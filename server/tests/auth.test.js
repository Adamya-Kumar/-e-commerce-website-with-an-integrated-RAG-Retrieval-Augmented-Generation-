import mongoose from 'mongoose';
import request from 'supertest';
import app from '../src/app.js';
import { AUTH_ATTEMPT_LIMIT, AUTH_COOKIE_NAME } from '../src/config/auth.js';
import { connectDb } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { seedAdmin } from '../src/scripts/seedAdmin.js';

const TEST_DB = 'spark-commerce-test';

beforeAll(async () => {
  await connectDb();
  if (mongoose.connection.name !== TEST_DB) {
    throw new Error(
      `Refusing to run auth tests against ${mongoose.connection.name}`,
    );
  }
  await User.deleteMany({ email: /@auth\.test$/ });
});

afterAll(async () => {
  await User.deleteMany({ email: /@auth\.test$/ });
  await mongoose.disconnect();
});

describe('auth API', () => {
  it('registers a customer, logs in, returns me, and logs out', async () => {
    const agent = request.agent(app);
    const email = uniqueEmail('ada');

    const registered = await agent.post('/api/auth/register').send({
      name: 'Ada Lovelace',
      email,
      password: 'password123',
      role: 'admin',
    });

    expect(registered.status).toBe(201);
    expect(registered.body.data.role).toBe('customer');
    expect(registered.body.data.email).toBe(email);
    expect(registered.body.data.passwordHash).toBeUndefined();
    expect(JSON.stringify(registered.body)).not.toContain('passwordHash');
    expect(cookieHeader(registered)).toMatch(/HttpOnly/i);
    expect(cookieHeader(registered)).toMatch(/SameSite=Lax/i);

    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.data.email).toBe(email);
    expect(me.body.data.passwordHash).toBeUndefined();

    await agent.post('/api/auth/logout').expect(200);

    const afterLogout = await agent.get('/api/auth/me');
    expect(afterLogout.status).toBe(401);
    expect(afterLogout.body.error.code).toBe('UNAUTHORIZED');

    const loggedIn = await request(app).post('/api/auth/login').send({
      email,
      password: 'password123',
    });
    expect(loggedIn.status).toBe(200);
    expect(loggedIn.body.data.id).toBe(registered.body.data.id);
    expect(loggedIn.body.data.passwordHash).toBeUndefined();
  });

  it('returns 409 when the email is already registered', async () => {
    const email = uniqueEmail('dup');
    const body = { name: 'Grace Hopper', email, password: 'password123' };

    await request(app).post('/api/auth/register').send(body).expect(201);
    const duplicate = await request(app).post('/api/auth/register').send(body);

    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe('CONFLICT');
  });

  it('returns 401 for a wrong password and an unknown email', async () => {
    const email = uniqueEmail('wrong');
    await request(app).post('/api/auth/register').send({
      name: 'Katherine Johnson',
      email,
      password: 'password123',
    });

    const wrong = await request(app).post('/api/auth/login').send({
      email,
      password: 'not-the-password',
    });
    expect(wrong.status).toBe(401);
    expect(wrong.body.error.code).toBe('UNAUTHORIZED');

    const unknown = await request(app)
      .post('/api/auth/login')
      .send({
        email: uniqueEmail('missing'),
        password: 'password123',
      });
    expect(unknown.status).toBe(401);
    expect(unknown.body.error.message).toBe(wrong.body.error.message);
  });

  it('returns 422 for an invalid register body', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'A',
      email: 'not-an-email',
      password: 'short',
    });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.length).toBeGreaterThan(0);
  });

  it('rejects a customer on the admin route and accepts a bearer token', async () => {
    const email = uniqueEmail('customer');
    const registered = await request(app).post('/api/auth/register').send({
      name: 'Customer User',
      email,
      password: 'password123',
    });
    const token = tokenFromCookie(registered);

    const forbidden = await request(app)
      .get('/api/admin/ping')
      .set('Authorization', `Bearer ${token}`);

    expect(forbidden.status).toBe(403);
    expect(forbidden.body.error.code).toBe('FORBIDDEN');

    const me = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body.data.email).toBe(email);
  });

  it('lets the seeded admin call the admin route', async () => {
    const email = uniqueEmail('admin');
    process.env.ADMIN_EMAIL = email;
    process.env.ADMIN_PASSWORD = 'admin-password-123';

    const first = await seedAdmin();
    const second = await seedAdmin();
    expect(first.role).toBe('admin');
    expect(first.passwordHash).toBeUndefined();
    expect(second.id).toBe(first.id);
    expect(await User.countDocuments({ email })).toBe(1);

    const login = await request(app).post('/api/auth/login').send({
      email,
      password: 'admin-password-123',
    });
    expect(login.status).toBe(200);

    const ping = await request(app)
      .get('/api/admin/ping')
      .set('Cookie', login.headers['set-cookie']);
    expect(ping.status).toBe(200);
    expect(ping.body.data.ok).toBe(true);
  });

  it('sets a Secure cookie in production', async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Prod User',
          email: uniqueEmail('prod'),
          password: 'password123',
        });
      expect(res.status).toBe(201);
      expect(cookieHeader(res)).toMatch(/Secure/i);
    } finally {
      process.env.NODE_ENV = previous;
    }
  });

  it('rate limits login and register outside of test mode', async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    try {
      const statuses = [];
      for (let attempt = 0; attempt < AUTH_ATTEMPT_LIMIT + 1; attempt += 1) {
        const res = await request(app).post('/api/auth/login').send({});
        statuses.push(res.status);
      }
      expect(statuses).toContain(422);
      expect(statuses.at(-1)).toBe(429);
      const blocked = await request(app).post('/api/auth/login').send({});
      expect(blocked.status).toBe(429);
      expect(blocked.body.error.code).toBe('TOO_MANY_REQUESTS');
    } finally {
      process.env.NODE_ENV = previous;
    }
  });
});

function uniqueEmail(label) {
  return `${label}-${Date.now()}-${Math.random().toString(16).slice(2)}@auth.test`;
}

function cookieHeader(res) {
  const raw = res.headers['set-cookie'];
  return Array.isArray(raw) ? raw.join(';') : String(raw ?? '');
}

function tokenFromCookie(res) {
  const match = cookieHeader(res).match(
    new RegExp(`${AUTH_COOKIE_NAME}=([^;]+)`),
  );
  if (!match) {
    throw new Error('Auth cookie was not set');
  }
  return match[1];
}

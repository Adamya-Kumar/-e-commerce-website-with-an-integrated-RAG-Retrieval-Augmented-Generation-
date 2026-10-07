import { Readable } from 'node:stream';
import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import app from '../src/app.js';
import { AUTH_COOKIE_NAME } from '../src/config/auth.js';

describe('chat proxy API', () => {
  const originalFetch = global.fetch;
  const originalJwtSecret = process.env.JWT_SECRET;
  const originalServiceKey = process.env.SERVICE_KEY;
  const originalChatbotUrl = process.env.CHATBOT_URL;

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.SERVICE_KEY = 'service-secret';
    process.env.CHATBOT_URL = 'http://chatbot.local';
    global.fetch = jest.fn(async (_url, options) => {
      const body = options.body ? JSON.parse(options.body) : {};
      expect(options.headers['X-Service-Key']).toBe('service-secret');

      if (body.thread_id === 'bad-token') {
        return new Response('data: nope\n\n', {
          headers: { 'content-type': 'text/event-stream' },
        });
      }

      const headers = {
        'content-type': 'text/event-stream',
      };
      const text = `event: done\ndata: ${JSON.stringify({ ok: true, userId: options.headers['X-User-Id'] ?? 'guest' })}\n\n`;
      return new Response(Readable.from([text]), { headers });
    });
  });

  afterEach(() => {
    if (originalFetch) {
      global.fetch = originalFetch;
    } else {
      delete global.fetch;
    }

    if (originalJwtSecret) {
      process.env.JWT_SECRET = originalJwtSecret;
    } else {
      delete process.env.JWT_SECRET;
    }

    if (originalServiceKey) {
      process.env.SERVICE_KEY = originalServiceKey;
    } else {
      delete process.env.SERVICE_KEY;
    }

    if (originalChatbotUrl) {
      process.env.CHATBOT_URL = originalChatbotUrl;
    } else {
      delete process.env.CHATBOT_URL;
    }
  });

  it('proxies chat streams with a verified JWT user id and passes the service key', async () => {
    const token = jwt.sign({ sub: 'user-42' }, 'test-secret', {
      expiresIn: '7d',
    });

    const response = await request(app)
      .post('/api/chat')
      .set('Cookie', `${AUTH_COOKIE_NAME}=${token}`)
      .send({ thread_id: 'thread-1', message: 'hello', page_context: { type: 'home' } });

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/text\/event-stream/);
    expect(response.text).toContain('userId');

    const call = global.fetch.mock.calls[0];
    expect(call[0]).toBe('http://chatbot.local/chat');
    expect(call[1].headers['X-User-Id']).toBe('user-42');
    expect(call[1].headers['X-Service-Key']).toBe('service-secret');
  });

  it('rejects a malformed JWT sent in the cookie before proxying', async () => {
    const response = await request(app)
      .post('/api/chat')
      .set('Cookie', `${AUTH_COOKIE_NAME}=not-a-valid-token`)
      .send({ thread_id: 'bad-token', message: 'hello' });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('allows guest chat requests without an X-User-Id header', async () => {
    const response = await request(app)
      .post('/api/chat')
      .send({ thread_id: 'guest-thread', message: 'hello' });

    expect(response.status).toBe(200);
    const call = global.fetch.mock.calls[0];
    expect(call[1].headers['X-User-Id']).toBeUndefined();
  });
});

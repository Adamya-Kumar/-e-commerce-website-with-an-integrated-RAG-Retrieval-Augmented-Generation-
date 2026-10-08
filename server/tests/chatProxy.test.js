import { Readable } from 'node:stream';
import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import app from '../src/app.js';
import { AUTH_COOKIE_NAME } from '../src/config/auth.js';
import { logger } from '../src/utils/logger.js';

describe('chat proxy API', () => {
  const originalFetch = global.fetch;
  const originalJwtSecret = process.env.JWT_SECRET;
  const originalServiceKey = process.env.SERVICE_KEY;
  const originalChatbotUrl = process.env.CHATBOT_URL;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.SERVICE_KEY = 'service-secret';
    process.env.CHATBOT_URL = 'http://chatbot.local///';
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

    if (originalNodeEnv) {
      process.env.NODE_ENV = originalNodeEnv;
    } else {
      delete process.env.NODE_ENV;
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

  it('returns a clear 503 when the chatbot is unreachable and logs only safe diagnostics', async () => {
    global.fetch = jest.fn(async () => {
      throw Object.assign(new TypeError('fetch failed'), {
        cause: Object.assign(new Error('connect ECONNREFUSED at https://chatbot.local/chat'), {
          code: 'ECONNREFUSED',
        }),
      });
    });
    const logError = jest.spyOn(logger, 'error').mockImplementation(() => logger);

    try {
      const response = await request(app)
        .post('/api/chat')
        .send({ message: 'hello' });

      expect(response.status).toBe(503);
      expect(response.body.error.code).toBe('CHATBOT_UNAVAILABLE');
      expect(response.body.error.message).toMatch(/unreachable/i);
      expect(response.body.error.message).not.toMatch(/python -m uvicorn/i);

      const diagnostic = logError.mock.calls[0][0];
      expect(diagnostic).toMatchObject({
        chatbotHost: 'chatbot.local',
        errorCode: 'ECONNREFUSED',
      });
      expect(diagnostic.errorMessage).not.toContain('https://');
      expect(JSON.stringify(diagnostic)).not.toContain('service-secret');
    } finally {
      logError.mockRestore();
    }
  });

  it('includes the local-run hint only for a localhost URL', async () => {
    process.env.CHATBOT_URL = 'http://localhost:8000/';
    global.fetch = jest.fn(async () => {
      throw new TypeError('fetch failed');
    });

    const response = await request(app)
      .post('/api/chat')
      .send({ message: 'hello' });

    expect(response.status).toBe(503);
    expect(response.body.error.message).toMatch(/python -m uvicorn/i);
  });

  it('uses the development fallback only when CHATBOT_URL is unset', async () => {
    delete process.env.CHATBOT_URL;
    process.env.NODE_ENV = 'development';

    const response = await request(app)
      .post('/api/chat')
      .send({ message: 'hello' });

    expect(response.status).toBe(200);
    expect(global.fetch.mock.calls[0][0]).toBe('http://127.0.0.1:8000/chat');
  });

  it('does not use a localhost fallback outside development', async () => {
    delete process.env.CHATBOT_URL;
    process.env.NODE_ENV = 'production';

    const response = await request(app)
      .post('/api/chat')
      .send({ message: 'hello' });

    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe('CHATBOT_URL_NOT_CONFIGURED');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns a waking-up message when the chatbot request times out', async () => {
    const timeoutSpy = jest.spyOn(global, 'setTimeout');
    global.fetch = jest.fn(async (_url, options) => {
      expect(options.signal).toBeInstanceOf(AbortSignal);
      const error = new DOMException('request timed out', 'TimeoutError');
      throw error;
    });

    try {
      const response = await request(app)
        .post('/api/chat')
        .send({ message: 'hello' });

      expect(timeoutSpy).toHaveBeenCalledWith(expect.any(Function), 90_000);
      expect(response.status).toBe(504);
      expect(response.body.error.code).toBe('CHATBOT_TIMEOUT');
      expect(response.body.error.message).toMatch(/waking up/i);
    } finally {
      timeoutSpy.mockRestore();
    }
  });

  it('reports an invalid chatbot service key for upstream 401 responses', async () => {
    global.fetch = jest.fn(async () => new Response('{"detail":"unauthorized"}', { status: 401 }));

    const response = await request(app)
      .post('/api/chat')
      .send({ message: 'hello' });

    expect(response.status).toBe(502);
    expect(response.body.error.code).toBe('CHATBOT_INVALID_SERVICE_KEY');
    expect(response.body.error.message).toMatch(/service key/i);
  });

  it('reports upstream 5xx responses as chatbot service errors', async () => {
    global.fetch = jest.fn(async () => new Response('Internal error', { status: 503 }));

    const response = await request(app)
      .post('/api/chat')
      .send({ message: 'hello' });

    expect(response.status).toBe(502);
    expect(response.body.error.code).toBe('CHATBOT_SERVICE_ERROR');
    expect(response.body.error.message).toMatch(/HTTP 503/);
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

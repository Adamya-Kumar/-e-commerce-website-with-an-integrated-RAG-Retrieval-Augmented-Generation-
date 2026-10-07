import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { Readable } from 'node:stream';
import { getJwtSecret } from '../config/auth.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { readAuthToken } from '../utils/authToken.js';

const chatRouter = Router();
const CHAT_RATE_WINDOW_MS = 60_000;
const CHAT_RATE_LIMIT = Number(process.env.CHAT_RATE_LIMIT ?? 20);
const CHAT_GUEST_RATE_LIMIT = Number(process.env.CHAT_GUEST_RATE_LIMIT ?? 5);
const CHAT_DAILY_LIMIT = Number(process.env.CHAT_DAILY_LIMIT ?? 500);
const chatMinuteBuckets = new Map();
const chatDayBuckets = new Map();

chatRouter.use(asyncHandler(async (req, _res, next) => {
  const userId = resolveChatUserId(req);
  req.chatUserId = userId;
  enforceChatRateLimit(req, userId);
  next();
}));

chatRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const payload = req.body ?? {};
    await proxyChatbot(req, res, '/chat', payload);
  }),
);

chatRouter.post(
  '/confirm',
  asyncHandler(async (req, res) => {
    const payload = req.body ?? {};
    await proxyChatbot(req, res, '/chat/confirm', payload);
  }),
);

chatRouter.get(
  '/sessions/latest',
  asyncHandler(async (req, res) => {
    await proxyChatbot(req, res, '/chat/sessions/latest');
  }),
);

export default chatRouter;

function resolveChatUserId(req) {
  const token = readAuthToken(req);
  if (!token) {
    return null;
  }

  try {
    const payload = jwt.verify(token, getJwtSecret());
    const userId = payload && typeof payload === 'object' ? payload.sub : null;
    if (typeof userId !== 'string' || !userId) {
      throw new Error('User id missing from JWT');
    }
    return userId;
  } catch {
    throw ApiError.unauthorized('Invalid or expired token');
  }
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || 'unknown';
}

function enforceChatRateLimit(req, userId) {
  const key = userId ? `user:${userId}` : `ip:${getClientIp(req)}`;
  const limit = userId ? CHAT_RATE_LIMIT : CHAT_GUEST_RATE_LIMIT;
  const now = Date.now();
  const minuteBucket = chatMinuteBuckets.get(key) ?? {
    count: 0,
    resetAt: now + CHAT_RATE_WINDOW_MS,
  };

  if (now > minuteBucket.resetAt) {
    minuteBucket.count = 0;
    minuteBucket.resetAt = now + CHAT_RATE_WINDOW_MS;
  }

  if (minuteBucket.count >= limit) {
    throw ApiError.tooManyRequests(
      userId ? 'You are sending chat messages too quickly.' : 'Too many guest chat messages. Try again later.',
    );
  }
  minuteBucket.count += 1;
  chatMinuteBuckets.set(key, minuteBucket);

  if (!userId) {
    return;
  }

  const dateKey = new Date().toISOString().slice(0, 10);
  const dailyKey = `user:${userId}:${dateKey}`;
  const dailyBucket = chatDayBuckets.get(dailyKey) ?? { count: 0 };
  if (dailyBucket.count >= CHAT_DAILY_LIMIT) {
    throw ApiError.tooManyRequests('Daily chat message cap reached for this account.');
  }
  dailyBucket.count += 1;
  chatDayBuckets.set(dailyKey, dailyBucket);
}

async function proxyChatbot(req, res, path, payload) {
  const chatbotUrl = process.env.CHATBOT_URL;
  const serviceKey = process.env.SERVICE_KEY;

  if (!chatbotUrl) {
    throw ApiError.badRequest('Chatbot URL is not configured');
  }

  if (!serviceKey) {
    throw ApiError.badRequest('Service key is not configured');
  }

  const baseUrl = chatbotUrl.replace(/\/$/, '');
  const headers = {
    'X-Service-Key': serviceKey,
  };

  if (req.chatUserId) {
    headers['X-User-Id'] = req.chatUserId;
  }

  const hasPayload = payload !== undefined && payload !== null;
  if (hasPayload) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: req.method,
    headers,
    body: hasPayload ? JSON.stringify(payload) : undefined,
  });

  const contentType = response.headers.get('content-type') || '';
  const isSse = contentType.includes('text/event-stream');

  for (const [key, value] of response.headers.entries()) {
    if (key.toLowerCase() === 'content-length') {
      continue;
    }
    res.setHeader(key, value);
  }

  if (!response.ok) {
    const bodyText = await response.text();
    let parsed;
    try {
      parsed = JSON.parse(bodyText);
    } catch {
      parsed = null;
    }

    if (parsed && typeof parsed === 'object' && 'error' in parsed) {
      res.status(response.status).json(parsed);
      return;
    }

    res.status(response.status).json({
      error: {
        code: 'CHATBOT_PROXY_ERROR',
        message: bodyText || 'Chatbot request failed',
      },
    });
    return;
  }

  if (isSse && response.body) {
    res.status(response.status);
    res.flushHeaders?.();
    Readable.fromWeb(response.body).pipe(res);
    return;
  }

  const text = await response.text();
  if (!text) {
    res.status(response.status).end();
    return;
  }

  try {
    res.status(response.status).json(JSON.parse(text));
  } catch {
    res.status(response.status).send(text);
  }
}

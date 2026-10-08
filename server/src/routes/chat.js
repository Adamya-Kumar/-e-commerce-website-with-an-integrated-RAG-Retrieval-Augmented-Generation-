import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { Readable } from 'node:stream';
import { getJwtSecret } from '../config/auth.js';
import {
  getChatbotBaseUrl,
  isLocalChatbotUrl,
  logChatbotFailure,
} from '../config/chatbot.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { readAuthToken } from '../utils/authToken.js';

const chatRouter = Router();
const CHAT_RATE_WINDOW_MS = 60_000;
const CHATBOT_REQUEST_TIMEOUT_MS = 90_000;
const CHAT_RATE_LIMIT = Number(process.env.CHAT_RATE_LIMIT ?? 20);
const CHAT_DAILY_LIMIT = Number(process.env.CHAT_DAILY_LIMIT ?? 500);
const chatMinuteBuckets = new Map();
const chatDayBuckets = new Map();

chatRouter.use(asyncHandler(async (req, _res, next) => {
  req.chatUserId = resolveChatUserId(req);
  next();
}));

chatRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    enforceChatRateLimit(req, req.chatUserId);
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
    if (!req.chatUserId) {
      throw ApiError.unauthorized('Login required to load chat history');
    }
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
  const limit = CHAT_RATE_LIMIT;
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

export async function proxyChatbot(req, res, path, payload, options = {}) {
  const chatbotUrl = getChatbotBaseUrl();
  const serviceKey = process.env.SERVICE_KEY;

  if (!chatbotUrl) {
    throw new ApiError(503, 'CHATBOT_URL_NOT_CONFIGURED', 'Chatbot URL is not configured');
  }

  if (!serviceKey) {
    throw ApiError.badRequest('Service key is not configured');
  }

  const headers = {
    'X-Service-Key': serviceKey,
  };

  const userId = options.userId ?? req.chatUserId;
  if (userId) {
    headers['X-User-Id'] = userId;
  }

  const hasPayload = payload !== undefined && payload !== null;
  if (hasPayload) {
    headers['Content-Type'] = 'application/json';
  }

  let response;
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(new DOMException('Chatbot request timed out', 'TimeoutError')),
    CHATBOT_REQUEST_TIMEOUT_MS,
  );
  try {
    response = await fetch(`${chatbotUrl}${path}`, {
      method: req.method,
      headers,
      body: hasPayload ? JSON.stringify(payload) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    const errorName =
      error && typeof error === 'object' && 'name' in error
        ? error.name
        : undefined;
    const isTimeout =
      controller.signal.aborted ||
      errorName === 'AbortError' ||
      errorName === 'TimeoutError';
    logChatbotFailure({
      baseUrl: chatbotUrl,
      error,
      errorCode: isTimeout ? 'CHATBOT_TIMEOUT' : undefined,
      errorMessage: error instanceof Error ? error.message : String(error),
      serviceKey,
    });
    const localHint = isLocalChatbotUrl(chatbotUrl)
      ? ' From the chatbot folder start: python -m uvicorn app.main:app --host 127.0.0.1 --port 8000'
      : '';
    if (isTimeout) {
      throw new ApiError(
        504,
        'CHATBOT_TIMEOUT',
        `The chatbot is waking up and taking longer than expected. Please try again shortly.${localHint}`,
      );
    }
    throw new ApiError(
      503,
      'CHATBOT_UNAVAILABLE',
      `The chatbot is unreachable.${localHint}`,
    );
  } finally {
    clearTimeout(timeout);
  }

  const contentType = response.headers.get('content-type') || '';
  const isSse = contentType.includes('text/event-stream');
  const forwardHeaders = ['content-type', 'cache-control', 'connection', 'x-accel-buffering'];

  if (!response.ok) {
    let bodyText;
    try {
      bodyText = await response.text();
    } catch (error) {
      logChatbotFailure({
        baseUrl: chatbotUrl,
        statusCode: response.status,
        error,
        serviceKey,
      });
      throw new ApiError(
        502,
        'CHATBOT_SERVICE_ERROR',
        `The chatbot response could not be read (HTTP ${response.status}). Please try again later.`,
      );
    }
    const parsed = parseJson(bodyText);
    const errorCode = getResponseErrorValue(parsed, 'code');
    const errorMessage =
      getResponseErrorValue(parsed, 'message') ??
      (bodyText || `Chatbot request failed with status ${response.status}`);
    logChatbotFailure({
      baseUrl: chatbotUrl,
      statusCode: response.status,
      errorCode,
      errorMessage,
      serviceKey,
    });

    if (response.status === 401) {
      res.status(502).json({
        error: {
          code: 'CHATBOT_INVALID_SERVICE_KEY',
          message: 'The chatbot rejected the service key (401). Check the server configuration.',
        },
      });
      return;
    }

    if (response.status >= 500) {
      res.status(502).json({
        error: {
          code: 'CHATBOT_SERVICE_ERROR',
          message: `The chatbot service returned an error (HTTP ${response.status}). Please try again later.`,
        },
      });
      return;
    }

    if (parsed && typeof parsed === 'object' && 'error' in parsed) {
      res.status(response.status).json(parsed);
      return;
    }

    res.status(response.status).json({
      error: {
        code: 'CHATBOT_PROXY_ERROR',
        message: errorMessage,
      },
    });
    return;
  }

  for (const [key, value] of response.headers.entries()) {
    if (forwardHeaders.includes(key.toLowerCase())) {
      res.setHeader(key, value);
    }
  }

  if (isSse && response.body) {
    res.status(response.status);
    res.flushHeaders?.();
    const chatbotStream = Readable.fromWeb(response.body);
    chatbotStream.on('error', (error) => {
      logChatbotFailure({
        baseUrl: chatbotUrl,
        statusCode: response.status,
        error,
        serviceKey,
      });
      res.destroy(error);
    });
    chatbotStream.pipe(res);
    return;
  }

  let text;
  try {
    text = await response.text();
  } catch (error) {
    logChatbotFailure({
      baseUrl: chatbotUrl,
      statusCode: response.status,
      error,
      serviceKey,
    });
    throw new ApiError(
      502,
      'CHATBOT_SERVICE_ERROR',
      `The chatbot response could not be read (HTTP ${response.status}). Please try again later.`,
    );
  }
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

function parseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function getResponseErrorValue(parsed, key) {
  if (!parsed || typeof parsed !== 'object') {
    return undefined;
  }

  const error = 'error' in parsed ? parsed.error : parsed;
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  const value = error[key];
  return typeof value === 'string' ? value : undefined;
}

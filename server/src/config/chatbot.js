import { logger } from '../utils/logger.js';

export function getChatbotBaseUrl() {
  const configuredUrl = process.env.CHATBOT_URL?.trim();
  if (!configuredUrl) {
    return process.env.NODE_ENV === 'development'
      ? 'http://127.0.0.1:8000'
      : undefined;
  }

  const baseUrl = configuredUrl.replace(/\/+$/, '');
  return baseUrl || undefined;
}

export function getChatbotHost(baseUrl) {
  try {
    return new URL(baseUrl).host;
  } catch {
    return 'invalid-url';
  }
}

export function isLocalChatbotUrl(baseUrl) {
  try {
    const hostname = new URL(baseUrl).hostname.toLowerCase();
    return (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '[::1]'
    );
  } catch {
    return false;
  }
}

export function logChatbotFailure({
  baseUrl,
  statusCode,
  errorCode,
  errorMessage,
  error,
  serviceKey,
}) {
  const cause = error?.cause;
  const message = errorMessage ?? error?.message ?? cause?.message;
  const code =
    errorCode ??
    error?.code ??
    cause?.code ??
    (error instanceof Error ? error.name : undefined);

  logger.error(
    {
      chatbotHost: getChatbotHost(baseUrl),
      statusCode: statusCode ?? error?.statusCode ?? null,
      errorCode: code ?? null,
      errorMessage: sanitizeLogValue(message, [baseUrl, serviceKey]),
    },
    'Chatbot request failed',
  );
}

function sanitizeLogValue(value, secrets) {
  if (typeof value !== 'string') {
    return null;
  }

  let sanitized = value.replace(/https?:\/\/[^\s"'<>]+/gi, '[url]');
  for (const secret of secrets) {
    if (secret) {
      sanitized = sanitized.replaceAll(secret, '[redacted]');
    }
  }
  return sanitized;
}

export const PROVIDER_FAILURE_CLASSES = Object.freeze([
  'TRANSPORT_TIMEOUT',
  'TRANSPORT_CONNECTION',
  'RATE_LIMIT_RETRYABLE',
  'PROVIDER_5XX_RETRYABLE',
  'PROVIDER_4XX_NON_RETRYABLE',
  'AUTHENTICATION_ERROR',
  'CANCELLED',
  'SEMANTIC_PARSE_FAILURE',
  'SEMANTIC_GATE_FAILURE',
  'UNKNOWN_PROVIDER_FAILURE',
]);

const TIMEOUT_CODES = new Set([
  'REQUEST_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_CONNECT_TIMEOUT',
  'ETIMEDOUT',
  'ESOCKETTIMEDOUT',
]);

const CONNECTION_CODES = new Set([
  'ECONNRESET',
  'ECONNREFUSED',
  'EAI_AGAIN',
  'ENETUNREACH',
  'UND_ERR_SOCKET',
]);

function finiteStatus(value) {
  const status = Number(value);
  return Number.isInteger(status) ? status : null;
}

export function classifyProviderFailure(error) {
  const code = String(error?.code || error?.name || 'UNKNOWN_PROVIDER_FAILURE');
  const errorName = String(error?.name || '');
  const causeCode = String(error?.details?.causeCode || error?.cause?.code || '');
  const httpStatus = finiteStatus(error?.details?.httpStatus ?? error?.httpStatus ?? error?.status);
  const responseHeadersReceived = typeof error?.details?.responseHeadersReceived === 'boolean'
    ? error.details.responseHeadersReceived
    : httpStatus !== null;

  if (code === 'SEMANTIC_PARSE_FAILURE') {
    return { failureClass: 'SEMANTIC_PARSE_FAILURE', retryable: false, responseHeadersReceived: true, errorCode: code, causeCode: causeCode || null, httpStatus };
  }
  if (code === 'SEMANTIC_GATE_FAILURE') {
    return { failureClass: 'SEMANTIC_GATE_FAILURE', retryable: false, responseHeadersReceived: true, errorCode: code, causeCode: causeCode || null, httpStatus };
  }
  if (errorName === 'AbortError' || code === 'AbortError' || code === 'CANCELLED') {
    return { failureClass: 'CANCELLED', retryable: false, responseHeadersReceived: false, errorCode: code, causeCode: causeCode || null, httpStatus };
  }
  if (TIMEOUT_CODES.has(code) || TIMEOUT_CODES.has(causeCode)) {
    return { failureClass: 'TRANSPORT_TIMEOUT', retryable: true, responseHeadersReceived: false, errorCode: code, causeCode: causeCode || null, httpStatus };
  }
  if (CONNECTION_CODES.has(code) || CONNECTION_CODES.has(causeCode)) {
    return { failureClass: 'TRANSPORT_CONNECTION', retryable: true, responseHeadersReceived: false, errorCode: code, causeCode: causeCode || null, httpStatus };
  }
  if (httpStatus === 429) {
    return { failureClass: 'RATE_LIMIT_RETRYABLE', retryable: true, responseHeadersReceived: true, errorCode: code, causeCode: causeCode || null, httpStatus };
  }
  if (httpStatus !== null && httpStatus >= 500 && httpStatus <= 599) {
    return { failureClass: 'PROVIDER_5XX_RETRYABLE', retryable: true, responseHeadersReceived: true, errorCode: code, causeCode: causeCode || null, httpStatus };
  }
  if (httpStatus === 401 || httpStatus === 403 || code === 'API_KEY_MISSING' || code === 'AUTHENTICATION_ERROR') {
    return { failureClass: 'AUTHENTICATION_ERROR', retryable: false, responseHeadersReceived, errorCode: code, causeCode: causeCode || null, httpStatus };
  }
  if (httpStatus !== null && httpStatus >= 400 && httpStatus <= 499) {
    return { failureClass: 'PROVIDER_4XX_NON_RETRYABLE', retryable: false, responseHeadersReceived: true, errorCode: code, causeCode: causeCode || null, httpStatus };
  }
  return { failureClass: 'UNKNOWN_PROVIDER_FAILURE', retryable: false, responseHeadersReceived, errorCode: code, causeCode: causeCode || null, httpStatus };
}

export function semanticFailure(kind) {
  const failureClass = kind === 'parse' ? 'SEMANTIC_PARSE_FAILURE' : 'SEMANTIC_GATE_FAILURE';
  return {
    failureClass,
    retryable: false,
    responseHeadersReceived: true,
    errorCode: failureClass,
    causeCode: null,
    httpStatus: null,
  };
}

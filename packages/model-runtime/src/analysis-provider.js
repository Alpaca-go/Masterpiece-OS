const PROVIDER_ERROR_CODES = Object.freeze([
  'AUTHENTICATION_FAILED',
  'TIMEOUT',
  'RATE_LIMITED',
  'MALFORMED_RESPONSE',
  'MODEL_UNAVAILABLE',
  'REQUEST_FAILED',
]);

export class AnalysisProviderError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = 'AnalysisProviderError';
    this.code = PROVIDER_ERROR_CODES.includes(code) ? code : 'REQUEST_FAILED';
    this.providerId = String(options.providerId || '').trim();
    this.causeCode = String(options.causeCode || '').trim();
    this.details = Object.freeze({
      ...(options.details && typeof options.details === 'object' ? options.details : {}),
      ...(this.causeCode ? { causeCode: this.causeCode } : {}),
    });
  }
}

export function assertAnalysisProvider(provider) {
  if (!provider || typeof provider !== 'object') throw new TypeError('Analysis Provider must be an object.');
  if (!String(provider.id || '').trim()) throw new TypeError('Analysis Provider identity is required.');
  if (typeof provider.supports !== 'function') throw new TypeError(`Analysis Provider ${provider.id} must implement supports().`);
  if (typeof provider.createReasoner !== 'function') throw new TypeError(`Analysis Provider ${provider.id} must implement createReasoner().`);
  return provider;
}

export function assertCanonicalAnalysisResult(result) {
  if (!result || typeof result !== 'object') throw new AnalysisProviderError('MALFORMED_RESPONSE', 'Analysis Provider returned no result.');
  for (const field of ['runId', 'provider', 'model', 'completedAt', 'reportMarkdown']) {
    if (!String(result[field] || '').trim()) {
      throw new AnalysisProviderError('MALFORMED_RESPONSE', `Analysis Provider result is missing ${field}.`);
    }
  }
  return result;
}

export function normalizeAnalysisProviderError(error, providerId) {
  if (error instanceof AnalysisProviderError) return error;
  const causeCode = String(
    error?.details?.causeCode
      || error?.causeCode
      || error?.cause?.code
      || error?.code
      || '',
  ).toUpperCase();
  const message = String(error?.message || error || 'Analysis Provider request failed.');
  let code = 'REQUEST_FAILED';
  if (/401|403|API_KEY|AUTH|UNAUTHORIZED|FORBIDDEN/u.test(`${causeCode} ${message}`)) code = 'AUTHENTICATION_FAILED';
  else if (/TIMEOUT|TIMED_OUT|ABORT/u.test(`${causeCode} ${message}`)) code = 'TIMEOUT';
  else if (/429|RATE_LIMIT/u.test(`${causeCode} ${message}`)) code = 'RATE_LIMITED';
  else if (/EMPTY|RESPONSE_INVALID|MALFORMED|PARSE/u.test(`${causeCode} ${message}`)) code = 'MALFORMED_RESPONSE';
  else if (/404|MODEL.*(?:NOT_FOUND|UNAVAILABLE)|DOES NOT EXIST/iu.test(`${causeCode} ${message}`)) code = 'MODEL_UNAVAILABLE';
  return new AnalysisProviderError(code, message, {
    cause: error,
    providerId,
    causeCode,
    details: {
      responseHeadersReceived: error?.details?.responseHeadersReceived ?? false,
      requestDispatched: error?.details?.requestDispatched,
      httpStatus: error?.details?.httpStatus ?? error?.httpStatus ?? error?.status,
    },
  });
}

export function createAnalysisProviderRegistry(providers = []) {
  const registered = new Map();
  for (const candidate of providers) {
    const provider = assertAnalysisProvider(candidate);
    const id = provider.id.trim().toLowerCase();
    if (registered.has(id)) throw new Error(`ANALYSIS_PROVIDER_DUPLICATE: ${id}`);
    registered.set(id, provider);
  }
  return Object.freeze({
    list() {
      return [...registered.values()].map((provider) => ({
        id: provider.id,
        capabilities: [...(provider.capabilities || [])],
      }));
    },
    resolve(configuration) {
      const matches = [...registered.values()].filter((provider) => provider.supports(configuration));
      if (matches.length === 0) {
        const identity = String(configuration?.provider || '').trim() || 'unknown';
        throw new AnalysisProviderError('MODEL_UNAVAILABLE', `ANALYSIS_PROVIDER_UNSUPPORTED: ${identity}`, { providerId: identity });
      }
      if (matches.length > 1) throw new Error(`ANALYSIS_PROVIDER_AMBIGUOUS: ${matches.map((provider) => provider.id).join(', ')}`);
      return matches[0];
    },
    createReasoner(configuration) {
      const provider = this.resolve(configuration);
      const reasoner = provider.createReasoner(configuration);
      return async (request) => {
        try {
          return assertCanonicalAnalysisResult(await reasoner(request));
        } catch (error) {
          throw normalizeAnalysisProviderError(error, provider.id);
        }
      };
    },
  });
}

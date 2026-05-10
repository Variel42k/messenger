export class ApiError extends Error {
  constructor(message, { status = 0, code = 'api_error', details = null, response = null } = {}) {
    super(message || code);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.response = response;
  }

  get isUnauthorized() {
    return this.status === 401;
  }

  get isForbidden() {
    return this.status === 403;
  }

  get isConflict() {
    return this.status === 409;
  }

  get isValidationError() {
    return this.status === 422 || this.status === 400;
  }
}

export function normalizeApiError(error) {
  if (error instanceof ApiError) {
    return error;
  }

  if (error?.name === 'AbortError') {
    return new ApiError('Request was cancelled.', { status: 0, code: 'request_cancelled', details: error });
  }

  return new ApiError(error?.message || 'Network request failed.', {
    status: error?.status || 0,
    code: error?.code || 'network_error',
    details: error,
  });
}

export function isAbortError(error) {
  return error?.name === 'AbortError' || error?.code === 'request_cancelled';
}

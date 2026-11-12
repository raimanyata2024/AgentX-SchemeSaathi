/**
 * Shared API error classification helpers for consistent auth, not-found,
 * and transient network failure handling across pages and context providers.
 */

export function isAuthenticationError(err: unknown): boolean {
  if (!err || typeof err !== 'object') {
    return false;
  }
  const e = err as { code?: unknown; message?: unknown; status?: unknown };
  const code = typeof e.code === 'string' ? e.code.toUpperCase() : '';
  if (
    code === 'UNAUTHORIZED' ||
    code === 'HTTP_401' ||
    code === 'INVALID_TOKEN' ||
    code === 'TOKEN_EXPIRED'
  ) {
    return true;
  }
  if (e.status === 401) {
    return true;
  }
  const message = typeof e.message === 'string' ? e.message : '';
  return /authentication token|token is missing|please log in|unauthorized|invalid token|token expired/i.test(
    message
  );
}

export function isNotFoundError(err: unknown): boolean {
  if (!err || typeof err !== 'object') {
    return false;
  }
  const e = err as { code?: unknown; message?: unknown; status?: unknown };
  const code = typeof e.code === 'string' ? e.code.toUpperCase() : '';
  if (code === 'NOT_FOUND' || code === 'HTTP_404' || e.status === 404) {
    return true;
  }
  const message = typeof e.message === 'string' ? e.message : '';
  return /not found/i.test(message);
}

export function isUuidString(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value.trim()
  );
}

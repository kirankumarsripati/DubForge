export const VERIFICATION_CHECK_CODES = {
  EXISTS: 'exists',
  SIZE: 'size',
  SHA256: 'sha256',
  PERMISSIONS: 'permissions',
  READABLE: 'readable',
  HEALTHY: 'healthy',
} as const;

export type VerificationCheckCode =
  (typeof VERIFICATION_CHECK_CODES)[keyof typeof VERIFICATION_CHECK_CODES];

export const MAX_RESPONSE_BODY_BYTES = 8192;

export const MAX_HTTP_REDIRECTS = 10;

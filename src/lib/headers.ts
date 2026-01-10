/**
 * Security headers configuration
 * These should be set on the server/CDN, but we document them here for reference
 */

export const SECURITY_HEADERS = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // TODO: Remove unsafe-inline/eval in production
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co https://api-inference.huggingface.co https://*.pinata.cloud https://hardwareapi-4xbs.onrender.com https://voiceagent-6h5b.onrender.com https://api.data.gov.in",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '),
  
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

/**
 * For Vite dev server, add security headers via middleware
 * This is handled in vite.config.ts
 */


/**
 * Security utilities for input validation, sanitization, and protection
 */

/**
 * Sanitize string input to prevent XSS and injection attacks
 */
export function sanitizeString(input: string | null | undefined, maxLength = 1000): string {
  if (!input) return '';
  
  const sanitized = input
    .slice(0, maxLength)
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
  
  return sanitized;
}

/**
 * Validate and sanitize numeric input
 */
export function validateNumber(
  value: string | number | null | undefined,
  min?: number,
  max?: number,
  defaultValue = 0
): number {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }
  
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num) || !isFinite(num)) {
    return defaultValue;
  }
  
  if (min !== undefined && num < min) {
    return min;
  }
  
  if (max !== undefined && num > max) {
    return max;
  }
  
  return num;
}

/**
 * Validate and sanitize integer input
 */
export function validateInteger(
  value: string | number | null | undefined,
  min?: number,
  max?: number,
  defaultValue = 0
): number {
  const num = validateNumber(value, min, max, defaultValue);
  return Math.floor(num);
}

/**
 * Validate UUID format
 */
export function isValidUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Safely parse JSON with error handling
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Sanitize object keys and values recursively
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized = { ...obj };
  
  for (const key in sanitized) {
    const value = sanitized[key];
    
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value) as T[Extract<keyof T, string>];
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>) as T[Extract<keyof T, string>];
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'string' ? sanitizeString(item) : item
      ) as T[Extract<keyof T, string>];
    }
  }
  
  return sanitized;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number format (basic validation)
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\+?[\d\s-()]{10,}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

/**
 * Rate limiting utility using Map (in-memory, for client-side)
 * For production, use a proper rate limiting service
 */
class RateLimiter {
  private requests = new Map<string, number[]>();
  
  constructor(
    private readonly maxRequests: number,
    private readonly windowMs: number
  ) {}
  
  isAllowed(key: string): boolean {
    const now = Date.now();
    const userRequests = this.requests.get(key) || [];
    
    // Remove requests outside the window
    const recentRequests = userRequests.filter(time => now - time < this.windowMs);
    
    if (recentRequests.length >= this.maxRequests) {
      return false;
    }
    
    recentRequests.push(now);
    this.requests.set(key, recentRequests);
    
    // Cleanup old entries periodically
    if (Math.random() < 0.01) {
      this.cleanup(now);
    }
    
    return true;
  }
  
  private cleanup(now: number): void {
    for (const [key, requests] of this.requests.entries()) {
      const recentRequests = requests.filter(time => now - time < this.windowMs);
      if (recentRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, recentRequests);
      }
    }
  }
  
  reset(key: string): void {
    this.requests.delete(key);
  }
}

// Export rate limiter instances for different use cases
export const apiRateLimiter = new RateLimiter(10, 60000); // 10 requests per minute
export const authRateLimiter = new RateLimiter(5, 60000); // 5 requests per minute
export const uploadRateLimiter = new RateLimiter(3, 60000); // 3 requests per minute

/**
 * Sanitize error message to prevent information leakage
 */
export function sanitizeError(error: unknown): string {
  if (error instanceof Error) {
    // Don't expose internal error details in production
    if (import.meta.env.PROD) {
      // Generic error messages for production
      if (error.message.includes('network') || error.message.includes('fetch')) {
        return 'Network error. Please check your connection.';
      }
      if (error.message.includes('auth') || error.message.includes('permission')) {
        return 'Authentication error. Please try again.';
      }
      if (error.message.includes('database') || error.message.includes('query')) {
        return 'Database error. Please try again later.';
      }
      return 'An error occurred. Please try again.';
    }
    return error.message;
  }
  
  return 'An unknown error occurred.';
}


/**
 * Simple in-memory rate limiter for API routes
 * In production, consider using Redis or a similar solution
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

// Clean up expired entries every 60 seconds
if (typeof window === 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, value] of rateLimitStore.entries()) {
      if (value.resetTime < now) {
        rateLimitStore.delete(key)
      }
    }
  }, 60000)
}

interface RateLimitOptions {
  /**
   * Maximum number of requests allowed within the window
   * @default 60
   */
  maxRequests?: number

  /**
   * Time window in seconds
   * @default 60
   */
  windowSeconds?: number

  /**
   * Custom identifier (e.g., user ID). If not provided, uses IP address
   */
  identifier?: string
}

interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  resetTime: number
}

/**
 * Check if a request should be rate limited
 * @param request - The Next.js request object
 * @param options - Rate limit configuration
 * @returns Rate limit result
 */
export function checkRateLimit(
  request: Request,
  options: RateLimitOptions = {}
): RateLimitResult {
  const {
    maxRequests = 60,
    windowSeconds = 60,
    identifier,
  } = options

  // Get identifier from custom value, X-Forwarded-For header, or fallback
  let key: string
  if (identifier) {
    key = identifier
  } else {
    const forwardedFor = request.headers.get('x-forwarded-for')
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown'
    key = `${ip}:${new URL(request.url).pathname}`
  }

  const now = Date.now()
  const windowMs = windowSeconds * 1000

  const entry = rateLimitStore.get(key)

  if (!entry || entry.resetTime < now) {
    // No entry or expired - create new entry
    const resetTime = now + windowMs
    rateLimitStore.set(key, {
      count: 1,
      resetTime,
    })

    return {
      success: true,
      limit: maxRequests,
      remaining: maxRequests - 1,
      resetTime,
    }
  }

  // Entry exists and is still valid
  if (entry.count >= maxRequests) {
    // Rate limit exceeded
    return {
      success: false,
      limit: maxRequests,
      remaining: 0,
      resetTime: entry.resetTime,
    }
  }

  // Increment count
  entry.count++

  return {
    success: true,
    limit: maxRequests,
    remaining: maxRequests - entry.count,
    resetTime: entry.resetTime,
  }
}

/**
 * Create a rate limit response when limit is exceeded
 */
export function createRateLimitResponse(result: RateLimitResult): Response {
  const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000)

  return new Response(
    JSON.stringify({
      error: 'Too many requests',
      message: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': result.resetTime.toString(),
        'Retry-After': retryAfter.toString(),
      },
    }
  )
}

/**
 * URL validation and sanitization utilities to prevent SSRF and other attacks
 */

const BLOCKED_HOSTNAMES = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '[::]',
  '::1',
]

const BLOCKED_IP_PATTERNS = [
  /^10\./,        // Private network 10.0.0.0/8
  /^172\.(1[6-9]|2\d|3[01])\./,  // Private network 172.16.0.0/12
  /^192\.168\./,  // Private network 192.168.0.0/16
  /^169\.254\./,  // Link-local 169.254.0.0/16
  /^127\./,       // Loopback 127.0.0.0/8
  /^0\./,         // Reserved 0.0.0.0/8
  /^224\./,       // Multicast 224.0.0.0/4
  /^240\./,       // Reserved 240.0.0.0/4
]

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

/**
 * Validates and sanitizes a URL to prevent SSRF attacks
 * @param urlString - The URL string to validate
 * @returns The validated URL object
 * @throws ValidationError if the URL is invalid or potentially dangerous
 */
export function validateUrl(urlString: string): URL {
  // Check if URL is provided
  if (!urlString || typeof urlString !== 'string') {
    throw new ValidationError('URL is required and must be a string')
  }

  // Trim and check length
  const trimmedUrl = urlString.trim()
  if (trimmedUrl.length === 0) {
    throw new ValidationError('URL cannot be empty')
  }

  if (trimmedUrl.length > 2048) {
    throw new ValidationError('URL is too long (max 2048 characters)')
  }

  // Parse URL
  let url: URL
  try {
    url = new URL(trimmedUrl)
  } catch (error) {
    throw new ValidationError('Invalid URL format')
  }

  // Only allow http and https protocols
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new ValidationError(`Protocol "${url.protocol}" is not allowed. Only HTTP and HTTPS are supported.`)
  }

  // Check for blocked hostnames
  const hostname = url.hostname.toLowerCase()
  if (BLOCKED_HOSTNAMES.includes(hostname)) {
    throw new ValidationError(`Access to ${hostname} is not allowed`)
  }

  // Check for private IP addresses
  for (const pattern of BLOCKED_IP_PATTERNS) {
    if (pattern.test(hostname)) {
      throw new ValidationError('Access to private IP addresses is not allowed')
    }
  }

  // Block IPv6 localhost and private addresses
  if (hostname.includes(':') && (
    hostname === '::1' ||
    hostname.startsWith('fe80:') ||
    hostname.startsWith('fc00:') ||
    hostname.startsWith('fd00:')
  )) {
    throw new ValidationError('Access to local or private IPv6 addresses is not allowed')
  }

  // Additional safety: check for encoded bypass attempts
  if (url.href.includes('%') && (url.href.match(/%/g) || []).length > 10) {
    throw new ValidationError('Suspicious URL encoding detected')
  }

  return url
}

/**
 * Validates a feed URL specifically
 * @param urlString - The feed URL to validate
 * @returns The validated URL string
 */
export function validateFeedUrl(urlString: string): string {
  const url = validateUrl(urlString)
  return url.href
}

/**
 * Validates an article URL
 * @param urlString - The article URL to validate
 * @returns The validated URL string
 */
export function validateArticleUrl(urlString: string): string {
  const url = validateUrl(urlString)
  return url.href
}

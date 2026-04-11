/**
 * input-sanitizer.ts
 *
 * Input validation and sanitization for MCP tools
 * Prevents ReDoS, SSRF, injection attacks, and resource exhaustion
 */

import { securityError, validationError } from './error';

/**
 * Safe regex patterns that are known to be non-vulnerable
 * Used for validation
 */
const SAFE_PATTERNS = {
  // Simple patterns without backtracking
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  url: /^https?:\/\/.+/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
};

/**
 * Regex patterns that are known to cause ReDoS
 * These should be blocked
 */
const DANGEROUS_PATTERNS = [
  // Exponential backtracking patterns
  /^(a+)+$/,
  /^(a|a)*$/,
  /^(a|ab)*$/,
  /^(.*)*$/,
  /^(.*)+$/,
  /^(a*)*$/,
  // Nested quantifiers
  /(x+x+)+y/,
  /(a+)+b/,
];

/**
 * Detect if a regex pattern is likely to cause ReDoS
 * Conservative approach: blocks known dangerous patterns
 */
export function detectReDoSPattern(pattern: string): boolean {
  // Check length (long patterns are suspicious)
  if (pattern.length > 200) {
    return true;
  }

  // Check for nested quantifiers (a+ followed by +)
  if (/([\*\+\?])\s*([\*\+\?])/.test(pattern)) {
    return true;
  }

  // Check for alternation with overlap
  if (/\(.*\|.*\)[\*\+]/.test(pattern)) {
    return true;
  }

  // Check for known dangerous patterns
  for (const dangerous of DANGEROUS_PATTERNS) {
    try {
      if (dangerous.test(pattern)) {
        return true;
      }
    } catch {
      // Pattern itself might be invalid
      return true;
    }
  }

  return false;
}

/**
 * Sanitize and validate a regex pattern
 * Throws if pattern appears unsafe
 */
export function sanitizeRegexPattern(pattern: string, toolName: string): string {
  // Validate length
  if (pattern.length === 0) {
    throw validationError(toolName, 'pattern', 'Cannot be empty');
  }

  if (pattern.length > 200) {
    throw validationError(toolName, 'pattern', 'Pattern too long (max 200 chars)');
  }

  // Detect ReDoS vulnerabilities
  if (detectReDoSPattern(pattern)) {
    throw securityError(
      toolName,
      'Regex pattern appears to be vulnerable to ReDoS attack',
    );
  }

  // Test the regex is compilable
  try {
    new RegExp(pattern);
  } catch (err) {
    throw validationError(toolName, 'pattern', `Invalid regex: ${String(err)}`);
  }

  return pattern;
}

/**
 * Validate and sanitize URLs
 * Prevents SSRF attacks
 */
export function sanitizeUrl(url: string, toolName: string): string {
  // Validate length
  if (url.length === 0) {
    throw validationError(toolName, 'url', 'Cannot be empty');
  }

  if (url.length > 2048) {
    throw validationError(toolName, 'url', 'URL too long (max 2048 chars)');
  }

  // Parse URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw validationError(toolName, 'url', 'Invalid URL format');
  }

  // Block localhost and private IPs (SSRF prevention)
  const hostname = parsedUrl.hostname.toLowerCase();
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('172.') ||
    hostname === '0.0.0.0'
  ) {
    throw securityError(toolName, 'Cannot access local or private IP addresses');
  }

  // Block file:// protocol (SSRF)
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw validationError(toolName, 'url', 'Only http:// and https:// protocols allowed');
  }

  return parsedUrl.href;
}

/**
 * Truncate large text to prevent memory exhaustion
 */
export function sanitizeLargeText(
  text: string,
  maxLength: number,
  toolName: string,
): string {
  if (text.length > maxLength) {
    console.warn(
      `[${toolName}] Text truncated from ${text.length} to ${maxLength} chars`,
    );
    return text.substring(0, maxLength);
  }
  return text;
}

/**
 * Validate numeric range
 */
export function validateNumericRange(
  value: number,
  min: number,
  max: number,
  fieldName: string,
  toolName: string,
): number {
  if (value < min || value > max) {
    throw validationError(
      toolName,
      fieldName,
      `Must be between ${min} and ${max}, got ${value}`,
    );
  }
  return value;
}

/**
 * Validate and sanitize user input string
 */
export function sanitizeString(
  input: string,
  minLength: number,
  maxLength: number,
  fieldName: string,
  toolName: string,
): string {
  if (input.length < minLength) {
    throw validationError(
      toolName,
      fieldName,
      `Minimum length is ${minLength}`,
    );
  }

  if (input.length > maxLength) {
    throw validationError(
      toolName,
      fieldName,
      `Maximum length is ${maxLength}`,
    );
  }

  return input;
}

/**
 * Sanitize search query
 * Prevents query injection and excessive requests
 */
export function sanitizeSearchQuery(query: string, toolName: string): string {
  // Validate length
  if (query.length < 2) {
    throw validationError(toolName, 'query', 'Query must be at least 2 characters');
  }

  if (query.length > 500) {
    throw validationError(toolName, 'query', 'Query limited to 500 characters');
  }

  // Trim whitespace
  const trimmed = query.trim();

  // Block obviously malicious patterns
  if (trimmed.includes('<') || trimmed.includes('>')) {
    throw securityError(toolName, 'Query contains HTML-like characters');
  }

  return trimmed;
}

/**
 * Validate array length to prevent resource exhaustion
 */
export function validateArrayLength(
  array: any[],
  minLength: number,
  maxLength: number,
  fieldName: string,
  toolName: string,
): any[] {
  if (array.length < minLength) {
    throw validationError(
      toolName,
      fieldName,
      `Array must have at least ${minLength} items`,
    );
  }

  if (array.length > maxLength) {
    throw validationError(
      toolName,
      fieldName,
      `Array limited to ${maxLength} items`,
    );
  }

  return array;
}

/**
 * Validate Monte Carlo path count
 * Prevents CPU exhaustion
 */
export function validateMonteCarloConfig(
  paths: number,
  maxPaths: number = 5000,
  toolName: string = 'montecarlo',
): number {
  return validateNumericRange(paths, 1, maxPaths, 'paths', toolName);
}

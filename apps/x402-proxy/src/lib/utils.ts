import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate a URL-safe slug from a string
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Format a number as currency (USDC)
 */
export function formatUSDC(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(amount);
}

/**
 * Format a date relative to now
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString();
}

/**
 * Truncate an Ethereum address for display
 */
export function truncateAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Check if a string is a valid Ethereum address
 */
export function isValidEthAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Reserved slugs that cannot be used by users
 */
export const RESERVED_SLUGS = [
  "api",
  "admin",
  "dashboard",
  "login",
  "register",
  "auth",
  "settings",
  "help",
  "support",
  "docs",
  "pricing",
  "about",
  "contact",
  "terms",
  "privacy",
  "blog",
  "status",
  "health",
  "app",
  "www",
  "mail",
  "email",
  "ftp",
  "ssh",
  "git",
  "cdn",
  "static",
  "assets",
  "images",
  "img",
  "css",
  "js",
  "fonts",
  "favicon",
  "robots",
  "sitemap",
  "feed",
  "rss",
  "atom",
  "webhook",
  "webhooks",
  "callback",
  "oauth",
  "verify",
  "confirm",
  "reset",
  "forgot",
  "password",
  "account",
  "profile",
  "user",
  "users",
  "billing",
  "invoice",
  "payment",
  "payments",
  "subscribe",
  "subscription",
  "plan",
  "plans",
  "checkout",
  "cart",
  "order",
  "orders",
];

/**
 * Check if a slug is reserved
 */
export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.includes(slug.toLowerCase());
}

/**
 * URL validation options
 */
export interface ValidateEndpointUrlOptions {
  allowLocalhost?: boolean;
  allowOtherSchemes?: boolean;
}

/**
 * URL validation result
 */
export interface ValidateEndpointUrlResult {
  valid: boolean;
  error?: string;
  url?: URL;
}

/**
 * Check if a hostname is localhost or an IP address
 */
function isLocalhostOrIP(hostname: string): boolean {
  // Check for localhost
  if (hostname.includes("localhost")) {
    return true;
  }

  // Check for IPv4 addresses (including loopback)
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(hostname)) {
    return true;
  }

  // Check for IPv6 addresses (including loopback ::1)
  // IPv6 in URLs is enclosed in brackets, but hostname won't have them
  if (hostname === "::1" || hostname.startsWith("fe80:") || hostname.includes(":")) {
    return true;
  }

  return false;
}

/**
 * Validate an endpoint target URL
 * 
 * By default:
 * - Only HTTPS scheme is allowed
 * - Localhost and IP addresses are not allowed
 * 
 * These can be overridden with environment variables or options:
 * - NEXT_PUBLIC_ALLOW_LOCALHOST_ENDPOINT=true
 * - NEXT_PUBLIC_ALLOW_OTHER_ENDPOINT_SCHEMES=true
 */
export function validateEndpointUrl(
  urlString: string,
  options?: ValidateEndpointUrlOptions
): ValidateEndpointUrlResult {
  // Get options from env vars or passed options
  const allowLocalhost = options?.allowLocalhost ?? 
    (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_ALLOW_LOCALHOST_ENDPOINT === "true");
  const allowOtherSchemes = options?.allowOtherSchemes ?? 
    (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_ALLOW_OTHER_ENDPOINT_SCHEMES === "true");

  // Try to parse the URL
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    return {
      valid: false,
      error: "Invalid URL format",
    };
  }

  // Check scheme
  if (!allowOtherSchemes && url.protocol !== "https:") {
    return {
      valid: false,
      error: "Only HTTPS URLs are allowed.",
    };
  }

  // Check for valid schemes (even when allowing other schemes)
  const validSchemes = ["https:", "http:"];
  if (!validSchemes.includes(url.protocol)) {
    return {
      valid: false,
      error: `Invalid URL scheme: ${url.protocol}. Only http:// and https:// are supported.`,
    };
  }

  // Check for localhost/IP
  if (!allowLocalhost && isLocalhostOrIP(url.hostname)) {
    return {
      valid: false,
      error: "Localhost and IP addresses are not allowed.",
    };
  }

  // Check for empty hostname
  if (!url.hostname) {
    return {
      valid: false,
      error: "URL must have a valid hostname",
    };
  }

  return {
    valid: true,
    url,
  };
}

/**
 * Get URL validation config from environment
 */
export function getUrlValidationConfig(): ValidateEndpointUrlOptions {
  return {
    allowLocalhost: typeof process !== "undefined" && 
      process.env?.NEXT_PUBLIC_ALLOW_LOCALHOST_ENDPOINT === "true",
    allowOtherSchemes: typeof process !== "undefined" && 
      process.env?.NEXT_PUBLIC_ALLOW_OTHER_ENDPOINT_SCHEMES === "true",
  };
}

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

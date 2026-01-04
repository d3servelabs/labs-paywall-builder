/**
 * Shared constants for x402 paywall system
 */

import type { ThemeConfig, BrandingConfig, ChainConfig } from './types';

/**
 * Namefi dark theme (default)
 */
export const NAMEFI_THEME: ThemeConfig = {
  background: '#1a1a1a',
  card: '#2a2a2a',
  foreground: '#fafafa',
  muted: '#a3a3a3',
  brandPrimary: '#22c55e',
  brandPrimaryHover: '#16a34a',
  destructive: '#ef4444',
  border: 'rgba(255,255,255,0.1)',
  borderRadius: '1.25rem',
};

/**
 * Namefi branding (default)
 */
export const NAMEFI_BRANDING: BrandingConfig = {
  appName: 'Namefi',
  appLogo: 'https://namefi.io/logotype.svg',
};

/**
 * Supported EVM chain configurations
 */
export const CHAIN_CONFIG: Record<string, ChainConfig> = {
  'eip155:8453': {
    chainId: 8453,
    name: 'Base',
    usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    rpcUrl: 'https://mainnet.base.org',
    blockExplorer: 'https://basescan.org',
  },
  'eip155:84532': {
    chainId: 84532,
    name: 'Base Sepolia',
    usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    rpcUrl: 'https://sepolia.base.org',
    blockExplorer: 'https://sepolia.basescan.org',
  },
};

/**
 * Default success redirect delay in seconds
 */
export const DEFAULT_SUCCESS_REDIRECT_DELAY = 3;

/**
 * Default redirect button label when autoSuccessRedirect is false
 */
export const DEFAULT_REDIRECT_BTN_LABEL = 'Redirect Now';

/**
 * Default auto-redirect behavior (true for backwards compatibility)
 */
export const DEFAULT_AUTO_SUCCESS_REDIRECT = true;

/**
 * Header name for dynamic redirect options from backend response
 */
export const PAYWALL_REDIRECT_OPTIONS_HEADER = 'X-PAYWALL-REDIRECT-OPTIONS';

/**
 * Header name for config override (base64-encoded JSON)
 * Server can set this header to override the default config injected in HTML
 */
export const PAYWALL_CONFIG_HEADER = 'X-PAYWALL-CONFIG';

/**
 * Meta tag name for config (used by JavaScript to read header-provided config)
 * The server populates this meta tag with base64-encoded config from the header
 */
export const PAYWALL_CONFIG_META_NAME = 'x-paywall-config';

/**
 * Placeholder for config in the meta tag
 * Server replaces this with base64-encoded JSON config
 */
export const PAYWALL_CONFIG_PLACEHOLDER = '{{payment-config}}';

/**
 * x402 Protocol link
 */
export const X402_PROTOCOL_URL = 'https://x402.org';

/**
 * Theme presets for paywall customization
 */
export const THEME_PRESETS = {
  Namefi: NAMEFI_THEME,
  Coinbase: {
    background: 'oklch(0.94 0 0)',
    card: 'oklch(0.91 0 0)',
    foreground: 'oklch(0.08 0 0)',
    muted: 'oklch(0.15 0 0)',
    brandPrimary: 'oklch(0.58 0.18 256.05)',
    brandPrimaryHover: 'oklch(0.51 0.18 256.05)',
    destructive: '#ef4444',
    border: 'rgba(255,255,255,0.1)',
    borderRadius: '1.25rem',
  } as ThemeConfig,
  'Ocean Gradient': {
    background:
      'linear-gradient(135deg, oklch(0.85 0.1 220) 0%, oklch(0.75 0.15 250) 100%)',
    card: 'oklch(0.95 0.02 240)',
    foreground: 'oklch(0.15 0.05 250)',
    muted: 'oklch(0.25 0.08 240)',
    brandPrimary: 'oklch(0.55 0.2 240)',
    brandPrimaryHover: 'oklch(0.45 0.22 240)',
    destructive: '#ef4444',
    border: 'rgba(100,150,255,0.15)',
    borderRadius: '1.5rem',
  } as ThemeConfig,
  'Sunset Gradient': {
    background:
      'linear-gradient(135deg, oklch(0.88 0.15 50) 0%, oklch(0.75 0.2 20) 100%)',
    card: 'oklch(0.92 0.08 40)',
    foreground: 'oklch(0.12 0.05 30)',
    muted: 'oklch(0.25 0.08 35)',
    brandPrimary: 'oklch(0.62 0.22 40)',
    brandPrimaryHover: 'oklch(0.52 0.24 35)',
    destructive: '#ef4444',
    border: 'rgba(255,180,100,0.2)',
    borderRadius: '1.25rem',
  } as ThemeConfig,
  Midnight: {
    background: 'oklch(0.12 0.02 270)',
    card: 'oklch(0.18 0.03 270)',
    foreground: 'oklch(0.95 0.01 270)',
    muted: 'oklch(0.55 0.05 270)',
    brandPrimary: 'oklch(0.65 0.25 310)',
    brandPrimaryHover: 'oklch(0.55 0.27 310)',
    destructive: '#ef4444',
    border: 'rgba(150,100,255,0.15)',
    borderRadius: '1.125rem',
  } as ThemeConfig,
  'Forest Gradient': {
    background:
      'linear-gradient(135deg, oklch(0.82 0.12 160) 0%, oklch(0.72 0.18 140) 100%)',
    card: 'oklch(0.9 0.05 150)',
    foreground: 'oklch(0.15 0.08 150)',
    muted: 'oklch(0.25 0.12 155)',
    brandPrimary: 'oklch(0.5 0.2 150)',
    brandPrimaryHover: 'oklch(0.4 0.22 145)',
    destructive: '#ef4444',
    border: 'rgba(80,200,120,0.2)',
    borderRadius: '1.375rem',
  } as ThemeConfig,
} as const;

export type ThemePresetName = keyof typeof THEME_PRESETS;

/**
 * Coinbase branding configuration
 */
export const COINBASE_BRANDING: BrandingConfig = {
  appName: 'Coinbase',
  appLogo:
    'https://static-assets.coinbase.com/ui-infra/illustration/v1/pictogram/svg/light/coinbaseLogoNavigation-4.svg',
};

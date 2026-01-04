# @d3servelabs/x402-paywall-builder

[![npm version](https://img.shields.io/npm/v/@d3servelabs/x402-paywall-builder.svg)](https://www.npmjs.com/package/@d3servelabs/x402-paywall-builder)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Customizable paywall HTML generator for the [x402 protocol](https://x402.org). Generate beautiful, responsive payment pages for crypto micropayments with USDC.

---

## Visual Builder (Recommended)

**No code required!** Use our visual builder to customize and export your paywall:

### [x402-paywall demo](https://labs-x402-paywall-builder.vercel.app/)

The builder lets you:

- Choose from 6 theme presets or create custom themes
- Configure branding (logo, app name)
- Set payment amount and description
- Configure success redirect behavior
- Preview on desktop, tablet, and mobile
- Export production-ready HTML with one click

---

## Installation

```bash
# npm
npm install @d3servelabs/x402-paywall-builder

# yarn
yarn add @d3servelabs/x402-paywall-builder

# pnpm
pnpm add @d3servelabs/x402-paywall-builder

# bun
bun add @d3servelabs/x402-paywall-builder
```

## Quick Start

```typescript
import { generateGenericPaywallTemplate, THEME_PRESETS } from '@d3servelabs/x402-paywall-builder';

const html = generateGenericPaywallTemplate({
  // Payment details
  payTo: '0x1234567890abcdef1234567890abcdef12345678',
  amount: 0.50,
  amountInAtomicUnits: '500000', // USDC has 6 decimals

  // Network configuration
  network: 'eip155:8453',
  chainId: 8453,
  chainIdHex: '0x2105',
  chainName: 'Base',
  usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  rpcUrl: 'https://mainnet.base.org',
  blockExplorer: 'https://basescan.org',

  // Context
  currentUrl: 'https://example.com/premium-content',
  testnet: false,
  paymentRequired: {},

  // Customization
  resourceDescription: 'Access premium article',
  theme: THEME_PRESETS.Coinbase,
  branding: {
    appName: 'My App',
    appLogo: 'https://example.com/logo.svg',
  },
});
```

## Theme Presets

Six built-in theme presets are available:

| Preset | Style | Primary Color |
|--------|-------|---------------|
| `d3servelabs` | Dark | Green |
| `Coinbase` | Light | Blue |
| `Ocean Gradient` | Light gradient | Blue |
| `Sunset Gradient` | Warm gradient | Orange |
| `Midnight` | Dark | Purple |
| `Forest Gradient` | Green gradient | Green |

```typescript
import { THEME_PRESETS } from '@d3servelabs/x402-paywall-builder';

// Use a preset
const theme = THEME_PRESETS.Coinbase;
const theme = THEME_PRESETS['Ocean Gradient'];
const theme = THEME_PRESETS.Midnight;
```

## Custom Themes

Create fully custom themes by providing a `ThemeConfig` object:

```typescript
import type { ThemeConfig } from '@d3servelabs/x402-paywall-builder';

const customTheme: ThemeConfig = {
  background: '#0a0a0a',
  card: '#1a1a1a',
  foreground: '#ffffff',
  muted: '#888888',
  brandPrimary: '#ff6b00',
  brandPrimaryHover: '#ff8533',
  destructive: '#ef4444',
  border: 'rgba(255, 255, 255, 0.1)',
  borderRadius: '1.25rem',
};
```

## Using with x402 Middleware

For server-side integration with x402 middleware, use the `genericEvmPaywall` handler:

```typescript
import { genericEvmPaywall } from '@d3servelabs/x402-paywall-builder';

// The handler implements PaywallNetworkHandler interface
const handler = genericEvmPaywall;

// Check if handler supports the network
if (handler.supports(paymentRequirement)) {
  const html = handler.generateHtml(
    paymentRequirement,
    paymentRequiredResponse,
    {
      walletConnectProjectId: 'your-project-id',
      appName: 'My App',
      appLogo: 'https://example.com/logo.svg',
      resourceDescription: 'Premium content access',
      successRedirectUrl: 'https://example.com/success',
    }
  );
}
```

## Server-Side Configuration

The paywall supports dynamic configuration via a meta tag with a replaceable placeholder.

### Meta Tag Placeholder

The HTML includes a meta tag with a `{{payment-config}}` placeholder:

```html
<meta name="x-paywall-config" content="{{payment-config}}">
```

Replace `{{payment-config}}` with your base64-encoded JSON config:

```typescript
import { 
  populateMetaTagPaywallConfig,
  PAYWALL_CONFIG_PLACEHOLDER  // '{{payment-config}}'
} from '@d3servelabs/x402-paywall-builder';

// Option 1: Use the helper function
const html = populateMetaTagPaywallConfig(templateHtml, {
  amount: 0.50,
  formattedAmount: '0.50',
  chainName: 'Base',
  testnet: false,
  // ... other config values
});

// Option 2: Manual replacement
const configB64 = btoa(JSON.stringify(config));
const html = templateHtml.replace('{{payment-config}}', configB64);
```

When config is provided via the meta tag, the JavaScript automatically:
- Parses the base64-encoded JSON
- Updates `window.x402Config` with the parsed config
- Updates UI elements (price display, pay button amount, chain name)

### Fallback Config Block

The HTML also contains a fallback configuration section:

```html
<!-- <CONFIG_JSON> -->
<script>
  window._x402FallbackConfig = { ... };
</script>
<!-- </CONFIG_JSON> -->
```

This fallback is used when the meta tag placeholder is not replaced.

### Config Resolution Order

The JavaScript resolves config in this order:
1. **Meta tag** (`x-paywall-config`) - if present and valid base64 JSON
2. **Fallback** (`window._x402FallbackConfig`) - if meta tag contains placeholder or invalid data

### Dynamic UI Updates

When config comes from the meta tag, these UI elements are automatically updated:

| Element ID | Description |
|------------|-------------|
| `#price-display-amount` | The amount shown in the price display |
| `#btn-pay-amount` | The amount shown in the pay button |
| `#chain-name-display` | The chain name with testnet suffix |
| `#chain-indicator` | Colored dot (yellow=testnet, green=mainnet) |

### Redirect Options Header

After successful payment, you can control redirect behavior via the `X-PAYWALL-REDIRECT-OPTIONS` response header. This allows dynamic redirect configuration without modifying the HTML.

```typescript
// Server response header (base64-encoded JSON)
const redirectOptions = {
  successRedirectUrl: 'https://example.com/success',
  successRedirectDelaySeconds: 3,
  autoSuccessRedirect: true,  // true = auto-redirect, false = show button
  successRedirectBtnLabel: 'Continue',
};

response.setHeader(
  'X-PAYWALL-REDIRECT-OPTIONS',
  btoa(JSON.stringify(redirectOptions))
);
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `successRedirectUrl` | `string` | - | URL to redirect after payment |
| `successRedirectDelaySeconds` | `number` | `3` | Countdown before redirect |
| `autoSuccessRedirect` | `boolean` | `true` | Auto-redirect or show button |
| `successRedirectBtnLabel` | `string` | `"Redirect Now"` | Button text when not auto-redirecting |

### Constants

```typescript
import { 
  PAYWALL_CONFIG_HEADER,       // 'X-PAYWALL-CONFIG'
  PAYWALL_CONFIG_META_NAME,    // 'x-paywall-config'
  PAYWALL_CONFIG_PLACEHOLDER,  // '{{payment-config}}'
  PAYWALL_REDIRECT_OPTIONS_HEADER,  // 'X-PAYWALL-REDIRECT-OPTIONS'
} from '@d3servelabs/x402-paywall-builder';
```

## Configuration Reference

### GenericPaywallConfig

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `payTo` | `string` | Yes | Recipient wallet address |
| `amount` | `number` | Yes | Amount in USDC (e.g., `0.50`) |
| `amountInAtomicUnits` | `string` | Yes | Amount in smallest unit (6 decimals) |
| `network` | `string` | Yes | Network identifier (e.g., `eip155:8453`) |
| `chainId` | `number` | Yes | Chain ID (e.g., `8453` for Base) |
| `chainIdHex` | `string` | Yes | Hex chain ID (e.g., `0x2105`) |
| `chainName` | `string` | Yes | Display name (e.g., `Base`) |
| `usdcAddress` | `string` | Yes | USDC contract address |
| `rpcUrl` | `string` | Yes | RPC endpoint URL |
| `blockExplorer` | `string` | Yes | Block explorer URL |
| `currentUrl` | `string` | Yes | URL of the protected resource |
| `testnet` | `boolean` | Yes | Whether on testnet |
| `paymentRequired` | `object` | Yes | x402 payment requirement object |
| `theme` | `ThemeConfig` | No | Theme configuration |
| `branding` | `BrandingConfig` | No | Branding configuration |
| `resourceDescription` | `string` | No | Description shown to user |
| `walletConnectProjectId` | `string` | No | WalletConnect Project ID |
| `successRedirectUrl` | `string` | No | URL to redirect after payment |
| `successRedirectDelaySeconds` | `number` | No | Delay before redirect (default: 3) |
| `autoSuccessRedirect` | `boolean` | No | Auto-redirect or show button (default: true) |

### ThemeConfig

| Property | Type | Description |
|----------|------|-------------|
| `background` | `string` | Page background (color or gradient) |
| `card` | `string` | Card background color |
| `foreground` | `string` | Primary text color |
| `muted` | `string` | Secondary text color |
| `brandPrimary` | `string` | Primary button/accent color |
| `brandPrimaryHover` | `string` | Button hover color |
| `destructive` | `string` | Error/destructive color |
| `border` | `string` | Border color |
| `borderRadius` | `string` | Border radius (e.g., `1.25rem`) |

### BrandingConfig

| Property | Type | Description |
|----------|------|-------------|
| `appName` | `string` | Application name |
| `appLogo` | `string` | Logo URL |

## Exports

### Functions

- `generateGenericPaywallTemplate(config)` - Generate paywall HTML
- `genericEvmPaywall` - PaywallNetworkHandler for x402 middleware
- `buildPaywallHtml(options)` - Low-level HTML builder
- `escapeHtml(str)` - HTML escape utility
- `populateMetaTagPaywallConfig(html, config)` - Populate meta tag with config
- `getConfigResolutionScript()` - Config resolution script for advanced use

### Constants

- `THEME_PRESETS` - Built-in theme presets
- `d3servelabs_THEME` - d3servelabs dark theme
- `d3servelabs_BRANDING` - d3servelabs branding config
- `COINBASE_BRANDING` - Coinbase branding config
- `CHAIN_CONFIG` - Supported chain configurations
- `PAYWALL_CONFIG_HEADER` - Header name for config (`X-PAYWALL-CONFIG`)
- `PAYWALL_CONFIG_META_NAME` - Meta tag name for config (`x-paywall-config`)
- `PAYWALL_CONFIG_PLACEHOLDER` - Placeholder in meta tag (`{{payment-config}}`)
- `PAYWALL_REDIRECT_OPTIONS_HEADER` - Header for redirect options (`X-PAYWALL-REDIRECT-OPTIONS`)

### Types

- `GenericPaywallConfig` - Main configuration interface
- `ThemeConfig` - Theme customization interface
- `BrandingConfig` - Branding configuration interface
- `ThemePresetName` - Union type of preset names
- `PaywallNetworkHandler` - Handler interface for x402 middleware
- `PaymentRequirement` - x402 payment requirement type
- `RedirectOptions` - Redirect configuration options

## Supported Networks

| Network | Chain ID | Status |
|---------|----------|--------|
| Base | 8453 | Mainnet |
| Base Sepolia | 84532 | Testnet |

## License

MIT License - see [LICENSE](https://github.com/d3servelabs/labs-paywall-builder/blob/main/LICENSE) for details.

---

Built with love by [D3ServeLabs](https://github.com/d3servelabs) for the [x402 Protocol](https://x402.org).

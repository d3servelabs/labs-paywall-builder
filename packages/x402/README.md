# @namefi/x402-paywall-builder

[![npm version](https://img.shields.io/npm/v/@namefi/x402-paywall-builder.svg)](https://www.npmjs.com/package/@namefi/x402-paywall-builder)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Customizable paywall HTML generator for the [x402 protocol](https://x402.org). Generate beautiful, responsive payment pages for crypto micropayments with USDC.

---

## Visual Builder (Recommended)

**No code required!** Use our visual builder to customize and export your paywall:

### [x402-paywall.labs.namefi.io](https://x402-paywall.labs.namefi.io)

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
npm install @namefi/x402-paywall-builder

# yarn
yarn add @namefi/x402-paywall-builder

# pnpm
pnpm add @namefi/x402-paywall-builder

# bun
bun add @namefi/x402-paywall-builder
```

## Quick Start

```typescript
import { generateGenericPaywallTemplate, THEME_PRESETS } from '@namefi/x402-paywall-builder';

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
| `Namefi` | Dark | Green |
| `Coinbase` | Light | Blue |
| `Ocean Gradient` | Light gradient | Blue |
| `Sunset Gradient` | Warm gradient | Orange |
| `Midnight` | Dark | Purple |
| `Forest Gradient` | Green gradient | Green |

```typescript
import { THEME_PRESETS } from '@namefi/x402-paywall-builder';

// Use a preset
const theme = THEME_PRESETS.Coinbase;
const theme = THEME_PRESETS['Ocean Gradient'];
const theme = THEME_PRESETS.Midnight;
```

## Custom Themes

Create fully custom themes by providing a `ThemeConfig` object:

```typescript
import type { ThemeConfig } from '@namefi/x402-paywall-builder';

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
import { genericEvmPaywall } from '@namefi/x402-paywall-builder';

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

The exported HTML contains a configuration section wrapped in special comments that your server should replace with dynamic values:

```html
<!-- <CONFIG_JSON> -->
<script>
  window.x402Config = { ... };
</script>
<!-- </CONFIG_JSON> -->
```

### Dynamic Replacement Example

```typescript
function injectConfig(html: string, config: object): string {
  const configScript = `<script>window.x402Config = ${JSON.stringify(config)};</script>`;
  return html.replace(
    /<!-- <CONFIG_JSON> -->[\s\S]*?<!-- <\/CONFIG_JSON> -->/,
    `<!-- <CONFIG_JSON> -->\n${configScript}\n<!-- </CONFIG_JSON> -->`
  );
}

// Usage
const dynamicHtml = injectConfig(templateHtml, {
  payTo: req.merchantWallet,
  amount: calculatePrice(req.resource),
  currentUrl: req.url,
  // ... other dynamic values
});
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

### Constants

- `THEME_PRESETS` - Built-in theme presets
- `NAMEFI_THEME` - Namefi dark theme
- `NAMEFI_BRANDING` - Namefi branding config
- `COINBASE_BRANDING` - Coinbase branding config
- `CHAIN_CONFIG` - Supported chain configurations

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

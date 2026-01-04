# x402 Proxy

A SaaS application that allows users to monetize their private APIs using the [x402 protocol](https://x402.org) for crypto payments (USDC on Base). Users can define proxy endpoints that require payment before forwarding requests to their target APIs.

## Table of Contents

- [Features](#features)
- [How It Works](#how-it-works)
- [Environment Variables](#environment-variables)
- [Development](#development)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
  - [Proxy Route](#proxy-route)
  - [Dashboard API](#dashboard-api)
- [Custom Paywall HTML](#custom-paywall-html)
- [x402 Protocol](#x402-protocol)
- [Tech Stack](#tech-stack)
- [Roadmap / Next Steps](#roadmap--next-steps)
- [License](#license)

## Features

- **API Monetization**: Charge per-request fees in USDC for API access
- **Proxy Endpoints**: Create multiple endpoints that proxy to your private APIs
- **Payment Verification**: Automatic verification and settlement via x402 facilitator
- **Custom Paywalls**: Use built-in paywall templates or provide custom HTML
- **Analytics Dashboard**: Track requests, payments, and revenue per endpoint
- **Encrypted Secrets**: Securely store API keys and tokens for target APIs
- **Rate Limiting**: Configurable per-endpoint rate limits
- **Custom Domains**: Support for CNAME mapping to custom domains

## How It Works

1. **Create an Account**: Register and get your unique user slug (e.g., `your-username`)
2. **Add an Endpoint**: Configure a proxy endpoint with:
   - Target API URL
   - Authentication credentials (optional)
   - Price per request (in USDC)
   - Payment recipient address
3. **Share Your Proxy URL**: Users access your API via `https://x402proxy.com/your-username/endpoint-slug`
4. **Get Paid**: When users pay via the x402 protocol, their requests are forwarded to your target API

## Environment Variables

Create a `.env.local` file based on `.env.local.example`:

```bash
# Database (PostgreSQL)
DATABASE_URL=postgresql://user:pass@host/database?sslmode=require

# Authentication (better-auth)
BETTER_AUTH_SECRET=your-32-char-secret-here-min-32-chars
BETTER_AUTH_URL=http://localhost:3001

# OAuth Providers (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Encryption key for secrets (32 bytes hex = 64 chars)
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# x402 Facilitator
FACILITATOR_URL=https://x402.org/facilitator

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3001

# WalletConnect Project ID (optional, for paywall wallet connections)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=

# Development Options
NEXT_PUBLIC_FORCE_TESTNET=              # Set to "true" to force Base Sepolia testnet
NEXT_PUBLIC_ALLOW_LOCALHOST_ENDPOINT=   # Set to "true" to allow localhost target URLs
NEXT_PUBLIC_ALLOW_OTHER_ENDPOINT_SCHEMES= # Set to "true" to allow http:// URLs

# Custom HTML Documentation URL (optional)
NEXT_PUBLIC_CUSTOM_HTML_HELPER_URL=     # URL to custom paywall HTML documentation
```

## Development

```bash
# Install dependencies
bun install

# Run database migrations
bun run db:migrate

# Start development server
bun run dev
```

The app will be available at `http://localhost:3001`.

## Project Structure

```
src/
├── app/
│   ├── (auth)/                    # Authentication pages
│   │   ├── login/
│   │   └── register/
│   ├── [userSlug]/[...path]/      # Proxy handler (main payment logic)
│   ├── api/
│   │   ├── auth/[...all]/         # better-auth API routes
│   │   ├── endpoints/             # Endpoint CRUD API
│   │   ├── secrets/               # Secrets management API
│   │   └── settings/              # User settings API
│   └── dashboard/
│       ├── endpoints/             # Endpoint management
│       │   ├── [id]/
│       │   │   ├── analytics/     # Per-endpoint analytics
│       │   │   └── page.tsx       # Edit endpoint
│       │   └── new/               # Create endpoint
│       ├── payments/              # Payment history
│       ├── secrets/               # API secrets management
│       └── settings/              # Account settings
├── components/
│   ├── layout/                    # Dashboard layout components
│   └── ui/                        # UI components (shadcn/ui)
└── lib/
    ├── db/
    │   ├── index.ts               # Drizzle database client
    │   └── schema.ts              # Database schema
    ├── proxy/
    │   ├── facilitator.ts         # x402 SDK integration
    │   ├── paywall-headers.ts     # HTTP 402 headers
    │   └── rate-limiter.ts        # Rate limiting logic
    ├── auth.ts                    # better-auth configuration
    ├── auth-client.ts             # Client-side auth utilities
    ├── crypto.ts                  # Encryption utilities
    └── utils.ts                   # Shared utilities
```

## Database Schema

The application uses PostgreSQL with Drizzle ORM:

- **users**: User accounts with slug, email, default payment address
- **sessions**: Authentication sessions (managed by better-auth)
- **accounts**: OAuth provider accounts (managed by better-auth)
- **endpoints**: Proxy endpoint configurations
- **secrets**: Encrypted API keys/tokens
- **payments**: Payment transaction records
- **request_logs**: API request logs for analytics

## API Endpoints

### Proxy Route

```
ANY /{userSlug}/{endpointSlug}[/...]
```

The main proxy handler that:
1. Looks up the endpoint configuration
2. Checks for x402 payment signature
3. If no payment: returns 402 with paywall (HTML for browsers, JSON for clients)
4. If payment provided: verifies, settles, and proxies the request

### Dashboard API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/endpoints` | List user's endpoints |
| POST | `/api/endpoints` | Create new endpoint |
| GET | `/api/endpoints/:id` | Get endpoint details |
| PATCH | `/api/endpoints/:id` | Update endpoint |
| DELETE | `/api/endpoints/:id` | Delete endpoint |
| GET | `/api/secrets` | List user's secrets |
| POST | `/api/secrets` | Create new secret |
| DELETE | `/api/secrets/:id` | Delete secret |
| GET | `/api/settings` | Get user settings |
| PATCH | `/api/settings` | Update user settings |

## Custom Paywall HTML

You can provide custom HTML for the paywall page. Use the `{{payment-config}}` placeholder where you want the payment configuration injected (as base64-encoded JSON).

Example:
```html
<!DOCTYPE html>
<html>
<head>
  <meta name="x402-payment-config" content="{{payment-config}}">
</head>
<body>
  <script>
    const configB64 = document.querySelector('meta[name="x402-payment-config"]').content;
    const config = JSON.parse(atob(configB64));
    // config contains: paymentRequired, amount, payTo, chainId, etc.
  </script>
</body>
</html>
```

The injected configuration includes:
- `paymentRequired`: x402 payment required response object
- `amount`: Price in USD
- `amountInAtomicUnits`: Price in USDC atomic units
- `payTo`: Recipient wallet address
- `network`: Chain identifier (e.g., "eip155:8453")
- `chainId`: Numeric chain ID
- `chainName`: Human-readable chain name
- `usdcAddress`: USDC contract address
- `rpcUrl`: RPC endpoint URL
- `testnet`: Boolean indicating testnet mode
- `branding`: App name and logo configuration

## x402 Protocol

This application implements the [x402 protocol](https://x402.org) for HTTP payments:

1. **402 Payment Required**: When a request lacks payment, return HTTP 402 with payment details
2. **Payment Signature**: Client includes payment signature in `X-PAYMENT` header
3. **Verification**: Server verifies the payment signature with the facilitator
4. **Settlement**: After successful response, server settles the payment
5. **Receipt**: Server includes payment receipt in `X-Payment-Receipt` header

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: better-auth
- **Styling**: Tailwind CSS + shadcn/ui
- **Payments**: x402 protocol (@x402/core, @x402/evm)
- **Monorepo**: Turborepo

## Roadmap / Next Steps

### 1. Signed Requests
Add support for cryptographically signed requests to ensure request integrity and prevent tampering. This would allow:
- Verification that requests haven't been modified in transit
- Non-repudiation of API calls
- Enhanced security for sensitive endpoints

### 2. TimescaleDB for Large Tables
Migrate high-volume tables (`request_logs`, `payments`) to [TimescaleDB](https://www.timescale.com/) for better performance at scale:
- Automatic time-based partitioning (hypertables)
- Efficient time-range queries for analytics
- Built-in data retention policies
- Continuous aggregates for real-time dashboards

### 3. User-Controlled Rate Limits
Expand rate limiting capabilities to give users more control:
- Per-endpoint rate limit configuration (already available)
- Per-payer rate limits (limit requests per wallet address)
- Tiered rate limits based on payment amount
- Burst allowances and sliding windows
- Rate limit headers in responses (X-RateLimit-*)

### 4. Multiple Facilitator Support
Support different x402 facilitators beyond the default:
- Coinbase CDP Facilitator
- Self-hosted facilitators
- Custom facilitator endpoints per endpoint
- Facilitator failover and load balancing
- Multi-chain support with different facilitators per chain

## License

MIT

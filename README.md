# x402 Paywall Builder

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A monorepo for building customizable paywall pages for the [x402 protocol](https://x402.org). Create beautiful, responsive payment pages for crypto micropayments with USDC.

## Table of Contents

- [Overview](#overview)
- [Live Demo](#live-demo)
- [Apps](#apps)
- [Packages](#packages)
- [Getting Started](#getting-started)
- [Development](#development)
- [License](#license)

## Overview

This monorepo contains tools for creating and customizing x402 protocol paywall pages:

- **Visual Builder** - A no-code web app for designing paywall pages
- **Paywall Builder Package** - A TypeScript library for generating paywall HTML
- **x402 Proxy** - A proxy server for handling x402 payments

## Live Demo

**[x402-paywall.labs.namefi.io](https://x402-paywall.labs.namefi.io)**

## Apps

| App | Description | Documentation |
|-----|-------------|---------------|
| [`apps/x402-paywall-builder-web`](./apps/x402-paywall-builder-web) | Visual paywall builder web app | [README](./apps/x402-paywall-builder-web/README.md) |
| [`apps/x402-proxy`](./apps/x402-proxy) | x402 payment proxy server | [README](./apps/x402-proxy/README.md) |

## Packages

| Package | Description | Documentation |
|---------|-------------|---------------|
| [`@namefi/x402-paywall-builder`](./packages/x402-paywall-builder) | Paywall HTML generator library | [README](./packages/x402-paywall-builder/README.md) |
| [`@repo/typescript-config`](./packages/typescript-config) | Shared TypeScript configurations | - |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ or [Bun](https://bun.sh/) (recommended)
- Package manager: npm, yarn, pnpm, or bun

### Installation

```bash
# Clone the repository
git clone https://github.com/d3servelabs/paywall-builder.git
cd paywall-builder

# Install dependencies
bun install
# or
npm install
```

### Quick Start

```bash
# Run the visual builder
bun dev --filter=x402-paywall-builder-web

# Or run all apps
bun dev
```

Open [http://localhost:3000](http://localhost:3000) to see the visual builder.

## Development

### Commands

```bash
# Install dependencies
bun install

# Run all apps in development mode
bun dev

# Build all apps and packages
bun run build

# Run a specific app
bun dev --filter=x402-paywall-builder-web
bun dev --filter=x402-proxy

# Lint code
bun run lint

# Format code
bun run format
```

### Project Structure

```
paywall-builder/
├── apps/
│   ├── x402-paywall-builder-web/   # Visual builder web app
│   └── x402-proxy/                  # x402 payment proxy server
├── packages/
│   ├── x402-paywall-builder/        # @namefi/x402-paywall-builder package
│   └── typescript-config/           # Shared TypeScript configs
├── turbo.json                       # Turborepo configuration
├── biome.jsonc                      # Biome linter/formatter config
└── package.json                     # Root package.json
```

### Tech Stack

- [Turborepo](https://turborepo.com/) - Monorepo build system
- [Next.js](https://nextjs.org/) - React framework
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Bun](https://bun.sh/) - JavaScript runtime & package manager

## License

MIT License - see [LICENSE](./LICENSE) for details.

---

Built with love by [D3ServeLabs](https://github.com/d3servelabs) for the [x402 Protocol](https://x402.org).

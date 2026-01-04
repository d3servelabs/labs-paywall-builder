# x402 Paywall Studio

A visual builder for creating customizable x402 protocol paywall pages. Design beautiful, responsive payment pages for crypto micropayments with USDC - no code required.

## Live Demo

### [x402-paywall demo](https://labs-x402-paywall-builder.vercel.app/)

## Features

- **Visual Theme Editor** - Choose from 6 built-in presets or create custom themes
- **Branding Customization** - Configure app name, logo, and colors
- **Payment Configuration** - Set amount, description, and redirect behavior
- **Responsive Preview** - Preview on desktop, tablet, and mobile viewports
- **Live Preview** - See changes in real-time as you customize
- **One-Click Export** - Export production-ready HTML instantly

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ or [Bun](https://bun.sh/)
- Package manager: npm, yarn, pnpm, or bun

### Installation

From the monorepo root:

```bash
# Install dependencies
bun install
# or
npm install
```

### Development

```bash
# Run the development server
bun dev
# or
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

### Build

```bash
# Build for production
bun run build
# or
npm run build
```

## Project Structure

```
apps/web/
├── src/
│   ├── app/           # Next.js App Router pages
│   ├── components/    # React components
│   │   ├── ui/        # shadcn/ui components
│   │   └── paywall-studio.tsx  # Main studio component
│   └── lib/           # Utility functions
├── public/            # Static assets
└── package.json
```

## Tech Stack

- [Next.js 14](https://nextjs.org/) - React framework
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [TypeScript](https://www.typescriptlang.org/) - Type safety

## Related Packages

This app uses the `@d3servelabs/x402-paywall-builder` package to generate paywall HTML.

For detailed documentation on:
- Configuration options
- Theme customization
- Server-side integration
- API reference

**See: [packages/x402/README.md](../../packages/x402/README.md)**

## Deployment

### Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme)

### Other Platforms

```bash
# Build the production bundle
npm run build

# Start the production server
npm run start
```

## License

MIT License - see [LICENSE](https://github.com/d3servelabs/labs-paywall-builder/blob/main/LICENSE) for details.

---

Built with love by [D3ServeLabs](https://github.com/d3servelabs) for the [x402 Protocol](https://x402.org).

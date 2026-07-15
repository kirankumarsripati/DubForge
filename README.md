# DubForge

Offline-first AI-powered desktop application for translating, dubbing and localizing videos.

## Requirements

- Node.js 22 LTS
- pnpm 10+
- Python 3.12+
- macOS 14+ (Apple Silicon)

## Getting Started

```bash
pnpm install
pnpm dev
```

## Scripts

| Command          | Description                |
| ---------------- | -------------------------- |
| `pnpm dev`       | Start desktop app in dev   |
| `pnpm build`     | Build all packages         |
| `pnpm lint`      | Lint TypeScript and Python |
| `pnpm typecheck` | Type check all packages    |
| `pnpm test`      | Run unit tests             |
| `pnpm test:e2e`  | Run Playwright e2e tests   |
| `pnpm format`    | Format all code            |

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full architecture overview.

## License

MIT

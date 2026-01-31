# Live Poker Tracker

A mobile-first web app for recording and reviewing live Texas Hold'em poker hands.

## Features

- **Hand Recording** — Track actions from preflop through river with position-aware player management
- **Pot Calculation** — Automatic pot sizing with side pot support for all-in scenarios
- **History Management** — Browse past hands with expandable details, favorites, and deletion
- **Memo Notes** — Attach notes to individual hands for post-session review
- **Board & Hand Display** — Suit-colored card rendering with 3D flip animations
- **Tab Navigation** — Switch between Record and History views while preserving session state

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | [Next.js](https://nextjs.org/) 15 (App Router) |
| UI | [React](https://react.dev/) 18, [TypeScript](https://www.typescriptlang.org/) 5 |
| Styling | [Tailwind CSS](https://tailwindcss.com/) 3, [framer-motion](https://www.framer.com/motion/) 11 |
| Icons | [Lucide React](https://lucide.dev/) |
| Unit Testing | [Vitest](https://vitest.dev/), [Testing Library](https://testing-library.com/) |
| E2E Testing | [Playwright](https://playwright.dev/) |

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run unit tests (watch mode) |
| `npm run test:run` | Run unit tests (single run) |
| `npm run test:e2e` | Run Playwright E2E tests |

## Project Structure

```
app/                  # Next.js App Router pages
├── record/           #   Hand recording flow
├── history/          #   Hand history browser
├── analysis/         #   Hand analysis
├── settings/         #   App settings
├── layout.tsx        #   Root layout
└── page.tsx          #   Tab navigation (Record / History)
components/           # Reusable React components
├── poker/            #   Poker-specific UI (card selectors, action buttons, etc.)
└── home/             #   Home screen components
contexts/             # React Context providers
└── HandContext.tsx    #   Global hand state management
types/                # TypeScript type definitions
└── poker.ts          #   Poker domain types (Position, Street, Action, etc.)
utils/                # Utility functions
├── pokerUtils.ts     #   Core poker logic
├── bettingUtils.ts   #   Bet sizing and validation
├── potUtils.ts       #   Pot and side pot calculation
├── storage.ts        #   LocalStorage persistence
└── recordFlowValidation.ts  # Recording flow state validation
tests/                # Test suites
├── e2e/              #   Playwright E2E tests
└── *.test.ts         #   Vitest unit tests
docs/                 # Development documentation and reports
```

## License

Private project.

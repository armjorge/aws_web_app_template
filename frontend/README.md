# Frontend

Vite + React + TypeScript + Tailwind CSS SPA, ready for static deploy to S3/CloudFront.

## Scripts

```bash
npm install
cp .env.example .env
npm run dev      # http://localhost:5173
npm run build    # output → dist/
npm run preview
```

## Structure

- `src/providers/PostHogProvider.tsx` — global analytics (no-op without key)
- `src/auth/` — Cognito SRP hooks, context, and client helpers
- `src/pages/` — Home, Login, Signup
- `src/config/env.ts` — typed env access + feature flags

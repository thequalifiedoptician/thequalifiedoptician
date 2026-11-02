# AlSera

AlSera is a full-stack e-commerce platform in foundation setup. The approved Phase 1 plan is in [the architecture blueprint](docs/architecture/phase-1-foundation.md).

## Requirements

- Node.js 20.19 or newer
- npm 11

## Local development

1. Install dependencies from the repository root with `npm install`.
2. Copy `apps/api/.env.example` to `apps/api/.env` if you need to override the API defaults.
3. Copy `apps/web/.env.example` to `apps/web/.env` only when configuring the frontend's API or Supabase client. Supabase values are not needed to start the application.
4. Run both development servers with `npm run dev`.

The web development server is available at `http://localhost:5173`; it proxies `/api` requests to the API at `http://localhost:3001`. The API health check is `http://localhost:3001/health`.

## Deployment foundation

- **Vercel:** The root `vercel.json` builds the web workspace and configures SPA route fallback. Set `VITE_API_BASE_URL` to the deployed API origin ending in `/api/v1`.
- **Render:** The root `render.yaml` builds and runs the API workspace and uses `/health` for service health checks. Set `CORS_ORIGIN` to the deployed frontend origin in the Render service environment.
- Configure Supabase project URL and publishable/anon key only when frontend code needs the client. Never add a Supabase service-role key to frontend environment variables.

### Supabase password recovery

Add the frontend callback URL `/auth/reset-password?flow=password-reset` to Supabase
Authentication’s allowed redirect URLs. For local Vite development, allow
`http://localhost:5173/auth/reset-password?flow=password-reset`; add the corresponding
production URL for the deployed frontend origin.

## Quality checks

- `npm run lint`
- `npm run format:check`
- `npm run typecheck`
- `npm run build`

Never commit local `.env` files or place private credentials in `VITE_*` variables. Only the Supabase project URL and publishable/anon key may be exposed to the browser.

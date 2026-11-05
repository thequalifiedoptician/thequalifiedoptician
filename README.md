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

### Supabase email verification

Add `/auth/verify-email?flow=email-verification` to Supabase Authentication’s allowed redirect URLs.
For local Vite development, allow
`http://localhost:5173/auth/verify-email?flow=email-verification`; add the corresponding production
URL for the deployed frontend origin. The confirmation email template must use Supabase’s
confirmation URL so the auth client can validate and exchange the link.

### Supabase Google and GitHub OAuth

Enable Google and GitHub under Supabase Authentication providers and add each provider’s OAuth
client credentials in the Supabase dashboard; never put provider secrets in `VITE_*` variables.
Set the Supabase Site URL to the frontend origin and add `<frontend-origin>/auth/login` to its
allowed redirect URLs. In each provider’s OAuth application, use the Supabase project callback URI
shown by the provider configuration, typically
`https://<project-ref>.supabase.co/auth/v1/callback`.

Apply the migration in `supabase/migrations` before enabling OAuth so the auth-user trigger creates
one `public.profiles` row per user. The table’s primary key is the auth user ID and RLS only permits
reading the signed-in user’s own profile.

### Supabase product catalog

Apply the product catalog migration in `supabase/migrations` after the profile migration. The
schema, relationships, access model, and manual verification checklist are documented in
[the product catalog database guide](docs/database/product-catalog.md). Catalog write access is
restricted to authenticated users with a trusted `app_metadata.role = "admin"` claim; never set
that claim from client-controlled user metadata.

### Admin product management

Apply `20261105160000_configure_product_image_storage.sql` after the product catalog migration.
It configures the public product image bucket with admin-only writes and installs the transactional
product save RPC. The admin workspace is available at `/admin/products` only to confirmed users
with a trusted admin claim. Setup and manual verification steps are in
[the admin product management guide](docs/database/admin-product-management.md).

## Quality checks

- `npm run lint`
- `npm run format:check`
- `npm run typecheck`
- `npm run build`

Never commit local `.env` files or place private credentials in `VITE_*` variables. Only the Supabase project URL and publishable/anon key may be exposed to the browser.

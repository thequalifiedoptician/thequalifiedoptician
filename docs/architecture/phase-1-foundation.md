# AlSera — Phase 1 Engineering Blueprint

**Status:** Planning and foundation only  
**Project type:** Modern e-commerce platform  
**Scope boundary:** This document defines product, architecture, and delivery decisions. It does not implement the application, create UI, or define executable database migrations.

## 1. Product and project plan

### Vision

AlSera is a dependable, polished online shopping experience that makes it easy to discover products, make informed purchase decisions, and manage orders. Its administrative tools should let authorized staff maintain the catalog and fulfill orders without compromising customer data or storefront performance.

### Business goal

Deliver a credible, maintainable commerce platform foundation for an internship project, with a clear path from a focused first release to additional customer and admin capabilities. Prioritize a reliable shopping and order lifecycle over breadth of features.

### User types

| User | Needs |
|---|---|
| Guest shopper | Browse, search, view products, and maintain a cart before signing in |
| Registered customer | Manage profile, wishlist, checkout, orders, and eligible reviews |
| Store administrator | Manage catalog, categories, orders, users, coupons, and store settings |
| Support/operations staff | Review customer and order information needed to resolve support requests; permissions should be narrower than full administration where practical |

### Functional requirements

1. Visitors can browse categories and product listings, search and filter the catalog, and view product details.
2. Shoppers can add, update, and remove cart items; the cart reflects current product availability and price before checkout.
3. Customers can sign up, sign in, sign out, recover access, and manage their profile.
4. Customers can maintain a wishlist and submit reviews for eligible purchased products.
5. Customers can place orders, see order status and history, and receive clear checkout and order outcomes.
6. Authorized staff can manage products, categories, orders, customers, reviews, coupons, and store settings according to their assigned permissions.
7. Administrators can view operational metrics derived from trusted order and catalog data.
8. The platform validates inputs, reports failures clearly, and records relevant operational events without logging secrets or sensitive payment data.

### Non-functional requirements

- **Security and privacy:** Least privilege, server-side authorization, validated inputs, protected credentials, and data access limited to the caller's needs.
- **Reliability:** Checkout and inventory changes must be consistent; failures must not produce falsely successful orders.
- **Performance:** Mobile-first rendering, optimized media, pagination, bounded API responses, and indexes informed by actual query patterns.
- **Accessibility:** Semantic controls, keyboard access, visible focus, sufficient contrast, and understandable validation and status messages.
- **Maintainability:** TypeScript is recommended for both application tiers; clear module boundaries, shared contracts where useful, and automated quality checks.
- **Scalability:** Stateless API instances, managed persistence, explicit versioned APIs, and measured scaling before adding infrastructure.
- **Observability:** Structured server logs, request correlation, actionable health checks, and error monitoring with sensitive data redacted.
- **Compatibility:** Responsive behavior and testing across supported current desktop and mobile browsers.

## 2. Technology decisions

| Area | Decision | Rationale and boundary |
|---|---|---|
| Frontend | React, Vite, TypeScript | Component-based storefront and admin UI with a fast development/build workflow. Use the current stable React and Vite releases when implementation begins. |
| Routing | React Router | Client-side route composition, nested layouts, and route-level access UX. This is not a substitute for API authorization. |
| Styling | Tailwind CSS | Consistent utility-based styling and responsive design tokens; keep design decisions in shared theme conventions rather than one-off values. |
| Motion | Framer Motion | Optional, restrained transitions for meaningful state changes; honor reduced-motion preferences. |
| HTTP | Axios | One configured client for the Express API, including bearer-token attachment and consistent error handling. |
| Backend | Node.js, Express.js, TypeScript | A separately deployable, stateless API for business rules, privileged operations, and integrations. |
| Database | Supabase PostgreSQL | Relational source of truth for catalog, inventory, customer commerce data, and orders. |
| Authentication | Supabase Auth | Managed identity and session lifecycle. The frontend obtains a user access token; the API verifies it and makes authorization decisions. |
| Hosting | Vercel (frontend and serverless Express API), Supabase (database/auth/storage as needed) | One deployment origin for the storefront and versioned API, with managed persistence and authentication. |
| Version control | Git and GitHub | Branch-based collaboration, pull-request review, and automated checks. |

**Additional dependency policy:** Do not add a global state library or server-state library by default. Start with React state/context for genuinely shared client state and service/hooks for API access. Reassess when measured complexity warrants another dependency.

## 3. Application architecture

### High-level structure

Use a frontend application, a versioned Express API, and Supabase-managed services:

```text
Browser
  ├─ React storefront/admin UI
  ├─ Supabase Auth client (session and token lifecycle)
  └─ Axios ── bearer token ──> Express API (/api/v1)
                                  ├─ authentication and authorization middleware
                                  ├─ route/controller/service modules
                                  └─ Supabase/PostgreSQL access
                                       ├─ catalog and customer commerce data
                                       └─ auth identity verification
```

The browser must not access privileged database credentials. Keep business rules and privileged writes behind the API. Public, read-only Supabase access may be considered later for specific use cases, but only with explicit Row Level Security (RLS) policies and a documented reason. The initial architecture uses the API as the consistent business boundary.

### Data flow

1. A route renders a page/layout and invokes a feature hook or service for the required state.
2. The service calls the configured Axios client with a typed request/response contract.
3. The API authenticates the request, validates its parameters/body, checks resource-level authorization, and invokes a domain service.
4. The domain service applies business rules and accesses Supabase/PostgreSQL through a server-side data layer.
5. The API returns a consistent success or error response. The UI presents loading, empty, success, and failure states explicitly.
6. Mutations refresh or reconcile affected client state; the database remains the source of truth for price, inventory, roles, and order status.

### Authentication and authorization flow

1. The user signs in or registers with Supabase Auth through the supported client SDK.
2. Supabase Auth issues and refreshes the session. The client stores session data using the SDK's supported mechanism; application code does not handle passwords beyond the auth operation.
3. The Axios request interceptor attaches the current access token to protected API requests.
4. Express middleware verifies the token against Supabase Auth (or a supported local JWT verification configuration) and establishes a trusted request identity.
5. Authorization middleware checks the required role and, where applicable, resource ownership. The API never trusts a role or user ID supplied only by the browser.
6. Sign-out clears the client session. Expired/invalid sessions lead to a clear re-authentication flow, not a success-shaped response.

### Routing strategy

- Keep public routes (home, catalog, product, about, and contact) separate from authenticated customer routes and admin routes.
- Use nested layouts for storefront, account, and admin navigation; lazy-load substantial route groups.
- Customer and admin guards improve navigation UX only. Every protected operation must also be authorized by the API.
- Define stable not-found and access-denied experiences as part of implementation; do not rely on hidden links for access control.
- Keep query parameters for shareable catalog state such as search, sorting, category, and pagination.

### State management strategy

- **Server-owned state:** Products, prices, stock, orders, coupons, and profile data are fetched through API services. Do not treat cached values as authoritative.
- **Session state:** A small auth context adapts Supabase Auth session events for the UI; avoid duplicating token lifecycle logic.
- **Local UI state:** Search input drafts, open menus, dialog state, and temporary form values remain local to the relevant feature.
- **Cart:** Support guest cart persistence in the browser only if needed for the chosen UX; reconcile it with the server-backed customer cart on sign-in. Validate availability and price again on the API at checkout.
- **Wishlist:** Persist for signed-in customers through the API. A guest wishlist is optional and should not block the first release.
- Avoid duplicating API data in multiple global stores. Introduce a dedicated server-state library only if invalidation, caching, or concurrency needs justify it.

### API structure

Use resource-oriented JSON endpoints under `/api/v1`, with consistent status codes and error envelopes. Example resource groups (planning names, not implementation):

| Resource group | Responsibilities |
|---|---|
| `/auth` | Session-related API needs only; identity lifecycle remains Supabase Auth-owned |
| `/products`, `/categories` | Public catalog reads and authorized catalog administration |
| `/cart`, `/wishlist` | Customer-owned shopping state |
| `/checkout`, `/orders` | Price/stock validation, order placement, and customer/admin order operations |
| `/reviews` | Review submission and moderation |
| `/coupons` | Coupon validation and admin management |
| `/admin/analytics`, `/admin/settings` | Authorized operational reporting and configuration |
| `/contact` | Validated support/contact submissions, if persisted |

Controllers translate HTTP input/output; services own business rules; data access modules own persistence details. Validate path, query, and body input at the API boundary. Use pagination and bounded filters for collection endpoints. Document contracts and error behavior before parallel frontend/backend feature work.

### Scalability and resilience

- Keep the API stateless and horizontally scalable; use managed services for identity, database, and object storage.
- Begin with a modular monolith, not microservices. Separate modules by domain and extract services only when team, deployment, or load evidence supports it.
- Use database constraints and transactions for invariants. Checkout should atomically create an order and reserve/decrement inventory; plan a PostgreSQL function or transaction-capable server-side data access path rather than a sequence of unrelated writes.
- Store product media in managed object storage (for example, Supabase Storage) and serve optimized assets; do not store binary images in relational rows.
- Add indexes based on the implemented queries and query plans. Use pagination, avoid N+1 access, and establish backups/retention appropriate to the deployment.
- Introduce caching, queues, and analytics pipelines only when a measured need exists. Do not cache personalized or inventory-sensitive data without explicit invalidation rules.

## 4. Folder responsibilities

The following is a target structure for implementation, not a request to create placeholder directories now. Keep the frontend and backend independently installable/deployable. A small root workspace may coordinate scripts and shared contracts if the team adopts a monorepo.

```text
alsera/
├── apps/
│   ├── web/
│   │   ├── public/
│   │   │   ├── images/
│   │   │   ├── icons/
│   │   │   └── fonts/
│   │   └── src/
│   │       ├── app/                 # App bootstrap, providers, route registration
│   │       ├── assets/              # Imported images, icons, and fonts
│   │       ├── components/
│   │       │   ├── ui/              # Generic, accessible primitives
│   │       │   └── shared/          # Cross-feature commerce components
│   │       ├── config/              # Validated client-safe runtime configuration
│   │       ├── constants/           # Stable UI/application constants
│   │       ├── contexts/            # Small cross-route contexts (e.g. auth)
│   │       ├── features/
│   │       │   ├── account/
│   │       │   ├── admin/
│   │       │   ├── cart/
│   │       │   ├── catalog/
│   │       │   ├── checkout/
│   │       │   ├── orders/
│   │       │   ├── reviews/
│   │       │   └── wishlist/
│   │       ├── hooks/               # Reusable hooks not owned by one feature
│   │       ├── layouts/             # Storefront, account, and admin shells
│   │       ├── lib/                 # Axios client, auth client, shared integrations
│   │       ├── routes/              # Route definitions and navigation guards
│   │       ├── services/            # API functions organized by resource/feature
│   │       ├── types/               # Client-only types and API contract imports
│   │       └── utils/               # Pure, feature-independent helpers
│   └── api/
│       └── src/
│           ├── app/                 # Express app assembly and shared setup
│           ├── config/              # Validated server configuration
│           ├── constants/
│           ├── controllers/         # HTTP request/response adapters
│           ├── middleware/          # Auth, authorization, validation, errors
│           ├── modules/             # Domain services and data access by feature
│           ├── routes/              # Versioned route registration
│           ├── types/
│           ├── utils/
│           └── validation/          # Request schemas and domain input rules
├── packages/
│   └── contracts/                   # Optional shared API types/schemas; keep dependency-light
├── supabase/
│   ├── migrations/                  # Added during implementation, not Phase 1
│   └── seed/                        # Deliberate non-production seed process, if needed
├── docs/
│   ├── architecture/
│   ├── api/
│   └── decisions/
├── config/                          # Shared lint/format/test configuration where useful
├── .env.example                     # Names and safe descriptions only; no real secrets
├── .gitignore
└── README.md
```

**Organization rules**

- Prefer feature ownership for feature-specific components, hooks, and services; promote code to shared folders only when reuse is real.
- `components/ui` contains generic controls, not product-specific business logic. Feature modules compose them.
- `layouts` own shared page chrome; `routes` own route mapping and route-level UX, not business authorization.
- `services` make HTTP requests; `utils` contain pure reusable functions. Avoid competing abstractions for the same concern.
- Backend `modules` group domain rules and persistence by bounded feature; controllers and routes remain thin.
- `public/` is for files referenced by a stable public URL; imported assets belong in `src/assets/`.
- Keep environment files out of version control except documented examples. Keep generated build output, dependency folders, and local secret files ignored.

## 5. Feature roadmap

### Customer-facing capabilities

| Feature | Planned scope |
|---|---|
| Home | Clear value proposition, curated category/catalog entry points, and accessible navigation |
| Categories | Category hierarchy, category landing pages, and active/available category filtering |
| Search | Search query, useful empty state, sorting/filtering, and shareable URL state |
| Product listing | Responsive product grid, pagination, category/filter/sort controls |
| Product details | Product information, media, price, variant/availability, and add-to-cart behavior |
| Wishlist | Add/remove and view saved products for authenticated customers |
| Cart | Review items, change quantities, remove items, show subtotal, and surface stock/price changes |
| Checkout | Validate address and cart, confirm totals, process payment through a selected provider, and create an order safely |
| Authentication | Register, sign in, sign out, recovery, and session-expiration handling through Supabase Auth |
| Orders | Confirmation, history, details, status, and appropriate cancellation/return policy behavior |
| Profile | Manage customer details and saved addresses with ownership checks |
| Reviews | Submit eligible product feedback; support moderation and reporting |
| Contact | Accessible contact information/form with input validation and spam controls |
| About | Explain the store and its policies without blocking the shopping path |

### Admin capabilities

| Feature | Planned scope |
|---|---|
| Dashboard | Operational overview with clearly defined metric windows and role-based access |
| Analytics | Sales, orders, and catalog metrics from trusted data; avoid presenting estimates as exacts |
| Products | Create, update, archive, and manage pricing, media, variants, and availability |
| Categories | Maintain category names, hierarchy, ordering, and active state |
| Orders | Review orders, update permitted fulfillment states, and preserve a status history |
| Users | Search and support customer accounts with restricted exposure of personal data |
| Reviews | Moderate, hide, or restore reviews with auditability |
| Coupons | Configure validity, discount rules, usage limits, and eligibility |
| Settings | Maintain a small, validated set of store configuration values and access controls |

## 6. Database planning (no SQL)

Use UUID primary keys for application entities unless a documented integration requirement dictates otherwise. Store currency as integer minor units with an ISO currency code; avoid floating-point monetary values. Add `created_at`/`updated_at` to mutable records and retain immutable purchase snapshots where history must not change with the catalog.

| Table | Primary key | Key foreign keys and purpose |
|---|---|---|
| `profiles` | `id` | `id` references `auth.users.id`; customer-facing profile fields, not credentials |
| `user_roles` | (`user_id`, `role`) or UUID | `user_id` references `auth.users.id`; assigns a constrained role such as customer, support, or admin |
| `addresses` | `id` | `user_id` references `profiles.id`; customer-owned address records and a default indicator |
| `categories` | `id` | Optional `parent_id` references `categories.id`; supports a tree and active/order metadata |
| `products` | `id` | Product description, status, and catalog-level information |
| `product_categories` | (`product_id`, `category_id`) | Links products to categories; use a join table if multi-category assignment is required |
| `product_variants` | `id` | `product_id` references `products.id`; SKU, option attributes, price, currency, and stock/availability |
| `product_media` | `id` | `product_id` references `products.id`; storage path/URL, alt text, and display order |
| `carts` | `id` | `user_id` references `profiles.id` (unique for an active customer cart); guest carts may remain client-side initially |
| `cart_items` | `id` | `cart_id` references `carts.id`; `variant_id` references `product_variants.id`; quantity |
| `wishlists` | `id` | `user_id` references `profiles.id` (unique per customer unless named lists are needed) |
| `wishlist_items` | (`wishlist_id`, `product_id`) | `wishlist_id` references `wishlists.id`; `product_id` references `products.id` |
| `orders` | `id` | `user_id` references `profiles.id`; status, currency, totals, address snapshot, timestamps, and external payment references |
| `order_items` | `id` | `order_id` references `orders.id`; optional `variant_id` references `product_variants.id`; immutable SKU/name/price/quantity snapshots |
| `order_status_history` | `id` | `order_id` references `orders.id`; status transitions, actor, and timestamp |
| `payments` | `id` | `order_id` references `orders.id`; provider reference, amount, currency, and payment state; never store raw card data |
| `reviews` | `id` | `product_id` references `products.id`; `user_id` references `profiles.id`; rating, text, moderation state; enforce purchase eligibility in service rules |
| `coupons` | `id` | Discount definition, validity window, limits, and active state |
| `coupon_redemptions` | `id` | `coupon_id` references `coupons.id`; `user_id` references `profiles.id`; `order_id` references `orders.id`; redemption constraints |
| `contact_messages` (optional) | `id` | Contact submission and processing state; minimize retained personal data |
| `store_settings` (optional) | `id` or key | Admin-managed values with constrained keys and audit/update metadata |

**Relationships and constraints**

- One auth identity has one profile and may have multiple assigned roles. A role assignment is not customer-editable.
- Products can belong to multiple categories through `product_categories`; a category can have one parent and many children.
- A product has one or more variants when options/SKUs require them. Cart and order lines refer to the purchased variant.
- A customer can have multiple addresses, one active cart, a wishlist, many orders, and many reviews.
- An order has one or more order items, payment records as required by the provider lifecycle, and a status history.
- Uniqueness, positive quantity, rating bounds, valid status transitions, and coupon-use limits should be enforced with appropriate database constraints and service rules.
- Use restrictive deletion or soft-archive for products/categories referenced by order history. Preserve order snapshots even when catalog records change.
- Index foreign keys and high-use lookup fields after query design; consider case-insensitive/search indexes when the chosen search behavior requires them.

### Checkout data flow

1. The API identifies the customer and loads the current cart.
2. It reloads products, variant prices, availability, coupon eligibility, and shipping/tax inputs from trusted sources.
3. It computes the total using integer minor units and an explicit currency; the browser-submitted total is never authoritative.
4. A transaction-safe operation creates the order and item snapshots and reserves/decrements inventory according to the agreed stock policy.
5. Payment is initiated/confirmed through a provider selected before implementation. Webhook events are authenticated, idempotent, and reconciled with order/payment state.
6. The customer receives confirmation only after the system reaches the defined successful order/payment state. Failure and retry behavior must be specified with the provider.

**Open business decisions before checkout implementation:** payment provider and supported currencies; shipping/tax calculation source; cancellation/refund policy; inventory reservation duration and low-stock behavior. These are product decisions, not assumptions to bury in code.

## 7. Security and privacy plan

- **Authentication:** Supabase Auth owns credentials and session lifecycle. Require appropriate account verification and recovery flows for the selected launch policy.
- **Authorization:** Enforce roles and ownership in Express middleware/services for every protected operation. Define least-privilege permissions for support and admin. UI guards are not security controls.
- **Role management:** Grant privileged roles only through trusted administrative processes. Prevent self-service role escalation. Consider an audit trail for role and sensitive admin changes.
- **Database access:** Keep service-role/database credentials on the server only. Apply RLS as defense in depth, especially if any client-side database access is ever introduced. Restrict production credentials and network access as supported by the host.
- **Environment variables:** Validate required configuration at startup. Separate local, preview, and production values. Expose only explicitly public values to Vite client builds; never put service keys, signing secrets, or private credentials in `VITE_*` variables.
- **Input validation:** Validate type, length, format, allowed values, and ownership at API boundaries. Normalize where appropriate; use parameterized database access. Escape output in rendering contexts.
- **API security:** Use HTTPS, restrictive CORS origins, safe security headers, request-size limits, rate limits on authentication/contact-sensitive endpoints, and bounded pagination. Use CSRF protections if cookie-based authentication is adopted.
- **Abuse and data handling:** Add anti-spam controls for public forms; redact tokens, passwords, payment details, and unnecessary personal data from logs. Apply retention and deletion policies appropriate to the deployment.
- **Payments:** Use a reputable hosted/tokenized payment integration. Do not store card numbers or security codes. Verify webhook signatures and make processing idempotent.
- **Operational security:** Rotate credentials, review dependency alerts, protect GitHub deployment secrets, avoid secrets in commits, and use separate least-privileged service credentials where supported.

## 8. Premium UI/UX strategy

### Design philosophy

Modern, clean, premium, minimal, fast, mobile-first, and accessible. Visual polish should support product discovery and trust rather than compete with them.

### Experience principles

- Start with mobile layouts and progressively enhance for larger screens; keep key shopping actions reachable and navigation predictable.
- Establish a restrained design system for typography, spacing, color, borders, controls, and status messages before implementing feature pages.
- Use high-quality, consistently cropped product media with meaningful alternative text; optimize formats, dimensions, and loading behavior.
- Prioritize clear product names, pricing, variant/stock status, delivery/return information, and prominent but non-aggressive purchase actions.
- Make search, filters, cart changes, form validation, and order status understandable without relying on color alone.
- Provide loading, empty, error, and success states for every meaningful data interaction. Preserve user input when recoverable.
- Use motion only for orientation or feedback, keep transitions short, and respect reduced-motion settings. Avoid decorative animation that delays content.
- Meet WCAG 2.2 AA as the target: semantic HTML, keyboard support, focus visibility, labels, contrast, accessible dialogs, and screen-reader status announcements.
- Measure user-facing performance (including Core Web Vitals) and optimize image delivery, route bundles, and third-party scripts before adding visual effects.

## 9. Development and quality standards

- Use TypeScript consistently; enable strict checks and avoid weakening types to bypass errors.
- Keep modules cohesive and functions/components focused. Prefer explicit domain language and meaningful names.
- Separate presentation, API transport, validation, and business rules. Do not duplicate pricing, permission, or checkout rules in the client.
- Use shared components for demonstrated reuse; avoid premature generic frameworks and unnecessary dependencies.
- Define formatting, linting, type-checking, and test commands and run them in local development and GitHub CI.
- Test business rules and API authorization at unit/integration level; test critical user journeys end-to-end, especially sign-in, cart, checkout, and admin order operations.
- Review changes through pull requests; require checks before merging and protect production deployment credentials.
- Keep documentation current for environment setup, architecture decisions, API contracts, database migrations, and operational procedures.
- Add database changes through reviewed, versioned migrations once implementation begins. Do not edit production schema ad hoc.

## 10. Development roadmap

Each phase should have a reviewed acceptance criterion and demonstrable output. The sequence is a recommended plan; detailed estimates depend on staffing and the selected payment/shipping policies.

| Phase | Focus | Exit criteria |
|---|---|---|
| 1. Foundation (current) | Product scope, architecture, stack, security, database plan, UX standards | Blueprint reviewed; open commerce decisions recorded; no application implementation |
| 2. Project setup | Repositories/workspace, TypeScript apps, lint/format/test/CI, environment validation, deployment skeleton | Both apps build and deploy a minimal health-checked baseline; secrets stay out of source |
| 3. Identity and access | Supabase Auth integration, profiles, roles, API token verification, authorization tests | Customer session works; unauthorized and cross-user requests are denied |
| 4. Catalog | Category/product/variant/media data, admin catalog management, storefront browse/search/detail | Catalog is manageable and browsable with validated, paginated API behavior |
| 5. Customer shopping | Cart, wishlist, account, addresses, responsive customer flows | Cart/wishlist ownership and guest-to-customer behavior are defined and tested |
| 6. Checkout and orders | Provider decision, atomic inventory/order flow, payment lifecycle, notifications as needed | Successful, failed, retried, and duplicate payment events leave consistent state |
| 7. Admin operations | Orders, users, reviews, coupons, settings, dashboard and metric definitions | Each operation is permission-checked and important changes are auditable |
| 8. Hardening and release | Accessibility, security, performance, backup/restore, monitoring, production runbook | Critical journeys pass; operational and recovery procedures are verified |

## 11. Feature delivery priority

1. **MVP:** Authentication, category/catalog browsing, product details, customer cart, checkout, payment, orders, basic profile, and admin product/category/order management.
2. **Next:** Search refinement, wishlist, reviews/moderation, coupons, saved addresses, and operational dashboard.
3. **Later, based on evidence:** Advanced analytics, personalization, richer promotions, support tooling, notifications, and additional commerce integrations.

Do not treat every listed feature as an MVP requirement. Checkout, payment, shipping, tax, inventory, and refund policies must be decided before their implementation scope can be estimated reliably.

## 12. Assumptions and decisions to confirm

- Initial release targets one storefront and one operating region unless product requirements say otherwise.
- Payment provider, currency, tax, shipping, returns/refunds, and inventory reservation policy are undecided.
- The API is the primary application data boundary; any direct browser-to-Supabase data path requires a separate RLS review.
- Role granularity starts small and can expand from customer/admin to support roles when real workflows require it.
- Analytics begins with operational summaries from transactional data; a separate analytics platform is not part of the foundation.
- The internship deliverable is expected to evolve incrementally; Phase 1 intentionally creates no application code, database SQL, UI, sample catalog, or placeholder pages.

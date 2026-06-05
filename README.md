# Korelly – Architecture & Implementation Plan

> UI adoption brief: reuse the provided dashboard shell (sidebar + header + cards + table styles) as the visual system. Replace content/logic with Korelly features. Mobile-first with slide-in drawer on small screens. No new design systems.

## Tech Stack (free-tier)
- Next.js (App Router) + TypeScript
- Tailwind CSS + ShadCN UI + Framer Motion
- TanStack React Query
- Zustand (client state)
- Next.js API routes (server)
- Postgres + Prisma ORM
- JWT auth (role-based: user, admin)
- Paystack payments + webhook verification

## Execution Order (mapped to tasks)
1) Build AppShell & UI components (no business logic)
2) Create page templates (Grid, Table, Detail, Dashboard)
3) Set up database schemas (Prisma/Postgres)
4) Implement auth & roles (JWT, protected routes)
5) Build admin features (products, orders, users, categories, payments)
6) Build store features (catalog, variants, cart/checkout, digital delivery)
7) Build data services (network/bundle purchase flow)
8) Integrate Paystack (initiate, verify, webhook)
9) Add webhooks & logs
10) Final polish (validation, loading, error states)

## Folder Structure (Next.js App Router)
```
/app
  /(shell)/layout.tsx           # AppShell with sidebar/header/drawer
  /(shell)/providers.tsx        # Theme, QueryClient, Zustand hydration
  /(shell)/globals.css          # Tailwind base, CSS vars
  /(shell)/components
    Sidebar.tsx                 # Desktop sidebar (cards, badges)
    MobileDrawer.tsx            # Slide-in on mobile
    Header.tsx                  # Search, theme toggle, profile, locale
    NavItem.tsx                 # Reusable nav link with badge
    StatCard.tsx                # Gradient cards w/ icon
    MetricGrid.tsx              # Responsive card grid
    TableCard.tsx               # Table wrapper + mobile stacked rows
    RightPanel.tsx              # Optional desktop-only panel
  /(templates)
    DashboardLayout.tsx
    GridLayout.tsx
    TableLayout.tsx
    DetailLayout.tsx
  /dashboard/page.tsx           # Welcome, KPIs, charts placeholders
  /shop/page.tsx                # Product listing (cards, filters)
  /shop/[slug]/page.tsx         # Product detail (variants, stock)
  /cart/page.tsx                # Cart + checkout summary
  /orders/page.tsx              # User orders table
  /data/page.tsx                # Buy Data flow (select network/bundle)
  /request-design/page.tsx      # Informational CTA (WhatsApp/Telegram)
  /admin/
    dashboard/page.tsx
    products/page.tsx
    orders/page.tsx
    users/page.tsx
    categories/page.tsx
    payments/page.tsx           # Paystack logs
    settings/page.tsx
  /api/
    auth/login/route.ts
    auth/register/route.ts
    auth/refresh/route.ts
    auth/profile/route.ts
    products/route.ts           # GET list, POST create (admin)
    products/[id]/route.ts      # GET, PATCH, DELETE (admin)
    categories/route.ts
    categories/[id]/route.ts
    orders/route.ts             # GET (admin/user scoped), POST create
    orders/[id]/route.ts        # PATCH status (admin), GET detail
    payments/paystack/initiate/route.ts
    payments/paystack/verify/route.ts
    payments/paystack/webhook/route.ts
    data/bundles/route.ts       # List bundles by network
    data/purchase/route.ts      # Initiate bundle purchase
/lib
  db.ts                         # Prisma client singleton
  auth.ts                       # JWT sign/verify, role guard
  rbac.ts                       # Role-based access helpers
  validators.ts                 # Zod schemas for payloads
  paystack.ts                   # Client for init/verify, webhook signature
  response.ts                   # ApiResponse helpers
  pagination.ts                 # Cursor/limit helpers
/prisma
  schema.prisma                 # Postgres models & relations
/types                          # Shared TypeScript types
/components/ui                  # ShadCN-wrapped primitives
/hooks
  useMobileDrawer.ts
  useSidebarNav.ts
  useCartStore.ts (Zustand)
  useToast.ts
/store                          # Zustand stores (cart, theme prefs)
/utils                          # formatters (currency, date)
/public                         # assets/icons
/tailwind.config.ts
/postcss.config.js
/env.d.ts
```

## UI Components (adopted from reference)
- **AppShell**: Sidebar + Header + Main + optional RightPanel. On mobile, sidebar becomes slide-in drawer; header keeps search/theme/profile. Cards use soft gradients and rounded corners; hover elevation via Framer Motion.
- **Navigation**: NavItem with icon + label + optional badge (for alerts/new). Active state matches reference.
- **StatCard / MetricGrid**: KPI cards with icon bubble, delta pill, and sparkline placeholder.
- **TableCard**: Desktop table; mobile renders stacked rows with key/value pairs. Includes toolbar (filters, search). Skeleton loaders for fetching states.
- **Filters**: Modal/bottom-sheet on mobile; inline row on desktop.
- **Buttons**: Touch-friendly spacing; primary/ghost variants consistent with reference colors.
- **Sticky actions**: On mobile cart/checkout, sticky bottom summary + pay CTA.

## Page Templates
- **DashboardLayout**: Hero welcome + KPI cards + two lower panels (visits vs orders/messages).
- **GridLayout**: Responsive cards for products/categories with CTA buttons.
- **TableLayout**: Title + toolbar + responsive table/stacked cards.
- **DetailLayout**: Media gallery, variant selector, price, stock, add-to-cart/buy.

## Database Schemas (Prisma / Postgres)
```prisma
model User {
  id          String   @id @default(cuid())
  email       String   @unique
  passwordHash String
  role        Role     @default(USER)
  name        String
  phone       String?
  addresses   Json?
  orders      Order[]
  createdAt   DateTime @default(now())
}

model Category {
  id          String    @id @default(cuid())
  name        String
  slug        String    @unique
  parentId    String?
  parent      Category? @relation("CategoryChildren", fields: [parentId], references: [id])
  children    Category[] @relation("CategoryChildren")
  products    Product[]
}

model Product {
  id          String     @id @default(cuid())
  name        String
  slug        String     @unique
  categoryId  String
  category    Category   @relation(fields: [categoryId], references: [id])
  price       Decimal
  salePrice   Decimal?
  stock       Int
  variants    Json?
  media       Json?
  type        ProductType
  digitalUrl  String?
  specs       Json?
  active      Boolean    @default(true)
  orders      OrderItem[]
}

model Order {
  id          String      @id @default(cuid())
  userId      String
  user        User        @relation(fields: [userId], references: [id])
  items       OrderItem[]
  total       Decimal
  status      OrderStatus @default(PENDING)
  payment     Payment?
  deliveryInfo Json?
  createdAt   DateTime    @default(now())
}

model OrderItem {
  id         String   @id @default(cuid())
  orderId    String
  order      Order    @relation(fields: [orderId], references: [id])
  productId  String
  product    Product  @relation(fields: [productId], references: [id])
  variant    Json?
  qty        Int
  price      Decimal
}

model Payment {
  id         String        @id @default(cuid())
  orderId    String        @unique
  order      Order         @relation(fields: [orderId], references: [id])
  provider   String        @default("paystack")
  reference  String        @unique
  amount     Decimal
  currency   String        @default("GHS")
  status     PaymentStatus @default(INITIATED)
  meta       Json?
  createdAt  DateTime      @default(now())
}

model PaystackEvent {
  id                String   @id @default(cuid())
  reference         String
  event             String
  payload           Json
  verifiedSignature Boolean   @default(false)
  receivedAt        DateTime  @default(now())
}

model DataBundle {
  id       String   @id @default(cuid())
  network  Network
  name     String
  price    Decimal
  volume   String
  validity String
}

model DesignRequest {
  id        String   @id @default(cuid())
  name      String
  contact   String
  channel   Channel
  message   String?
  createdAt DateTime @default(now())
}

enum Role {
  USER
  ADMIN
}

enum ProductType {
  PHYSICAL
  DIGITAL
}

enum OrderStatus {
  PENDING
  PAID
  SHIPPED
  DELIVERED
  CANCELED
}

enum PaymentStatus {
  INITIATED
  SUCCESS
  FAILED
}

enum Network {
  mtn
  telecel
  airteltigo
}

enum Channel {
  whatsapp
  telegram
}
```

## API Routes (high level)
- **Auth**: `/api/auth/login`, `/register`, `/refresh`, `/profile` (JWT, httpOnly cookie).
- **Catalog**: `/api/products` (list/create), `/api/products/[id]` (read/update/delete), `/api/categories`.
- **Orders**: `/api/orders` (create from cart; GET scoped by role), `/api/orders/[id]` (detail, status update admin-only).
- **Payments/Paystack**: `/api/payments/paystack/initiate` (creates Payment + returns auth URL), `/verify` (confirm reference), `/webhook` (signature check + status update + log PaystackEvent).
- **Data Services**: `/api/data/bundles` (list by network), `/api/data/purchase` (initiate Paystack for bundle + mark order type `data`).
- **Design CTA**: `/api/design-request` (store submissions; no checkout).

## Auth & RBAC
- JWT signed with `JWT_SECRET`, issued on login/registration; stored httpOnly cookie.
- Middleware guard (server) checks token, injects user/role; client hooks redirect if missing.
- Roles: `user` (self data), `admin` (full management).

## Paystack Setup
- Env: `DATABASE_URL`, `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`, `PAYSTACK_WEBHOOK_SECRET` (for signature).
- Optional env: `PAYSTACK_CALLBACK_BASE_URL` to force callback origin (recommended for Vercel preview/custom domain consistency).
- Initiate: create Payment doc with `status='initiated'`, call Paystack initialize, return `authorization_url` + `reference`.
- Verify: call Paystack verify, update Payment + Order status to `paid` on success.
- Webhook: validate signature, log PaystackEvent, idempotently update Payment/Order.

## .env Example
```
DATABASE_URL=postgresql://user:password@localhost:5432/boss_market
JWT_SECRET=supersecretjwt
PAYSTACK_PUBLIC_KEY=pk_test_xxx
PAYSTACK_SECRET_KEY=sk_test_xxx
PAYSTACK_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_APP_URL=http://localhost:3000
PAYSTACK_CALLBACK_BASE_URL=http://localhost:3000
```

## Seed Data (sample)
```json
{
  "categories": [
    {"name": "Accessories", "slug": "accessories"},
    {"name": "Phone Accessories", "slug": "phone-accessories", "parent": "accessories"},
    {"name": "Digital Products", "slug": "digital-products"}
  ],
  "products": [
    {
      "name": "MagSafe Charger",
      "slug": "magsafe-charger",
      "category": "phone-accessories",
      "price": 59.99,
      "stock": 120,
      "type": "physical",
      "variants": [{"name": "Color", "options": ["White", "Black"]}],
      "media": ["/img/magsafe.png"],
      "specs": {"warranty": "12m"}
    },
    {
      "name": "E-book: Growth Playbook",
      "slug": "growth-playbook-ebook",
      "category": "digital-products",
      "price": 19,
      "stock": 9999,
      "type": "digital",
      "digitalUrl": "https://download.example.com/growth.pdf",
      "media": ["/img/ebook.png"]
    }
  ],
  "dataBundles": [
    {"network": "mtn", "name": "1.5GB Daily", "price": 10, "volume": "1.5GB", "validity": "1 day"},
    {"network": "airteltigo", "name": "10GB Weekly", "price": 45, "volume": "10GB", "validity": "7 days"}
  ]
}
```

## Setup Guide
1) Create app: `npx create-next-app@latest boss-market --ts --app --tailwind`
2) Install deps: `npm i @tanstack/react-query zustand @prisma/client prisma pg jsonwebtoken zod paystack-sdk framer-motion` and ShadCN UI per docs.
3) Copy folder structure above into `/app`, `/lib`, `/models`, `/components`.
4) Configure Tailwind + shadcn (theme tokens matching reference gradients, card radii, spacing).
5) Implement AppShell layout and wrap all routes with providers.
6) Add templates (DashboardLayout, GridLayout, TableLayout, DetailLayout) and wire sample content.
7) Configure Prisma + Postgres (`prisma init --datasource-provider postgresql`), update `/prisma/schema.prisma`, run `npx prisma migrate dev` to generate client.
8) Build auth API routes; add middleware for protected pages and role guards.
9) Implement catalog/orders/payment/data APIs with validation + error handling.
10) Integrate Paystack initiate/verify/webhook; test webhook with a tunnel (e.g., `ngrok http 3000`).
11) Add skeleton loaders, empty states, and responsive table->card behavior.
12) Final QA on mobile (no horizontal scroll; sticky cart actions) and desktop.

## Notes
- Keep layout faithful to reference: sidebar widths, card radius, gradient fills, badge styles.
- Use Framer Motion for subtle fade/slide on page/card load; hover elevation for cards/buttons.
- Filters become modal/bottom-sheet on mobile; inline on desktop.
- No checkout on Request Design page—CTA buttons open WhatsApp/Telegram links.
- Digital products: deliver via secure link post-payment (signed URL placeholder).

## Next Steps
- Stand up Next.js project and scaffold AppShell + templates.
- Implement auth and database connectors.
- Wire Paystack flows and webhook logging.
- Populate seed data and run initial QA.

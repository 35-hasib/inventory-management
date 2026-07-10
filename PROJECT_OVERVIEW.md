# Project Overview

**Inventory Management** is a multi-tenant SaaS application for small and mid-size
businesses to manage stock, sales, purchases, invoicing, and reporting. Each
company that signs up gets an isolated workspace — all data is separated by
`companyId` so tenants never see each other's records.

---

## What it does

- **Authentication & roles** — email/password login with JWT; `ADMIN` and
  `EMPLOYEE` roles.
- **Catalog** — products organized into categories, with SKU, pricing, stock
  levels, images, and low-stock thresholds.
- **Contacts** — suppliers and customers.
- **Purchases** — record incoming stock; totals and stock counts update automatically.
- **Sales** — record outgoing stock; generates an invoice and adjusts inventory.
- **Inventory audit** — every stock change is logged as a `StockMovement`
  (purchase, sale, adjustment, return, initial).
- **Invoices** — auto-numbered per company, downloadable as **PDF**.
- **Reports** — sales, purchases, inventory valuation, and profit & loss, with
  **Excel** and **PDF** export.
- **Notifications** — automatic low-stock / out-of-stock alerts via a scheduled job.
- **Subscriptions** — Free / Basic / Premium plans with per-plan limits on users
  and products.

---

## Technology stack

### Backend (`/backend`)

| Purpose | Technology |
|---------|------------|
| Runtime | Node.js |
| Web framework | Express 5 |
| Database | PostgreSQL |
| ORM / migrations | Prisma 6 (`@prisma/client`) |
| Authentication | JSON Web Tokens (`jsonwebtoken`) |
| Password hashing | `bcryptjs` |
| Validation | `zod` |
| Security | `helmet`, `cors`, `express-rate-limit` |
| File uploads | `multer` (product images) |
| PDF generation | `pdfmake` |
| Excel generation | `exceljs` |
| Scheduled jobs | `node-cron` (low-stock checks) |
| Config | `dotenv` |

### Frontend (`/frontend`)

| Purpose | Technology |
|---------|------------|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI library | React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| Icons | `lucide-react` |
| Charts | `recharts` |
| Class utilities | `clsx` |

---

## Architecture

```
┌──────────────────────┐         HTTPS / JSON          ┌──────────────────────┐
│   Next.js frontend   │  ───────────────────────────▶ │   Express REST API   │
│  (React, Tailwind)   │  ◀─────────────────────────── │   (/api/v1/...)      │
└──────────────────────┘        JWT in header          └──────────┬───────────┘
                                                                    │ Prisma
                                                                    ▼
                                                          ┌──────────────────┐
                                                          │   PostgreSQL     │
                                                          └──────────────────┘
```

- The frontend is a single-page dashboard that calls the API at
  `NEXT_PUBLIC_API_URL` and stores the JWT to authenticate requests.
- The API is organized into **feature modules** under `backend/src/modules/`
  (auth, products, categories, suppliers, customers, purchases, sales, inventory,
  invoices, reports, notifications, subscriptions, dashboard, users, companies).
- Cross-cutting concerns live in `backend/src/middleware/` (authentication,
  role checks, plan limits, validation, uploads, error handling).

### Backend structure

```
backend/
├── server.js                 # entry point, starts HTTP server + cron jobs
├── prisma/
│   ├── schema.prisma         # data model (single source of truth)
│   ├── migrations/           # generated SQL migrations
│   └── seed.js               # seeds the 3 subscription plans
└── src/
    ├── app.js                # Express app: middleware, routes, error handler
    ├── config/               # env + Prisma client
    ├── middleware/           # auth, roles, validation, uploads, errors
    ├── modules/<feature>/    # routes + services per feature
    ├── routes/index.js       # mounts all module routers under /api/v1
    ├── jobs/                 # cron jobs (low-stock notifications)
    └── utils/                # jwt, password, pdf, excel, pagination, etc.
```

### Frontend structure

```
frontend/src/
├── app/
│   ├── (auth)/               # login, register pages
│   ├── (dashboard)/          # dashboard, products, sales, reports, ... pages
│   └── layout.tsx            # root layout
├── components/
│   ├── ui/                   # Button, Card, Input, Modal, Table, Toast, ...
│   ├── layout/               # Sidebar, Topbar
│   └── charts/               # recharts wrappers
└── lib/                      # api client, auth context, formatters, types
```

---

## Data model (main entities)

- **Company** — the tenant root; owns everything.
- **User** — belongs to a company; `ADMIN` or `EMPLOYEE`.
- **Category → Product** — catalog; product tracks `quantity`, `costPrice`,
  `sellPrice`, `lowStockThreshold`.
- **Supplier / Customer** — contacts.
- **Purchase → PurchaseItem** — incoming stock.
- **Sale → SaleItem → Invoice** — outgoing stock + invoicing.
- **StockMovement** — append-only audit of every quantity change.
- **SubscriptionPlan / Subscription / Payment** — billing.
- **Notification** — alerts (low stock, subscription, payment, system).

The full schema is in [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma).

---

## API surface

All routes are versioned under `/api/v1`. Public routes: `/auth/*` and
`GET /subscriptions/plans`. Everything else requires a valid JWT (Bearer token).
Health check: `GET /health`.

For local setup and running instructions, see [`README.md`](README.md).
For deployment (Render + Vercel), see [`DEPLOYMENT.md`](DEPLOYMENT.md).

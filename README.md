# Inventory Management

Multi-tenant inventory management SaaS. Node.js/Express + Prisma (PostgreSQL) API and a Next.js dashboard.

## Features

- JWT auth, multi-tenant companies, ADMIN / EMPLOYEE roles
- Products, categories, suppliers, customers
- Purchases and sales with automatic stock movements and audit trail
- Auto-generated invoices with PDF download
- Reports (sales, purchases, inventory, profit & loss) with Excel/PDF export
- Low-stock notifications (cron) and subscription plans (Free / Basic / Premium)

## Prerequisites

- Node.js 18+
- PostgreSQL 14+

## Backend setup

```bash
cd backend
npm install

# Configure the DB connection in .env (DATABASE_URL, JWT_SECRET, etc.)
# The DATABASE_URL user must own its database (Postgres 15+ needs schema privileges).

npx prisma migrate dev   # create schema
npm run seed             # seed subscription plans
npm run dev              # start API on http://localhost:5000
```

Health check: `GET http://localhost:5000/health`

## Frontend setup

```bash
cd frontend
npm install
# .env.local -> NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
npm run dev              # start UI on http://localhost:3000
```

## Production build

```bash
# frontend
npm run build && npm run start
# backend
npm start
```

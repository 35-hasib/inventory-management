# Deployment Guide — Render (backend) + Vercel (frontend)

This guide deploys the **backend API** to [Render](https://render.com) with a
managed PostgreSQL database, and the **frontend** to [Vercel](https://vercel.com).

## Order of operations (important)

The two services reference each other's URLs, so follow this order:

1. Create the **PostgreSQL** database on Render.
2. Deploy the **backend** on Render.
3. Deploy the **frontend** on Vercel (needs the backend URL).
4. Go back and set the backend's `CLIENT_URL` to the Vercel URL (needed for CORS),
   then redeploy the backend.

Push your code to a GitHub repository first — both platforms deploy from GitHub.

---

## Part 1 — PostgreSQL database on Render

1. In the Render dashboard: **New → Postgres**.
2. Give it a name (e.g. `inventory-db`), pick a region and the Free plan (or paid).
3. Click **Create Database** and wait until it's available.
4. Open the database page and copy the **Internal Database URL** — you'll use it as
   `DATABASE_URL` for the backend (use *Internal* since the API runs inside Render).

> Render's managed Postgres user **owns** its database, so Prisma migrations run
> without the schema-permission issues you can hit on a local Postgres.

---

## Part 2 — Backend on Render

1. **New → Web Service**, connect your GitHub repo.
2. Configure:
   - **Root Directory:** `backend`
   - **Runtime:** Node
   - **Build Command:**
     ```
     npm install && npx prisma generate && npx prisma migrate deploy
     ```
   - **Start Command:**
     ```
     npm start
     ```
3. Add **Environment Variables** (Advanced → Add Environment Variable):

   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | *(Internal Database URL from Part 1)* |
   | `JWT_SECRET` | a long random string (e.g. `openssl rand -base64 48`) |
   | `JWT_EXPIRES_IN` | `7d` |
   | `NODE_ENV` | `production` |
   | `CLIENT_URL` | `http://localhost:3000` *(temporary — updated in Part 4)* |

   > Don't set `PORT` — Render provides it automatically, and the app already reads
   > `process.env.PORT`.

4. Click **Create Web Service**. The first deploy runs the migrations automatically
   (via `prisma migrate deploy` in the build command).

5. **Seed the subscription plans once.** Open the service's **Shell** tab and run:
   ```
   npm run seed
   ```
   (Safe to run again — it upserts.)

6. When the deploy is live, note your backend URL, e.g.
   `https://inventory-api.onrender.com`. Verify it:
   - `https://inventory-api.onrender.com/health` → `{"status":"ok"}`

### ⚠️ Backend gotchas on Render

- **Free tier sleeps.** After ~15 min of inactivity the service spins down; the next
  request takes ~30–60s to wake. Fine for demos; use a paid instance for production.
- **Uploaded images don't persist.** Product image uploads go to the local
  `/uploads` folder via `multer`, and Render's disk is **ephemeral** — files are lost
  on every redeploy/restart. For production, switch uploads to object storage
  (Cloudinary, AWS S3, Cloudflare R2) or attach a Render Persistent Disk.

---

## Part 3 — Frontend on Vercel

1. In Vercel: **Add New → Project**, import the same GitHub repo.
2. Configure:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Next.js (auto-detected)
   - Build/Output settings: leave as defaults.
3. Add an **Environment Variable**:

   | Key | Value |
   |-----|-------|
   | `NEXT_PUBLIC_API_URL` | `https://inventory-api.onrender.com/api/v1` |

   > Use *your* backend URL from Part 2, and keep the `/api/v1` suffix.
   > `NEXT_PUBLIC_` variables are read at **build time**, so if you change this later
   > you must **redeploy** the frontend.

4. Click **Deploy**. When it finishes, note your frontend URL, e.g.
   `https://inventory-app.vercel.app`.

---

## Part 4 — Connect the two (CORS)

The backend only accepts browser requests from the origin in `CLIENT_URL`.

1. In Render → your backend service → **Environment**, set:
   ```
   CLIENT_URL = https://inventory-app.vercel.app
   ```
   Use your exact Vercel URL, **no trailing slash**.
2. Save — Render redeploys automatically.
3. Open your Vercel URL, register a company, and log in. You're live. 🎉

---

## Custom domains (optional)

- **Vercel:** Project → Settings → Domains → add your domain. After it's active,
  update the backend `CLIENT_URL` to the custom domain and redeploy.
- **Render:** Service → Settings → Custom Domains. Then update the frontend
  `NEXT_PUBLIC_API_URL` to the new backend domain and redeploy the frontend.

---

## Troubleshooting

| Symptom | Likely cause / fix |
|---------|--------------------|
| Login/requests fail with a CORS error in the browser console | `CLIENT_URL` on Render doesn't exactly match the Vercel origin (check for trailing slash / http vs https). |
| Frontend calls `localhost:5000` in production | `NEXT_PUBLIC_API_URL` wasn't set, or the frontend wasn't redeployed after setting it. |
| First request after idle is very slow | Render free tier cold start — expected; upgrade to a paid instance. |
| `relation "..." does not exist` errors | Migrations didn't run — confirm `prisma migrate deploy` is in the build command and re-deploy. |
| No subscription plans show up | Run `npm run seed` in the Render Shell (Part 2, step 5). |
| Uploaded product images disappear | Ephemeral disk — move uploads to external object storage (see gotchas). |

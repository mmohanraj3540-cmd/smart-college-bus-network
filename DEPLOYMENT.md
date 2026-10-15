# Smart College Bus Network - Deployment Guide

This guide details how to deploy the Smart College Bus Network as **one public website** containing the **Admin**, **Driver**, and **Student** portals.

---

## 1. System Architecture

The project is structured into:
* **Public Frontend (Single Website):** Built with React + TypeScript + Vite. Served on a single public URL (e.g., `https://smart-bus.vercel.app`) with client-side role-based routing:
  * `/admin` – Transport Manager & Fleet Oversight
  * `/driver` – Driver Live Telemetry & Trip Console
  * `/student` – Student Live Map & Alternative Bus Recommendations
  * `/login` – Unified authentication portal
* **Backend API & Real-time WebSockets:** FastAPI application deployed on a cloud web service (e.g., `https://smart-bus-backend.onrender.com`), exposing `/api` endpoints and `wss://...` WebSockets for live bus GPS coordinates.
* **Database Layer:** Configurable via `DATABASE_URL` (SQLite, PostgreSQL, or MySQL).

---

## 2. Recommended Free Hosting Options

### Option A: Distributed Free Cloud (Recommended for Demos)
* **Frontend:** **Vercel** or **Netlify** (100% Free Tier)
  * Instant global CDN, automatic HTTPS, SPA routing (`vercel.json` and `_redirects` included).
  * URL: `https://your-bus-app.vercel.app`
* **Backend:** **Render** (Free Web Service) or **Railway**
  * Supports Python / FastAPI and WebSockets (`wss://`) natively.
  * Start command: `uvicorn app.main:app --host 0.0.0.0 --port 10000`
* **Database Persistence Note (Crucial):**
  * Free PaaS containers (such as Render Free Tier) use **ephemeral disks**. Any local SQLite file (`sql_app.db`) stored inside the container will reset whenever the container restarts or sleeps.
  * **Solution for Permanent Persistence:** Use a free managed PostgreSQL database (e.g., **Supabase** or **Neon.tech** or **Render PostgreSQL**).
    * Set `DATABASE_URL=postgresql://<user>:<password>@<host>:5432/<dbname>` in your backend environment variables.
    * The backend already includes `psycopg2-binary` and automatically creates all tables on startup.

---

### Option B: Single Virtual Server / VPS (All-in-One)
* **Host:** AWS EC2 (Free Tier eligible), DigitalOcean Droplet ($4–$6/mo), or Oracle Cloud Free VM.
* **How it works:**
  * Build the frontend with `npm run build` and let Nginx serve the `dist/` directory on port 80/443.
  * Run FastAPI in the background (via systemd or Docker) on `localhost:8000`.
  * Nginx proxies `/api` and `/ws` to `localhost:8000`.
  * **SQLite Database:** The local SQLite file (`sql_app.db`) is safely persisted on the server's permanent filesystem without external database costs.
  * **Result:** Single unified domain for everything (e.g. `https://bus.yourcollege.edu`).

---

## 3. Environment Variables Reference

### Frontend (`frontend/.env`)
| Variable | Description | Example (Production) | Local Default |
| :--- | :--- | :--- | :--- |
| `VITE_API_URL` | Base URL of deployed FastAPI backend | `https://smart-bus-backend.onrender.com/api` | `http://localhost:8000/api` |
| `VITE_WS_URL` | *(Optional)* WebSocket URL for live GPS updates | `wss://smart-bus-backend.onrender.com` | Derived from `VITE_API_URL` |

### Backend (`backend/.env`)
| Variable | Description | Example (Production) | Default |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | Database connection string | `postgresql://user:pass@host:5432/bus_db` | `sqlite:///./sql_app.db` |
| `CORS_ORIGINS` | Allowed frontend origins (comma-separated or JSON) | `https://smart-bus.vercel.app,http://localhost:5173` | `*` |
| `JWT_SECRET` | Secret key used to sign JWT session tokens | `<generate-secure-random-string>` | Dev secret |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token expiration duration | `10080` (7 days) | `10080` |
| `GPS_UPDATE_INTERVAL` | Driver GPS transmission interval (ms) | `7000` | `7000` |

---

## 4. Step-by-Step Deployment Instructions

### Step 1: Deploy the Backend
1. Push your repository to GitHub.
2. Sign up on **Render.com** (or Railway).
3. Create a **New Web Service**:
   * **Root Directory:** `backend`
   * **Environment:** `Python 3`
   * **Build Command:** `pip install -r requirements.txt`
   * **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. In the service **Environment Variables**, add:
   * `DATABASE_URL`: Your database connection string (PostgreSQL URL or default SQLite).
   * `CORS_ORIGINS`: Your frontend public URL (e.g. `https://smart-bus.vercel.app`).
   * `JWT_SECRET`: A secure random string.
5. Deploy and note your public backend URL (e.g. `https://smart-bus-backend.onrender.com`).
6. *(Optional Initial Seeding)*: Run `python app/seed/seed_data.py` via the Render Shell console to populate demo accounts and routes.

### Step 2: Deploy the Frontend
1. Sign up on **Vercel.com** (or Netlify).
2. Import the same GitHub repository:
   * **Framework Preset:** `Vite`
   * **Root Directory:** `frontend`
   * **Build Command:** `npm run build`
   * **Output Directory:** `dist`
3. In **Environment Variables**, add:
   * `VITE_API_URL`: `https://your-backend-service.onrender.com/api`
4. Click **Deploy**. Your single public website is live!

---

## 5. Post-Deployment Verification

1. **Health Check:** Open `https://<backend-url>/` in browser; verify response: `{"message":"Welcome to Smart College Bus Network API"}`.
2. **Swagger Docs:** Check `https://<backend-url>/docs`.
3. **Public Frontend:** Open `https://<frontend-url>/login`.
4. **Test Role Logins:**
   * **Admin:** `admin@demo.com` / `password` (Checks fleet stats & bus assignments)
   * **Driver:** `driver05@demo.com` / `password` (Starts trip & streams GPS)
   * **Student:** `student@demo.com` / `password` (Connects to live map via `wss://` and tracks Bus 05)

# Production Deployment Guide — Office Expanse

This guide details how to deploy **Office Expanse** (React/Vite Frontend + Express/Prisma Backend) to real-time production environments.

---

## Architecture Overview

- **Frontend**: React 19 + TypeScript + Vite + TailwindCSS + Lucide Icons + React Query.
- **Backend**: Node.js + Express 5 + Prisma ORM + JWT Auth + Cookie Session + Helmet Security.
- **Database**: PostgreSQL (Production recommended) or SQLite (Local container fallback).

---

## Option 1: Containerized Deployment (Docker & Docker Compose) — Recommended for VPS / AWS / DigitalOcean

### Prerequisites
- Docker & Docker Compose installed on target server.

### Quick Start Command
Run from project root directory:
```bash
docker compose up -d --build
```

### What this does:
1. Spins up a PostgreSQL 16 database container with volume persistence.
2. Builds & launches the Express backend container, runs Prisma database migrations, and exposes port 5000.
3. Builds the React SPA and serves it through Nginx on port 80 with proxying for `/api` and `/uploads`.

---

## Option 2: Cloud Deployment (Vercel Frontend + Render Backend) — Recommended for Free Hosting

### 1. Deploy Backend & PostgreSQL on Render
1. Push your repository to GitHub.
2. Sign into [Render.com](https://render.com).
3. Click **New +** -> **Blueprint**.
4. Connect your repo — Render will read `render.yaml` and create:
   - PostgreSQL Database
   - Backend Web Service
5. Copy the deployed Backend Service URL (e.g. `https://office-expanse-backend.onrender.com`).
6. Set Environment Variable in Backend Web Service:
   - `FRONTEND_URL`: `https://office-expanse-frontend.vercel.app` (your Vercel app domain).

### 2. Deploy Frontend on Vercel
1. Sign into [Vercel.com](https://vercel.com).
2. Click **Add New Project** and select your GitHub repo.
3. Set **Root Directory** to `frontend`.
4. Environment Variables:
   - `VITE_API_BASE_URL`: `https://office-expanse-backend.onrender.com/api`
5. Click **Deploy**. Vercel will automatically build the SPA using `vercel.json`.

---

## Option 3: Unified Single-Server Deployment (Node.js + Static Frontend)

If hosting on a single Node.js host (Heroku, Railway, single EC2 instance):

1. Build frontend assets:
   ```bash
   cd frontend
   npm run build
   ```
2. In `backend/.env`, set:
   ```env
   SERVE_FRONTEND=true
   ```
3. Start backend:
   ```bash
   cd backend
   npm start
   ```
The backend will automatically serve `/api` routes and fall back to serving the React frontend `index.html` for all browser routes on port 5000!

---

## Production Environment Checklist

Before making live to real users, verify your `.env` settings:

- [ ] **JWT_SECRET**: Unique string (min 32 characters).
- [ ] **JWT_REFRESH_SECRET**: Unique string (min 32 characters).
- [ ] **DATABASE_URL**: Production PostgreSQL connection string with SSL.
- [ ] **FRONTEND_URL**: Production HTTPS domain(s).
- [ ] **COOKIE_SECURE**: Set to `true` on HTTPS environments.
- [ ] **SMTP Email**: Valid SMTP credentials for sending password reset emails.

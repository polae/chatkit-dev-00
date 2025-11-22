# Cupid-Simple: Vercel + Railway Deployment Guide

Quick deployment guide for Cupid-Simple using Vercel (frontend) and Railway (backend) - the simplest and lowest-cost option.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Deploy Backend to Railway](#deploy-backend-to-railway)
4. [Deploy Frontend to Vercel](#deploy-frontend-to-vercel)
5. [Environment Variables](#environment-variables)
6. [Testing](#testing)
7. [Custom Domain Setup](#custom-domain-setup)
8. [Monitoring](#monitoring)
9. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
Frontend (Vercel CDN) → Backend (Railway)
     ↓                      ↓
  Static files         Python + FastAPI
  Free tier            $5 free credit/month
```

**Cost:** $0-5/month for low traffic

**Benefits:**
- Automatic HTTPS on both platforms
- Auto-deploy on git push
- Zero server management
- Global CDN (Vercel)
- Fastest setup time (~30 minutes)

---

## Prerequisites

- GitHub account
- Railway account (sign up at railway.app)
- Vercel account (sign up at vercel.com)
- OpenAI API key

---

## Deploy Backend to Railway

### Step 1: Sign Up for Railway

1. Go to [railway.app](https://railway.app)
2. Click "Start a New Project"
3. Sign in with GitHub

### Step 2: Create New Project

1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Connect your GitHub account if not already connected
4. Select repository: `chatkit-dev-00`

### Step 3: Configure Backend Service

1. **Root Directory:**
   - Click "Settings" → "Service Settings"
   - Set **Root Directory**: `apps/cupid-simple/backend`

2. **Environment Variables:**
   - Click "Variables" tab
   - Add variable:
     ```
     OPENAI_API_KEY = your_openai_api_key_here
     ```

3. **Deploy:**
   - Railway auto-detects Python and starts building
   - Wait for deployment to complete (~2-3 minutes)

### Step 4: Get Backend URL

1. Go to "Settings" → "Networking"
2. Click "Generate Domain"
3. Copy the URL (e.g., `https://cupid-backend-production.up.railway.app`)
4. Save this URL - you'll need it for Vercel!

### Step 5: Test Backend

```bash
# Test health endpoint
curl https://your-backend.up.railway.app/health

# Should return:
# {"status":"healthy","service":"cupid-backend"}
```

---

## Deploy Frontend to Vercel

### Step 1: Sign Up for Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "Sign Up"
3. Sign up with GitHub

### Step 2: Import Project

1. Click "Add New..." → "Project"
2. Import your GitHub repository: `chatkit-dev-00`
3. Vercel will detect it's a monorepo

### Step 3: Configure Frontend

1. **Framework Preset:** Vite (auto-detected)

2. **Root Directory:**
   - Click "Edit" next to Root Directory
   - Enter: `apps/cupid-simple/frontend`

3. **Build Settings:**
   - Build Command: `npm run build` (default)
   - Output Directory: `dist` (default)
   - Install Command: `npm install` (default)

4. **Environment Variables:**
   Click "Environment Variables" and add:
   ```
   Name: VITE_CHATKIT_API_URL
   Value: https://your-backend.up.railway.app/chatkit
   ```

   Replace `your-backend.up.railway.app` with your Railway backend URL!

5. **Click "Deploy"**

### Step 4: Wait for Deployment

- First deployment takes ~2-3 minutes
- Vercel will show build logs
- When complete, you'll get a URL like: `https://chatkit-dev-00.vercel.app`

### Step 5: Test Frontend

1. Click the deployment URL
2. You should see the Cupid app
3. Click "Play" to test the game
4. Verify ProfileCards appear

---

## Environment Variables

### Backend (Railway)

**Required:**
```
OPENAI_API_KEY=sk-your-actual-key
```

**Optional:**
```
FRONTEND_URLS=https://your-app.vercel.app
```

### Frontend (Vercel)

**Required:**
```
VITE_CHATKIT_API_URL=https://your-backend.railway.app/chatkit
```

**Note:** Vercel environment variables are prefixed with `VITE_` to be accessible in the browser.

---

## Testing

### Test Backend Directly

```bash
# Health check
curl https://your-backend.railway.app/health

# Test ChatKit endpoint (should return error without proper payload)
curl -X POST https://your-backend.railway.app/chatkit \
  -H "Content-Type: application/json"
```

### Test Frontend

1. Visit your Vercel URL
2. Open browser DevTools (F12)
3. Go to Network tab
4. Click "Play"
5. Look for `/chatkit` request
6. Verify it goes to your Railway backend URL
7. Check for CORS errors (there should be none)

### Test Full Flow

1. Open app in browser
2. Click "Play"
3. Wait for Zara's ProfileCard to appear
4. Click "MATCH"
5. Verify Sam's ProfileCard appears
6. Check browser console for errors

---

## Custom Domain Setup

### Frontend Domain (Vercel)

1. Go to your Vercel project
2. Click "Settings" → "Domains"
3. Add your domain (e.g., `cupid.yourdomain.com`)
4. Follow Vercel's DNS instructions
5. Vercel automatically handles SSL

### Backend Domain (Railway)

1. Go to your Railway project
2. Click "Settings" → "Networking"
3. Add custom domain
4. Update DNS records as instructed
5. Railway automatically handles SSL

### Update Environment Variables

After adding custom domains:

**Vercel:**
```
VITE_CHATKIT_API_URL=https://api.yourdomain.com/chatkit
```

**Railway:**
```
FRONTEND_URLS=https://cupid.yourdomain.com
```

---

## Monitoring

### Railway Dashboard

- **Metrics:** CPU, Memory, Network usage
- **Logs:** Real-time application logs
- **Deployments:** View deployment history

**Access:**
1. Go to Railway project
2. Click "Metrics" to see resource usage
3. Click "Deployments" → "View Logs"

### Vercel Dashboard

- **Analytics:** Page views, visitors
- **Logs:** Build and function logs
- **Performance:** Web Vitals

**Access:**
1. Go to Vercel project
2. Click "Analytics" for usage data
3. Click "Deployments" → "View Function Logs"

---

## Auto-Deployment

Both platforms auto-deploy on git push!

### How It Works

```bash
# Make changes
git add .
git commit -m "Update cupid-simple"
git push origin main

# Railway automatically:
# 1. Detects changes in apps/cupid-simple/backend/
# 2. Rebuilds backend
# 3. Deploys new version

# Vercel automatically:
# 1. Detects changes in apps/cupid-simple/frontend/
# 2. Rebuilds frontend
# 3. Deploys to CDN
```

### Ignore Build Step (Optional)

To prevent builds when only other apps change:

**Vercel:**
1. Settings → Git → Ignored Build Step
2. Command: `git diff HEAD^ HEAD --quiet apps/cupid-simple/frontend/`

**Railway:**
1. Settings → "Watch Paths"
2. Add: `apps/cupid-simple/backend/**`

---

## Troubleshooting

### Backend Issues

#### "Application failed to respond"

```bash
# Check Railway logs
# Railway Dashboard → Deployments → View Logs

# Common issues:
# 1. Missing OPENAI_API_KEY
# 2. Wrong Python version
# 3. Dependencies failed to install
```

**Fix:**
1. Verify environment variables in Railway
2. Check `railway.toml` specifies Python 3.13
3. Review build logs for errors

#### CORS Errors

**Symptom:** Frontend shows CORS error in browser console

**Fix:**
1. Add frontend URL to Railway environment:
   ```
   FRONTEND_URLS=https://your-app.vercel.app
   ```
2. Redeploy backend (Railway auto-redeploys on env var change)

### Frontend Issues

#### "Failed to fetch"

**Symptom:** Frontend can't connect to backend

**Fix:**
1. Verify `VITE_CHATKIT_API_URL` in Vercel
2. Check Railway backend is running
3. Test backend health: `curl https://your-backend.railway.app/health`

#### Environment Variables Not Working

**Symptom:** App can't find backend URL

**Fix:**
1. Vercel → Settings → Environment Variables
2. Verify `VITE_CHATKIT_API_URL` is set
3. Click "Redeploy" (environment changes require rebuild)

#### Build Fails

```bash
# Common causes:
# 1. Wrong root directory
# 2. Missing dependencies
# 3. Build command incorrect
```

**Fix:**
1. Verify Root Directory: `apps/cupid-simple/frontend`
2. Check `package.json` exists in frontend directory
3. Review build logs in Vercel dashboard

### General Debugging

#### Check Backend Logs

Railway:
1. Dashboard → Deployments
2. Click latest deployment
3. Click "View Logs"

#### Check Frontend Logs

Vercel:
1. Dashboard → Deployments
2. Click latest deployment
3. Click "View Function Logs"

#### Test Locally

```bash
# Test backend locally
cd backend
uv sync
.venv/bin/python -m uvicorn app.main:app --reload

# Test frontend locally
cd frontend
npm install
npm run dev
```

---

## Cost Breakdown

### Railway (Backend)

**Free Tier:**
- $5 credit/month
- ~500 hours of small service
- After credit: $0.01/hour (~$7/month)

**Typical Usage (Low Traffic):**
- Hobby project: $0-5/month
- Demo app: $5-10/month

### Vercel (Frontend)

**Free Tier:**
- Unlimited deployments
- 100GB bandwidth/month
- Automatic scaling

**Typical Usage:**
- Personal project: $0/month
- With traffic: Still $0 (generous free tier)

**Total: $0-5/month**

---

## Scaling

### Increase Railway Resources

If backend is slow:

1. Railway Dashboard → Settings
2. Under "Resources"
3. Increase CPU/Memory (costs more)

### Vercel Scales Automatically

Vercel's CDN automatically handles traffic spikes.

---

## Migration from Railway+Vercel to Docker+AWS

If you outgrow this setup:

1. All Docker files are already created
2. Follow `DEPLOY-DOCKER-AWS.md`
3. Update Vercel env vars to point to EC2
4. Delete Railway project

---

## Quick Reference

### Backend (Railway)

- **Dashboard:** https://railway.app/dashboard
- **Logs:** Project → Deployments → View Logs
- **Env Vars:** Project → Variables
- **Domain:** Project → Settings → Networking

### Frontend (Vercel)

- **Dashboard:** https://vercel.com/dashboard
- **Logs:** Project → Deployments → View Logs
- **Env Vars:** Project → Settings → Environment Variables
- **Domain:** Project → Settings → Domains

### File Locations

- Backend config: `backend/railway.toml`
- Frontend config: `frontend/vercel.json`
- Environment template: `.env.example`

---

## Next Steps

- ✅ Backend deployed to Railway
- ✅ Frontend deployed to Vercel
- 🔲 Add custom domain
- 🔲 Set up error tracking (Sentry, etc.)
- 🔲 Configure analytics
- 🔲 Add staging environment (Vercel preview deployments)

---

## Support

- **Railway:** https://docs.railway.app
- **Vercel:** https://vercel.com/docs
- **ChatKit:** OpenAI ChatKit documentation

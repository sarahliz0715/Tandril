# 🚀 Tandril Quickstart Guide

**Complete setup guide to get your standalone Tandril MVP running in 30 minutes.**

---

## 📋 Prerequisites

- Node.js 18+ installed
- PostgreSQL database (or use Railway's free tier)
- Supabase account (free tier works)
- OpenAI API key (for AI features)

---

## Part 1: Backend Setup (15 minutes)

### Step 1: Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create account
2. Click "New Project"
3. Fill in project details (keep it simple for MVP):
   - Name: `tandril-mvp`
   - Database Password: (save this!)
   - Region: Choose closest to you
4. Wait 2-3 minutes for project to initialize

5. **Get your API keys:**
   - Go to **Settings → API** in your Supabase dashboard
   - Copy these values:
     - `Project URL` → This is your `SUPABASE_URL`
     - `anon public` key → This is your `SUPABASE_ANON_KEY`
     - `service_role secret` key → This is your `SUPABASE_SERVICE_KEY`

### Step 2: Deploy Backend to Railway

**Option A: One-Click Deploy (Easiest)**

1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click **"New Project"** → **"Deploy from GitHub repo"**
4. Connect your GitHub account
5. Select your Tandril repository
6. Railway will auto-detect the backend

7. **Add PostgreSQL database:**
   - In your Railway project, click **"+ New"**
   - Select **"Database" → "PostgreSQL"**
   - Railway will provision it automatically

8. **Set environment variables:**
   - Click on your backend service
   - Go to **"Variables"** tab
   - Add these variables:

```bash
DATABASE_URL=${{Postgres.DATABASE_URL}}  # Auto-filled by Railway
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
FRONTEND_URL=https://your-frontend.vercel.app
PORT=3001
NODE_ENV=production
OPENAI_API_KEY=your-openai-key
SHOPIFY_API_KEY=your-shopify-key-from-partners
SHOPIFY_API_SECRET=your-shopify-secret
REDIS_URL=redis://localhost:6379
```

9. **Deploy!**
   - Railway automatically builds and deploys
   - Get your backend URL from **"Settings" → "Domains"**
   - Click **"Generate Domain"** if not already created
   - Your backend will be live at: `https://your-app.railway.app`

**Option B: Railway CLI (Alternative)**

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Navigate to backend folder
cd backend

# Initialize project
railway init

# Add PostgreSQL
railway add --database postgresql

# Deploy
railway up

# Set environment variables (one by one)
railway variables set SUPABASE_URL="https://your-project.supabase.co"
railway variables set SUPABASE_ANON_KEY="your-anon-key"
railway variables set SUPABASE_SERVICE_KEY="your-service-key"
railway variables set FRONTEND_URL="https://your-frontend.vercel.app"
railway variables set OPENAI_API_KEY="your-openai-key"

# Get your live URL
railway domain
```

### Step 3: Run Database Migrations

Railway should run migrations automatically via the build command in `package.json`. To verify:

```bash
# Check Railway logs
railway logs

# You should see:
# "Running migrations..."
# "✅ Migrations complete"
```

If migrations didn't run, you can run them manually:

```bash
# Connect to Railway project
railway link

# Run migrations
railway run npm run db:migrate
```

### Step 4: Verify Backend is Running

Visit your backend URL + `/api/health`:
```
https://your-app.railway.app/api/health
```

You should see:
```json
{
  "status": "ok",
  "timestamp": "2025-11-26T...",
  "database": "connected"
}
```

✅ **Backend is live!**

---

## Part 2: Frontend Setup (15 minutes)

### Step 1: Configure Environment Variables

1. In your Tandril root directory, create `.env.local`:

```bash
cp .env.example .env.local
```

2. Edit `.env.local` with your values:

```bash
# Backend API URL (from Railway)
VITE_API_BASE_URL=https://your-app.railway.app

# Supabase Config (same as backend)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Standalone mode (use your backend, not Base44)
VITE_STANDALONE_MODE=true

# Optional: OpenAI for frontend features
VITE_OPENAI_API_KEY=your-openai-key

# Shopify (if testing Shopify integration)
VITE_SHOPIFY_API_KEY=your-shopify-key
VITE_SHOPIFY_API_SECRET=your-shopify-secret
```

### Step 2: Test Locally

```bash
# Install dependencies (if not already done)
npm install

# Start dev server
npm run dev
```

Visit `http://localhost:5173`

**You should see:**
- Console log: `🔍 Tandril Mode Check: { mode: "Standalone Backend" }`
- Login page at `/Login`

### Step 3: Deploy Frontend to Vercel

**Option A: Vercel Dashboard (Easiest)**

1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Click **"Add New..." → "Project"**
4. Import your Tandril repository
5. Configure project:
   - **Framework Preset:** Vite
   - **Root Directory:** `./` (root)
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

6. **Add environment variables** (same as `.env.local`):
   - Click **"Environment Variables"**
   - Add all variables from your `.env.local`
   - Make sure to add them to **Production**, **Preview**, and **Development**

7. Click **"Deploy"**
8. Wait 2-3 minutes
9. Your app will be live at: `https://your-app.vercel.app`

**Option B: Vercel CLI**

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name? tandril
# - In which directory? ./
# - Override settings? No

# Add environment variables
vercel env add VITE_API_BASE_URL production
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
# ... add all other env vars

# Deploy to production
vercel --prod
```

### Step 4: Update Backend FRONTEND_URL

Now that you have your Vercel URL, update the backend:

```bash
# In Railway dashboard
# Go to your backend service → Variables
# Update FRONTEND_URL to:
FRONTEND_URL=https://your-app.vercel.app
```

Or via CLI:
```bash
railway variables set FRONTEND_URL="https://your-app.vercel.app"
```

---

## Part 3: First User Setup (5 minutes)

### Step 1: Create Your Account

1. Visit your deployed frontend: `https://your-app.vercel.app/Login`
2. Click **"Don't have an account? Sign up"**
3. Fill in:
   - Full Name: Your name
   - Email: your@email.com
   - Password: (at least 6 characters)
4. Click **"Sign Up"**
5. Check your email for verification link
6. Click the verification link
7. Return to login page and sign in

### Step 2: Verify Everything Works

After logging in, you should see:
- ✅ Dashboard loads
- ✅ No Base44 errors in console
- ✅ API requests going to your Railway backend

### Step 3: Connect Your First Platform (Optional)

1. Go to **"Platforms"** page
2. Click **"Connect Shopify"** (or your platform)
3. Follow OAuth flow
4. Verify connection shows as "Connected"

---

## 🎉 You're Live!

Your complete MVP is now running:

- ✅ **Backend API:** Railway (`https://your-app.railway.app`)
- ✅ **Frontend App:** Vercel (`https://your-app.vercel.app`)
- ✅ **Database:** Railway PostgreSQL
- ✅ **Auth:** Supabase
- ✅ **No more Base44 dependency!**

---

## 🔧 Common Issues & Solutions

### Issue: "Failed to fetch" errors

**Solution:** Check that `VITE_API_BASE_URL` in Vercel matches your Railway backend URL exactly.

### Issue: "Database not connected"

**Solution:** Verify Railway migrations ran successfully:
```bash
railway logs | grep migrate
```

### Issue: "Unauthorized" errors

**Solution:** Make sure all Supabase keys match between backend and frontend:
- Check Railway variables
- Check Vercel environment variables
- Verify keys are from the same Supabase project

### Issue: Login page not loading

**Solution:** Check browser console for errors. Most likely:
- Missing environment variables
- Incorrect Supabase URL/keys

### Issue: "Module not found: @supabase/supabase-js"

**Solution:**
```bash
npm install @supabase/supabase-js
```

---

## 📚 Next Steps

Now that you're live, here's what to build next:

### Week 1: Core Features
- [ ] Test Shopify product sync
- [ ] Test command execution
- [ ] Verify listing health checker works
- [ ] Set up background workers (requires Redis)

### Week 2: Polish
- [ ] Add error boundaries
- [ ] Improve loading states
- [ ] Add toast notifications for all actions
- [ ] Test on mobile

### Week 3: First Users
- [ ] Invite 3-5 beta users
- [ ] Gather feedback
- [ ] Fix critical bugs
- [ ] Document known issues

---

## 🆘 Need Help?

1. **Check Railway Logs:**
   ```bash
   railway logs --follow
   ```

2. **Check Vercel Logs:**
   - Go to Vercel dashboard
   - Click on your deployment
   - Click "Logs" tab

3. **Check Supabase Logs:**
   - Go to Supabase dashboard
   - Click "Logs" in sidebar

4. **Backend Health Check:**
   ```bash
   curl https://your-app.railway.app/api/health
   ```

---

## 💰 Cost Breakdown

- **Railway:** ~$5-10/month (backend + PostgreSQL)
- **Vercel:** Free (frontend hosting)
- **Supabase:** Free tier (50k MAU)
- **OpenAI:** Pay-per-use (~$10-20/month for testing)

**Total: ~$15-30/month for full MVP**

---

## 🔒 Security Checklist

Before sharing with users:

- [ ] All API keys in environment variables (not in code)
- [ ] FRONTEND_URL set correctly in backend
- [ ] Supabase RLS (Row Level Security) enabled
- [ ] HTTPS enforced on all endpoints
- [ ] CORS configured correctly
- [ ] Rate limiting enabled (add later)

---

## 🎯 Success Metrics

Track these to validate your MVP:

**Technical:**
- [ ] Backend health check returns 200
- [ ] Database migrations successful
- [ ] User can sign up and login
- [ ] Platform connection works
- [ ] Command execution returns results

**Business:**
- [ ] First user onboarded
- [ ] First Shopify store connected
- [ ] First command executed successfully
- [ ] Zero critical errors in 24 hours
- [ ] <1 second API response time

---

**You're all set! Go build something amazing! 🚀**

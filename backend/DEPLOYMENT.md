# 🚀 Deployment Guide - Tandril Backend

## Railway Deployment (Recommended - 5 minutes)

### **Step 1: Create Railway Account**
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub

### **Step 2: Create New Project**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize in backend folder
cd backend
railway init

# Create PostgreSQL database
railway add --database postgresql
```

### **Step 3: Set Environment Variables**
```bash
# Railway will auto-set DATABASE_URL
# You only need to add:

railway variables set SUPABASE_URL="https://xxxxx.supabase.co"
railway variables set SUPABASE_ANON_KEY="your-anon-key"
railway variables set SUPABASE_SERVICE_KEY="your-service-key"
railway variables set FRONTEND_URL="https://your-frontend.vercel.app"
railway variables set NODE_ENV="production"
railway variables set ENCRYPTION_KEY="generate-random-32-char-string"
```

### **Step 4: Deploy**
```bash
railway up
```

That's it! Railway will:
- ✅ Install dependencies
- ✅ Generate Prisma client
- ✅ Run database migrations
- ✅ Start your server

**Get your URL:**
```bash
railway domain
```

Your API is now live at `https://your-app.railway.app` 🎉

---

## Alternative: Fly.io Deployment

### **Setup**
```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Login
flyctl auth login

# Launch app
flyctl launch

# Add PostgreSQL
flyctl postgres create

# Attach database
flyctl postgres attach <postgres-app-name>
```

### **Set Secrets**
```bash
flyctl secrets set SUPABASE_URL="..."
flyctl secrets set SUPABASE_ANON_KEY="..."
flyctl secrets set SUPABASE_SERVICE_KEY="..."
flyctl secrets set FRONTEND_URL="..."
```

### **Deploy**
```bash
flyctl deploy
```

---

## Alternative: Render Deployment

1. Go to [render.com](https://render.com)
2. New → Web Service
3. Connect GitHub repo
4. Settings:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install && npx prisma generate && npx prisma migrate deploy`
   - **Start Command:** `npm start`
5. Add PostgreSQL database (Render dashboard)
6. Add environment variables
7. Deploy

---

## Alternative: DigitalOcean App Platform

1. Go to DigitalOcean
2. Create App → GitHub
3. Select `backend` folder
4. Add PostgreSQL database
5. Add environment variables
6. Deploy

---

## Alternative: Self-Hosted (VPS)

### **Requirements**
- Ubuntu 22.04+ VPS
- Domain name (optional)

### **Setup Script**
```bash
# SSH into your server
ssh root@your-server-ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Create database
sudo -u postgres createdb tandril

# Clone your repo
git clone https://github.com/your-username/Tandril.git
cd Tandril/backend

# Install dependencies
npm install

# Set up environment
cp .env.example .env
nano .env  # Edit with your credentials

# Run migrations
npm run db:migrate:deploy

# Install PM2 for process management
npm install -g pm2

# Start server
pm2 start src/server.js --name tandril-backend

# Save PM2 config
pm2 save
pm2 startup

# Set up Nginx reverse proxy (optional)
sudo apt install nginx
sudo nano /etc/nginx/sites-available/tandril

# Add:
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/tandril /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Install SSL (optional but recommended)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `SUPABASE_URL` | ✅ | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | ✅ | Supabase anon key | `eyJ...` |
| `SUPABASE_SERVICE_KEY` | ✅ | Supabase service key | `eyJ...` |
| `FRONTEND_URL` | ✅ | Frontend URL for CORS | `https://app.tandril.com` |
| `PORT` | ❌ | Server port (default: 3001) | `3001` |
| `NODE_ENV` | ❌ | Environment | `production` |
| `REDIS_URL` | ❌ | For background jobs (optional) | `redis://localhost:6379` |
| `ENCRYPTION_KEY` | ⚠️ | For encrypting credentials | 32-char random string |
| `SHOPIFY_API_KEY` | ❌ | Shopify app credentials | Only if using Shopify |
| `SHOPIFY_API_SECRET` | ❌ | Shopify app secret | Only if using Shopify |

---

## Post-Deployment Checklist

### **1. Test Health Endpoint**
```bash
curl https://your-api.railway.app/api/health
```

Expected response:
```json
{
  "success": true,
  "status": "healthy",
  "database": "connected",
  "version": "1.0.0"
}
```

### **2. Test Authentication**
Create a test user in Supabase, then:
```bash
# Get token from Supabase sign-in
curl https://your-api.railway.app/api/auth/me \
  -H "Authorization: Bearer <your-token>"
```

### **3. Update Frontend**
Update your frontend's API URL:
```javascript
// frontend/src/api/client.js
const API_URL = 'https://your-api.railway.app';
```

### **4. Set Up Monitoring** (Optional but recommended)
- Enable Railway metrics
- Set up error tracking (Sentry, LogRocket, etc.)
- Configure uptime monitoring (UptimeRobot, Pingdom)

### **5. Database Backups**
Railway includes automatic backups, but you can also:
```bash
# Manual backup
pg_dump $DATABASE_URL > backup.sql

# Restore
psql $DATABASE_URL < backup.sql
```

---

## Troubleshooting

### **Migration Fails**
```bash
# Reset and re-run
railway run npx prisma migrate reset
railway run npx prisma migrate deploy
```

### **Can't Connect to Database**
Check `DATABASE_URL` format:
```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
```

### **Supabase Auth Not Working**
1. Check Supabase project URL matches
2. Verify service key (not anon key) is set
3. Check CORS settings in Supabase dashboard

### **Server Won't Start**
```bash
# Check logs
railway logs

# Common issues:
# - Missing environment variables
# - Database not connected
# - Port already in use (change PORT in .env)
```

---

## Performance Tips

### **1. Database Indexing**
Indexes are already added in schema for:
- User lookups
- Product SKU searches
- Listing health scores
- Command history

### **2. Caching** (Future Enhancement)
Add Redis for caching:
```bash
railway add --database redis
```

### **3. Rate Limiting** (Future Enhancement)
Add Express rate limiter:
```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

---

## 🎉 You're Live!

Your backend is now deployed and accessible worldwide.

**Next steps:**
1. Connect your frontend
2. Set up background workers (coming soon)
3. Add Shopify integration (coming soon)
4. Enable automated health checks (coming soon)

Questions? Check the main [README.md](./README.md)

# Tandril Backend

**Standalone Node.js backend for Tandril - AI-powered e-commerce automation**

✅ **No more Base44 dependency!** Full control over your backend.

---

## 🎯 What's Included

### **15 Core Entities**
1. **User** - Authentication & user management
2. **Platform** - Connected sales channels (Shopify, Etsy, eBay, etc.)
3. **Product** - Master product catalog
4. **Listing** - Platform-specific product listings
5. **ListingHealthIssue** ⭐ - Suppression/stranded listing tracking (KILLER FEATURE)
6. **InventoryItem** - Stock levels across warehouses/platforms
7. **PurchaseOrder** - Reorder management & draft POs
8. **Automation** - Workflow automation rules
9. **AutomationRun** - Execution history for audit trail
10. **AICommand** - Command history & undo tracking
11. **AdCampaign** - Facebook/Google ads management
12. **AdSpendGuard** ⭐ - Budget caps & ACoS monitoring (CRITICAL SAFETY)
13. **Alert** - Smart alerts & notifications
14. **IntegrationCredential** - Secure API key storage
15. **AuditLog** - Immutable audit trail for compliance

### **Key Features**
- ✅ **Listing Health Checker** - Auto-detect & fix suppressed listings
- ✅ **Ad Spend Guardrails** - Budget caps, ACoS/ROAS monitoring
- ✅ **Audit Trail** - Full undo capability with before/after state
- ✅ **REST API** - Clean, documented endpoints
- ✅ **Supabase Auth** - Drop-in authentication
- ✅ **Type-safe** - Prisma ORM with full TypeScript support

---

## 🚀 Quick Start

### **1. Prerequisites**
- Node.js 18+
- PostgreSQL database (or use Railway's included database)
- Supabase account (free tier works)

### **2. Install Dependencies**
```bash
cd backend
npm install
```

### **3. Set Up Environment**
```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/tandril"
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_KEY="your-service-key"
PORT=3001
FRONTEND_URL="http://localhost:5173"
```

### **4. Run Database Migrations**
```bash
npm run db:generate
npm run db:migrate
```

### **5. Start Server**
```bash
# Development (auto-reload)
npm run dev

# Production
npm start
```

Server runs on `http://localhost:3001` 🎉

---

## 📡 API Endpoints

### **Health & Auth**
- `GET /api/health` - Health check
- `GET /api/auth/me` - Get current user
- `PATCH /api/auth/me` - Update user

### **Products**
- `GET /api/products` - List products
- `GET /api/products/:id` - Get product
- `POST /api/products` - Create product
- `PATCH /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### **Listings** ⭐ KILLER FEATURE
- `GET /api/listings` - List listings with health status
- `POST /api/listings/:id/health-check` - Run health check
- `POST /api/listings/health-check-all` - Check all listings
- `POST /api/listings/issues/:issueId/auto-fix` - Auto-fix issue
- `GET /api/listings/health/dashboard` - Health dashboard stats

### **Inventory**
- `GET /api/inventory` - List inventory
- `POST /api/inventory` - Create inventory item
- `PATCH /api/inventory/:id` - Update inventory

### **Automations**
- `GET /api/automations` - List automations
- `POST /api/automations` - Create automation
- `PATCH /api/automations/:id` - Update automation
- `DELETE /api/automations/:id` - Delete automation

### **Commands** (with Undo!)
- `GET /api/commands` - Command history
- `POST /api/commands` - Execute command
- `POST /api/commands/:id/undo` - Undo command

### **Ads** (with Spend Guards)
- `GET /api/ads/campaigns` - List campaigns
- `POST /api/ads/campaigns` - Create campaign
- `POST /api/ads/campaigns/:id/guards` - Add spend guard
- `GET /api/ads/dashboard` - Ad dashboard

### **Alerts**
- `GET /api/alerts` - Get alerts
- `PATCH /api/alerts/:id/read` - Mark as read
- `DELETE /api/alerts/:id` - Dismiss alert

### **Platforms**
- `GET /api/platforms` - List platforms
- `POST /api/platforms` - Connect platform
- `PATCH /api/platforms/:id` - Update platform
- `DELETE /api/platforms/:id` - Disconnect platform

---

## 🌐 Deploy to Railway (Easiest)

### **Option 1: One-Click Deploy**
1. Go to [Railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub"
3. Connect your repo
4. Railway auto-detects the backend folder
5. Add environment variables (see `.env.example`)
6. Deploy! 🚀

### **Option 2: CLI Deploy**
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link project
railway link

# Add environment variables
railway variables set DATABASE_URL="..." SUPABASE_URL="..." ...

# Deploy
railway up
```

Railway automatically:
- ✅ Provisions PostgreSQL database
- ✅ Runs migrations
- ✅ Deploys your API
- ✅ Provides HTTPS URL

**Cost:** ~$5-10/month

---

## 🔒 Setting Up Supabase Auth

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Get your keys from **Settings → API**
4. Add to `.env`:
   ```env
   SUPABASE_URL="https://xxxxx.supabase.co"
   SUPABASE_ANON_KEY="your-anon-key"
   SUPABASE_SERVICE_KEY="your-service-key"
   ```

### **Frontend Integration**
```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
})

// Use the token
const response = await fetch('https://your-api.railway.app/api/products', {
  headers: {
    'Authorization': `Bearer ${data.session.access_token}`
  }
})
```

---

## 🛠️ Development

### **Database Commands**
```bash
# Generate Prisma client
npm run db:generate

# Create migration
npm run db:migrate

# View database in browser
npm run db:studio

# Reset database (⚠️ deletes all data)
npx prisma migrate reset
```

### **Adding New Entities**
1. Edit `prisma/schema.prisma`
2. Run `npm run db:migrate`
3. Prisma auto-generates TypeScript types

### **Viewing Logs**
```bash
# Railway
railway logs

# Local
# Logs appear in console
```

---

## 🔥 Key Differentiators

### **1. Listing Health Checker**
Automatically detects and fixes:
- Image size violations
- Title length issues
- Missing required attributes
- Price violations (MAP)
- Platform-specific requirements

**Usage:**
```javascript
// Check all listings
POST /api/listings/health-check-all

// Auto-fix an issue
POST /api/listings/issues/:issueId/auto-fix
```

### **2. Ad Spend Guardrails**
Prevent budget overruns:
- Daily/monthly caps
- ACoS/ROAS thresholds
- Auto-pause campaigns
- Real-time monitoring

**Usage:**
```javascript
// Add budget cap
POST /api/ads/campaigns/:id/guards
{
  "type": "DAILY_BUDGET_CAP",
  "dailyCapAmount": 100,
  "autoAction": "PAUSE_CAMPAIGN"
}
```

### **3. Full Undo Support**
Every command stores before/after state:
```javascript
// Undo any command
POST /api/commands/:id/undo
```

---

## 📊 Database Schema

See `prisma/schema.prisma` for full schema.

**Key relationships:**
- User → Products → Listings → Health Issues
- User → Platforms → Credentials
- User → Automations → Runs
- User → Commands (with undo tracking)
- AdCampaigns → SpendGuards

---

## 🤝 Contributing

This backend is built for **your control**. Fork it, modify it, deploy it anywhere.

---

## 📞 Support

Questions? Issues?
- Check Railway logs: `railway logs`
- Check Prisma Studio: `npm run db:studio`
- Review this README

---

## 🎉 You Did It!

You now have a **real, production-ready backend** that you fully control. No vendor lock-in, no hallucinated code, no surprises.

Deploy once, iterate fast. 🚀

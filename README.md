# Tandril

**AI-powered automation platform for multi-channel e-commerce management**

🎉 **Now with standalone backend!** No more vendor lock-in. Full control over your data and infrastructure.

---

## ✨ What it does

Tandril is an AI-powered platform that automates e-commerce operations across multiple channels:

- **🤖 Natural Language Commands** - Control your inventory, pricing, and listings with simple commands
- **🔍 Listing Health Checker** - Auto-detect and fix suppressed/stranded listings
- **💰 Ad Spend Guardrails** - Prevent budget overruns with AI monitoring
- **📦 Multi-Platform Sync** - Manage Shopify, Etsy, eBay, Amazon from one place
- **⚡ Workflow Automation** - Build custom automations without code
- **📊 Smart Analytics** - AI-powered insights and recommendations

---

## 🚀 Quick Start

### New Users (Recommended)

**Get your MVP running in 30 minutes:**

👉 **See [QUICKSTART.md](./QUICKSTART.md) for complete setup guide**

### Existing Base44 Users

You can continue using Base44 by setting `VITE_STANDALONE_MODE=false` in your `.env.local`.

---

## 🏗️ Architecture

Tandril now runs on a **standalone architecture**:

```
┌─────────────────┐
│   Frontend      │
│   (Vite/React)  │
│   Vercel        │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   Backend API   │
│   (Express.js)  │
│   Railway       │
└────────┬────────┘
         │
    ┌────┴────┐
    ↓         ↓
┌────────┐ ┌──────────┐
│ Postgres│ │ Supabase │
│ Railway │ │   Auth   │
└─────────┘ └──────────┘
```

**Components:**
- **Frontend:** React + Vite → Deployed on Vercel
- **Backend:** Express.js API → Deployed on Railway
- **Database:** PostgreSQL → Railway-hosted
- **Auth:** Supabase → Identity management
- **Workers:** BullMQ + Redis → Background jobs

---

## 💻 Local Development

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Supabase account

### Setup

1. **Clone the repository:**
```bash
git clone <your-repo-url>
cd Tandril
```

2. **Install frontend dependencies:**
```bash
npm install
```

3. **Set up environment variables:**
```bash
cp .env.example .env.local
```

Edit `.env.local` with your values:
```bash
VITE_API_BASE_URL=http://localhost:3001
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_STANDALONE_MODE=true
```

4. **Install backend dependencies:**
```bash
cd backend
npm install
```

5. **Set up backend environment:**
```bash
cp .env.example .env
```

Edit `backend/.env`:
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/tandril
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
FRONTEND_URL=http://localhost:5173
PORT=3001
```

6. **Run database migrations:**
```bash
npm run db:migrate
```

7. **Start both servers:**

Terminal 1 (Backend):
```bash
cd backend
npm run dev
```

Terminal 2 (Frontend):
```bash
npm run dev
```

8. **Visit** `http://localhost:5173` and sign up!

---

## 🌐 Deployment

**Complete deployment guide:** [QUICKSTART.md](./QUICKSTART.md)

**Quick summary:**
1. Deploy backend to Railway (~10 min)
2. Deploy frontend to Vercel (~5 min)
3. Set up Supabase auth (~5 min)
4. Configure environment variables
5. You're live! 🎉

**Estimated cost:** $15-30/month

---

## 📚 Documentation

- **[QUICKSTART.md](./QUICKSTART.md)** - Complete setup guide (30 min)
- **[backend/README.md](./backend/README.md)** - Backend API documentation
- **[backend/NEXT_STEPS.md](./backend/NEXT_STEPS.md)** - Development roadmap
- **[backend/DEPLOYMENT.md](./backend/DEPLOYMENT.md)** - Advanced deployment options

---

## 🔧 Configuration Modes

### Standalone Mode (Default)
Uses your own backend + Supabase auth:
```bash
VITE_STANDALONE_MODE=true
VITE_API_BASE_URL=https://your-backend.railway.app
```

### Base44 Mode (Legacy)
Uses Base44 platform:
```bash
VITE_STANDALONE_MODE=false
VITE_BASE44_API_KEY=your-api-key
```

---

## Project Structure
- `main.jsx`: Application entry point
- `App.jsx`: Main application component
- `pages/`: Page components and routing (~60 pages)
- `components/`: Reusable UI and feature components
  - `ui/`: Base UI components (buttons, cards, dialogs, etc.)
  - `commands/`: Command interface components
  - `dashboard/`: Dashboard widgets and components
  - `platforms/`: Platform integration components
  - `automations/`: Workflow automation components
  - And many more...
- `api/`: API client and entity definitions
- `utils/`: Utility functions and helpers
- `hooks/`: Custom React hooks
- `lib/`: Shared libraries

## Tech Stack
- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **Tailwind CSS** - Styling
- **Radix UI** - Component primitives
- **@base44/sdk** - Base44 platform integration

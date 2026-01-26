# Tandril

AI-powered e-commerce operations automation platform

## What it does

Tandril is an AI agent that automates workflows and manages multi-platform e-commerce operations. Connect your Shopify store (and other platforms) to automate inventory management, order processing, customer support, and marketing campaigns through natural language commands and intelligent workflows.

## Key Features

- 🤖 **AI-Powered Automation** - Natural language command interface powered by Anthropic Claude
- 🛍️ **Multi-Platform Integration** - Currently supports Shopify, with WooCommerce, BigCommerce, and Etsy coming soon
- 📦 **Smart Inventory Management** - Automated reordering, low-stock alerts, and demand forecasting
- 🔄 **Visual Workflow Builder** - Create complex automations with trigger-based workflows
- 📊 **Real-Time Analytics** - Performance insights, sales velocity tracking, and profit margin analysis
- 💬 **Orion AI Advisor** - Conversational AI assistant for business insights and recommendations

## How to run locally

1. Clone the repo: `git clone https://github.com/sarahliz0715/Tandril.git`
2. Install dependencies: `npm install`
3. Set up environment variables (see `.env.example`)
4. Run development server: `npm run dev`
5. Open http://localhost:5173 in your browser

## Deployment

### Production Deployment (Vercel)
See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for detailed instructions on deploying to Vercel.

Quick deploy:
```bash
npm run build
vercel --prod
```

## Project Structure

- `main.jsx`: Application entry point
- `App.jsx`: Main application component with routing
- `pages/`: Page components (~60+ pages)
  - `Home.jsx`: Landing page
  - `Dashboard.jsx`: Main dashboard
  - `Inventory.jsx`: Inventory management
  - `Workflows.jsx`: Workflow automation
  - `Orders.jsx`: Order management
  - And many more...
- `components/`: Reusable UI and feature components
  - `ui/`: Base UI components (shadcn/ui)
  - `commands/`: Natural language command interface
  - `dashboard/`: Dashboard widgets and analytics
  - `platforms/`: E-commerce platform integrations
  - `automations/`: Workflow builder and automation engine
  - `inventory/`: Inventory management components
  - `workflows/`: Workflow templates and execution
  - `advisor/`: AI chat interface (Orion)
- `api/`: API client and entity definitions
  - `apiClient.js`: Base API client
  - `entities.js`: Data models (Orders, Products, Workflows, etc.)
  - `supabaseClient.js`: Supabase configuration
- `utils/`: Utility functions and helpers
- `hooks/`: Custom React hooks
- `lib/`: Shared libraries
- `supabase/functions/`: Serverless edge functions

## Tech Stack

### Frontend
- **React 18** - UI framework with hooks
- **Vite** - Lightning-fast build tool and dev server
- **React Router v6** - Client-side routing
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - High-quality component library
- **Radix UI** - Accessible component primitives
- **Recharts** - Data visualization and analytics

### Backend & Database
- **Supabase** - PostgreSQL database with real-time subscriptions
- **Supabase Edge Functions** - Serverless Deno functions
- **Row-Level Security** - Database-level access control

### AI & Automation
- **Anthropic Claude API** - Advanced language model for natural language processing
- **Custom Workflow Engine** - Trigger-based automation system

### Platform Integrations
- **Shopify API** - Full inventory, orders, and product management
- **Stripe** - Payment processing and subscription management

### Deployment & Infrastructure
- **Vercel** - Serverless deployment with edge network
- **GitHub** - Version control and CI/CD

## Platform Integrations

### Currently Supported
- ✅ **Shopify** - Full integration (inventory, orders, products, webhooks)

### Coming Soon
- 🔜 **WooCommerce** - WordPress e-commerce platform
- 🔜 **BigCommerce** - Enterprise e-commerce solution
- 🔜 **Etsy** - Handmade and vintage marketplace
- 🔜 **Amazon Seller Central** - Multi-channel fulfillment

## Environment Variables

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_ANTHROPIC_API_KEY=your_anthropic_api_key
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

### Code Structure Guidelines

- Use functional components with hooks
- Follow component composition patterns
- Keep components small and focused
- Use Tailwind utility classes for styling
- Implement proper error boundaries
- Add loading states for async operations

## Contributing

This is a private repository. For questions or support, contact the development team.

## License

Proprietary - All rights reserved

---

**For more information:**
- Tech Stack Details: [TECH_STACK.md](./TECH_STACK.md)
- Deployment Guide: [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)


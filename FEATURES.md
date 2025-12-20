# Tandril Feature Documentation

**Last Updated:** 2025-12-20
**Purpose:** This document provides developers with a complete overview of implemented, partially implemented, and planned features, along with gaps between current state and original specifications.

---

## Table of Contents
1. [Overview](#overview)
2. [Core Features - Implemented](#core-features---implemented)
3. [Core Features - Partially Implemented](#core-features---partially-implemented)
4. [Planned Features - Not Implemented](#planned-features---not-implemented)
5. [Database Schema](#database-schema)
6. [API & Edge Functions](#api--edge-functions)
7. [Frontend Pages](#frontend-pages)
8. [Known Issues & Gaps](#known-issues--gaps)
9. [Technical Architecture](#technical-architecture)

---

## Overview

**Tandril** is an AI-powered workflow automation platform for e-commerce, specifically designed for Shopify merchants. It enables natural language commands to automate repetitive tasks, create workflows, and manage multi-platform operations.

**Current Status:** Beta - Ready for Shopify App Store submission
**Tech Stack:** React 18, Vite, Supabase, Tailwind CSS, Radix UI
**Target Users:** Shopify merchants, e-commerce store owners

---

## Core Features - Implemented

### ✅ 1. Authentication & User Management
**Status:** Fully Implemented
**Location:** `api/supabaseClient.js`, `pages/Login.jsx`, `pages/Signup.jsx`

- **Supabase Auth Integration:** Email/password authentication
- **User Profiles:** Stored in Supabase auth.users with extended metadata
- **Session Management:** Automatic session refresh and token management
- **Protected Routes:** Auth guards on all protected pages
- **User Modes:** Standard vs Beta user experience modes
- **Onboarding Flow:** Beta user onboarding with feature introductions

**Database Tables:**
- `auth.users` (Supabase built-in)
- User metadata in JSONB format

**Files:**
- `api/supabaseClient.js` - Supabase configuration
- `utils/authHelpers.js` - Auth utilities and error handling
- `components/onboarding/BetaOnboardingFlow.jsx` - Onboarding wizard

---

### ✅ 2. Shopify Integration
**Status:** Fully Implemented
**Location:** `supabase/functions/shopify-*`, `pages/ShopifyCallback.jsx`, `pages/Platforms.jsx`

- **OAuth 2.0 Flow:** Complete OAuth implementation with state validation
- **Access Token Storage:** Encrypted token storage in database
- **Scopes Management:** Configurable Shopify API scopes
- **Multi-Store Support:** Users can connect multiple Shopify stores
- **GDPR Compliance:** Webhooks for data requests, redaction, and shop deletion

**Database Tables:**
- `platforms` - Connected Shopify stores
- `oauth_states` - Temporary OAuth state validation

**Edge Functions:**
- `shopify-auth-init` - Initiates Shopify OAuth flow
- `shopify-auth-callback` - Handles OAuth callback and token exchange
- `shopify-webhook-gdpr-data-request` - GDPR data request handler
- `shopify-webhook-gdpr-redact` - GDPR customer data redaction
- `shopify-webhook-shop-redact` - GDPR shop deletion handler

**Files:**
- `pages/Platforms.jsx` - Platform connection management
- `pages/ShopifyCallback.jsx` - OAuth callback handler
- `SHOPIFY_SETUP.md` - Shopify app configuration documentation

**Known Limitations:**
- Only Shopify is implemented; other platforms (Etsy, eBay, Amazon) are UI mockups
- Shopify API calls are limited to configured scopes

---

### ✅ 3. AI Command Execution
**Status:** Implemented (Backend ready, UI functional)
**Location:** `pages/Commands.jsx`, `supabase/functions/interpret-command`, `supabase/functions/execute-command`

- **Natural Language Processing:** AI interprets plain English commands
- **Command Queue:** Commands queued for interpretation and execution
- **Multi-Step Actions:** Single command can trigger multiple platform actions
- **Platform Targeting:** Commands can target specific connected platforms
- **Execution History:** Full command history with status tracking
- **Confidence Scoring:** AI provides confidence scores for interpretations
- **Action Confirmation:** User approval required before executing actions

**Database Tables:**
- `ai_commands` - Command history and execution results
- `saved_commands` - User's favorite/saved command templates

**Edge Functions:**
- `interpret-command` - AI-powered command interpretation
- `execute-command` - Command execution against platforms

**Files:**
- `pages/Commands.jsx` - Command interface with loading states
- `components/commands/CommandHistory.jsx` - Command history view
- `api/supabaseEntities.js` - Database entity wrappers

**Command Examples:**
- "Update SEO titles for all products in the 'T-Shirts' collection"
- "Set all out-of-stock products to draft status"
- "Add 'New Arrival' tag to products created in the last 7 days"

**Current Gaps:**
- Command interpretation AI needs fine-tuning for complex multi-step commands
- Limited to Shopify API capabilities (no cross-platform commands yet)

---

### ✅ 4. Workflows (Automation)
**Status:** Implemented (CRUD operations work, execution needs enhancement)
**Location:** `pages/Workflows.jsx`, `components/workflows/*`

- **Workflow Builder:** Create workflows with triggers and actions
- **Trigger Types:**
  - Manual (run on demand)
  - Schedule (cron-based, daily/weekly/monthly)
  - Event-based (planned, not fully implemented)
- **Action System:** JSONB array of actions to execute in sequence
- **Workflow Templates:** Pre-built templates for common tasks (database ready, UI displays)
- **Workflow History:** Execution logs with success/failure tracking
- **Active/Inactive States:** Toggle workflows on/off

**Database Tables:**
- `ai_workflows` - Workflow definitions with actions (not commands)
- `workflow_runs` - Execution history
- `workflow_templates` - Pre-built workflow templates

**Files:**
- `pages/Workflows.jsx` - Workflow listing and management
- `components/workflows/CreateWorkflowModal.jsx` - Workflow creation
- `components/workflows/WorkflowCard.jsx` - Workflow display card (uses actions column)
- `components/workflows/WorkflowTemplateCard.jsx` - Template cards

**Recent Fixes:**
- Fixed column name mismatch: database uses `actions` (JSONB), not `commands` (text array)
- Fixed workflow creation to properly format actions as `{type: 'execute_command', config: {...}}`

**Current Gaps:**
- Event-based triggers not fully implemented (webhooks needed)
- Workflow execution engine needs cron scheduler integration
- No workflow versioning or rollback capability
- Limited error handling and retry logic

---

### ✅ 5. Dashboard & Analytics
**Status:** Implemented (UI complete, data integration partial)
**Location:** `pages/Dashboard.jsx`, `pages/Analytics.jsx`

- **Overview Dashboard:** Key metrics, recent commands, connected platforms
- **Analytics Page:** Charts and graphs for usage patterns (mock data currently)
- **Command Statistics:** Command success rate, execution time
- **Platform Status:** Connection health monitoring

**Files:**
- `pages/Dashboard.jsx` - Main dashboard with widgets
- `pages/Analytics.jsx` - Analytics and reporting
- `components/dashboard/*` - Dashboard widgets

**Current Gaps:**
- Analytics data is partially mocked (needs real aggregation queries)
- No data export functionality
- Limited date range filtering

---

### ✅ 6. AI Business Advisor
**Status:** Implemented (UI ready, backend placeholder)
**Location:** `pages/AIAdvisor.jsx`, `agents.js`

- **Chat Interface:** Conversational AI for business advice
- **Context-Aware:** Understands user's store and business context
- **Agent Types:** Business advisor, marketing advisor (planned)
- **WhatsApp Integration:** Placeholder for future WhatsApp connect

**Files:**
- `pages/AIAdvisor.jsx` - Chat interface
- `agents.js` - Agent SDK placeholder (WhatsApp connect URL placeholder added)

**Current Gaps:**
- Backend AI integration needs implementation (currently placeholder responses)
- WhatsApp integration is placeholder only (`getWhatsAppConnectURL` returns '#')
- No conversation history persistence
- Agent types not fully differentiated

---

## Core Features - Partially Implemented

### ⚠️ 7. Inventory Management
**Status:** Partial - UI exists, Shopify API integration needed
**Location:** `pages/Inventory.jsx`

**What Works:**
- Inventory list view with mock data
- Filter and search UI
- Bulk actions UI

**What's Missing:**
- Real Shopify inventory sync
- Inventory update/edit functionality
- Low stock alerts
- Inventory forecasting

---

### ⚠️ 8. Order Management
**Status:** Partial - UI exists, Shopify API integration needed
**Location:** `pages/Orders.jsx`

**What Works:**
- Order list view with mock data
- Order status filters
- Order detail view

**What's Missing:**
- Real Shopify order sync
- Order fulfillment automation
- Return/refund processing
- Order export functionality

---

### ⚠️ 9. Bulk Upload
**Status:** Partial - UI exists, processing logic incomplete
**Location:** `pages/BulkUpload.jsx`

**What Works:**
- File upload interface (CSV/Excel)
- Upload history view

**What's Missing:**
- CSV parsing and validation
- Bulk product creation
- Error reporting for failed rows
- Template download for CSV format

---

### ⚠️ 10. Calendar & Scheduling
**Status:** Partial - UI exists, integration incomplete
**Location:** `pages/Calendar.jsx`

**What Works:**
- Calendar view interface
- Mock events display

**What's Missing:**
- Integration with workflow schedules
- Event creation/editing
- Reminders and notifications
- Export to external calendars

---

### ⚠️ 11. Custom Alerts
**Status:** Partial - UI exists, alert engine incomplete
**Location:** `pages/CustomAlerts.jsx`

**What Works:**
- Alert configuration UI
- Alert list view

**What's Missing:**
- Real-time monitoring system
- Email/SMS notifications
- Alert condition evaluation engine
- Alert history and acknowledgment

---

## Planned Features - Not Implemented

### ❌ 12. Multi-Platform Support (Beyond Shopify)
**Status:** Not Implemented (UI mockups only)
**Platforms Planned:**
- Etsy
- eBay
- Amazon
- Facebook Marketplace
- WooCommerce

**Current State:**
- Platform connection UI exists but is non-functional
- OAuth callbacks exist for eBay and Facebook but incomplete
- Database schema supports multi-platform via `platform_type` column

**Files (Non-functional):**
- `pages/EbayCallback.jsx`
- `pages/FacebookCallback.jsx`

---

### ❌ 13. Email Marketing
**Status:** Not Implemented
**Location:** `pages/Inbox.jsx` (exists as placeholder)

**Planned Features:**
- Email campaign creation
- Customer segmentation
- Automated email workflows
- Template library
- A/B testing

**Current State:**
- UI exists but shows mock data only

---

### ❌ 14. Advertising Management
**Status:** Not Implemented
**Location:** `pages/Ads.jsx` (exists as placeholder)

**Planned Features:**
- Multi-platform ad campaign management
- Ad creative library
- Performance analytics
- Budget optimization
- ROI tracking

**Current State:**
- UI exists but shows mock data only
- Database tables exist: `ad_campaigns`, `ad_creatives`, `ad_templates`

---

### ❌ 15. Customer Support Features
**Status:** Not Implemented
**Location:** `pages/CustomerSupport.jsx` (exists as placeholder)

**Planned Features:**
- Ticket management
- AI-powered response suggestions
- Customer conversation history
- SLA tracking

**Current State:**
- UI exists but non-functional

---

### ❌ 16. Market Intelligence
**Status:** Not Implemented
**Location:** `pages/Intelligence.jsx` (exists as placeholder)

**Planned Features:**
- Competitor analysis
- Price tracking
- Trend analysis
- Product recommendations

**Current State:**
- UI exists but shows mock data

---

### ❌ 17. Advanced Automation Marketplace
**Status:** Not Implemented
**Location:** `pages/AutomationMarketplace.jsx` (exists as placeholder)

**Planned Features:**
- Community-shared workflow templates
- Paid automation packages
- Template ratings and reviews
- One-click template installation

**Current State:**
- UI mockup only

---

### ❌ 18. Mobile App / Progressive Web App
**Status:** Not Implemented
**Location:** `pages/MobileAutomations.jsx` (exists as placeholder)

**Planned Features:**
- Responsive mobile interface
- Push notifications
- Offline mode
- Mobile-specific features

**Current State:**
- Basic responsive design exists, but no dedicated mobile app

---

### ❌ 19. Printful Integration
**Status:** Not Implemented
**Database tables exist:** `printful_products`, `printful_stores`

**Planned Features:**
- Print-on-demand product sync
- Order fulfillment automation
- Inventory management

**Current State:**
- Database schema ready, no implementation

---

### ❌ 20. API & Webhook System
**Status:** Not Implemented (beyond Shopify webhooks)

**Planned Features:**
- Public API for third-party integrations
- Custom webhook endpoints
- API key management
- Rate limiting and usage analytics

**Current State:**
- Only internal Shopify webhooks implemented (GDPR compliance)

---

## Database Schema

### Implemented Tables

#### Authentication & Users
```sql
auth.users (Supabase built-in)
├── id (UUID, primary key)
├── email (TEXT)
├── encrypted_password
├── user_metadata (JSONB)
│   ├── full_name
│   ├── onboarding_completed
│   ├── user_mode (standard/beta)
│   ├── shopify_beta_access
│   └── vacation_mode_enabled
└── created_at, updated_at
```

#### Platform Connections
```sql
platforms
├── id (UUID)
├── user_id (UUID -> auth.users)
├── platform_type (TEXT: 'shopify', 'etsy', etc.)
├── shop_domain (TEXT)
├── shop_name (TEXT)
├── access_token (TEXT, encrypted)
├── access_scopes (TEXT[])
├── is_active (BOOLEAN)
├── last_synced_at (TIMESTAMPTZ)
├── metadata (JSONB)
└── created_at, updated_at

oauth_states (temporary OAuth validation)
├── id (UUID)
├── state (TEXT, unique)
├── user_id (UUID)
├── shop_domain (TEXT)
├── expires_at (TIMESTAMPTZ)
└── created_at
```

#### Commands & Workflows
```sql
ai_commands
├── id (UUID)
├── user_id (UUID)
├── command_text (TEXT)
├── platform_targets (TEXT[])
├── actions_planned (JSONB)
├── status (TEXT: pending, interpreting, executing, completed, failed)
├── confidence_score (DECIMAL)
├── execution_results (JSONB)
├── error_message (TEXT)
├── executed_at (TIMESTAMPTZ)
└── created_at, updated_at

saved_commands
├── id (UUID)
├── user_id (UUID)
├── name (TEXT)
├── command_text (TEXT)
├── description (TEXT)
├── category (TEXT)
├── is_favorite (BOOLEAN)
├── use_count (INTEGER)
└── last_used_at, created_at, updated_at

ai_workflows
├── id (UUID)
├── user_id (UUID)
├── name (TEXT)
├── description (TEXT)
├── trigger_type (TEXT: schedule, event, manual)
├── trigger_config (JSONB)
├── actions (JSONB) ⚠️ NOTE: Column is 'actions' not 'commands'
├── is_active (BOOLEAN)
├── last_run_at, next_run_at (TIMESTAMPTZ)
├── run_count, success_count, failure_count (INTEGER)
└── created_at, updated_at

workflow_runs
├── id (UUID)
├── workflow_id (UUID -> ai_workflows)
├── status (TEXT: running, completed, failed)
├── started_at, completed_at (TIMESTAMPTZ)
├── execution_results (JSONB)
├── error_message (TEXT)
└── created_at

workflow_templates
├── id (UUID)
├── name (TEXT)
├── description (TEXT)
├── category (TEXT)
├── workflow_data (JSONB)
├── is_featured (BOOLEAN)
└── created_at, updated_at
```

### Tables Defined But Not Implemented

The following tables exist in the schema but are not actively used:
- `ad_campaigns`, `ad_creatives`, `ad_templates` (Advertising)
- `customer_messages`, `customer_profiles` (Customer Support)
- `market_intelligence` (Market Intelligence)
- `security_audits` (Security features)
- `printful_products`, `printful_stores` (Printful integration)
- `email_signups`, `email_logs` (Email marketing)
- `support_tickets` (Support system)
- `automation_triggers`, `automation_actions` (Advanced automation)

---

## API & Edge Functions

### Implemented Edge Functions

Location: `supabase/functions/`

#### 1. `shopify-auth-init`
**Purpose:** Initiates Shopify OAuth flow
**Endpoint:** `/shopify-auth-init`
**Method:** POST
**Status:** ✅ Implemented

#### 2. `shopify-auth-callback`
**Purpose:** Handles OAuth callback and token exchange
**Endpoint:** `/shopify-auth-callback`
**Method:** GET
**Status:** ✅ Implemented

#### 3. `interpret-command`
**Purpose:** AI interpretation of natural language commands
**Endpoint:** `/interpret-command`
**Method:** POST
**Status:** ✅ Implemented (needs AI fine-tuning)

#### 4. `execute-command`
**Purpose:** Execute interpreted commands against platforms
**Endpoint:** `/execute-command`
**Method:** POST
**Status:** ✅ Implemented

#### 5. `shopify-webhook-gdpr-data-request`
**Purpose:** Handle GDPR data request webhooks
**Endpoint:** `/shopify-webhook-gdpr-data-request`
**Method:** POST
**Status:** ✅ Implemented

#### 6. `shopify-webhook-gdpr-redact`
**Purpose:** Handle GDPR customer data redaction
**Endpoint:** `/shopify-webhook-gdpr-redact`
**Method:** POST
**Status:** ✅ Implemented

#### 7. `shopify-webhook-shop-redact`
**Purpose:** Handle GDPR shop deletion
**Endpoint:** `/shopify-webhook-shop-redact`
**Method:** POST
**Status:** ✅ Implemented

### Planned Edge Functions (Not Implemented)

- `execute-workflow` - Workflow execution engine
- `schedule-workflow` - Cron-based workflow scheduler
- `send-notification` - Email/SMS notification sender
- `sync-platform-data` - Platform data synchronization
- `generate-analytics` - Analytics aggregation
- `ai-advisor-chat` - AI advisor backend

---

## Frontend Pages

### Core Application Pages (Implemented & Functional)

| Page | Route | Status | Purpose |
|------|-------|--------|---------|
| Dashboard | `/Dashboard` | ✅ Implemented | Main overview, metrics, quick actions |
| Commands | `/Commands` | ✅ Implemented | AI command interface with history |
| Workflows | `/Workflows` | ✅ Implemented | Workflow management (CRUD operations) |
| Platforms | `/Platforms` | ✅ Implemented | Connect/manage Shopify stores |
| AI Advisor | `/AIAdvisor` | ⚠️ Partial | Business advisor chat (backend placeholder) |
| Settings | `/Settings` | ✅ Implemented | User preferences and configuration |
| History | `/History` | ✅ Implemented | Command execution history |
| Onboarding | `/Onboarding` | ✅ Implemented | Beta user onboarding flow |
| Login | `/Login` | ✅ Implemented | Authentication |
| Signup | `/Signup` | ✅ Implemented | New user registration |

### Feature Pages (UI Exists, Backend Incomplete)

| Page | Route | Status | Notes |
|------|-------|--------|-------|
| Inventory | `/Inventory` | ⚠️ Partial | Mock data, needs Shopify sync |
| Orders | `/Orders` | ⚠️ Partial | Mock data, needs Shopify sync |
| Analytics | `/Analytics` | ⚠️ Partial | Charts exist, needs real data aggregation |
| Listings | `/Listings` | ⚠️ Partial | Product listings (mock data) |
| Bulk Upload | `/BulkUpload` | ⚠️ Partial | UI exists, processing incomplete |
| Calendar | `/Calendar` | ⚠️ Partial | UI exists, integration missing |
| Custom Alerts | `/CustomAlerts` | ⚠️ Partial | UI exists, alert engine missing |

### Placeholder/Demo Pages (Not Functional)

| Page | Route | Status | Notes |
|------|-------|--------|-------|
| Ads | `/Ads` | ❌ Placeholder | Advertising management UI mockup |
| Intelligence | `/Intelligence` | ❌ Placeholder | Market intelligence mockup |
| Inbox | `/Inbox` | ❌ Placeholder | Email marketing mockup |
| Customer Support | `/CustomerSupport` | ❌ Placeholder | Support ticket system mockup |
| Automation Marketplace | `/AutomationMarketplace` | ❌ Placeholder | Template marketplace mockup |

### Business/Investor Pages (Special Purpose)

These pages are for fundraising and business development, not core product features:
- `/ExecutiveSummary`, `/BusinessPlan`, `/RevenueModel`
- `/PitchDeckYC`, `/PitchDeckA16z`, `/PitchDeckAntler`, etc.
- `/ProposalNVNG`, `/ProposalIdeaFund`, `/ProposalWEDC`, etc.
- `/Pricing` (Public pricing page)
- `/TermsOfService`, `/PrivacyPolicy` (Legal pages)

### Callback/OAuth Pages

| Page | Route | Status | Notes |
|------|-------|--------|-------|
| Shopify Callback | `/ShopifyCallback` | ✅ Implemented | OAuth callback handler |
| eBay Callback | `/EbayCallback` | ❌ Incomplete | Placeholder |
| Facebook Callback | `/FacebookCallback` | ❌ Incomplete | Placeholder |

---

## Known Issues & Gaps

### Critical Issues (Resolved)

1. ✅ **RESOLVED:** Workflow creation error - `commands` column not found
   - **Fix:** Updated to use `actions` column (JSONB format)
   - **Files:** `components/workflows/CreateWorkflowModal.jsx`, `components/workflows/WorkflowCard.jsx`

2. ✅ **RESOLVED:** AI Advisor crash - `getWhatsAppConnectURL` not defined
   - **Fix:** Added placeholder function to `agents.js`

3. ✅ **RESOLVED:** Commands page crash - undefined property access
   - **Fix:** Added loading states and null safety checks
   - **File:** `pages/Commands.jsx`

### Current Known Issues

1. **Workflow Execution Engine Not Scheduled**
   - Workflows can be created but don't run automatically
   - Need cron scheduler integration for scheduled workflows
   - Event-based triggers not implemented

2. **AI Command Interpretation Needs Tuning**
   - Basic interpretation works but needs fine-tuning for complex commands
   - Limited context awareness
   - No conversation memory

3. **Platform Sync Performance**
   - No background sync for Shopify data
   - Manual refresh required
   - No real-time webhook processing (except GDPR)

4. **Analytics Data Incomplete**
   - Some metrics use mock data
   - No data export functionality
   - Limited date range filtering

5. **No Multi-Platform Support**
   - Only Shopify works
   - Other platforms are UI mockups only

### Gaps with Original Specifications

**Original Vision:** Multi-platform e-commerce automation hub
**Current Reality:** Shopify-focused automation tool

**Feature Gaps:**

| Planned Feature | Current Status | Gap Description |
|----------------|----------------|-----------------|
| Multi-Platform Support | Not Implemented | Only Shopify works; Etsy, eBay, Amazon are mockups |
| AI Business Advisor | Partial | Chat UI exists but backend is placeholder |
| Email Marketing | Not Implemented | UI mockup only, no email sending |
| Ad Campaign Management | Not Implemented | UI mockup only |
| Market Intelligence | Not Implemented | UI mockup only |
| Customer Support System | Not Implemented | UI mockup only |
| Automation Marketplace | Not Implemented | UI mockup only |
| Mobile App | Not Implemented | Web app only, no PWA |
| Public API | Not Implemented | No API for third-party integrations |
| Advanced Analytics | Partial | Basic metrics only, no ML-powered insights |

**Technical Debt:**

1. **Mock Data Throughout Codebase**
   - Many pages use `mockData.js` instead of real API calls
   - Need to replace with Supabase queries

2. **Incomplete Error Handling**
   - Some components lack error boundaries
   - Network errors not always gracefully handled

3. **No Test Coverage**
   - No unit tests or integration tests
   - Manual testing only

4. **Performance Optimizations Needed**
   - No pagination on large lists
   - No lazy loading for images
   - Bundle size not optimized

5. **Security Hardening**
   - Access tokens in database (should use Supabase Vault)
   - Rate limiting not implemented
   - No audit logging for sensitive operations

---

## Technical Architecture

### Frontend Architecture

**Framework:** React 18 (Vite)
**Routing:** React Router v7
**State Management:** React hooks (useState, useEffect, useContext)
**UI Components:** Radix UI + Tailwind CSS
**Forms:** React Hook Form + Zod validation
**API Client:** Custom wrapper around Supabase client

**Key Files:**
- `main.jsx` - Application entry point
- `App.jsx` - Root component with routing
- `pages/index.jsx` - Page routing configuration
- `api/base44Client.js` - API client wrapper
- `api/supabaseClient.js` - Supabase configuration
- `api/supabaseEntities.js` - Database entity wrappers

### Backend Architecture

**Database:** Supabase (PostgreSQL)
**Authentication:** Supabase Auth
**File Storage:** Supabase Storage (configured but not used)
**Serverless Functions:** Supabase Edge Functions (Deno)
**Hosting:** Vercel (frontend), Supabase (backend)

**Edge Function Stack:**
- **Runtime:** Deno
- **Language:** TypeScript
- **HTTP Framework:** Supabase Edge Functions API

### Data Flow

```
User Input (UI)
    ↓
React Component
    ↓
API Client (base44Client.js)
    ↓
Supabase Client
    ↓
[Option A] Direct Database Query (Supabase PostgREST)
[Option B] Edge Function (Supabase Functions)
    ↓
Database (PostgreSQL)
    ↓
Response back up the chain
```

### Deployment Architecture

**Frontend (Vercel):**
- Build: `npm run build` (Vite)
- Deploy: Git push to `main` branch
- CDN: Vercel Edge Network
- Environment Variables: Vercel dashboard

**Backend (Supabase):**
- Database: Managed PostgreSQL
- Edge Functions: Deploy via Supabase CLI
- Environment Variables: Supabase dashboard

**Domain:**
- Production: `tandril-beta.vercel.app` (or custom domain)
- Supabase URL: `[project-id].supabase.co`

---

## Development Workflow

### Local Development

```bash
# Install dependencies
npm install

# Start dev server (frontend)
npm run dev

# Deploy edge functions (backend)
supabase functions deploy [function-name]

# Run database migrations
supabase db push
```

### Environment Variables Required

**Frontend (.env):**
```
VITE_SUPABASE_URL=https://[project-id].supabase.co
VITE_SUPABASE_ANON_KEY=[anon-key]
VITE_SHOPIFY_CLIENT_ID=[shopify-api-key]
VITE_SHOPIFY_API_SCOPES=read_products,write_products,...
```

**Edge Functions (.env):**
```
SHOPIFY_CLIENT_SECRET=[shopify-api-secret]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]
```

### Git Branching Strategy

- `main` - Production branch (auto-deploys to Vercel)
- `claude/*` - Feature branches created by Claude Code
- Feature branches merged to `main` after testing

---

## Next Steps for Development

### Immediate Priorities (For Beta Launch)

1. ✅ Fix critical bugs blocking demo video
2. ⏳ Record Loom demo video for Shopify submission
3. ⏳ Complete Shopify app listing (feature media, screenshots)
4. ⏳ Submit to Shopify App Store for review

### Short-Term (Post-Launch)

1. Implement workflow execution engine (cron scheduler)
2. Fine-tune AI command interpretation
3. Add background sync for Shopify data
4. Implement real-time analytics aggregation
5. Add comprehensive error handling and logging

### Medium-Term (Next 3-6 Months)

1. Add second platform (Etsy or WooCommerce)
2. Implement AI Business Advisor backend
3. Build automation marketplace
4. Add email marketing features
5. Implement public API

### Long-Term (6-12 Months)

1. Multi-platform support (all major e-commerce platforms)
2. Mobile app (React Native or PWA)
3. Advanced ML-powered features (demand forecasting, price optimization)
4. Enterprise features (team collaboration, role-based access)
5. White-label solution for agencies

---

## Documentation Files

| File | Purpose |
|------|---------|
| `README.md` | Project overview and setup instructions |
| `FEATURES.md` | **This file** - Comprehensive feature documentation |
| `SHOPIFY_SETUP.md` | Shopify app configuration and GDPR compliance |
| `VERCEL_DEPLOYMENT.md` | Vercel deployment instructions |
| `supabase/migrations/001_create_shopify_tables.sql` | Database schema definition |

---

## Support & Contact

For development questions or feature clarification:
- Check this documentation first
- Review code comments in relevant files
- Consult Shopify API documentation for platform limitations
- Review Supabase documentation for backend capabilities

**Key Contacts:**
- Product Owner: Sarah (sarahliz0715)
- Development Support: Base44 team (app@base44.com)

---

**Document Version:** 1.0
**Last Updated:** 2025-12-20
**Maintained By:** Claude Code + Development Team

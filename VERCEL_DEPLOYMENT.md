# Deploying Tandril to Vercel

This guide will help you deploy Tandril to Vercel as an alternative to Base44 hosting.

## 🎯 Two Deployment Modes

Tandril can run in two modes:

### 1. **Standalone Mode** (Recommended for Vercel)
- ✅ No Base44 authentication required
- ✅ Uses mock/demo data
- ✅ Perfect for demos, testing, or standalone deployment
- ✅ Set `VITE_STANDALONE_MODE=true`

### 2. **Base44 Connected Mode**
- 🔐 Requires Base44 authentication
- 📊 Uses real Base44 data and API
- 🔗 Full platform integration
- 🔧 Set `VITE_STANDALONE_MODE=false` (or omit the variable)

**For Vercel deployment, we recommend Standalone Mode to avoid authentication redirects.**

## Prerequisites

- A [Vercel account](https://vercel.com/signup) (free tier available)
- [Vercel CLI](https://vercel.com/docs/cli) installed (optional, for command-line deployment)
- Git repository connected to GitHub, GitLab, or Bitbucket

## Option 1: Deploy via Vercel Dashboard (Recommended)

### Step 1: Push to Git Repository

Make sure your code is pushed to a Git repository (GitHub, GitLab, or Bitbucket).

```bash
git push origin claude/vercel-deployment-01Eupymf41jm4hp8DNxgq5K6
```

### Step 2: Import Project to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Import your Git repository
4. Select the branch: `claude/vercel-deployment-01Eupymf41jm4hp8DNxgq5K6`

### Step 3: Configure Project

Vercel will auto-detect the Vite framework. Verify these settings:

- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### Step 4: Environment Variables (**REQUIRED for Standalone Mode**)

**IMPORTANT:** To run Tandril on Vercel without Base44 authentication, you MUST set this environment variable:

1. Go to **Project Settings** → **Environment Variables**
2. Click **Add New**
3. Add the following variable:
   - **Name**: `VITE_STANDALONE_MODE`
   - **Value**: `true`
   - **Environment**: Production (and Preview if you want)

This enables demo/standalone mode with mock data instead of requiring Base44 login.

**Optional variables** (only needed if connecting to Base44):
   - `VITE_API_BASE_URL` - Base44 API endpoint
   - `VITE_BASE44_API_KEY` - Base44 API key

See `.env.example` for all available variables.

### Step 5: Deploy

Click **"Deploy"** and Vercel will:
- Install dependencies
- Run the build process
- Deploy your application
- Provide a production URL (e.g., `https://tandril.vercel.app`)

## Option 2: Deploy via Vercel CLI

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Login to Vercel

```bash
vercel login
```

### Step 3: Set Environment Variables

Create a `.env.production` file in your project root:

```bash
echo "VITE_STANDALONE_MODE=true" > .env.production
```

### Step 4: Deploy

For the first deployment:

```bash
vercel
```

Follow the prompts:
- **Set up and deploy?** Y
- **Which scope?** Select your account/team
- **Link to existing project?** N (for first time)
- **Project name:** tandril (or your preferred name)
- **Directory:** ./ (default)

For subsequent deployments:

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

**Note:** After the first deployment, go to the Vercel dashboard and add the `VITE_STANDALONE_MODE=true` environment variable to ensure it persists across deployments.

## Configuration Files Included

### `vercel.json`

Configures Vercel-specific settings:
- SPA routing (all routes redirect to index.html)
- Static asset caching
- Build and output directories

### `.env.example`

Template for environment variables. Copy to `.env.local` for local development:

```bash
cp .env.example .env.local
```

## Differences from Base44 Deployment

### Similarities:
- Same build process (`npm run build`)
- Same React + Vite stack
- Same dependencies

### Key Differences:

1. **Hosting Platform**: Vercel instead of Base44
2. **Environment Variables**: Set in Vercel dashboard instead of Base44 config
3. **Custom Domain**: Configure via Vercel domain settings
4. **CDN**: Vercel's global edge network (automatic)
5. **SSL**: Automatic HTTPS with Vercel

## Custom Domain Setup

1. Go to **Project Settings** → **Domains**
2. Add your custom domain
3. Configure DNS records as instructed by Vercel
4. Vercel will automatically provision SSL certificate

## Automatic Deployments

Vercel automatically deploys:
- **Production**: When you push to your main/production branch
- **Preview**: When you push to other branches or open PRs

To configure which branch triggers production deployments:
1. Go to **Project Settings** → **Git**
2. Set your **Production Branch**

## Monitoring and Logs

Access deployment logs and runtime logs:
1. Go to your project in Vercel Dashboard
2. Click **Deployments** to see deployment history
3. Click any deployment to view build logs
4. Use **Runtime Logs** for application logs

## Troubleshooting

### Build Fails

Check the build logs in Vercel dashboard. Common issues:
- Missing environment variables
- Dependency installation failures
- Build script errors

### 404 on Routes

Ensure `vercel.json` has the SPA rewrite rule (already included in this setup).

### Environment Variables Not Working

- Ensure variables are prefixed with `VITE_` (Vite requirement)
- Redeploy after adding environment variables
- Check they're set for the correct environment (Production/Preview/Development)

## Rollback

To rollback to a previous deployment:
1. Go to **Deployments**
2. Find the working deployment
3. Click **"..."** → **"Promote to Production"**

## Local Development

Nothing changes for local development:

```bash
npm install
npm run dev
```

## Support

- [Vercel Documentation](https://vercel.com/docs)
- [Vite Documentation](https://vitejs.dev/)
- [Vercel Community](https://github.com/vercel/vercel/discussions)

## Next Steps

After successful deployment:

1. ✅ Test all routes and functionality
2. ✅ Configure custom domain (optional)
3. ✅ Set up environment variables
4. ✅ Enable Vercel Analytics (optional)
5. ✅ Configure team access (optional)

# Tandril
My awesome project on Base44

## What it does
AI agent tool for automating workflows and multiplatform e-commerce management

## How to run locally
1. Clone the repo.
2. Install dependencies: `npm install`
3. Run `npm run dev`

## Deployment Options

### Deploy to Base44
For more information and support, please contact Base44 support at app@base44.com.

### Deploy to Vercel
See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for detailed instructions on deploying to Vercel.

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

# ProjoFlow — Self-Hosted Project Management

**White-label project management for agencies and consultancies.**  
One-time license · Self-hosted · Full branding · Native AI integration (MCP)

---

## 🔐 License Required

**This is open-source code, but requires a valid license key to use.**

- 📦 **Purchase:** [Get your license](https://projoflow.com/purchase)
- 🔑 **License key** required during setup
- 💰 **One-time payment** — no recurring fees
- 🔄 **Free updates forever**

---

## 🚀 What You Get

- ✅ **Full source code** (Next.js, React, TypeScript, Supabase)
- ✅ **MCP server** for AI assistant integration (Claude Code, Cursor, Cline)
- ✅ **White-label branding** system (logo, colors, workspace name)
- ✅ **Client portal** with role-based access
- ✅ **Time tracking & billing**
- ✅ **@Mentions, comments, file attachments**
- ✅ **Free updates forever** (via GitHub)
- ✅ **Lifetime license** (one-time payment)

---

## 📦 What's Included

### Core Features
- **Projects & Tasks** — Full project lifecycle management
- **Time Tracking** — Billable hours, project rates, reporting
- **Client Portal** — Secure client access with invitations
- **Team Collaboration** — @Mentions, threaded comments, real-time updates
- **File Attachments** — Per-task file uploads (Supabase Storage)
- **Custom Branding** — Logo, colors (light/dark themes), workspace name
- **MCP Server** — Native AI assistant integration (no API setup needed)

### Tech Stack
- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Auth + Storage + Realtime)
- **AI Integration:** Model Context Protocol (MCP) server
- **Deployment:** Vercel-ready (or Railway, Render, self-hosted)

---

## ⚙️ Quick Start

### Prerequisites
- **Valid ProjoFlow license key** ([purchase here](https://projoflow.com/purchase))
- Node.js 20+ and npm/pnpm/yarn
- Supabase account (free tier works)
- Vercel account (optional, for one-click deploy)

### Option 1: One-Click Deploy (Vercel)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/mahmoudsheikh94/projoflow-selfhosted)

1. Click the button above
2. Connect your GitHub account
3. Create a Supabase project
4. Add environment variables (see below)
5. Deploy!
6. Visit `/setup` and **enter your license key**
7. Complete setup wizard 🎉

### Option 2: Manual Setup

1. **Clone the repo**
   ```bash
   git clone https://github.com/mahmoudsheikh94/projoflow-selfhosted.git
   cd projoflow-selfhosted
   npm install
   ```

2. **Create Supabase project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Copy your project URL and anon key

3. **Set environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   RESEND_API_KEY=re_... # Optional, for email invitations
   ```

4. **Run database migrations**
   ```bash
   # Using Supabase CLI (recommended)
   npx supabase link --project-ref your-project-ref
   npx supabase db push

   # OR manually: Copy SQL from supabase/migrations/*.sql
   # and run in Supabase SQL Editor
   ```

5. **Run the setup wizard**
   ```bash
   npm run dev
   # Visit http://localhost:3000/setup
   # Enter your license key
   # Setup database migrations
   # Create your admin account
   ```

6. **Deploy to Vercel**
   ```bash
   npx vercel
   ```

---

## 🎨 Branding Customization

### Logo & Colors
1. Log in to your ProjoFlow instance
2. Go to **Settings → Branding**
3. Upload your logo
4. Customize colors (light and dark themes)
5. Changes apply instantly across all users

### Theme System
ProjoFlow includes a full CSS variable-based theming system:
- 9 customizable colors per theme (light/dark)
- 40+ components styled with theme variables
- Persistent per-workspace (stored in `workspace_settings`)

---

## 🤖 AI Integration (MCP Server)

### What is MCP?
ProjoFlow includes a [Model Context Protocol](https://modelcontextprotocol.io) server that lets AI assistants natively interact with your projects.

### Supported Assistants
- **Claude Code** (OpenClaw, Claude Desktop)
- **Cursor**
- **Cline** (VS Code extension)
- Any MCP-compatible client

### Setup
1. Navigate to `/mcp-server` folder
2. Follow `mcp-server/README.md` for configuration
3. Add ProjoFlow as an MCP server in your AI assistant settings
4. Your AI can now create tasks, log time, update projects, etc.

**Example commands:**
- "Create a task in Project X called 'Fix login bug'"
- "Log 2 hours to the homepage redesign task"
- "Show me all tasks assigned to John"

---

## 📚 Documentation

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** — Detailed deployment guide
- **[LICENSE.md](./LICENSE.md)** — License terms & restrictions
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** — How to contribute
- **[mcp-server/README.md](./mcp-server/README.md)** — MCP server setup

---

## 🔒 Security

- **Row-level security (RLS)** enabled on all tables
- **Per-workspace isolation** (no cross-tenant data leakage)
- **Auth handled by Supabase** (OAuth, magic links, email/password)
- **Environment variables** for secrets (never commit credentials)

---

## ❓ FAQ

### Can I use this without a license?
No. While the source code is publicly viewable, the setup wizard requires a valid license key to proceed. You won't be able to complete installation without one.

### What if I lose my license key?
Email support@projoflow.com with your purchase email and we'll resend it.

### Can I use one license for multiple deployments?
Yes! The license is per entity (your agency/company), not per deployment. Use it for all your client projects.

### Do I need to keep the license key after setup?
No. The license is validated once during setup. After that, you can delete it from your records (but we recommend keeping it safe for future deployments).

---

## 🤝 Support

### First 100 Licenses
Email support included for 90 days from purchase.  
**Contact:** support@projoflow.com

### After License #100
- **Documentation:** This README + deployment guides
- **Community:** Discord (invite in your license email)
- **Source Code:** You have it — hire your own developers if needed

---

## 📜 License

**One-time purchase · Perpetual use · Free updates**

See [LICENSE.md](./LICENSE.md) for full terms.

**TL;DR:**
- ✅ Use for your agency/company
- ✅ Deploy for all your clients
- ✅ Modify and white-label
- ✅ Free updates forever
- ❌ Do NOT resell the source code
- ❌ Do NOT create competing SaaS

---

## 🛠️ Tech Details

### Environment Variables
```env
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Email (optional — for client invitations)
RESEND_API_KEY=re_...
```

### Database
ProjoFlow uses Supabase (PostgreSQL) with the following schema:
- `workspaces` — Tenant isolation
- `projects` — Client projects
- `tasks` — Task management
- `time_entries` — Time tracking
- `clients` — Client organizations
- `client_users` — Client portal access
- `workspace_settings` — Branding & configuration

All migrations are in `supabase/migrations/`.

---

## 🎯 Roadmap

**Current version:** 1.0.0

**Coming soon:**
- Gantt chart view
- Budget tracking
- Invoicing automation
- Mobile app (React Native)
- Additional MCP tools (calendar, email, etc.)

Updates will be pushed to GitHub. You control when to pull and deploy them.

---

## 💬 Questions?

**Pre-sales:** sales@projoflow.com  
**Support (first 100 licenses):** support@projoflow.com  
**License questions:** legal@projoflow.com

---

**Built with ❤️ for agencies who value ownership.**

© 2025 ProjoFlow. All rights reserved.

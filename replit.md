# Craflect - AI Content Intelligence Platform

## Overview
Craflect is a modern SaaS content intelligence platform for AI-powered content repurposing, daily briefs, workspace management, and analytics. Built with a dark-first aesthetic using neon purple (#7C5CFF) branding.

## Stack
- **Frontend**: React + TypeScript + Tailwind CSS + shadcn/ui + Framer Motion
- **Backend**: Express/Node.js + TypeScript
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: Google OAuth via passport-google-oauth20 (no Replit Auth branding)
- **AI**: OpenAI via Replit AI Integrations (`gpt-5.2`, `max_completion_tokens`)
- **Routing**: wouter (frontend), Express (backend)

## Architecture
```
client/src/
├── assets/           # logo-color.png, logo-transparent.png
├── components/       # app-sidebar.tsx, layout.tsx, ui/
├── hooks/            # use-auth.ts, use-theme.ts, use-workspaces.ts, use-toast.ts
├── lib/              # queryClient.ts
├── pages/            # landing.tsx, dashboard.tsx, library.tsx, briefs.tsx, analytics.tsx, settings.tsx
server/
├── replit_integrations/auth/  # replitAuth.ts (Google OAuth), storage.ts, routes.ts
├── replit_integrations/chat/  # AI chat integration
├── routes.ts         # API routes
├── storage.ts        # IStorage interface
├── db.ts             # Drizzle DB connection
shared/
├── schema.ts         # Drizzle schemas (workspaces, content_sources, generated_content, briefs, etc.)
├── models/auth.ts    # users + sessions tables
├── routes.ts         # API route definitions with Zod validation
```

## Auth
- Google OAuth only (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)
- Session stored in PostgreSQL via connect-pg-simple
- User ID from `req.user.id` (Google profile ID)
- Login: GET /api/login → Google OAuth → /api/auth/google/callback → /dashboard
- Logout: GET /api/logout

## Theme
- Dark mode by default (`class="dark"` on html element)
- Light/dark toggle via useTheme hook (persisted to localStorage)
- CSS variables in :root (light) and .dark (dark) in index.css
- Logo: logo-transparent.png (dark), logo-color.png (light)

## Key Patterns
- Workspaces belong to users (ownerId)
- Content sources belong to workspaces
- Generated content belongs to sources
- Briefs belong to workspaces
- All protected routes use `isAuthenticated` middleware

## Environment Variables
- DATABASE_URL (auto)
- GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
- SESSION_SECRET
- AI_INTEGRATIONS_OPENAI_API_KEY, AI_INTEGRATIONS_OPENAI_BASE_URL (auto)

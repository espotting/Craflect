# Craflect - AI Content Intelligence & Creation Platform

## Overview
Craflect is an AI-powered content intelligence and creation platform focused on short-form video analysis (TikTok, Instagram Reels, YouTube Shorts). Its vision is to streamline the entire content creation pipeline from trend identification to video publication: Trend → Opportunity → Create Script → Create Video → Publish. Key capabilities include a Viral Opportunity Engine, a unified content library, idea generation, an AI Script Generator, an AI Video Builder, and comprehensive project management. The platform aims to provide a complete solution for creators to capitalize on viral trends.

## User Preferences
- Priorité au développement itératif
- **AUCUNE modification (ajout/suppression de fonctionnalité, données, ou code) sans validation préalable explicite**
- **AUCUNE suppression de données sans validation préalable**
- Toutes les réponses en français
- Dark-first aesthetic, neon purple (#7C5CFF)
- Ne pas modifier `replit_integrations/auth/` et `replit_integrations/chat/` sans approbation

## System Architecture
The application uses a React, TypeScript, Tailwind CSS, shadcn/ui, and Framer Motion frontend. The backend is built with Express/Node.js, using PostgreSQL with Drizzle ORM for data persistence. Authentication is handled via Google OAuth and Email/Password. OpenAI (gpt-4.1-mini) is integrated for AI functionalities.

The system employs a dual schema approach:
- **Legacy tables**: `video_primitives`, `niche_patterns`, `niche_statistics`, `niche_profiles`, `workspace_intelligence` are used by the current frontend. These tables utilize a 4-dimensional taxonomy (VP_HOOK_TYPES, FORMAT_TYPES, ANGLE_CATEGORIES, STRUCTURE_MODELS).
- **Craflect Taxonomy v1 tables**: `videos`, `viral_patterns`, `patterns`, `saved_ideas`, `content_projects` support the stable pipeline, Pattern Engine, and new features, based on a layered taxonomy. Both schema co-exist.
- **Geo Intelligence**: Table `geo_zones` (6 zones: US, UK, EU-FR, EU-ES, EU-DE, LATAM). Table `videos` has geo columns: `geo_zone`, `geo_country`, `geo_language`, `target_markets` (text array with GIN index).

The platform features a dual interface layer:
- **Creator Mode** (default): Focuses on action and creation (Home with Viral Play of the Day + Trending Videos, Opportunities grid, Studio/Create with 5 modes, Workspace).
- **Intelligence Mode**: Stats cards, Top Patterns, Trending Topics, Hook Performance — toggled from Home page header.

Key UI components include:
- `VideoCardV2` (`video-card-v2.tsx`): Hover actions (Create Similar, Analyze, Save), compact mode, virality badge.
- `OpportunityCard` (`opportunity-card.tsx`): Featured (Viral Play) and compact versions.
- `ViralityBadge` (`virality-badge.tsx`): Red 90+, Orange 80+, Yellow 60+, Slate default.
- `StatusBadge` (`status-badge.tsx`): idea/script/blueprint/completed states.
- `GuidedWorkflow` (`guided-workflow.tsx`): Sticky bottom bar, 4 steps (Idea→Script→Blueprint→Export).
- `PaywallModal` (`paywall-modal.tsx`): Dialog-based upgrade prompt for Free users on export.
- `getPredictedViews` utility for calculating virality scores and view ranges.
- `DashboardLayout` for authenticated views with a sidebar.

## Studio / Create Page
5 creation modes: Opportunity (Recommended), Script-to-Video, Viral Templates, AI Avatar, Video Remix (Pro/Coming Soon disabled). Each mode enters the 4-step wizard (Idea→Script→Blueprint→Export). PaywallModal blocks export for Free users.

## AI Credits System
- Credit costs: idea=1, script=1, blueprint=1, template_render=2, avatar=3
- Plan credits: Free=30/month, Creator=250/month, Pro=1500/month
- estimatedVideos = credits / 3
- Credit rollover: max 2 months

## Pricing
- Free: $0, 30 credits, preview only (no export)
- Creator: $24/mo ($19/mo yearly), 250 credits
- Pro: $109/mo ($99/mo yearly), 1500 credits

The user onboarding process involves 5 steps: intro, niche selection, creator profile setup, AI analysis, and initial viral idea generation.

API endpoints are designed for aggregated dashboard data, viral opportunity engine, idea management, AI credit system, AI generation (script, blueprint, viral idea), aggregated home and opportunities data, intelligence feed, viral templates, content remixing, predicted views, and projects CRUD operations.

An internal Twin API allows external agents to interact with the platform for video ingestion, classification, trend scoring, and pattern detection.

Admin functionalities include a Founder Dashboard, logs, and system settings, with distinct navigation and route protection. Admin login requires a 6-digit code verification.

## External Dependencies
- OpenAI (gpt-4.1-mini)
- PostgreSQL
- Google OAuth
- Stripe (@stripe/react-stripe-js)
- bcryptjs
- connect-pg-simple
- wouter
- Express
- framer-motion
- nodemailer
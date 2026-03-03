# Craflect - Content Performance Intelligence Platform

## Overview
Craflect is a content performance intelligence platform designed to analyze short-form video content (TikTok, Instagram, YouTube) to identify successful patterns (hooks, formats, structures) within specific niches. Its primary purpose is to generate optimized content recommendations based on these insights, enabling users to reproduce effective strategies. The platform's core vision is "Show me what works → Tell me what to post → Create it for me." The MVP focuses on URL-based ingestion for content analysis.

## User Preferences
I want to prioritize iterative development.
I prefer detailed explanations of complex concepts, especially regarding AI analysis and scoring.
I need clear communication regarding the status and progress of tasks.
Ask for confirmation before making any major architectural changes or introducing new external dependencies.
Ensure that all generated content, particularly AI-generated recommendations, adheres strictly to the identified niche patterns and avoids speculative outputs.
Do not make changes to any files or folders related to `replit_integrations/auth/` and `replit_integrations/chat/` without explicit approval.
I prefer a dark-first aesthetic for the UI, using neon purple (#7C5CFF) as the branding color.

## System Architecture
The application is built with a React, TypeScript, Tailwind CSS, shadcn/ui, and Framer Motion frontend, an Express/Node.js backend, PostgreSQL with Drizzle ORM, and Google OAuth for authentication. OpenAI (gpt-4.1-mini) is utilized for AI integrations.

**UI/UX Decisions:**
- Dark mode is default, with a toggle for light mode.
- Branding uses neon purple (#7C5CFF).
- A 4-step onboarding process guides users through niche selection and initial URL ingestion.
- Key dashboards and analytics feature a "Global Signal / Your Dataset" toggle to switch between aggregated and personal data views.
- Internationalization is supported for English and French, with language persistence via local storage.

**Technical Implementations:**
- **Authentication:** Google OAuth, Email/Password with OTP verification, bcryptjs for password hashing, and PostgreSQL for session storage.
- **Data Model:** Drizzle ORM manages a PostgreSQL database with schemas for workspaces, content sources, generated content, briefs, performance, events, niches, creators, video primitives, niche patterns, niche statistics, and niche profiles.
- **Intelligence Layer:**
    - **Ingestion Pipeline:** Processes URLs, scrapes public metadata, and uses an LLM for video primitive classification (hookType, narrativeStructure, contentAngle, contentFormat, performanceScore). Metrics are scraped only, never simulated by AI.
    - **Pattern Aggregator:** Calculates distribution, stability, and confidence scores for niche patterns.
    - **Scoring Engine:** Computes "Confidence" (based on volume, consistency, stability) and "Signal Strength," and determines "Intelligence Status" (Building, Active, Mature).
    - **Profile Generator:** LLM-generates niche intelligence summaries and strategic recommendations.
- **Content Source Processing:** AI extracts pattern features using closed taxonomies (e.g., HOOK_TYPES, STRUCTURE_MODELS), ensuring consistent categorization.
- **Hybrid Intelligence:** Supports both 'Global Intelligence' (admin-ingested niche data, sourceType='admin') and 'Workspace Intelligence' (user's personal dataset, sourceType='user'). All data flows through the unified `video_primitives` table. Content sources are automatically converted to video primitives upon analysis. The `workspace_intelligence` table caches per-workspace scoring.
    - **Data State:** Single niche "Influencer / Creator Economy" (public, id=504c98ef), 10 admin primitives (Global Signal), 6 user primitives across workspaces. Workspace "KT" (fed26535) has 5 user primitives.
- **Stripe Billing:** Integrated for subscription management, product/price creation, and webhook handling for subscription status updates.
- **Scraping:** Lightweight public metadata scraping (title, description, views, likes, etc.) is non-blocking and continues analysis even if full metadata is unavailable. SSRF protection is implemented.

**Key Features:**
- **Dashboard:** Displays Niche Intelligence Status, Quick Snapshot of dominant patterns, and a CTA for Data Breakdown.
- **Analyzed Content (Library):** Manages ingested URLs, displays source cards with metrics and AI tags, with filtering and sorting options.
- **Insights (Briefs):** Provides Niche Intelligence Profiles, Winning Patterns, and actionable recommendations.
- **Analytics (Learning Loop):** Tracks content creation, signal strength, and confidence over time.
- **Niche Data:** Presents detailed distribution tables for patterns and confidence computation.
- **Admin Panel:** Offers KPI cards, user management, and an event feed.
- **Event Tracking:** Instruments user actions like content uploads, brief generation, and analytics viewing.

## External Dependencies
- **OpenAI:** Used for AI integrations (gpt-4.1-mini) for content classification and generation.
- **PostgreSQL:** Primary database for all application data.
- **Google OAuth:** For user authentication.
- **Stripe:** For managing subscriptions, payments, and customer portals.
- **bcryptjs:** For hashing user passwords.
- **connect-pg-simple:** For storing session data in PostgreSQL.
- **wouter:** Frontend routing.
- **Express:** Backend routing.
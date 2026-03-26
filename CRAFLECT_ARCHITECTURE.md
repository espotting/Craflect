# Craflect — Architecture Technique Complète

## 1. Vision Produit

**Craflect** est une plateforme d'intelligence de contenu viral alimentée par l'IA. Elle analyse des milliers de vidéos courtes (TikTok) pour identifier les patterns qui fonctionnent et générer des opportunités de création actionnables.

**Pipeline principal** : Discover → Opportunity → Create → Publish

**Proposition de valeur** : Transformer la data brute de TikTok en stratégie de contenu intelligente.

---

## 2. Architecture Bi-Serveur

```
┌──────────────────────────────────────────────────────────────────┐
│                        HETZNER (16GB)                            │
│                   Workers + Processing                           │
│                                                                  │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │  PostgreSQL  │  │    Redis     │  │       Ollama           │  │
│  │  (local DB)  │  │  (BullMQ)   │  │  (llama3.1:8b local)   │  │
│  └──────┬───────┘  └──────┬──────┘  └───────────┬────────────┘  │
│         │                 │                     │                │
│  ┌──────┴─────────────────┴─────────────────────┴──────────┐    │
│  │                    Workers (BullMQ)                       │    │
│  │                                                          │    │
│  │  Ingestion ──→ Transcription ──→ Classification          │    │
│  │  (Apify)      (faster-whisper)   (Ollama → OpenAI)       │    │
│  │                                                          │    │
│  │  Scoring ──→ Pattern Engine ──→ Phase Transition          │    │
│  │  (15min)      (6h)               (30min)                  │    │
│  │                                                          │    │
│  │  Sync-to-Replit (15min) ─────────────────────────────┐   │    │
│  └──────────────────────────────────────────────────────┤   │    │
│                                                         │   │    │
└─────────────────────────────────────────────────────────┤───┘────┘
                                                          │
                              HTTPS POST (batches de 20)  │
                              Bearer SYNC_API_KEY         │
                                                          ▼
┌──────────────────────────────────────────────────────────────────┐
│                     REPLIT (craflect.com)                         │
│                    App + API + Frontend                           │
│                                                                  │
│  ┌──────────────┐  ┌──────────────────────────────────────────┐  │
│  │  PostgreSQL   │  │          Express API                     │  │
│  │  (Replit DB)  │◄─┤  /api/sync/{videos,classifications,...} │  │
│  │              │  │  /api/auth, /api/home, /api/create, ...  │  │
│  └──────┬───────┘  └──────────────────────────────────────────┘  │
│         │                                                        │
│  ┌──────┴──────────────────────────────────────────────────────┐  │
│  │                   React Frontend (Vite)                     │  │
│  │  Dashboard, Discover, Opportunities, Studio, Library, ...   │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Structure du Projet

```
craflect/
├── client/
│   └── src/
│       ├── pages/                    # 40 pages (dashboard, discover, create...)
│       │   ├── dashboard.tsx         # Home — Viral Play + Trending + Opportunities
│       │   ├── discover.tsx          # Exploration de vidéos
│       │   ├── opportunities.tsx     # Opportunités détectées par Pattern Engine
│       │   ├── create.tsx            # Studio de création (AI-powered)
│       │   ├── library.tsx           # Bibliothèque de vidéos analysées
│       │   ├── landing.tsx           # Landing page publique
│       │   ├── founder-dashboard.tsx # Admin panel (/system/founder)
│       │   └── ...
│       ├── components/
│       │   ├── video-card-v2.tsx     # Card vidéo avec virality badge
│       │   ├── opportunity-card.tsx  # Card opportunité avec trend indicator
│       │   ├── app-sidebar.tsx       # Navigation latérale
│       │   └── ...
│       └── hooks/
│           ├── use-language.ts       # i18n (EN/FR)
│           └── use-toast.ts
│
├── server/
│   ├── index.ts                      # Express bootstrap (body parser, middleware)
│   ├── routes.ts                     # 4185 lignes — toutes les API routes
│   ├── storage.ts                    # Interface CRUD (Drizzle ORM)
│   ├── sync-routes.ts               # 5 endpoints sync sécurisés (SYNC_API_KEY)
│   ├── stripe.ts                     # Intégration Stripe (plans, webhooks)
│   ├── email.ts                      # SMTP transactionnel
│   ├── db.ts                         # Pool PostgreSQL
│   │
│   └── workers/                      # Tous tournent sur Hetzner uniquement
│       ├── scheduler.ts              # Crons BullMQ (ingestion 2h, scoring 15m...)
│       ├── ingestion.worker.ts       # Apify TikTok scraper → DB
│       ├── transcription.worker.ts   # curl/yt-dlp → ffmpeg → faster-whisper
│       ├── classification.worker.ts  # Ollama (local) → fallback OpenAI gpt-4.1-mini
│       ├── scoring.worker.ts         # Calcul virality_score, engagement_rate
│       ├── pattern.worker.ts         # Détection patterns multi-dimensionnels
│       ├── phase-transition.worker.ts# Phases 1→2→3 (500/2000 vidéos classifiées)
│       ├── sync-to-replit.worker.ts  # Push Hetzner → Replit (batches paginés)
│       └── requeue-pending.ts        # Script utilitaire de re-queue
│
├── shared/
│   └── schema.ts                     # 1159 lignes — Drizzle ORM schema (40+ tables)
│
├── migrations/
│   ├── 0001_cleanup.sql              # TRUNCATE legacy (Hetzner only)
│   ├── 0002_geo_v2.sql               # Geo zones
│   └── 0003_full_schema.sql          # Schema complet (source of truth)
│
├── docker-compose.yml                # Stack Hetzner: app, workers, postgres, redis, ollama
├── Dockerfile                        # Alpine + Node20 + python3 + yt-dlp + ffmpeg + faster-whisper
└── sync-github.sh                    # Push Replit → GitHub
```

---

## 4. Pipeline de Données (Workers)

### 4.1 Ingestion (toutes les 2h)

```
Apify TikTok Scraper
        │
        ▼
  5 niches US-only:
  ai_tools, online_business, productivity, finance, content_creation
        │
        ▼
  Filtres:
  - Max 3 vidéos / créateur
  - Max 120 vidéos / topic_cluster
  - Déduplication par platform_video_id
        │
        ▼
  INSERT videos → DB
  + queue transcription job
```

**Extrait — Ingestion Worker :**
```typescript
const NICHE_KEYWORDS = {
  'ai_tools': ['ai tools', 'chatgpt', 'midjourney', 'automation'],
  'online_business': ['online business', 'entrepreneurship', 'digital marketing'],
  'productivity': ['productivity', 'time management', 'habits'],
  'finance': ['personal finance', 'investing', 'crypto'],
  'content_creation': ['content creation', 'viral content', 'youtube growth']
};

const run = await apify.actor('clockworks/tiktok-scraper').call({
  searchQueries: keywords,
  resultsPerPage: 50,
  maxItems: 200,
  language: 'en',
  country: 'US',
}, { timeout: 300 });
```

### 4.2 Transcription (chaîné après ingestion)

```
Video URL
    │
    ├─ Essai 1: curl sur download_url (lien direct MP4 Apify)
    │           → vérifie taille > 10KB
    │
    ├─ Fallback: yt-dlp sur video_url (page TikTok)
    │
    ▼
  ffmpeg → extraction audio (mp3, 16kHz, mono)
    │
    ▼
  faster-whisper (base, CPU, int8) → transcription
    │
    ▼
  cleanTranscript() → suppression fillers, dédup mots, max 500 chars
    │
    ▼
  UPDATE videos SET transcript, transcript_language
  + queue classification job
```

**Extrait — Transcription :**
```typescript
async function downloadVideo(outputPath, downloadUrl, videoUrl) {
  // 1. curl direct (download_url = playAddr Apify)
  if (downloadUrl) {
    execSync(`curl -sL -o "${outputPath}" "${downloadUrl}"`);
    if (stat.size > 10000) return 'curl_direct';
  }
  // 2. fallback yt-dlp (video_url = page web TikTok)
  execSync(`yt-dlp -f "best[ext=mp4]/best" -o "${outputPath}" "${targetUrl}"`);
  return 'yt-dlp';
}

// faster-whisper via Python subprocess
const pythonScript = `
from faster_whisper import WhisperModel
model = WhisperModel("base", device="cpu", compute_type="int8")
segments, info = model.transcribe("${audioPath}", beam_size=5)
text = " ".join([s.text for s in segments])
`;
```

### 4.3 Classification (chaîné après transcription)

```
Caption + Transcript
        │
        ▼
  Ollama (llama3.1:8b local) → prompt structuré
        │
        ├─ Si confidence ≥ 0.7 → OK
        ├─ Si confidence < 0.7 → fallback OpenAI gpt-4.1-mini
        │
        ▼
  Extraction Content DNA :
  hook_text, hook_type, structure_type, format_type,
  topic_level_1, topic_level_2, emotion_primary, confidence
        │
        ▼
  UPDATE videos SET classification fields
  Max 3 tentatives, puis status = 'failed'
```

**Extrait — Classification :**
```typescript
// Essai Ollama local d'abord
const response = await ollama.generate({
  model: 'llama3.1:8b',
  prompt,
  format: 'json',
  options: { temperature: 0.3, num_predict: 500 }
});
dna = JSON.parse(response.response);

if (dna.confidence < 0.7 || !dna.hook_type) {
  // Fallback OpenAI
  const completion = await openai.chat.completions.create({
    model: 'gpt-4.1-mini',
    messages: [{ role: 'system', content: '...' }, { role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.3
  });
  dna = JSON.parse(completion.choices[0].message.content);
}
```

### 4.4 Scoring (toutes les 15 min)

```
Vidéos classifiées
        │
        ▼
  Calcul :
  - view_velocity = views / heures_depuis_publication
  - engagement_rate = (likes + comments + shares) / views
        │
        ▼
  Calcul virality_score (0-100) :
  - view_velocity × 0.4
  - engagement_rate × 1000 × 0.25
  - ln(views) × 3 × 0.2
  - recency_bonus × 0.15
```

### 4.5 Pattern Engine (toutes les 6h)

```
Vidéos classifiées + scorées
        │
        ▼
  GROUP BY hook_type, structure_type, topic_cluster, geo_zone
        │
  Filtres :
  - Min 5 vidéos par pattern
  - Virality score moyen > 20
  - US content uniquement
        │
        ▼
  Calcul par pattern :
  - pattern_score = (count × 2) + (avg_virality × 0.3)
  - velocity = vidéos_24h / vidéos_7j
  - trend = rising (>0.3) ou stable
        │
        ▼
  UPSERT patterns + INSERT video_patterns (associations)
```

**Extrait — Pattern Engine SQL :**
```sql
INSERT INTO patterns (dimension_keys, hook_type, structure_type, ...)
SELECT
  ARRAY[v.hook_mechanism_primary, v.structure_type, v.topic_cluster],
  COUNT(*),
  ROUND(AVG(v.virality_score)::numeric, 2),
  LEAST(100, (COUNT(*) * 2) + (AVG(v.virality_score) * 0.3)),
  -- velocity = ratio 24h / 7j
  (COUNT(*) FILTER (WHERE v.collected_at > NOW() - INTERVAL '24 hours'))::float /
    GREATEST(1, COUNT(*) FILTER (WHERE v.collected_at > NOW() - INTERVAL '7 days'))
FROM videos v
WHERE v.classification_status = 'completed'
  AND v.is_us_content = true
  AND v.virality_score > 0
GROUP BY v.hook_mechanism_primary, v.structure_type, v.topic_cluster, v.geo_zone
HAVING COUNT(*) >= 5 AND AVG(v.virality_score) >= 20
ON CONFLICT (dimension_keys) DO UPDATE SET ...
```

### 4.6 Phase Transition

```
Phase 1: Collection (0-500 vidéos classifiées)
  → Ingestion + Classification basique
        │
        ▼ 500 vidéos
Phase 2: Clustering (500-2000)
  → Embeddings + Clustering automatique
        │
        ▼ 2000 vidéos
Phase 3: LLM Synthesis (2000+)
  → Analyse LLM des clusters → patterns avancés
```

---

## 5. Synchronisation Hetzner → Replit

```
Worker sync (toutes les 15 min)
        │
        ▼
  1. GET /api/sync/status → récupère curseurs (MAX timestamps)
  2. Pour chaque table :
     SELECT * WHERE timestamp > cursor ORDER BY timestamp LIMIT 20
  3. POST /api/sync/{table} → UPSERT côté Replit
  4. Pagination : si batch = 20, continue avec nouveau curseur
        │
        ▼
  Tables synchronisées :
  - videos (91 colonnes)
  - video_classification
  - patterns
  - video_patterns
  - opportunities
```

**Sécurité :** Bearer token `SYNC_API_KEY` sur tous les endpoints.
**Body limit :** 20MB pour les routes `/api/sync/*` (Express middleware dédié).
**Batch size :** 20 par défaut (configurable via `SYNC_BATCH_SIZE`).

---

## 6. Stack Technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React 18 + Vite + TypeScript |
| UI | Tailwind CSS + shadcn/ui (dark-only) |
| Routing | wouter |
| State | TanStack Query v5 |
| Backend | Express.js + TypeScript |
| ORM | Drizzle ORM |
| DB | PostgreSQL 15 |
| Queue | BullMQ + Redis |
| AI Local | Ollama (llama3.1:8b) |
| AI Cloud | OpenAI gpt-4.1-mini |
| Scraping | Apify (clockworks/tiktok-scraper) |
| Transcription | faster-whisper (base, CPU, int8) |
| Video DL | curl (direct) + yt-dlp (fallback) |
| Audio | ffmpeg |
| Auth | Email/password + Google OAuth |
| Paiement | Stripe |
| Infra Prod | Hetzner VPS 16GB (workers) + Replit (app) |
| Git | GitHub (sync via sync-github.sh) |

---

## 7. Modèle de Données (tables principales)

### videos (91 colonnes)
```
id, platform, video_url, download_url, caption, transcript, hashtags,
duration_seconds, views, likes, comments, shares,
creator_name, creator_platform_id,
hook_text, hook_type_v2, hook_pattern, hook_mechanism_primary,
structure_type, content_format, topic_category, topic_cluster,
emotion_primary, virality_score, engagement_rate, view_velocity,
classification_status, transcription_status, confidence,
geo_zone, geo_country, is_us_content, niche_cluster,
collected_at, classified_at, updated_at, ...
```

### patterns
```
pattern_id, dimension_keys[], hook_type, structure_type, topic_cluster,
geo_zone, video_count, avg_virality_score, avg_engagement_rate,
pattern_score, velocity_mid, trend_classification, last_updated
```

### opportunities
```
id, pattern_id, topic, hook, format, virality_score,
view_range, confidence, trend_classification,
why_it_works, generated_at, platform
```

### video_classification
```
id, video_id, hook_text, hook_type, structure_type,
format_type, topic_level_1, topic_level_2,
emotion_primary, confidence, classified_at
```

---

## 8. Schedules Workers (BullMQ)

| Worker | Fréquence | Description |
|--------|-----------|-------------|
| Ingestion | 2h (cron) | Scraping TikTok via Apify (5 niches × zones US) |
| Transcription | On-demand | Déclenché après ingestion (chaîné) |
| Classification | On-demand | Déclenché après transcription (chaîné) |
| Scoring | 15 min | Calcul virality_score + engagement_rate |
| Pattern Engine | 6h | Détection patterns multi-dimensionnels |
| Phase Transition | 30 min | Vérification seuils 500/2000 vidéos |
| Sync-to-Replit | 15 min | Push données Hetzner → Replit (batches de 20) |

---

## 9. Infrastructure Docker (Hetzner)

```yaml
services:
  app:           # Express API (port 3000)
  workers:       # BullMQ workers (ingestion, transcription, classification...)
  postgres:      # PostgreSQL 15 (volume persistant)
  redis:         # Redis 7 (BullMQ queues)
  ollama:        # LLM local llama3.1:8b (port 11434)
```

**Dockerfile :** Alpine + Node 20 + python3 + yt-dlp + ffmpeg + faster-whisper

---

## 10. Pages Frontend (40 pages)

| Page | Route | Description |
|------|-------|-------------|
| Landing | `/` | Page publique, pricing |
| Dashboard | `/dashboard` | Viral Play + Trending + Opportunities |
| Discover | `/discover` | Exploration vidéos analysées |
| Opportunities | `/opportunities` | Opportunités Pattern Engine |
| Create/Studio | `/create` | Génération de scripts AI |
| Library | `/library` | Bibliothèque vidéos sauvegardées |
| Analytics | `/analytics` | Métriques et insights |
| Patterns | `/patterns` | Visualisation patterns détectés |
| Trend Radar | `/trend-radar` | Tendances en temps réel |
| Founder Dashboard | `/system/founder` | Admin (admin@craflect.com) |

---

## 11. Comptes

| Rôle | Email | Mot de passe |
|------|-------|-------------|
| Admin/Founder | admin@craflect.com | Admin1234! |
| Demo | demo@craflect.com | Demo1234! |

Route admin : `/system/founder`

---

## 12. Workflow de Déploiement

```
Replit (développement)
    │
    ▼  bash sync-github.sh
GitHub (source of truth)
    │
    ▼  git pull (sur Hetzner)
Hetzner (workers)
    │
    ▼  docker-compose build && docker-compose up -d
Production workers running
```

**Règle :** Ne jamais modifier les fichiers directement sur Hetzner. Toujours passer par Replit → GitHub → Hetzner.

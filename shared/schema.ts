import { pgTable, text, varchar, timestamp, integer, doublePrecision, jsonb, boolean, real, index, uniqueIndex, char } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

export * from "./models/auth";
export * from "./models/chat";

export const VP_HOOK_TYPES = [
  "Question", "Bold_Claim", "Statistic", "Story_Start", "Shock",
  "Promise", "Problem", "Curiosity_Gap", "Authority_Intro", "Controversial",
  "Relatable", "Tutorial_Intro", "Before_After", "Myth_Busting", "Direct_Statement",
] as const;

export const VP_STRUCTURE_MODELS = [
  "Problem_Solution", "Hook_Value_CTA", "Story_Lesson", "List_Format", "Tutorial_Step",
  "Authority_Breakdown", "Emotional_Arc", "Before_After_Transformation", "Myth_Truth", "Quick_Tip",
] as const;

export const VP_ANGLE_CATEGORIES = [
  "Educational", "Emotional", "Authority", "Inspirational", "Relatable",
  "Fear_Based", "Aspirational", "Tactical", "Analytical", "Storytelling",
  "Controversial", "Social_Proof",
] as const;

export const VP_FORMAT_TYPES = [
  "Talking_Head", "B_Roll_Voiceover", "Text_Overlay", "Interview", "Montage", "Mixed_Format",
] as const;

export const STRUCTURE_MODELS = VP_STRUCTURE_MODELS;
export const ANGLE_CATEGORIES = VP_ANGLE_CATEGORIES;
export const FORMAT_TYPES = VP_FORMAT_TYPES;

export const workspaces = pgTable("workspaces", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id").notNull(), 
  name: text("name").notNull(),
  nicheId: varchar("niche_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const contentSources = pgTable("content_sources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workspaceId: varchar("workspace_id").notNull(),
  nicheId: varchar("niche_id"),
  type: text("type").notNull(),
  title: text("title").notNull(),
  fileUrl: text("file_url"),
  transcript: text("transcript"),
  rawContent: text("raw_content"),
  status: text("status").default("pending").notNull(),
  url: text("url"),
  platform: text("platform"),
  creatorHandle: text("creator_handle"),
  publishedAt: timestamp("published_at"),
  duration: integer("duration"),
  views: integer("views"),
  followersCount: integer("followers_count"),
  likes: integer("likes"),
  commentsCount: integer("comments_count"),
  description: text("description"),
  hashtags: text("hashtags").array(),
  thumbnailUrl: text("thumbnail_url"),
  hookType: text("hook_type"),
  narrativeStructure: text("narrative_structure"),
  contentAngle: text("content_angle"),
  contentFormat: text("content_format"),
  performanceScore: integer("performance_score"),
  nicheCategory: text("niche_category"),
  ingestionStatus: text("ingestion_status").default("pending"),
  ingestionError: text("ingestion_error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_content_sources_workspace_id").on(table.workspaceId),
  index("idx_content_sources_niche_id").on(table.nicheId),
  index("idx_content_sources_created_at").on(table.createdAt),
]);

export const generatedContent = pgTable("generated_content", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sourceId: varchar("source_id"),
  workspaceId: varchar("workspace_id").notNull(),
  briefId: varchar("brief_id"),
  format: text("format").notNull(),
  hookType: text("hook_type"),
  content: text("content").notNull(),
  platform: text("platform"),
  status: text("status").default("draft").notNull(),
  scheduledAt: timestamp("scheduled_at"),
  videoUrl: text("video_url"),
  previewUrl: text("preview_url"),
  duplicatedFrom: varchar("duplicated_from"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const videoPerformance = pgTable("video_performance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  platformVideoUrl: text("platform_video_url").notNull(),
  platform: text("platform").default("tiktok"),
  predictedViews: integer("predicted_views"),
  actualViews: integer("actual_views"),
  actualLikes: integer("actual_likes"),
  actualComments: integer("actual_comments"),
  accuracyScore: doublePrecision("accuracy_score"),
  lastFetchedAt: timestamp("last_fetched_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_video_performance_user").on(table.userId),
]);

export const briefs = pgTable("briefs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workspaceId: varchar("workspace_id").notNull(),
  topic: text("topic").notNull(),
  hook: text("hook").notNull(),
  script: text("script").notNull(),
  format: text("format").notNull(),
  status: text("status").default("active").notNull(),
  insights: text("insights"),
  recommendations: text("recommendations"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const performance = pgTable("performance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  generatedContentId: varchar("generated_content_id").notNull(),
  platform: text("platform").notNull(),
  views: integer("views").default(0).notNull(),
  engagement: doublePrecision("engagement").default(0).notNull(),
  retention: doublePrecision("retention").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  plan: text("plan").default("starter").notNull(),
  analysesUsed: integer("analyses_used").default(0).notNull(),
  analysesLimit: integer("analyses_limit").default(20).notNull(),
  nichesCount: integer("niches_count").default(1).notNull(),
  nichesLimit: integer("niches_limit").default(1).notNull(),
  billingStatus: text("billing_status").default("trial").notNull(),
  trialEndDate: timestamp("trial_end_date"),
  renewalDate: timestamp("renewal_date"),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  eventName: text("event_name").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertWorkspaceSchema = createInsertSchema(workspaces).omit({ id: true, createdAt: true, ownerId: true });
export const insertContentSourceSchema = createInsertSchema(contentSources).omit({ id: true, createdAt: true });
export const insertGeneratedContentSchema = createInsertSchema(generatedContent).omit({ id: true, createdAt: true });
export const insertBriefSchema = createInsertSchema(briefs).omit({ id: true, createdAt: true });
export const insertPerformanceSchema = createInsertSchema(performance).omit({ id: true, createdAt: true });
export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertEventSchema = createInsertSchema(events).omit({ id: true, createdAt: true });

export type Workspace = typeof workspaces.$inferSelect;
export type InsertWorkspace = z.infer<typeof insertWorkspaceSchema>;

export type ContentSource = typeof contentSources.$inferSelect;
export type InsertContentSource = z.infer<typeof insertContentSourceSchema>;

export type GeneratedContent = typeof generatedContent.$inferSelect;
export type InsertGeneratedContent = z.infer<typeof insertGeneratedContentSchema>;

export const insertVideoPerformanceSchema = createInsertSchema(videoPerformance).omit({ id: true, createdAt: true });
export type VideoPerformance = typeof videoPerformance.$inferSelect;
export type InsertVideoPerformance = z.infer<typeof insertVideoPerformanceSchema>;

export type Brief = typeof briefs.$inferSelect;
export type InsertBrief = z.infer<typeof insertBriefSchema>;

export type Performance = typeof performance.$inferSelect;
export type InsertPerformance = z.infer<typeof insertPerformanceSchema>;

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;

export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;

export const niches = pgTable("niches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description"),
  minRequiredVideos: integer("min_required_videos").default(500).notNull(),
  isPublic: boolean("is_public").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const creators = pgTable("creators", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nicheId: varchar("niche_id").notNull(),
  platform: text("platform").notNull(),
  username: text("username").notNull(),
  followers: integer("followers"),
  viewsTotal: integer("views_total"),
  viewsGrowth: doublePrecision("views_growth"),
  viralVideos: integer("viral_videos"),
  niche: text("niche"),
  seedScore: doublePrecision("seed_score"),
  discoveredFromCreator: varchar("discovered_from_creator"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_creators_niche").on(table.niche),
  index("idx_creators_platform").on(table.platform),
]);

export const videoPrimitives = pgTable("video_primitives", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nicheId: varchar("niche_id").notNull(),
  creatorId: varchar("creator_id").notNull(),
  workspaceId: varchar("workspace_id"),
  sourceType: text("source_type").default("admin").notNull(),
  platform: text("platform").notNull(),
  publishDate: timestamp("publish_date"),
  durationSeconds: integer("duration_seconds"),
  engagementRatio: real("engagement_ratio"),
  hookText: text("hook_text"),
  hookType: text("hook_type").notNull(),
  hookLengthSeconds: real("hook_length_seconds"),
  structureModel: text("structure_model").notNull(),
  formatType: text("format_type").notNull(),
  angleCategory: text("angle_category").notNull(),
  topicCategory: text("topic_category"),
  topicCluster: text("topic_cluster"),
  topicSubcluster: text("topic_subcluster"),
  ctaPresent: boolean("cta_present").default(false).notNull(),
  pacingScore: real("pacing_score"),
  authorityScore: real("authority_score"),
  emotionalIntensityScore: real("emotional_intensity_score"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_video_primitives_niche_id").on(table.nicheId),
  index("idx_video_primitives_hook_type").on(table.hookType),
  index("idx_video_primitives_format_type").on(table.formatType),
  index("idx_video_primitives_angle_category").on(table.angleCategory),
]);

export const nichePatterns = pgTable("niche_patterns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nicheId: varchar("niche_id").notNull(),
  hookDistribution: jsonb("hook_distribution"),
  structureDistribution: jsonb("structure_distribution"),
  angleDistribution: jsonb("angle_distribution"),
  formatDistribution: jsonb("format_distribution"),
  avgDuration: real("avg_duration"),
  medianDuration: real("median_duration"),
  dominantPatterns: jsonb("dominant_patterns"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const nicheStatistics = pgTable("niche_statistics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nicheId: varchar("niche_id").notNull(),
  totalVideos: integer("total_videos").default(0).notNull(),
  sampleSize: integer("sample_size").default(0).notNull(),
  dominantHook: text("dominant_hook"),
  dominantStructure: text("dominant_structure"),
  dominantAngle: text("dominant_angle"),
  dominantFormat: text("dominant_format"),
  medianDuration: real("median_duration"),
  patternStabilityScore: real("pattern_stability_score"),
  confidenceScore: real("confidence_score"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const nicheProfiles = pgTable("niche_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nicheId: varchar("niche_id").notNull(),
  intelligenceSummary: text("intelligence_summary"),
  strategicRecommendation: text("strategic_recommendation"),
  dominantPatterns: jsonb("dominant_patterns"),
  nicheShiftSignal: text("niche_shift_signal"),
  confidenceScore: real("confidence_score"),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

export const workspaceIntelligence = pgTable("workspace_intelligence", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workspaceId: varchar("workspace_id").notNull(),
  nicheId: varchar("niche_id").notNull(),
  totalVideos: integer("total_videos").default(0).notNull(),
  dominantHook: text("dominant_hook"),
  dominantStructure: text("dominant_structure"),
  dominantFormat: text("dominant_format"),
  dominantAngle: text("dominant_angle"),
  hookDistribution: jsonb("hook_distribution"),
  structureDistribution: jsonb("structure_distribution"),
  formatDistribution: jsonb("format_distribution"),
  angleDistribution: jsonb("angle_distribution"),
  confidenceScore: real("confidence_score"),
  signalStrength: real("signal_strength"),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
}, (table) => [
  index("idx_workspace_intelligence_workspace_id").on(table.workspaceId),
  index("idx_workspace_intelligence_niche_id").on(table.nicheId),
]);

export const insertNicheSchema = createInsertSchema(niches).omit({ id: true, createdAt: true });
export const insertCreatorSchema = createInsertSchema(creators).omit({ id: true, createdAt: true });
export const insertVideoPrimitiveSchema = createInsertSchema(videoPrimitives).omit({ id: true, createdAt: true });
export const insertNichePatternsSchema = createInsertSchema(nichePatterns).omit({ id: true, updatedAt: true });
export const insertNicheStatisticsSchema = createInsertSchema(nicheStatistics).omit({ id: true, updatedAt: true });
export const insertNicheProfileSchema = createInsertSchema(nicheProfiles).omit({ id: true, lastUpdated: true });
export const insertWorkspaceIntelligenceSchema = createInsertSchema(workspaceIntelligence).omit({ id: true, lastUpdated: true });

// ═══════════════════════════════════════════════════════════
// Craflect Taxonomy v1 — Stable Reference Values
// ═══════════════════════════════════════════════════════════

export const HOOK_TYPES = [
  "contrarian", "question", "shock_statement", "statistic",
  "curiosity_gap", "warning", "story", "before_after",
] as const;

export const STRUCTURE_TYPES = [
  "hook_value_cta", "problem_solution", "story_lesson", "list_format",
  "tutorial_step", "before_after", "myth_truth", "emotional_arc",
  "authority_breakdown", "quick_tip", "demo_walkthrough", "challenge_result",
] as const;

export const CTA_TYPES = [
  "follow", "comment", "share", "link_bio", "save",
  "dm", "subscribe", "buy", "visit_link", "none",
] as const;

export const EMOTION_VALUES = [
  "curiosity", "fear", "status", "opportunity", "urgency", "novelty",
] as const;

export const DURATION_BUCKETS = [
  "0-15s", "15-30s", "30-60s", "60-90s", "90-180s", "180s+",
] as const;

export const TEXT_OVERLAY_DENSITIES = [
  "none", "low", "medium", "high",
] as const;

export const CUT_FREQUENCIES = [
  "static", "low", "medium", "high", "very_high",
] as const;

export const VISUAL_SWITCH_RATES = [
  "static", "low", "medium", "high",
] as const;

export const TOPIC_CLUSTERS = [
  "ai_tools", "ai_automation", "online_business", "entrepreneurship",
  "digital_marketing", "ecommerce", "saas", "real_estate",
  "finance", "crypto", "productivity", "education",
  "tech", "personal_branding", "coaching", "motivation",
  "lifestyle", "fitness", "health", "health_wellness", "beauty",
  "food", "travel", "relationships", "entertainment", "gaming",
  "mindset",
] as const;

export const NICHE_CLUSTERS = [
  "ai_tools",
  "finance",
  "online_business",
  "content_creation",
  "productivity",
  "health_wellness",
  "fitness",
  "mindset",
  "digital_marketing",
  "real_estate",
] as const;

export const NICHE_CLUSTER_LABELS: Record<string, string> = {
  ai_tools: "AI Tools",
  finance: "Finance",
  online_business: "Online Business",
  content_creation: "Content Creation",
  productivity: "Productivity",
  health_wellness: "Health & Wellness",
  fitness: "Fitness",
  mindset: "Mindset",
  digital_marketing: "Digital Marketing",
  real_estate: "Real Estate",
};

export const TOPIC_TO_NICHE_CLUSTER: Record<string, string> = {
  // AI / Tech
  ai_tools: "ai_tools",
  ai_automation: "ai_tools",
  tech: "ai_tools",
  saas: "ai_tools",
  // Finance
  finance: "finance",
  crypto: "finance",
  // Online business
  online_business: "online_business",
  entrepreneurship: "online_business",
  ecommerce: "online_business",
  // Content creation
  content_creation: "content_creation",
  personal_branding: "content_creation",
  education: "content_creation",
  coaching: "content_creation",
  entertainment: "content_creation",
  gaming: "content_creation",
  // Productivity
  productivity: "productivity",
  lifestyle: "productivity",
  food: "productivity",
  travel: "productivity",
  relationships: "productivity",
  // Health & Wellness
  health_wellness: "health_wellness",
  health: "health_wellness",
  beauty: "health_wellness",
  // Fitness
  fitness: "fitness",
  // Mindset
  mindset: "mindset",
  motivation: "mindset",
  // Digital Marketing
  digital_marketing: "digital_marketing",
  // Real Estate
  real_estate: "real_estate",
};

export function resolveNicheCluster(topicCluster: string | null | undefined): string | null {
  if (!topicCluster) return null;
  return TOPIC_TO_NICHE_CLUSTER[topicCluster] ?? null;
}

export const TOPIC_CLUSTER_LABELS: Record<string, string> = {
  ai_tools: "AI tools",
  ai_automation: "AI automation",
  online_business: "Online business",
  entrepreneurship: "Entrepreneurship",
  digital_marketing: "Digital marketing",
  ecommerce: "Ecommerce",
  saas: "SaaS",
  real_estate: "Real estate",
  finance: "Finance",
  crypto: "Crypto",
  productivity: "Productivity",
  education: "Education",
  tech: "Tech",
  personal_branding: "Personal branding",
  coaching: "Coaching",
  motivation: "Motivation",
  lifestyle: "Lifestyle",
  fitness: "Fitness",
  health: "Health",
  health_wellness: "Health & Wellness",
  beauty: "Beauty",
  food: "Food",
  travel: "Travel",
  relationships: "Relationships",
  entertainment: "Entertainment",
  gaming: "Gaming",
  mindset: "Mindset",
  unknown: "General",
};

export function normalizeTopicCluster(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const lower = raw.toLowerCase().trim().replace(/[_\s-]+/g, "_");
  if (TOPIC_CLUSTERS.includes(lower as any)) return lower;
  const aliases: Record<string, string> = {
    ai_tool: "ai_tools",
    ai_software: "ai_tools",
    artificial_intelligence: "ai_tools",
    ai: "ai_tools",
    automation: "ai_automation",
    ai_agent: "ai_automation",
    ai_agents: "ai_automation",
    ai_workflow: "ai_automation",
    ai_workflows: "ai_automation",
    business: "online_business",
    online_biz: "online_business",
    startup: "entrepreneurship",
    startups: "entrepreneurship",
    marketing: "digital_marketing",
    social_media_marketing: "digital_marketing",
    content_marketing: "digital_marketing",
    e_commerce: "ecommerce",
    shopify: "ecommerce",
    dropshipping: "ecommerce",
    software: "saas",
    real_estate_investing: "real_estate",
    property: "real_estate",
    investing: "finance",
    money: "finance",
    trading: "finance",
    bitcoin: "crypto",
    web3: "crypto",
    blockchain: "crypto",
    personal_development: "motivation",
    self_improvement: "motivation",
    mindset: "motivation",
    personal_brand: "personal_branding",
    branding: "personal_branding",
    life_coaching: "coaching",
    mentor: "coaching",
    mentoring: "coaching",
    gym: "fitness",
    workout: "fitness",
    exercise: "fitness",
    wellness: "health",
    mental_health: "health",
    nutrition: "health",
    skincare: "beauty",
    makeup: "beauty",
    cooking: "food",
    recipe: "food",
    recipes: "food",
    gaming_tech: "gaming",
    video_games: "gaming",
    esports: "gaming",
    fun: "entertainment",
    comedy: "entertainment",
    humor: "entertainment",
    dating: "relationships",
    love: "relationships",
    technology: "tech",
    gadgets: "tech",
    learn: "education",
    learning: "education",
    tutorial: "education",
    tutorials: "education",
    digital_nomad: "lifestyle",
    remote_work: "lifestyle",
  };
  if (aliases[lower]) return aliases[lower];
  for (const cluster of TOPIC_CLUSTERS) {
    if (lower.includes(cluster) || cluster.includes(lower)) return cluster;
  }
  console.warn(`[normalizeTopicCluster] Rejected unknown value: "${raw}"`);
  return null;
}

const HOOK_MECHANISM_MAP: Record<string, string> = {
  curiosity_gap: "curiosity",
  contrarian: "contrarian",
  question: "question",
  shock_statement: "shock",
  statistic: "statistic",
  warning: "warning",
  story: "story",
  before_after: "before_after",
  story_opening: "story",
  mistake: "mistake",
  bold_claim: "contrarian",
  list: "list",
  how_to: "how_to",
  challenge: "challenge",
  reveal: "curiosity",
  social_proof: "social_proof",
  analogy: "analogy",
  prediction: "prediction",
  myth_busting: "contrarian",
};

export function deriveHookMechanismPrimary(hookMechanism: string[] | null | undefined, hookPattern?: string | null): string | null {
  if (hookMechanism && hookMechanism.length > 0) {
    const first = hookMechanism[0].toLowerCase().replace(/[\s-]+/g, "_");
    if (HOOK_MECHANISM_MAP[first]) return HOOK_MECHANISM_MAP[first];
    return first;
  }
  if (hookPattern) {
    const lower = hookPattern.toLowerCase().replace(/[\s-]+/g, "_");
    if (HOOK_MECHANISM_MAP[lower]) return HOOK_MECHANISM_MAP[lower];
    return lower;
  }
  return null;
}

// ── Legacy enums (deprecated, kept for backward compatibility) ──

export const HOOK_MECHANISMS = [
  "contrarian", "question", "bold_claim", "statistic", "story_start",
  "shock", "promise", "problem", "curiosity_gap", "authority_intro",
  "relatable", "tutorial_intro", "before_after", "myth_busting", "direct_statement",
] as const;

export const HOOK_FORMATS = [
  "bold_statement", "question", "statistic", "story_opener", "challenge",
  "confession", "prediction", "comparison", "warning", "revelation",
] as const;

export const EMOTIONAL_TRIGGERS = [
  "curiosity", "fear", "excitement", "anger", "surprise",
  "empathy", "aspiration", "nostalgia", "urgency", "relief",
] as const;

export const CONTENT_STRUCTURES = [
  "hook_value_cta", "problem_solution", "story_lesson", "list_format",
  "tutorial_step", "before_after", "myth_truth", "emotional_arc",
  "authority_breakdown", "quick_tip",
] as const;

export const CONTENT_FORMATS = [
  "talking_head", "b_roll_voiceover", "text_overlay", "interview",
  "montage", "mixed_format", "screen_recording", "vlog", "skit",
] as const;

export const VISUAL_STYLES = [
  "cinematic", "raw_authentic", "polished", "lo_fi", "aesthetic",
  "documentary", "minimalist", "high_energy",
] as const;

export const STORYTELLING_PRESENCES = ["strong", "moderate", "minimal", "none"] as const;
export const CONTENT_PACES = ["fast", "moderate", "slow", "variable"] as const;
export const CREATOR_ARCHETYPES = ["educator", "entertainer", "motivator", "storyteller", "expert", "curator", "provocateur", "lifestyle"] as const;
export const TOPIC_CATEGORIES = ["business", "finance", "health", "fitness", "tech", "lifestyle", "beauty", "food", "travel", "education", "entertainment", "motivation", "relationships", "productivity", "marketing"] as const;
export const CONTROVERSY_LEVELS = ["none", "low", "moderate", "high"] as const;
export const INFORMATION_DENSITIES = ["low", "moderate", "high", "very_high"] as const;
export const HOOK_TOPICS = ["mistake", "secret", "myth", "strategy", "tools", "comparison", "trend"] as const;
export const CONTENT_GOALS = ["education", "lead_generation", "brand_awareness", "storytelling", "engagement", "product_promotion"] as const;

// Aliases for backward compatibility
export const HOOK_TYPES_V2 = HOOK_TYPES;
export const CTA_TYPES_V2 = CTA_TYPES;

// ═══════════════════════════════════════════════════════════
// Craflect Taxonomy v1 — videos table
// ═══════════════════════════════════════════════════════════

export const videos = pgTable("videos", {
  // ── Video Metadata ──
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  platform: text("platform"),
  platformVideoId: text("platform_video_id").unique(),
  videoUrl: text("video_url"),
  thumbnailUrl: text("thumbnail_url"),
  caption: text("caption"),
  transcript: text("transcript"),
  hashtags: text("hashtags").array(),
  durationSeconds: integer("duration_seconds"),
  durationBucket: text("duration_bucket"),
  creatorName: text("creator_name"),
  creatorUrl: text("creator_url"),
  creatorPlatformId: text("creator_platform_id"),
  creatorId: text("creator_id"),
  creatorNiche: text("creator_niche"),
  publishedAt: timestamp("published_at"),
  collectedAt: timestamp("collected_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),

  // ── Hook Intelligence ──
  hookType: text("hook_type_v2"),
  hookPattern: text("hook_pattern"),
  hookText: text("hook_text"),
  hookDuration: real("hook_duration"),
  hookPosition: text("hook_position"),

  // ── Narrative Structure ──
  structureType: text("structure_type"),
  beatsCount: integer("beats_count"),
  revealTime: real("reveal_time"),
  demoPresence: boolean("demo_presence"),
  proofPresence: boolean("proof_presence"),
  ctaType: text("cta_type_v2"),

  // ── Visual Language ──
  facecam: boolean("facecam"),
  screenRecording: boolean("screen_recording"),
  brollUsage: boolean("broll_usage"),
  textOverlayDensity: text("text_overlay_density"),
  cutFrequency: text("cut_frequency"),
  visualSwitchRate: text("visual_switch_rate"),

  // ── Emotional Trigger ──
  emotionPrimary: text("emotion_primary"),
  emotionSecondary: text("emotion_secondary"),

  // ── Topic Classification (3 levels + macro niche) ──
  topicCategory: text("topic_category"),
  topicCluster: text("topic_cluster"),
  topicSubcluster: text("topic_subcluster"),
  nicheCluster: text("niche_cluster"),

  // ── Performance Metrics ──
  views: integer("views"),
  followersCount: integer("followers_count"),
  likes: integer("likes"),
  comments: integer("comments"),
  shares: integer("shares"),

  // ── Derived Fields ──
  hookMechanismPrimary: text("hook_mechanism_primary"),

  // ── Derived Metrics (stored, recalculated periodically) ──
  engagementRate: doublePrecision("engagement_rate"),
  viewVelocity: doublePrecision("view_velocity"),
  viralityScore: doublePrecision("virality_score"),
  trendScoreProcessedAt: timestamp("trend_score_processed_at"),
  patternIdRef: text("pattern_id_ref"),

  // ── Versioning & Pipeline ──
  taxonomyVersion: text("taxonomy_version").default("1.0"),
  classifiedAt: timestamp("classified_at"),
  classifiedBy: text("classified_by"),
  classificationStatus: text("classification_status").notNull().default("pending"),
  classificationAttempts: integer("classification_attempts").notNull().default(0),
  classificationStartedAt: timestamp("classification_started_at"),
  patternNotes: text("pattern_notes"),

  // ── Deep Selection & Transcription Pipeline ──
  contentHash: varchar("content_hash", { length: 64 }),
  viewsPerHour: doublePrecision("views_per_hour").default(0),
  isDeepSelected: boolean("is_deep_selected").default(false),
  deepSelectionReason: varchar("deep_selection_reason", { length: 50 }),
  transcriptionStatus: text("transcription_status").default("pending"),
  transcriptLanguage: varchar("transcript_language", { length: 10 }),
  transcriptGenerated: boolean("transcript_generated").default(false),
  audioUrl: text("audio_url"),
  downloadUrl: text("download_url"),

  // ── Geo Intelligence ──
  geoZone: varchar("geo_zone", { length: 10 }),
  geoCountry: char("geo_country", { length: 2 }),
  geoLanguage: varchar("geo_language", { length: 5 }),
  targetMarkets: text("target_markets").array(),
  isUsContent: boolean("is_us_content").default(false),
  countryDetected: varchar("country_detected", { length: 10 }),
  isArchived: boolean("is_archived").default(false),
  confidence: real("confidence"),

  // ── Legacy fields (deprecated, kept for transition) ──
  hookMechanism: text("hook_mechanism").array(),
  hookFormat: text("hook_format"),
  emotionalTrigger: text("emotional_trigger").array(),
  contentStructure: text("content_structure").array(),
  contentFormat: text("content_format"),
  visualStyle: text("visual_style").array(),
  storytellingPresence: text("storytelling_presence"),
  contentPace: text("content_pace"),
  creatorArchetype: text("creator_archetype"),
  callToAction: text("call_to_action"),
  controversyLevel: text("controversy_level"),
  informationDensity: text("information_density"),
  hookTopic: text("hook_topic"),
  contentGoal: text("content_goal"),
  v2ClassifiedAt: timestamp("v2_classified_at"),
  v2ClassifiedBy: text("v2_classified_by"),
}, (table) => [
  index("idx_videos_platform").on(table.platform),
  index("idx_videos_classification_status").on(table.classificationStatus),
  index("idx_videos_collected_at").on(table.collectedAt),
  index("idx_videos_hook_type").on(table.hookType),
  index("idx_videos_structure_type").on(table.structureType),
  index("idx_videos_emotion_primary").on(table.emotionPrimary),
  index("idx_videos_topic_category").on(table.topicCategory),
  index("idx_videos_topic_cluster").on(table.topicCluster),
  index("idx_videos_virality_score").on(table.viralityScore),
  index("idx_videos_hook_mechanism_primary").on(table.hookMechanismPrimary),
  index("idx_videos_creator_niche").on(table.creatorNiche),
  index("idx_videos_taxonomy_version").on(table.taxonomyVersion),
  index("idx_videos_geo_zone").on(table.geoZone),
  index("idx_videos_geo_language").on(table.geoLanguage),
  index("idx_videos_niche_cluster").on(table.nicheCluster),
  index("idx_videos_deep_selected").on(table.isDeepSelected),
  index("idx_videos_transcription_status").on(table.transcriptionStatus),
]);

export const geoZones = pgTable("geo_zones", {
  zoneCode: varchar("zone_code", { length: 10 }).primaryKey(),
  zoneName: text("zone_name").notNull(),
  proxyCountryCode: char("proxy_country_code", { length: 2 }).notNull(),
  languagesPriority: text("languages_priority").array().notNull(),
  scrapingHours: integer("scraping_hours").array().notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertGeoZoneSchema = createInsertSchema(geoZones);
export type InsertGeoZone = z.infer<typeof insertGeoZoneSchema>;
export type GeoZone = typeof geoZones.$inferSelect;

export const viralPatterns = pgTable("viral_patterns", {
  patternId: varchar("pattern_id").primaryKey().default(sql`gen_random_uuid()`),
  hookMechanism: text("hook_mechanism").array(),
  hookFormat: text("hook_format"),
  hookTopic: text("hook_topic"),
  contentFormat: text("content_format"),
  contentPace: text("content_pace"),
  contentStructure: text("content_structure").array(),
  contentGoal: text("content_goal"),
  topicCategory: text("topic_category"),
  platform: text("platform"),
  averagePerformance: doublePrecision("average_performance"),
  performanceRatio: doublePrecision("performance_ratio"),
  frequency: doublePrecision("frequency"),
  trendRatio: doublePrecision("trend_ratio"),
  patternType: text("pattern_type"),
  videoCount: integer("video_count"),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
}, (table) => [
  index("idx_viral_patterns_hook_format").on(table.hookFormat),
  index("idx_viral_patterns_content_format").on(table.contentFormat),
  index("idx_viral_patterns_topic_category").on(table.topicCategory),
  index("idx_viral_patterns_pattern_type").on(table.patternType),
]);

// ═══════════════════════════════════════════════════════════
// Pattern Engine v1 — Combinatorial patterns
// ═══════════════════════════════════════════════════════════

export const patterns = pgTable("patterns", {
  patternId: varchar("pattern_id").primaryKey().default(sql`gen_random_uuid()`),
  dimensionKeys: text("dimension_keys").array().notNull(),
  hookType: text("hook_type"),
  structureType: text("structure_type"),
  emotionPrimary: text("emotion_primary"),
  topicCluster: text("topic_cluster"),
  topicCategory: text("topic_category"),
  facecam: boolean("facecam"),
  cutFrequency: text("cut_frequency"),
  textOverlayDensity: text("text_overlay_density"),
  platform: text("platform"),
  videoCount: integer("video_count").notNull(),
  avgViralityScore: doublePrecision("avg_virality_score"),
  medianViralityScore: doublePrecision("median_virality_score"),
  avgEngagementRate: doublePrecision("avg_engagement_rate"),
  performanceRank: integer("performance_rank"),
  patternLabel: text("pattern_label"),
  patternScore: doublePrecision("pattern_score"),
  velocityMid: doublePrecision("velocity_mid"),
  patternNovelty: doublePrecision("pattern_novelty"),
  geoZone: varchar("geo_zone", { length: 10 }),
  trendClassification: text("trend_classification"),
  hookTemplate: text("hook_template"),
  structureTemplate: text("structure_template"),
  optimalDuration: integer("optimal_duration"),
  whyItWorks: text("why_it_works"),
  bestFor: text("best_for"),
  contentAngle: text("content_angle"),
  ctaSuggestion: text("cta_suggestion"),
  clusterId: text("cluster_id"),
  velocity7d: doublePrecision("velocity_7d").default(0),
  velocity14d: doublePrecision("velocity_14d").default(0),
  velocity30d: doublePrecision("velocity_30d").default(0),
  trendStatus: text("trend_status").default("stable"),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("idx_patterns_dimension_keys_unique").on(table.dimensionKeys),
  index("idx_patterns_geo_zone").on(table.geoZone),
  index("idx_patterns_hook_type").on(table.hookType),
  index("idx_patterns_structure_type").on(table.structureType),
  index("idx_patterns_topic_cluster").on(table.topicCluster),
  index("idx_patterns_avg_virality").on(table.avgViralityScore),
  index("idx_patterns_performance_rank").on(table.performanceRank),
  index("idx_patterns_video_count").on(table.videoCount),
  index("idx_patterns_pattern_score").on(table.patternScore),
  index("idx_patterns_trend_classification").on(table.trendClassification),
]);

// ═══════════════════════════════════════════════════════════
// Video Patterns — Liaison videos ↔ patterns (futur Pattern Engine)
// ═══════════════════════════════════════════════════════════

export const videoPatterns = pgTable("video_patterns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  videoId: varchar("video_id").notNull(),
  patternId: varchar("pattern_id").notNull(),
  matchScore: doublePrecision("match_score"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_video_patterns_video_id").on(table.videoId),
  index("idx_video_patterns_pattern_id").on(table.patternId),
]);

// ═══════════════════════════════════════════════════════════
// Saved Ideas — User-curated opportunities
// ═══════════════════════════════════════════════════════════

export const savedIdeas = pgTable("saved_ideas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  hook: text("hook").notNull(),
  format: text("format"),
  topic: text("topic"),
  opportunityScore: integer("opportunity_score"),
  velocity: real("velocity"),
  videosDetected: integer("videos_detected"),
  status: text("status").default("saved").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_saved_ideas_user_id").on(table.userId),
  index("idx_saved_ideas_status").on(table.status),
]);

export const insertSavedIdeaSchema = createInsertSchema(savedIdeas).omit({ id: true, createdAt: true });

// ═══════════════════════════════════════════════════════════
// Content Projects — Full creation pipeline
// ═══════════════════════════════════════════════════════════

export const contentProjects = pgTable("content_projects", {
  projectId: varchar("project_id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  title: text("title"),
  hook: text("hook"),
  format: text("format"),
  topic: text("topic"),
  script: jsonb("script"),
  blueprint: jsonb("blueprint"),
  status: text("status").default("draft").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_content_projects_user_id").on(table.userId),
  index("idx_content_projects_status").on(table.status),
]);

export const insertContentProjectSchema = createInsertSchema(contentProjects).omit({ projectId: true, createdAt: true, updatedAt: true });

// ═══════════════════════════════════════════════════════════
// Viral Templates — Inspired from detected patterns
// ═══════════════════════════════════════════════════════════

export const viralTemplates = pgTable("viral_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  topicCluster: text("topic_cluster"),
  hookMechanism: text("hook_mechanism"),
  structureType: text("structure_type"),
  hookTemplate: text("hook_template"),
  sceneStructure: jsonb("scene_structure"),
  source: text("source").default("auto").notNull(),
  usageCount: integer("usage_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_viral_templates_source").on(table.source),
  index("idx_viral_templates_topic").on(table.topicCluster),
]);

export const insertViralTemplateSchema = createInsertSchema(viralTemplates).omit({ id: true, createdAt: true, usageCount: true });

// ═══════════════════════════════════════════════════════════
// Intelligence Events — AI activity feed
// ═══════════════════════════════════════════════════════════

export const intelligenceEvents = pgTable("intelligence_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventType: text("event_type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_intelligence_events_type").on(table.eventType),
  index("idx_intelligence_events_created").on(table.createdAt),
]);

export const insertIntelligenceEventSchema = createInsertSchema(intelligenceEvents).omit({ id: true, createdAt: true });

export const insertVideoSchema = createInsertSchema(videos).omit({ id: true, collectedAt: true });
export const insertViralPatternSchema = createInsertSchema(viralPatterns).omit({ patternId: true, lastUpdated: true });
export const insertPatternSchema = createInsertSchema(patterns).omit({ patternId: true, lastUpdated: true });

// ═══════════════════════════════════════════════════════════
// Pipeline Data — Video Classification (Content DNA separate table)
// ═══════════════════════════════════════════════════════════

export const videoClassification = pgTable("video_classification", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  videoId: varchar("video_id").notNull(),
  hookType: text("hook_type"),
  structureType: text("structure_type"),
  topicCluster: text("topic_cluster"),
  emotionValue: text("emotion_value"),
  formatType: text("format_type"),
  ctaType: text("cta_type"),
  visualStyle: text("visual_style"),
  cutFrequency: text("cut_frequency"),
  nicheCluster: text("niche_cluster"),
  classifiedAt: timestamp("classified_at").defaultNow().notNull(),
}, (table) => [
  index("idx_video_classification_video_id").on(table.videoId),
  index("idx_video_classification_hook_type").on(table.hookType),
  index("idx_video_classification_topic_cluster").on(table.topicCluster),
  index("idx_video_classification_niche_cluster").on(table.nicheCluster),
]);

export const insertVideoClassificationSchema = createInsertSchema(videoClassification).omit({ id: true, classifiedAt: true });

// ═══════════════════════════════════════════════════════════
// Pipeline Patterns — Detected by Pattern Engine
// ═══════════════════════════════════════════════════════════

export const pipelinePatterns = pgTable("pipeline_patterns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patternType: text("pattern_type"),
  nicheCluster: text("niche_cluster"),
  description: text("description"),
  frequency: doublePrecision("frequency"),
  engagementAvg: doublePrecision("engagement_avg"),
  creatorDiversity: doublePrecision("creator_diversity"),
  stabilityScore: doublePrecision("stability_score"),
  patternScore: doublePrecision("pattern_score"),
  trendVelocity: doublePrecision("trend_velocity"),
  patternConfidenceScore: doublePrecision("pattern_confidence_score").default(0),
  humanValidationFlag: boolean("human_validation_flag"),
  detectedAt: timestamp("detected_at").defaultNow(),
  videoCount: integer("video_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_pipeline_patterns_niche_cluster").on(table.nicheCluster),
  index("idx_pipeline_patterns_pattern_score").on(table.patternScore),
  index("idx_pipeline_patterns_pattern_type").on(table.patternType),
]);

export const insertPipelinePatternSchema = createInsertSchema(pipelinePatterns).omit({ id: true, createdAt: true });

// ═══════════════════════════════════════════════════════════
// Pattern Templates — Reusable templates from patterns
// ═══════════════════════════════════════════════════════════

export const patternTemplates = pgTable("pattern_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patternId: varchar("pattern_id").notNull(),
  templateName: text("template_name"),
  templateDescription: text("template_description"),
  templateStructure: jsonb("template_structure"),
  templateFormula: text("template_formula"),
  hookType: text("hook_type"),
  structureType: text("structure_type"),
  formatType: text("format_type"),
  exampleVideo: text("example_video"),
  confidenceScore: doublePrecision("confidence_score"),
  usageCount: integer("usage_count").default(0),
  nicheId: varchar("niche_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_pattern_templates_pattern_id").on(table.patternId),
  index("idx_pattern_templates_niche_id").on(table.nicheId),
]);

export const insertPatternTemplateSchema = createInsertSchema(patternTemplates).omit({ id: true, createdAt: true });

// ═══════════════════════════════════════════════════════════
// Opportunities — Generated by Opportunity Engine
// ═══════════════════════════════════════════════════════════

export const opportunities = pgTable("opportunities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  patternTemplateId: varchar("pattern_template_id").notNull(),
  hook: text("hook"),
  topic: text("topic"),
  structure: text("structure"),
  format: text("format"),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_opportunities_pattern_template_id").on(table.patternTemplateId),
]);

export const insertOpportunitySchema = createInsertSchema(opportunities).omit({ id: true, generatedAt: true });

// ═══════════════════════════════════════════════════════════
// Pipeline Logs — Job monitoring
// ═══════════════════════════════════════════════════════════

export const pipelineLogs = pgTable("pipeline_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobType: text("job_type").notNull(),
  status: text("status").notNull(),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_pipeline_logs_job_type").on(table.jobType),
  index("idx_pipeline_logs_status").on(table.status),
  index("idx_pipeline_logs_created_at").on(table.createdAt),
]);

export const insertPipelineLogSchema = createInsertSchema(pipelineLogs).omit({ id: true, createdAt: true });

// ═══════════════════════════════════════════════════════════
// Dataset Batches — Tracking ingested datasets
// ═══════════════════════════════════════════════════════════

export const datasetBatches = pgTable("dataset_batches", {
  batchId: varchar("batch_id").primaryKey().default(sql`gen_random_uuid()`),
  source: text("source"),
  videosIngested: integer("videos_ingested").default(0).notNull(),
  videosClassified: integer("videos_classified").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_dataset_batches_source").on(table.source),
])

export const insertDatasetBatchSchema = createInsertSchema(datasetBatches).omit({ batchId: true, createdAt: true });

// ═══════════════════════════════════════════════════════════
// Pattern Engine State — Phase tracking (1→2→3)
// ═══════════════════════════════════════════════════════════

export const patternEngineState = pgTable("pattern_engine_state", {
  id: integer("id").primaryKey(),
  currentPhase: integer("current_phase").default(1).notNull(),
  phase1ActivatedAt: timestamp("phase_1_activated_at").defaultNow(),
  phase2ActivatedAt: timestamp("phase_2_activated_at"),
  phase3ActivatedAt: timestamp("phase_3_activated_at"),
  totalDeepVideos: integer("total_deep_videos").default(0),
  totalClassifiedVideos: integer("total_classified_videos").default(0),
  clusterCount: integer("cluster_count").default(0),
  lastTransitionAt: timestamp("last_transition_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ═══════════════════════════════════════════════════════════
// Video Embeddings — JSONB on Replit, pgvector on Hetzner
// ═══════════════════════════════════════════════════════════

export const videoEmbeddings = pgTable("video_embeddings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  videoId: varchar("video_id").notNull().unique(),
  embedding: jsonb("embedding"),
  modelUsed: varchar("model_used", { length: 50 }).default("text-embedding-3-small"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_video_embeddings_video_id").on(table.videoId),
]);

export const insertVideoEmbeddingSchema = createInsertSchema(videoEmbeddings).omit({ id: true, createdAt: true });

// ═══════════════════════════════════════════════════════════
// Content Clusters — Grouped by similarity
// ═══════════════════════════════════════════════════════════

export const contentClusters = pgTable("content_clusters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clusterLabel: varchar("cluster_label", { length: 100 }).notNull(),
  clusterDescription: text("cluster_description"),
  videoIds: text("video_ids").array(),
  centroid: jsonb("centroid"),
  patternDetected: text("pattern_detected"),
  confidenceScore: doublePrecision("confidence_score"),
  densityScore: doublePrecision("density_score"),
  analyzedByLlm: boolean("analyzed_by_llm").default(false),
  dominantHookType: text("dominant_hook_type"),
  dominantStructure: text("dominant_structure"),
  dominantFormat: text("dominant_format"),
  dominantNiche: text("dominant_niche"),
  avgViralityScore: doublePrecision("avg_virality_score"),
  velocity7d: doublePrecision("velocity_7d").default(0),
  velocity14d: doublePrecision("velocity_14d").default(0),
  velocity30d: doublePrecision("velocity_30d").default(0),
  trendStatus: text("trend_status").default("stable"),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_content_clusters_analyzed").on(table.analyzedByLlm),
]);

export const insertContentClusterSchema = createInsertSchema(contentClusters).omit({ id: true, createdAt: true });

export const userContentDna = pgTable("user_content_dna", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  hookTypePerformance: jsonb("hook_type_performance").default({}),
  formatPerformance: jsonb("format_performance").default({}),
  bestPostingPatterns: jsonb("best_posting_patterns").default({}),
  avgPredictionAccuracy: doublePrecision("avg_prediction_accuracy"),
  totalTrackedVideos: integer("total_tracked_videos").default(0),
  topPerformingNiche: text("top_performing_niche"),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Niche = typeof niches.$inferSelect;
export type InsertNiche = z.infer<typeof insertNicheSchema>;
export type Creator = typeof creators.$inferSelect;
export type InsertCreator = z.infer<typeof insertCreatorSchema>;
export type VideoPrimitive = typeof videoPrimitives.$inferSelect;
export type InsertVideoPrimitive = z.infer<typeof insertVideoPrimitiveSchema>;
export type NichePattern = typeof nichePatterns.$inferSelect;
export type NicheStatistic = typeof nicheStatistics.$inferSelect;
export type NicheProfile = typeof nicheProfiles.$inferSelect;
export type WorkspaceIntelligence = typeof workspaceIntelligence.$inferSelect;
export type InsertWorkspaceIntelligence = z.infer<typeof insertWorkspaceIntelligenceSchema>;
export type Video = typeof videos.$inferSelect;
export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type ViralPattern = typeof viralPatterns.$inferSelect;
export type InsertViralPattern = z.infer<typeof insertViralPatternSchema>;
export type Pattern = typeof patterns.$inferSelect;
export type InsertPattern = z.infer<typeof insertPatternSchema>;
export type VideoPattern = typeof videoPatterns.$inferSelect;
export type ContentProject = typeof contentProjects.$inferSelect;
export type InsertContentProject = z.infer<typeof insertContentProjectSchema>;
export type SavedIdea = typeof savedIdeas.$inferSelect;
export type InsertSavedIdea = z.infer<typeof insertSavedIdeaSchema>;
export type ViralTemplate = typeof viralTemplates.$inferSelect;
export type InsertViralTemplate = z.infer<typeof insertViralTemplateSchema>;
export type IntelligenceEvent = typeof intelligenceEvents.$inferSelect;
export type InsertIntelligenceEvent = z.infer<typeof insertIntelligenceEventSchema>;
export type VideoClassification = typeof videoClassification.$inferSelect;
export type InsertVideoClassification = z.infer<typeof insertVideoClassificationSchema>;
export type PipelinePattern = typeof pipelinePatterns.$inferSelect;
export type InsertPipelinePattern = z.infer<typeof insertPipelinePatternSchema>;
export type PatternTemplate = typeof patternTemplates.$inferSelect;
export type InsertPatternTemplate = z.infer<typeof insertPatternTemplateSchema>;
export type Opportunity = typeof opportunities.$inferSelect;
export type InsertOpportunity = z.infer<typeof insertOpportunitySchema>;
export type PipelineLog = typeof pipelineLogs.$inferSelect;
export type InsertPipelineLog = z.infer<typeof insertPipelineLogSchema>;
export type DatasetBatch = typeof datasetBatches.$inferSelect;
export type InsertDatasetBatch = z.infer<typeof insertDatasetBatchSchema>;
export type PatternEngineState = typeof patternEngineState.$inferSelect;
export type VideoEmbedding = typeof videoEmbeddings.$inferSelect;
export type InsertVideoEmbedding = z.infer<typeof insertVideoEmbeddingSchema>;
export type ContentCluster = typeof contentClusters.$inferSelect;
export type InsertContentCluster = z.infer<typeof insertContentClusterSchema>;

export const waitlist = pgTable("waitlist", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: text("first_name").notNull(),
  email: text("email").notNull().unique(),
  niche: text("niche"),
  why: text("why"),
  status: text("status").default("pending").notNull(),
  inviteToken: text("invite_token"),
  inviteSentAt: timestamp("invite_sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertWaitlistSchema = createInsertSchema(waitlist).omit({ id: true, createdAt: true });
export type WaitlistEntry = typeof waitlist.$inferSelect;
export type InsertWaitlistEntry = z.infer<typeof insertWaitlistSchema>;

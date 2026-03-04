import { pgTable, text, varchar, timestamp, integer, doublePrecision, jsonb, boolean, real, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

export * from "./models/auth";
export * from "./models/chat";

export const HOOK_TYPES = [
  "Question", "Bold_Claim", "Statistic", "Story_Start", "Shock",
  "Promise", "Problem", "Curiosity_Gap", "Authority_Intro", "Controversial",
  "Relatable", "Tutorial_Intro", "Before_After", "Myth_Busting", "Direct_Statement",
] as const;

export const STRUCTURE_MODELS = [
  "Problem_Solution", "Hook_Value_CTA", "Story_Lesson", "List_Format", "Tutorial_Step",
  "Authority_Breakdown", "Emotional_Arc", "Before_After_Transformation", "Myth_Truth", "Quick_Tip",
] as const;

export const ANGLE_CATEGORIES = [
  "Educational", "Emotional", "Authority", "Inspirational", "Relatable",
  "Fear_Based", "Aspirational", "Tactical", "Analytical", "Storytelling",
  "Controversial", "Social_Proof",
] as const;

export const FORMAT_TYPES = [
  "Talking_Head", "B_Roll_Voiceover", "Text_Overlay", "Interview", "Montage", "Mixed_Format",
] as const;

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
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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
  topicCluster: text("topic_cluster"),
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
// Craflect V1 — Taxonomie 17 dimensions
// ═══════════════════════════════════════════════════════════

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

export const STORYTELLING_PRESENCES = [
  "strong", "moderate", "minimal", "none",
] as const;

export const CONTENT_PACES = [
  "fast", "moderate", "slow", "variable",
] as const;

export const CREATOR_ARCHETYPES = [
  "educator", "entertainer", "motivator", "storyteller",
  "expert", "curator", "provocateur", "lifestyle",
] as const;

export const TOPIC_CATEGORIES = [
  "business", "finance", "health", "fitness", "tech",
  "lifestyle", "beauty", "food", "travel", "education",
  "entertainment", "motivation", "relationships", "productivity", "marketing",
] as const;

export const CTA_TYPES = [
  "follow", "comment", "share", "link_bio", "save",
  "dm", "subscribe", "none",
] as const;

export const CONTROVERSY_LEVELS = [
  "none", "low", "moderate", "high",
] as const;

export const INFORMATION_DENSITIES = [
  "low", "moderate", "high", "very_high",
] as const;

export const DURATION_BUCKETS = [
  "0-15s", "15-30s", "30-60s", "60-90s", "90-180s", "180s+",
] as const;

export const videos = pgTable("videos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  platform: text("platform"),
  videoUrl: text("video_url"),
  caption: text("caption"),
  transcript: text("transcript"),
  hashtags: text("hashtags").array(),
  durationSeconds: integer("duration_seconds"),
  durationBucket: text("duration_bucket"),
  views: integer("views"),
  likes: integer("likes"),
  comments: integer("comments"),
  shares: integer("shares"),
  creatorName: text("creator_name"),
  creatorNiche: text("creator_niche"),
  collectedAt: timestamp("collected_at").defaultNow().notNull(),
  hookMechanism: text("hook_mechanism").array(),
  hookFormat: text("hook_format"),
  hookText: text("hook_text"),
  emotionalTrigger: text("emotional_trigger").array(),
  contentStructure: text("content_structure").array(),
  contentFormat: text("content_format"),
  visualStyle: text("visual_style").array(),
  storytellingPresence: text("storytelling_presence"),
  contentPace: text("content_pace"),
  creatorArchetype: text("creator_archetype"),
  topicCategory: text("topic_category"),
  callToAction: text("call_to_action"),
  controversyLevel: text("controversy_level"),
  informationDensity: text("information_density"),
  patternNotes: text("pattern_notes"),
  classifiedAt: timestamp("classified_at"),
  classifiedBy: text("classified_by"),
  classificationStatus: text("classification_status").notNull().default("pending"),
  classificationStartedAt: timestamp("classification_started_at"),
}, (table) => [
  index("idx_videos_platform").on(table.platform),
  index("idx_videos_hook_format").on(table.hookFormat),
  index("idx_videos_content_format").on(table.contentFormat),
  index("idx_videos_topic_category").on(table.topicCategory),
  index("idx_videos_creator_niche").on(table.creatorNiche),
  index("idx_videos_collected_at").on(table.collectedAt),
  index("idx_videos_classification_status").on(table.classificationStatus),
]);

export const viralPatterns = pgTable("viral_patterns", {
  patternId: varchar("pattern_id").primaryKey().default(sql`gen_random_uuid()`),
  hookMechanism: text("hook_mechanism").array(),
  hookFormat: text("hook_format"),
  contentFormat: text("content_format"),
  contentPace: text("content_pace"),
  contentStructure: text("content_structure").array(),
  topicCategory: text("topic_category"),
  averagePerformance: doublePrecision("average_performance"),
  videoCount: integer("video_count"),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
}, (table) => [
  index("idx_viral_patterns_hook_format").on(table.hookFormat),
  index("idx_viral_patterns_content_format").on(table.contentFormat),
  index("idx_viral_patterns_topic_category").on(table.topicCategory),
]);

export const insertVideoSchema = createInsertSchema(videos).omit({ id: true, collectedAt: true });
export const insertViralPatternSchema = createInsertSchema(viralPatterns).omit({ patternId: true, lastUpdated: true });

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

import { pgTable, text, varchar, timestamp, integer, doublePrecision, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

export * from "./models/auth";
export * from "./models/chat";

export const workspaces = pgTable("workspaces", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id").notNull(), 
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const contentSources = pgTable("content_sources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workspaceId: varchar("workspace_id").notNull(),
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
});

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

import { db } from "./db";
import { 
  workspaces, contentSources, briefs, generatedContent, performance, events, subscriptions,
  niches, creators, videoPrimitives, nichePatterns, nicheStatistics, nicheProfiles, workspaceIntelligence,
  type Workspace, type InsertWorkspace,
  type ContentSource, type InsertContentSource,
  type Brief, type InsertBrief,
  type GeneratedContent, type InsertGeneratedContent,
  type Performance, type InsertPerformance,
  type InsertEvent, type Event,
  type Subscription,
  type Niche, type InsertNiche,
  type Creator, type InsertCreator,
  type VideoPrimitive, type InsertVideoPrimitive,
  type NichePattern,
  type NicheStatistic,
  type NicheProfile,
  type WorkspaceIntelligence
} from "@shared/schema";
import { users, type User } from "@shared/models/auth";
import { eq, desc, sql, count, and, or, isNull } from "drizzle-orm";

export interface IStorage {
  getWorkspacesByOwner(ownerId: string): Promise<Workspace[]>;
  createWorkspace(ownerId: string, workspace: InsertWorkspace): Promise<Workspace>;
  getWorkspaceById(id: string): Promise<Workspace | undefined>;
  
  getContentSources(workspaceId: string): Promise<ContentSource[]>;
  createContentSource(source: InsertContentSource): Promise<ContentSource>;
  updateContentSourceStatus(id: string, status: string): Promise<ContentSource>;
  updateContentSource(id: string, data: Partial<ContentSource>): Promise<ContentSource>;
  getContentSourceById(id: string): Promise<ContentSource | undefined>;
  
  getBriefs(workspaceId: string): Promise<Brief[]>;
  createBrief(brief: InsertBrief): Promise<Brief>;
  updateBriefStatus(id: string, status: string): Promise<Brief>;

  getGeneratedContent(sourceId: string): Promise<GeneratedContent[]>;
  getGeneratedContentByWorkspace(workspaceId: string): Promise<GeneratedContent[]>;
  createGeneratedContent(content: InsertGeneratedContent): Promise<GeneratedContent>;
  updateGeneratedContentStatus(id: string, status: string): Promise<GeneratedContent>;
  scheduleGeneratedContent(id: string, scheduledAt: Date): Promise<GeneratedContent>;

  getPerformanceByWorkspace(workspaceId: string): Promise<Performance[]>;
  createPerformance(perf: InsertPerformance): Promise<Performance>;

  createEvent(event: InsertEvent): Promise<Event>;
  getEvents(limit?: number): Promise<Event[]>;
  getEventsByUser(userId: string): Promise<Event[]>;

  updateUserProfile(id: string, data: { firstName?: string; lastName?: string; onboardingCompleted?: boolean }): Promise<User>;

  getSubscription(userId: string): Promise<Subscription | undefined>;
  getOrCreateSubscription(userId: string): Promise<Subscription>;
  updateSubscription(userId: string, data: Partial<Subscription>): Promise<Subscription>;
  getSubscriptionByStripeCustomerId(stripeCustomerId: string): Promise<Subscription | undefined>;
  getSubscriptionByStripeSubscriptionId(stripeSubscriptionId: string): Promise<Subscription | undefined>;
  
  getAllUsers(): Promise<User[]>;
  getGlobalStats(): Promise<{
    totalUsers: number;
    totalWorkspaces: number;
    totalSources: number;
    totalGenerated: number;
    totalBriefs: number;
  }>;
  getWorkspaceStats(workspaceId: string): Promise<{
    sourceCount: number;
    generatedCount: number;
    briefCount: number;
  }>;

  createNiche(niche: InsertNiche): Promise<Niche>;
  getNiches(): Promise<Niche[]>;
  getNicheById(id: string): Promise<Niche | undefined>;
  getNicheByName(name: string): Promise<Niche | undefined>;

  createCreator(creator: InsertCreator): Promise<Creator>;
  getCreatorsByNiche(nicheId: string): Promise<Creator[]>;
  getCreatorByUsername(platform: string, username: string): Promise<Creator | undefined>;

  createVideoPrimitive(primitive: InsertVideoPrimitive): Promise<VideoPrimitive>;
  getVideoPrimitivesByNiche(nicheId: string): Promise<VideoPrimitive[]>;
  getVideoPrimitiveCount(nicheId: string): Promise<number>;

  upsertNichePatterns(nicheId: string, data: Partial<NichePattern>): Promise<NichePattern>;
  getNichePatterns(nicheId: string): Promise<NichePattern | undefined>;

  upsertNicheStatistics(nicheId: string, data: Partial<NicheStatistic>): Promise<NicheStatistic>;
  getNicheStatistics(nicheId: string): Promise<NicheStatistic | undefined>;

  upsertNicheProfile(nicheId: string, data: Partial<NicheProfile>): Promise<NicheProfile>;
  getNicheProfile(nicheId: string): Promise<NicheProfile | undefined>;

  getVideoPrimitivesByWorkspace(workspaceId: string): Promise<VideoPrimitive[]>;
  getVideoPrimitiveCountByWorkspace(workspaceId: string): Promise<number>;

  getWorkspaceIntelligence(workspaceId: string): Promise<WorkspaceIntelligence | undefined>;
  upsertWorkspaceIntelligence(workspaceId: string, data: Partial<WorkspaceIntelligence>): Promise<WorkspaceIntelligence>;
}

export class DatabaseStorage implements IStorage {
  async getWorkspacesByOwner(ownerId: string): Promise<Workspace[]> {
    return await db.select().from(workspaces).where(eq(workspaces.ownerId, ownerId)).orderBy(desc(workspaces.createdAt));
  }

  async createWorkspace(ownerId: string, workspace: InsertWorkspace): Promise<Workspace> {
    const [created] = await db.insert(workspaces).values({ ...workspace, ownerId }).returning();
    return created;
  }

  async getWorkspaceById(id: string): Promise<Workspace | undefined> {
    const [ws] = await db.select().from(workspaces).where(eq(workspaces.id, id));
    return ws;
  }

  async getContentSources(workspaceId: string): Promise<ContentSource[]> {
    return await db.select().from(contentSources).where(eq(contentSources.workspaceId, workspaceId)).orderBy(desc(contentSources.createdAt));
  }

  async createContentSource(source: InsertContentSource): Promise<ContentSource> {
    const [created] = await db.insert(contentSources).values(source).returning();
    return created;
  }

  async updateContentSourceStatus(id: string, status: string): Promise<ContentSource> {
    const [updated] = await db.update(contentSources).set({ status }).where(eq(contentSources.id, id)).returning();
    return updated;
  }

  async updateContentSource(id: string, data: Partial<ContentSource>): Promise<ContentSource> {
    const [updated] = await db.update(contentSources).set(data).where(eq(contentSources.id, id)).returning();
    return updated;
  }

  async getContentSourceById(id: string): Promise<ContentSource | undefined> {
    const [source] = await db.select().from(contentSources).where(eq(contentSources.id, id));
    return source;
  }

  async getBriefs(workspaceId: string): Promise<Brief[]> {
    return await db.select().from(briefs).where(eq(briefs.workspaceId, workspaceId)).orderBy(desc(briefs.createdAt));
  }

  async createBrief(brief: InsertBrief): Promise<Brief> {
    const [created] = await db.insert(briefs).values(brief).returning();
    return created;
  }

  async updateBriefStatus(id: string, status: string): Promise<Brief> {
    const [updated] = await db.update(briefs).set({ status }).where(eq(briefs.id, id)).returning();
    return updated;
  }

  async getGeneratedContent(sourceId: string): Promise<GeneratedContent[]> {
    return await db.select().from(generatedContent).where(eq(generatedContent.sourceId, sourceId)).orderBy(desc(generatedContent.createdAt));
  }

  async getGeneratedContentByWorkspace(workspaceId: string): Promise<GeneratedContent[]> {
    return await db.select().from(generatedContent).where(eq(generatedContent.workspaceId, workspaceId)).orderBy(desc(generatedContent.createdAt));
  }

  async createGeneratedContent(content: InsertGeneratedContent): Promise<GeneratedContent> {
    const [created] = await db.insert(generatedContent).values(content).returning();
    return created;
  }

  async updateGeneratedContentStatus(id: string, status: string): Promise<GeneratedContent> {
    const [updated] = await db.update(generatedContent).set({ status }).where(eq(generatedContent.id, id)).returning();
    return updated;
  }

  async scheduleGeneratedContent(id: string, scheduledAt: Date): Promise<GeneratedContent> {
    const [updated] = await db.update(generatedContent).set({ scheduledAt, status: "scheduled" }).where(eq(generatedContent.id, id)).returning();
    return updated;
  }

  async getPerformanceByWorkspace(workspaceId: string): Promise<Performance[]> {
    const contents = await db.select({ id: generatedContent.id }).from(generatedContent).where(eq(generatedContent.workspaceId, workspaceId));
    if (contents.length === 0) return [];
    const contentIds = contents.map(c => c.id);
    const results: Performance[] = [];
    for (const cId of contentIds) {
      const perfs = await db.select().from(performance).where(eq(performance.generatedContentId, cId));
      results.push(...perfs);
    }
    return results;
  }

  async createPerformance(perf: InsertPerformance): Promise<Performance> {
    const [created] = await db.insert(performance).values(perf).returning();
    return created;
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    const [created] = await db.insert(events).values(event).returning();
    return created;
  }

  async getEvents(limit = 50): Promise<Event[]> {
    return await db.select().from(events).orderBy(desc(events.createdAt)).limit(limit);
  }

  async getEventsByUser(userId: string): Promise<Event[]> {
    return await db.select().from(events).where(eq(events.userId, userId)).orderBy(desc(events.createdAt));
  }

  async getSubscription(userId: string): Promise<Subscription | undefined> {
    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId));
    return sub;
  }

  async getOrCreateSubscription(userId: string): Promise<Subscription> {
    const existing = await this.getSubscription(userId);
    if (existing) return existing;
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 7);
    const renewalDate = new Date();
    renewalDate.setDate(renewalDate.getDate() + 30);
    const [created] = await db.insert(subscriptions).values({
      userId,
      plan: "starter",
      analysesUsed: 0,
      analysesLimit: 20,
      nichesCount: 1,
      nichesLimit: 1,
      billingStatus: "trial",
      trialEndDate: trialEnd,
      renewalDate,
    }).returning();
    return created;
  }

  async updateSubscription(userId: string, data: Partial<Subscription>): Promise<Subscription> {
    const [updated] = await db.update(subscriptions).set({ ...data, updatedAt: new Date() }).where(eq(subscriptions.userId, userId)).returning();
    return updated;
  }

  async getSubscriptionByStripeCustomerId(stripeCustomerId: string): Promise<Subscription | undefined> {
    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.stripeCustomerId, stripeCustomerId));
    return sub;
  }

  async getSubscriptionByStripeSubscriptionId(stripeSubscriptionId: string): Promise<Subscription | undefined> {
    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId));
    return sub;
  }

  async updateUserProfile(id: string, data: { firstName?: string; lastName?: string; onboardingCompleted?: boolean }): Promise<User> {
    const [updated] = await db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, id)).returning();
    return updated;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getGlobalStats(): Promise<{ totalUsers: number; totalWorkspaces: number; totalSources: number; totalGenerated: number; totalBriefs: number }> {
    const [userCount] = await db.select({ count: count() }).from(users);
    const [wsCount] = await db.select({ count: count() }).from(workspaces);
    const [srcCount] = await db.select({ count: count() }).from(contentSources);
    const [genCount] = await db.select({ count: count() }).from(generatedContent);
    const [briefCount] = await db.select({ count: count() }).from(briefs);
    return {
      totalUsers: userCount.count,
      totalWorkspaces: wsCount.count,
      totalSources: srcCount.count,
      totalGenerated: genCount.count,
      totalBriefs: briefCount.count,
    };
  }

  async getWorkspaceStats(workspaceId: string): Promise<{ sourceCount: number; generatedCount: number; briefCount: number }> {
    const [srcCount] = await db.select({ count: count() }).from(contentSources).where(eq(contentSources.workspaceId, workspaceId));
    const [genCount] = await db.select({ count: count() }).from(generatedContent).where(eq(generatedContent.workspaceId, workspaceId));
    const [briefCount] = await db.select({ count: count() }).from(briefs).where(eq(briefs.workspaceId, workspaceId));
    return {
      sourceCount: srcCount.count,
      generatedCount: genCount.count,
      briefCount: briefCount.count,
    };
  }

  async createNiche(niche: InsertNiche): Promise<Niche> {
    const [created] = await db.insert(niches).values(niche).returning();
    return created;
  }

  async getNiches(): Promise<Niche[]> {
    return await db.select().from(niches).orderBy(desc(niches.createdAt));
  }

  async getNicheById(id: string): Promise<Niche | undefined> {
    const [niche] = await db.select().from(niches).where(eq(niches.id, id));
    return niche;
  }

  async getNicheByName(name: string): Promise<Niche | undefined> {
    const [niche] = await db.select().from(niches).where(eq(niches.name, name));
    return niche;
  }

  async createCreator(creator: InsertCreator): Promise<Creator> {
    const [created] = await db.insert(creators).values(creator).returning();
    return created;
  }

  async getCreatorsByNiche(nicheId: string): Promise<Creator[]> {
    return await db.select().from(creators).where(eq(creators.nicheId, nicheId)).orderBy(desc(creators.createdAt));
  }

  async getCreatorByUsername(platform: string, username: string): Promise<Creator | undefined> {
    const [creator] = await db.select().from(creators).where(and(eq(creators.platform, platform), eq(creators.username, username)));
    return creator;
  }

  async createVideoPrimitive(primitive: InsertVideoPrimitive): Promise<VideoPrimitive> {
    const [created] = await db.insert(videoPrimitives).values(primitive).returning();
    return created;
  }

  async getVideoPrimitivesByNiche(nicheId: string): Promise<VideoPrimitive[]> {
    return await db.select().from(videoPrimitives).where(eq(videoPrimitives.nicheId, nicheId)).orderBy(desc(videoPrimitives.createdAt));
  }

  async getVideoPrimitiveCount(nicheId: string): Promise<number> {
    const [result] = await db.select({ count: count() }).from(videoPrimitives).where(
      eq(videoPrimitives.nicheId, nicheId)
    );
    return result.count;
  }

  async upsertNichePatterns(nicheId: string, data: Partial<NichePattern>): Promise<NichePattern> {
    const existing = await this.getNichePatterns(nicheId);
    if (existing) {
      const [updated] = await db.update(nichePatterns).set({ ...data, updatedAt: new Date() }).where(eq(nichePatterns.nicheId, nicheId)).returning();
      return updated;
    }
    const [created] = await db.insert(nichePatterns).values({ nicheId, ...data }).returning();
    return created;
  }

  async getNichePatterns(nicheId: string): Promise<NichePattern | undefined> {
    const [pattern] = await db.select().from(nichePatterns).where(eq(nichePatterns.nicheId, nicheId));
    return pattern;
  }

  async upsertNicheStatistics(nicheId: string, data: Partial<NicheStatistic>): Promise<NicheStatistic> {
    const existing = await this.getNicheStatistics(nicheId);
    if (existing) {
      const [updated] = await db.update(nicheStatistics).set({ ...data, updatedAt: new Date() }).where(eq(nicheStatistics.nicheId, nicheId)).returning();
      return updated;
    }
    const [created] = await db.insert(nicheStatistics).values({ nicheId, ...data }).returning();
    return created;
  }

  async getNicheStatistics(nicheId: string): Promise<NicheStatistic | undefined> {
    const [stat] = await db.select().from(nicheStatistics).where(eq(nicheStatistics.nicheId, nicheId));
    return stat;
  }

  async upsertNicheProfile(nicheId: string, data: Partial<NicheProfile>): Promise<NicheProfile> {
    const existing = await this.getNicheProfile(nicheId);
    if (existing) {
      const [updated] = await db.update(nicheProfiles).set({ ...data, lastUpdated: new Date() }).where(eq(nicheProfiles.nicheId, nicheId)).returning();
      return updated;
    }
    const [created] = await db.insert(nicheProfiles).values({ nicheId, ...data }).returning();
    return created;
  }

  async getNicheProfile(nicheId: string): Promise<NicheProfile | undefined> {
    const [profile] = await db.select().from(nicheProfiles).where(eq(nicheProfiles.nicheId, nicheId));
    return profile;
  }

  async getVideoPrimitivesByWorkspace(workspaceId: string): Promise<VideoPrimitive[]> {
    return await db.select().from(videoPrimitives).where(eq(videoPrimitives.workspaceId, workspaceId)).orderBy(desc(videoPrimitives.createdAt));
  }

  async getVideoPrimitiveCountByWorkspace(workspaceId: string): Promise<number> {
    const [result] = await db.select({ count: count() }).from(videoPrimitives).where(eq(videoPrimitives.workspaceId, workspaceId));
    return result.count;
  }

  async getWorkspaceIntelligence(workspaceId: string): Promise<WorkspaceIntelligence | undefined> {
    const [intel] = await db.select().from(workspaceIntelligence).where(eq(workspaceIntelligence.workspaceId, workspaceId));
    return intel;
  }

  async upsertWorkspaceIntelligence(workspaceId: string, data: Partial<WorkspaceIntelligence>): Promise<WorkspaceIntelligence> {
    const existing = await this.getWorkspaceIntelligence(workspaceId);
    if (existing) {
      const [updated] = await db.update(workspaceIntelligence).set({ ...data, lastUpdated: new Date() }).where(eq(workspaceIntelligence.workspaceId, workspaceId)).returning();
      return updated;
    }
    const [created] = await db.insert(workspaceIntelligence).values({ workspaceId, ...data } as any).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();

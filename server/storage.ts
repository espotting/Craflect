import { db } from "./db";
import { 
  workspaces, contentSources, briefs, generatedContent, performance, events,
  type Workspace, type InsertWorkspace,
  type ContentSource, type InsertContentSource,
  type Brief, type InsertBrief,
  type GeneratedContent, type InsertGeneratedContent,
  type Performance, type InsertPerformance,
  type InsertEvent, type Event
} from "@shared/schema";
import { users, type User } from "@shared/models/auth";
import { eq, desc, sql, count, and } from "drizzle-orm";

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
}

export const storage = new DatabaseStorage();

import { db } from "./db";
import { 
  workspaces, contentSources, briefs, generatedContent,
  type Workspace, type InsertWorkspace,
  type ContentSource, type InsertContentSource,
  type Brief, type InsertBrief,
  type GeneratedContent, type InsertGeneratedContent
} from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Workspaces
  getWorkspacesByOwner(ownerId: string): Promise<Workspace[]>;
  createWorkspace(ownerId: string, workspace: InsertWorkspace): Promise<Workspace>;
  
  // Sources
  getContentSources(workspaceId: string): Promise<ContentSource[]>;
  createContentSource(source: InsertContentSource): Promise<ContentSource>;
  
  // Briefs
  getBriefs(workspaceId: string): Promise<Brief[]>;
  createBrief(brief: InsertBrief): Promise<Brief>;
  
  // Generated Content
  getGeneratedContent(sourceId: string): Promise<GeneratedContent[]>;
}

export class DatabaseStorage implements IStorage {
  async getWorkspacesByOwner(ownerId: string): Promise<Workspace[]> {
    return await db.select().from(workspaces).where(eq(workspaces.ownerId, ownerId));
  }

  async createWorkspace(ownerId: string, workspace: InsertWorkspace): Promise<Workspace> {
    const [created] = await db.insert(workspaces).values({
      ...workspace,
      ownerId,
    }).returning();
    return created;
  }

  async getContentSources(workspaceId: string): Promise<ContentSource[]> {
    return await db.select().from(contentSources).where(eq(contentSources.workspaceId, workspaceId));
  }

  async createContentSource(source: InsertContentSource): Promise<ContentSource> {
    const [created] = await db.insert(contentSources).values(source).returning();
    return created;
  }

  async getBriefs(workspaceId: string): Promise<Brief[]> {
    return await db.select().from(briefs).where(eq(briefs.workspaceId, workspaceId));
  }

  async createBrief(brief: InsertBrief): Promise<Brief> {
    const [created] = await db.insert(briefs).values(brief).returning();
    return created;
  }

  async getGeneratedContent(sourceId: string): Promise<GeneratedContent[]> {
    return await db.select().from(generatedContent).where(eq(generatedContent.sourceId, sourceId));
  }
}

export const storage = new DatabaseStorage();

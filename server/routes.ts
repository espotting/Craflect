import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { registerChatRoutes } from "./replit_integrations/chat";
import { registerImageRoutes } from "./replit_integrations/image";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Setup Authentication
  await setupAuth(app);
  registerAuthRoutes(app);
  
  // Setup AI Chat / Images
  registerChatRoutes(app);
  registerImageRoutes(app);

  // Workspaces
  app.get(api.workspaces.list.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.id;
    const items = await storage.getWorkspacesByOwner(userId);
    res.json(items);
  });

  app.post(api.workspaces.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const input = api.workspaces.create.input.parse(req.body);
      const workspace = await storage.createWorkspace(userId, input);
      res.status(201).json(workspace);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      res.status(500).json({ message: "Internal Error" });
    }
  });

  // Sources
  app.get(api.contentSources.list.path, isAuthenticated, async (req: any, res) => {
    const items = await storage.getContentSources(req.params.workspaceId);
    res.json(items);
  });

  app.post(api.contentSources.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.contentSources.create.input.parse(req.body);
      const source = await storage.createContentSource({
        ...input,
        workspaceId: req.params.workspaceId,
      });
      res.status(201).json(source);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal Error" });
    }
  });

  // Briefs
  app.get(api.briefs.list.path, isAuthenticated, async (req: any, res) => {
    const items = await storage.getBriefs(req.params.workspaceId);
    res.json(items);
  });

  app.post(api.briefs.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const input = api.briefs.create.input.parse(req.body);
      const brief = await storage.createBrief({
        ...input,
        workspaceId: req.params.workspaceId,
      });
      res.status(201).json(brief);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal Error" });
    }
  });

  // Generated Content
  app.get(api.generatedContent.list.path, isAuthenticated, async (req: any, res) => {
    const items = await storage.getGeneratedContent(req.params.sourceId);
    res.json(items);
  });

  return httpServer;
}

import { z } from "zod";
import { 
  insertWorkspaceSchema, 
  workspaces, 
  contentSources, 
  insertContentSourceSchema,
  briefs,
  insertBriefSchema,
  generatedContent,
  insertGeneratedContentSchema
} from "./schema";

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

export const api = {
  workspaces: {
    list: {
      method: "GET" as const,
      path: "/api/workspaces" as const,
      responses: {
        200: z.array(z.custom<typeof workspaces.$inferSelect>()),
        401: errorSchemas.unauthorized,
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/workspaces" as const,
      input: insertWorkspaceSchema,
      responses: {
        201: z.custom<typeof workspaces.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
  },
  contentSources: {
    list: {
      method: "GET" as const,
      path: "/api/workspaces/:workspaceId/sources" as const,
      responses: {
        200: z.array(z.custom<typeof contentSources.$inferSelect>()),
        401: errorSchemas.unauthorized,
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/workspaces/:workspaceId/sources" as const,
      input: insertContentSourceSchema.omit({ workspaceId: true }),
      responses: {
        201: z.custom<typeof contentSources.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      }
    }
  },
  briefs: {
    list: {
      method: "GET" as const,
      path: "/api/workspaces/:workspaceId/briefs" as const,
      responses: {
        200: z.array(z.custom<typeof briefs.$inferSelect>()),
        401: errorSchemas.unauthorized,
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/workspaces/:workspaceId/briefs" as const,
      input: insertBriefSchema.omit({ workspaceId: true }),
      responses: {
        201: z.custom<typeof briefs.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      }
    }
  },
  generatedContent: {
    list: {
      method: "GET" as const,
      path: "/api/sources/:sourceId/generated" as const,
      responses: {
        200: z.array(z.custom<typeof generatedContent.$inferSelect>()),
        401: errorSchemas.unauthorized,
      }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

import { z } from 'zod';
import { insertScenarioSchema, scenarios } from './schema';

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
};

export const api = {
  scenarios: {
    list: {
      method: 'GET' as const,
      path: '/api/scenarios',
      responses: {
        200: z.array(z.custom<typeof scenarios.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/scenarios/:id',
      responses: {
        200: z.custom<typeof scenarios.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/scenarios',
      input: insertScenarioSchema,
      responses: {
        201: z.custom<typeof scenarios.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/scenarios/:id',
      input: insertScenarioSchema.partial(),
      responses: {
        200: z.custom<typeof scenarios.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/scenarios/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
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

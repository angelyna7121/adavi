/**
 * client/src/lib/publicConfig.ts
 *
 * Safe frontend-only configuration.
 *
 * Rules:
 *  - Only VITE_* prefixed env vars are accessible here (Vite inlines them at build time).
 *  - NEVER import server/config.ts from any client file.
 *  - NEVER put secrets, API keys, or credentials here.
 *
 * To add a new public config value:
 *  1. Prefix it with VITE_ in your .env / Replit Secrets
 *  2. Add it to this file
 *  3. Import { publicConfig } wherever needed in the client
 */

export const publicConfig = {
  appName:      import.meta.env.VITE_APP_NAME      ?? "adavi.ai",
  supportEmail: import.meta.env.VITE_SUPPORT_EMAIL ?? "adavi@adavi.ai",
  appUrl:       import.meta.env.VITE_APP_URL       ?? "",
  isDev:        import.meta.env.DEV  === true,
  isProd:       import.meta.env.PROD === true,
} as const;

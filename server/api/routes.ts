import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import { storage } from "../services/storage";
import { passport, googleAuthConfigured } from "../auth";
import { z } from "zod";
import {
  insertUserSchema, insertWaitlistSchema, insertIncomeStrategySchema,
  insertNetWorthItemSchema, insertReportSchema, insertAnnotationSchema, type SafeUser,
} from "@shared/schema";
import { stripeConfig, appConfig, google, openaiConfig, fileStorage } from "../config";
import rateLimit from "express-rate-limit";
import { registerDocumentRoutes } from "./documents";
import { classifyItem } from "../services/classificationEngine";

// ── Rate limiters ─────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts. Please try again in 15 minutes." },
  skip: () => appConfig.isDev,
});

function safeOrigin(raw: string | undefined, fallback: string): string {
  if (!raw) return fallback;
  const trimmed = raw.trim().replace(/\/$/, "");
  return trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ message: "Unauthorized" });
}

function isPro(user: any): boolean {
  return user?.subscriptionStatus === "active" || user?.subscriptionStatus === "trialing";
}

function safeUser(user: any): SafeUser {
  const { passwordHash, googleId, ...safe } = user;
  return safe;
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // ── Document upload routes ─────────────────────────────────────
  registerDocumentRoutes(app);

  // ── Auth: status ──────────────────────────────────────────────
  app.get("/api/auth/me", async (req, res) => {
    if (req.isAuthenticated()) {
      const user = safeUser(req.user);
      const profile = await storage.getUserProfile((req.user as any).id);
      return res.json({ ...user, profile: profile ?? null });
    }
    res.json(null);
  });

  app.get("/api/auth/providers", (_req, res) => {
    res.json({ google: googleAuthConfigured });
  });

  // ── Auth: email + password ────────────────────────────────────
  app.post("/api/auth/signup", authLimiter, async (req, res, next) => {
    try {
      const input = insertUserSchema.parse(req.body);
      const existing = await storage.getUserByEmail(input.email);
      if (existing) return res.status(400).json({ message: "An account with this email already exists." });
      const user = await storage.createUser(input.email, input.password);
      await storage.upsertUserProfile(user.id, { onboardingCompleted: false });
      await storage.trackEvent("signup_completed", user.id);
      // Regenerate session to prevent session fixation attacks
      req.session.regenerate((regenErr) => {
        if (regenErr) return next(regenErr);
        req.login(user, (loginErr) => {
          if (loginErr) return next(loginErr);
          res.status(201).json(safeUser(user));
        });
      });
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      next(err);
    }
  });

  app.post("/api/auth/login", authLimiter, (req, res, next) => {
    passport.authenticate("local", async (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Login failed." });
      // Regenerate session to prevent session fixation attacks
      req.session.regenerate((regenErr) => {
        if (regenErr) return next(regenErr);
        req.login(user, async (loginErr) => {
          if (loginErr) return next(loginErr);
          await storage.trackEvent("login_completed", user.id);
          const profile = await storage.getUserProfile(user.id);
          res.json({ ...safeUser(user), profile: profile ?? null });
        });
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      req.session.destroy((destroyErr) => {
        if (destroyErr) return next(destroyErr);
        res.clearCookie("connect.sid");
        res.json({ ok: true });
      });
    });
  });

  // ── Auth: Google OAuth ────────────────────────────────────────
  if (googleAuthConfigured) {
    app.get("/api/auth/google", passport.authenticate("google", { scope: ["email", "profile"] }));
    app.get(
      "/api/auth/google/callback",
      passport.authenticate("google", { failureRedirect: "/login?error=google_failed" }),
      async (req, res) => {
        const user = req.user as any;
        await storage.trackEvent("login_completed", user.id, JSON.stringify({ method: "google" }));
        const profile = await storage.getUserProfile(user.id);
        if (!profile || !profile.onboardingCompleted) return res.redirect("/onboarding");
        res.redirect("/dashboard");
      }
    );
  } else {
    app.get("/api/auth/google", (_req, res) => res.redirect("/login?error=google_not_configured"));
  }

  // ── Google OAuth diagnostic (dev-only, no secrets exposed) ────
  app.get("/api/auth/google-diag", (req, res) => {
    if (appConfig.isProd) return res.status(404).end();

    // Compute the same callback URL that auth/index.ts would use
    const callbackURL = (() => {
      if (google.callbackUrl) return google.callbackUrl;
      if (appConfig.publicUrl) return `${appConfig.publicUrl.replace(/\/$/, "")}/api/auth/google/callback`;
      const domain = appConfig.replitDomains.split(",")[0].trim();
      if (domain) return `https://${domain}/api/auth/google/callback`;
      return "(relative — cannot determine full URL)";
    })();

    const clientId = google.clientId ?? "";

    res.json({
      configured: googleAuthConfigured,
      callbackUrl: callbackURL,
      // Reveal only the first 12 characters so you can verify which credential is in use
      clientIdPrefix: clientId ? clientId.slice(0, 12) + "…" : "(not set)",
      clientSecretPresent: !!google.clientSecret,
      envVars: {
        GOOGLE_CLIENT_ID:     !!process.env.GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
        GOOGLE_CALLBACK_URL:  !!process.env.GOOGLE_CALLBACK_URL,
        PUBLIC_APP_URL:       !!process.env.PUBLIC_APP_URL,
        REPLIT_DOMAINS:       appConfig.replitDomains || "(empty)",
      },
      setupChecklist: [
        `✅ Step 1 — In Google Cloud Console → APIs & Services → OAuth consent screen:`,
        `   • Status should be "In production" (not "Testing")`,
        `   • If still in Testing, add your email under "Test users"`,
        `✅ Step 2 — In Google Cloud Console → APIs & Services → Credentials → your OAuth 2.0 Client ID:`,
        `   • Authorised redirect URIs must contain EXACTLY: ${callbackURL}`,
        `✅ Step 3 — Confirm environment variables are set in Replit Secrets:`,
        `   • GOOGLE_CLIENT_ID   : ${!!process.env.GOOGLE_CLIENT_ID  ? "present" : "MISSING"}`,
        `   • GOOGLE_CLIENT_SECRET: ${!!process.env.GOOGLE_CLIENT_SECRET ? "present" : "MISSING"}`,
        `   • (Optional) GOOGLE_CALLBACK_URL: set this to override the auto-computed callback URL`,
        `✅ Step 4 — If using a custom domain, set PUBLIC_APP_URL=https://yourdomain.com in Replit Secrets`,
      ],
    });
  });

  // ── Onboarding ────────────────────────────────────────────────
  app.post("/api/onboarding", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as any;
      const { firstName, lastName, businessType, province, incomeRange } = req.body;
      const profile = await storage.upsertUserProfile(user.id, {
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        businessType: businessType || undefined,
        province: province || "ON",
        incomeRange: incomeRange || undefined,
        onboardingCompleted: true,
      });
      await storage.trackEvent("onboarding_completed", user.id);
      res.json(profile);
    } catch (err) { next(err); }
  });

  app.get("/api/onboarding", requireAuth, async (req, res) => {
    const user = req.user as any;
    const profile = await storage.getUserProfile(user.id);
    res.json(profile ?? null);
  });

  // ── Net Worth ─────────────────────────────────────────────────
  app.get("/api/net-worth", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as any;
      const statement = await storage.getOrCreateNetWorthStatement(user.id);
      const items = await storage.getNetWorthItems(statement.id);
      res.json({ statement, items });
    } catch (err) { next(err); }
  });

  app.post("/api/net-worth/items", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as any;
      if (!isPro(user)) return res.status(403).json({ message: "Pro subscription required to save net worth items." });
      const statement = await storage.getOrCreateNetWorthStatement(user.id);
      // Apply classification engine before saving so rules are always enforced
      const { type: enforcedType, category: enforcedCategory } = classifyItem(
        req.body.name ?? "",
        req.body.category,
        req.body.type,
      );
      const data = insertNetWorthItemSchema.parse({
        ...req.body,
        type: enforcedType,
        category: enforcedCategory,
        statementId: statement.id,
        userId: user.id,
      });
      const item = await storage.addNetWorthItem(data);
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      next(err);
    }
  });

  app.put("/api/net-worth/items/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const user = req.user as any;
      const updates = insertNetWorthItemSchema.partial().parse(req.body);
      const item = await storage.updateNetWorthItem(id, user.id, updates);
      if (!item) return res.status(404).json({ message: "Item not found" });
      res.json(item);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      next(err);
    }
  });

  app.delete("/api/net-worth/items/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const user = req.user as any;
      await storage.deleteNetWorthItem(id, user.id);
      res.status(204).send();
    } catch (err) { next(err); }
  });

  app.post("/api/net-worth/save", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as any;
      if (!isPro(user)) return res.status(403).json({ message: "Pro subscription required to save net worth reports." });
      const { totalAssets, totalLiabilities } = req.body;
      const statement = await storage.getOrCreateNetWorthStatement(user.id);
      const updated = await storage.updateNetWorthTotals(statement.id, totalAssets ?? 0, totalLiabilities ?? 0);

      const existing = await storage.getReports(user.id);
      const nwReport = existing.find(r => r.reportType === "net_worth");
      if (!nwReport) {
        await storage.createReport({
          userId: user.id,
          reportType: "net_worth",
          title: "Net Worth Summary",
          referenceId: statement.id,
          status: "generated",
        });
      }
      await storage.trackEvent("net_worth_saved", user.id);

      res.json(updated);
    } catch (err) { next(err); }
  });

  // ── Income Strategy ───────────────────────────────────────────
  app.get("/api/income-strategy", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as any;
      const strategies = await storage.getIncomeStrategies(user.id);
      res.json(strategies);
    } catch (err) { next(err); }
  });

  app.post("/api/income-strategy", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as any;
      if (!isPro(user)) return res.status(403).json({ message: "Pro subscription required to save strategies." });
      const data = insertIncomeStrategySchema.parse({ ...req.body, userId: user.id });
      const strategy = await storage.saveIncomeStrategy(data);

      await storage.createReport({
        userId: user.id,
        reportType: "income_strategy",
        title: data.title || "Income Strategy Analysis",
        referenceId: strategy.id,
        status: "generated",
      });

      await storage.trackEvent("income_strategy_saved", user.id);
      res.status(201).json(strategy);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      next(err);
    }
  });

  app.delete("/api/income-strategy/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const user = req.user as any;
      await storage.deleteIncomeStrategy(id, user.id);
      res.status(204).send();
    } catch (err) { next(err); }
  });

  // ── Reports ───────────────────────────────────────────────────
  app.get("/api/reports", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as any;
      if (!isPro(user)) return res.json([]);
      const userReports = await storage.getReports(user.id);
      res.json(userReports);
    } catch (err) { next(err); }
  });

  app.post("/api/reports", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as any;
      if (!isPro(user)) return res.status(403).json({ message: "Pro subscription required." });
      const data = insertReportSchema.parse({ ...req.body, userId: user.id });
      const report = await storage.createReport(data);
      res.status(201).json(report);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      next(err);
    }
  });

  app.get("/api/reports/:id", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as any;
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const report = await storage.getReport(id, user.id);
      if (!report) return res.status(404).json({ message: "Report not found" });

      let detail: any = null;
      if (report.reportType === "net_worth" && report.referenceId) {
        const statement = await storage.getOrCreateNetWorthStatement(user.id);
        const items = await storage.getNetWorthItems(statement.id);
        detail = { statement, items };
      } else if (report.reportType === "income_strategy" && report.referenceId) {
        detail = await storage.getIncomeStrategyById(report.referenceId);
      }

      res.json({ report, detail, user: { email: user.email, profile: user.profile } });
    } catch (err) { next(err); }
  });

  app.delete("/api/reports/:id", requireAuth, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      const user = req.user as any;
      await storage.deleteReport(id, user.id);
      res.status(204).send();
    } catch (err) { next(err); }
  });

  // ── Settings (profile update) ─────────────────────────────────
  app.put("/api/settings/profile", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as any;
      const { firstName, lastName, province } = req.body;
      const profile = await storage.upsertUserProfile(user.id, {
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        province: province || "ON",
      });
      res.json(profile);
    } catch (err) { next(err); }
  });

  app.put("/api/settings/password", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as any;
      if (user.googleId) return res.status(400).json({ message: "Google accounts cannot change their password here." });
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) return res.status(400).json({ message: "Both fields are required." });
      if (newPassword.length < 8) return res.status(400).json({ message: "New password must be at least 8 characters." });
      const { comparePasswords, hashPassword } = await import("../auth/crypto");
      const dbUser = await storage.getUserById(user.id);
      const ok = await comparePasswords(currentPassword, dbUser?.passwordHash);
      if (!ok) return res.status(400).json({ message: "Current password is incorrect." });
      const newHash = await hashPassword(newPassword);
      await storage.changePassword(user.id, newHash);
      res.json({ ok: true });
    } catch (err) { next(err); }
  });

  // ── Scenarios (legacy) ────────────────────────────────────────
  app.get("/api/scenarios", requireAuth, async (req, res) => {
    const user = req.user as any;
    res.json(await storage.getScenariosByUser(user.id));
  });

  // ── Waitlist ──────────────────────────────────────────────────
  app.post("/api/waitlist", async (req, res, next) => {
    try {
      const input = insertWaitlistSchema.parse(req.body);
      const row = await storage.addToWaitlist(input.email, input.source || "landing");
      const userId = req.isAuthenticated() ? (req.user as any).id : undefined;
      await storage.trackEvent("waitlist_joined", userId);
      res.json({ ok: true, alreadyExists: row === null });
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      next(err);
    }
  });

  // ── Stripe diagnostic (dev only) ──────────────────────────────
  app.get("/api/stripe-diag", (req, res) => {
    if (appConfig.isProd) return res.status(404).end();
    res.json({
      hasKey: stripeConfig.configured,
      monthly: (stripeConfig.monthlyPriceId ?? "(not set)").slice(0, 30),
      annual:  (stripeConfig.annualPriceId  ?? "(not set)").slice(0, 30),
      pubUrl:  (appConfig.publicUrl         ?? "(not set)").slice(0, 60),
    });
  });

  // ── Stripe Checkout ───────────────────────────────────────────
  app.post("/api/create-checkout-session", async (req, res) => {
    try {
      const { plan } = req.body;
      if (plan !== "monthly" && plan !== "annual") return res.status(400).json({ error: "Invalid plan." });
      const priceId = plan === "annual" ? stripeConfig.annualPriceId : stripeConfig.monthlyPriceId;
      if (!stripeConfig.secretKey || !priceId) return res.status(503).json({ configured: false });

      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(stripeConfig.secretKey, { apiVersion: "2024-12-18.acacia" as any });
      const origin = safeOrigin(appConfig.publicUrl, `${req.protocol}://${req.get("host")}`);
      const userId = req.isAuthenticated() ? (req.user as any).id : undefined;
      const existingCustomerId = req.isAuthenticated() ? (req.user as any).stripeCustomerId : undefined;

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        allow_promotion_codes: true,
        success_url: `${origin}/billing?checkout=success`,
        cancel_url: `${origin}/pricing?checkout=cancelled`,
        ...(existingCustomerId
          ? { customer: existingCustomerId }
          : req.isAuthenticated() && (req.user as any)?.email
            ? { customer_email: (req.user as any).email }
            : {}),
        metadata: { userId: userId ? String(userId) : "", plan },
      });

      res.json({ url: session.url });
    } catch (err: any) {
      console.error("[Stripe] Checkout error:", err.message);
      res.status(500).json({ error: "checkout_failed" });
    }
  });

  // ── Stripe Billing Portal ──────────────────────────────────────
  app.post("/api/billing/portal", requireAuth, async (req, res) => {
    try {
      const user = req.user as any;
      if (!stripeConfig.secretKey || !user.stripeCustomerId) {
        return res.status(400).json({ error: "No active subscription found." });
      }
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(stripeConfig.secretKey, { apiVersion: "2024-12-18.acacia" as any });
      const origin = safeOrigin(appConfig.publicUrl, `${req.protocol}://${req.get("host")}`);
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${origin}/billing`,
      });
      res.json({ url: portalSession.url });
    } catch (err: any) {
      console.error("[Stripe] Portal error:", err.message);
      res.status(500).json({ error: "portal_failed" });
    }
  });

  // ── Annotations ───────────────────────────────────────────────
  /**
   * POST /api/annotations
   * Records a user correction made during the import review step.
   * Fire-and-forget from the client — always returns 201.
   */
  app.post("/api/annotations", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as any;
      const data = insertAnnotationSchema.parse({ ...req.body, userId: user.id });
      const annotation = await storage.createAnnotation(data);
      res.status(201).json(annotation);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      next(err);
    }
  });

  /**
   * GET /api/annotations?documentId=123
   * Returns all annotations for a document (owner only).
   */
  app.get("/api/annotations", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as any;
      const documentId = parseInt(String(req.query.documentId ?? ""));
      if (isNaN(documentId)) return res.status(400).json({ message: "documentId required" });
      const rows = await storage.getAnnotationsByDocument(documentId, user.id);
      res.json(rows);
    } catch (err) { next(err); }
  });

  // ── User data export ──────────────────────────────────────────
  app.get("/api/user/data-export", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as any;
      const uid = user.id;

      const [profile, scenariosList, nwStatement, strategies, docs, reportsList] = await Promise.all([
        storage.getUserProfile(uid),
        storage.getScenariosByUser(uid),
        storage.getOrCreateNetWorthStatement(uid),
        storage.getIncomeStrategies(uid),
        storage.getUploadedDocuments(uid),
        storage.getReports(uid),
      ]);

      const nwItems = await storage.getNetWorthItems(nwStatement.id);

      const exportPayload = {
        exportedAt: new Date().toISOString(),
        exportVersion: "1.0",
        account: {
          id: uid,
          email: user.email,
          subscriptionStatus: user.subscriptionStatus,
          planType: user.planType,
          createdAt: user.createdAt,
        },
        profile: profile ?? null,
        netWorth: {
          statement: { ...nwStatement },
          items: nwItems,
        },
        incomeStrategies: strategies,
        scenarios: scenariosList,
        documents: docs.map(({ storedPath: _sp, extractedText: _et, ...safe }) => safe),
        reports: reportsList,
      };

      const filename = `adavi-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Cache-Control", "private, no-cache");
      res.json(exportPayload);
    } catch (err) { next(err); }
  });

  // ── Account deletion ───────────────────────────────────────────
  app.post("/api/user/delete-account", requireAuth, async (req, res, next) => {
    try {
      const user = req.user as any;
      const { confirmEmail } = req.body ?? {};

      if (!confirmEmail || confirmEmail.toLowerCase().trim() !== user.email.toLowerCase()) {
        return res.status(400).json({ message: "Email confirmation does not match your account email." });
      }

      // Destroy session first so the user is immediately logged out
      req.session.destroy(async () => {
        try {
          await storage.deleteUser(user.id);
        } catch (err) {
          console.error("[delete-account] Failed to delete user", user.id, err);
        }
      });

      res.json({ ok: true, message: "Account and all associated data have been permanently deleted." });
    } catch (err) { next(err); }
  });

  // ── Admin: launch status ──────────────────────────────────────
  app.get("/api/admin/launch-status", async (req, res, next) => {
    try {
      const dbHealth = await storage.checkDatabaseHealth();

      res.json({
        timestamp: new Date().toISOString(),
        environment: appConfig.nodeEnv,
        checks: {
          database: {
            urlSet: !!process.env.DATABASE_URL,
            connected: dbHealth.connected,
            tablesExist: dbHealth.tablesExist,
          },
          session: {
            secretSet: !!process.env.SESSION_SECRET,
          },
          google: {
            clientIdSet:     !!process.env.GOOGLE_CLIENT_ID,
            clientSecretSet: !!process.env.GOOGLE_CLIENT_SECRET,
            callbackUrlSet:  !!(process.env.GOOGLE_CALLBACK_URL || process.env.PUBLIC_APP_URL),
            configured:      google.configured,
          },
          stripe: {
            secretKeySet:      !!process.env.STRIPE_SECRET_KEY,
            webhookSecretSet:  !!process.env.STRIPE_WEBHOOK_SECRET,
            monthlyPriceIdSet: !!process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
            annualPriceIdSet:  !!process.env.STRIPE_PRO_ANNUAL_PRICE_ID,
            configured:        stripeConfig.configured,
          },
          openai: {
            apiKeySet:  !!process.env.OPENAI_API_KEY,
            configured: openaiConfig.configured,
          },
          app: {
            publicUrlSet: !!process.env.PUBLIC_APP_URL,
            nodeEnv:      appConfig.nodeEnv,
            isProduction: appConfig.isProd,
          },
          fileStorage: {
            provider:     fileStorage.provider,
            maxFileSizeMb: fileStorage.maxFileSizeMb,
            s3Configured: !!(fileStorage.s3.bucket && fileStorage.s3.accessKeyId && fileStorage.s3.secretAccessKey),
          },
        },
      });
    } catch (err) { next(err); }
  });

  // ── Analytics ─────────────────────────────────────────────────
  app.post("/api/analytics/event", async (req, res, next) => {
    try {
      const { eventName, metadata } = req.body;
      if (!eventName) return res.status(400).json({ message: "eventName required" });
      const userId = req.isAuthenticated() ? (req.user as any).id : undefined;
      await storage.trackEvent(eventName, userId, metadata);
      res.json({ ok: true });
    } catch (err) { next(err); }
  });

  return httpServer;
}

import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";
import { registerRoutes } from "./api/routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { passport } from "./auth";
import { storage } from "./services/storage";
import { validateConfig, database, sessionConfig, stripeConfig, appConfig } from "./config";
import { errorHandler, notFoundHandler } from "./lib/errorHandler";
import { checkDatabaseConnection } from "./db";

// ── Validate environment at startup ───────────────────────────
validateConfig();

export const app = express();
const httpServer = createServer(app);

if (process.env.VERCEL || appConfig.isProd) {
  app.set("trust proxy", 1);
}

// ── Stripe status normalizer ───────────────────────────────────
// Maps Stripe's subscription statuses to our 4 app statuses:
// free | active | past_due | canceled
function normalizeStripeStatus(stripeStatus: string): string {
  switch (stripeStatus) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
    case "incomplete":
    case "unpaid":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
      return "canceled";
    default:
      return "free";
  }
}

// ── Stripe webhook needs raw body BEFORE express.json() ───────
// Must be registered first so the raw Buffer reaches the handler.
app.post(
  "/api/stripe-webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"] as string | undefined;

    if (!stripeConfig.webhookSecret) {
      if (appConfig.isDev) {
        console.warn("[Stripe] STRIPE_WEBHOOK_SECRET not set — skipping webhook.");
      }
      return res.status(200).json({ received: true });
    }

    let event: any;
    try {
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(stripeConfig.secretKey!, {
        apiVersion: "2024-12-18.acacia" as any,
      });
      event = stripe.webhooks.constructEvent(req.body, sig ?? "", stripeConfig.webhookSecret);
    } catch (err: any) {
      if (appConfig.isDev) {
        console.error("[Stripe] Webhook signature verification failed:", err.message);
      }
      return res.status(400).json({ error: "Webhook signature verification failed." });
    }

    console.log(`[Stripe] webhook: ${event.type}`);

    switch (event.type) {

      // ── New checkout completed ────────────────────────────────
      case "checkout.session.completed": {
        const session = event.data.object;
        const userIdStr = session.metadata?.userId;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;
        if (userIdStr) {
          const userId = parseInt(userIdStr, 10);
          const plan = (session.metadata?.plan as string) ?? null;
          // Eagerly mark active; subscription.updated fires next and will
          // overwrite with the real Stripe status.
          await storage.updateUserStripeInfo(userId, {
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            subscriptionStatus: "active",
            planType: plan,
          });
          console.log(`[Stripe] user ${userId} → active (checkout completed)`);
        }
        break;
      }

      // ── Subscription created / updated ────────────────────────
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object;
        const user = await storage.getUserByStripeCustomerId(sub.customer as string);
        if (user) {
          const priceId = sub.items?.data?.[0]?.price?.id;
          const planType =
            priceId === stripeConfig.annualPriceId  ? "annual"  :
            priceId === stripeConfig.monthlyPriceId ? "monthly" :
            user.planType;
          // Normalize Stripe's subscription status to our 4 app statuses:
          //   active | trialing              → "active"
          //   past_due | incomplete | unpaid → "past_due"
          //   canceled | incomplete_expired  → "canceled"
          const status = normalizeStripeStatus(sub.status);
          await storage.updateUserStripeInfo(user.id, {
            stripeSubscriptionId: sub.id,
            subscriptionStatus: status,
            planType,
          });
          console.log(`[Stripe] user ${user.id} → ${status} (${event.type}, stripe: ${sub.status})`);
        }
        break;
      }

      // ── Subscription canceled ─────────────────────────────────
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const user = await storage.getUserByStripeCustomerId(sub.customer as string);
        if (user) {
          // Keep stripeCustomerId so they can re-subscribe; clear sub ID + mark canceled.
          await storage.updateUserStripeInfo(user.id, {
            stripeSubscriptionId: null,
            subscriptionStatus: "canceled",
            planType: null,
          });
          console.log(`[Stripe] user ${user.id} → canceled`);
        }
        break;
      }

      // ── Payment failed ────────────────────────────────────────
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const user = await storage.getUserByStripeCustomerId(invoice.customer as string);
        if (user) {
          await storage.updateUserStripeInfo(user.id, { subscriptionStatus: "past_due" });
          console.log(`[Stripe] user ${user.id} → past_due (payment failed)`);
        }
        break;
      }

      // ── Payment succeeded (retry after failure) ───────────────
      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        // Only act on recurring payments, not the initial checkout invoice
        // (checkout.session.completed already handles that one).
        if (invoice.billing_reason === "subscription_cycle" ||
            invoice.billing_reason === "subscription_update") {
          const user = await storage.getUserByStripeCustomerId(invoice.customer as string);
          if (user) {
            await storage.updateUserStripeInfo(user.id, { subscriptionStatus: "active" });
            console.log(`[Stripe] user ${user.id} → active (payment succeeded)`);
          }
        }
        break;
      }

      default:
        break;
    }

    res.status(200).json({ received: true });
  }
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ── Session store (PostgreSQL) ────────────────────────────────
const PgStore = connectPgSimple(session);
const pgPool = new pg.Pool({ connectionString: database.url });

app.use(
  session({
    store: new PgStore({ pool: pgPool }),
    secret: sessionConfig.secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: sessionConfig.maxAgeMs,
      httpOnly: true,
      sameSite: "lax",
      secure: appConfig.isProd,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      log(logLine);
    }
  });

  next();
});

export const ready = (async () => {
  const { runMigrations } = await import("./db/migrate");
  await runMigrations();
  await checkDatabaseConnection();

  await registerRoutes(httpServer, app);

  // Frontend must be registered BEFORE notFoundHandler so non-API routes
  // fall through to the React app (index.html), not the JSON 404 handler.
  // Vercel serves dist/public directly, so the serverless function only mounts API routes.
  if (process.env.NODE_ENV === "production") {
    if (!process.env.VERCEL) serveStatic(app);
  } else if (!process.env.VERCEL) {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  app.use(notFoundHandler);
  app.use(errorHandler);
})();

if (!process.env.VERCEL) {
  ready.then(() => {
    httpServer.listen(
      { port: appConfig.port, host: "0.0.0.0", reusePort: true },
      () => { log(`serving on port ${appConfig.port}`); }
    );
  }).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export default app;

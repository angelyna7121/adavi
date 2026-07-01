// Creates (or finds) the Stripe webhook endpoint for this Replit domain
// Run with: npx tsx scripts/setup-webhook.ts
import Stripe from "stripe";

async function getSecretKey(): Promise<string> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;

  if (hostname && xReplitToken) {
    const url = new URL(`https://${hostname}/api/v2/connection`);
    url.searchParams.set("include_secrets", "true");
    url.searchParams.set("connector_names", "stripe");
    url.searchParams.set("environment", "development");
    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json", "X-Replit-Token": xReplitToken },
    });
    const data = await response.json();
    const settings = data.items?.[0];
    if (settings?.settings?.secret) return settings.settings.secret as string;
  }
  const key = process.env.STRIPE_SECRET_KEY;
  if (key) return key;
  throw new Error("No Stripe credentials found");
}

async function setupWebhook() {
  const secretKey = await getSecretKey();
  const stripe = new Stripe(secretKey, { apiVersion: "2024-06-20" as any });

  // Determine endpoint URL from REPLIT_DOMAINS
  const domains = process.env.REPLIT_DOMAINS;
  if (!domains) throw new Error("REPLIT_DOMAINS not set");
  const domain = domains.split(",")[0].trim();
  const endpointUrl = `https://${domain}/api/stripe/webhook`;

  console.log("Webhook URL:", endpointUrl);

  // Check existing webhooks
  const existing = await stripe.webhookEndpoints.list({ limit: 20 });
  const found = existing.data.find((w) => w.url === endpointUrl);

  if (found) {
    console.log("Webhook already exists:", found.id);
    console.log("Status:", found.status);
    console.log(
      "\nNote: The signing secret is only shown on creation. If you need to reset it,\n" +
      "delete this webhook in the Stripe dashboard and re-run this script."
    );
    return;
  }

  // Create new webhook
  const events: Stripe.WebhookEndpointCreateParams.EnabledEvent[] = [
    "checkout.session.completed",
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
  ];

  const webhook = await stripe.webhookEndpoints.create({
    url: endpointUrl,
    enabled_events: events,
    description: "Adavi billing events",
  });

  console.log("Created webhook:", webhook.id);
  console.log("Signing secret:", webhook.secret);
  console.log(
    "\nIMPORTANT: Add this as STRIPE_WEBHOOK_SECRET in your environment secrets."
  );
}

setupWebhook().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});

// Run this via: npx tsx scripts/seed-products-connector.ts
// Uses the Replit stripe connector credentials
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
      headers: {
        Accept: "application/json",
        "X-Replit-Token": xReplitToken,
      },
    });

    const data = await response.json();
    const settings = data.items?.[0];
    if (settings?.settings?.secret) {
      return settings.settings.secret as string;
    }
  }

  const key = process.env.STRIPE_SECRET_KEY;
  if (key) return key;
  throw new Error("No Stripe credentials found");
}

async function seedProducts() {
  const secretKey = await getSecretKey();
  const stripe = new Stripe(secretKey, { apiVersion: "2024-06-20" as any });

  console.log("Checking for existing Adavi Pro products...");
  const existing = await stripe.products.search({
    query: "name:'Adavi Pro' AND active:'true'",
  });

  if (existing.data.length > 0) {
    console.log("Adavi Pro product already exists:", existing.data[0].id);
    const prices = await stripe.prices.list({
      product: existing.data[0].id,
      active: true,
    });
    console.log("Existing prices:");
    for (const p of prices.data) {
      console.log(
        `  ${p.id}  interval=${p.recurring?.interval}  amount=$${(p.unit_amount ?? 0) / 100} ${p.currency?.toUpperCase()}`
      );
    }
    return;
  }

  console.log("Creating Adavi Pro product...");
  const product = await stripe.products.create({
    name: "Adavi Pro",
    description:
      "Unlimited compensation plans, advanced tax breakdown, and strategy comparison for Canadian CCPC owners.",
  });
  console.log("Created product:", product.id);

  const monthly = await stripe.prices.create({
    product: product.id,
    unit_amount: 1900,
    currency: "cad",
    recurring: { interval: "month" },
  });
  console.log("Created monthly price:", monthly.id, "— CAD $19.00/month");

  const annual = await stripe.prices.create({
    product: product.id,
    unit_amount: 19000,
    currency: "cad",
    recurring: { interval: "year" },
  });
  console.log("Created annual price:", annual.id, "— CAD $190.00/year");

  console.log("\nDone! Price IDs:");
  console.log(`  Monthly: ${monthly.id}`);
  console.log(`  Annual:  ${annual.id}`);
}

seedProducts().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});

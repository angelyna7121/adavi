import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("Error: STRIPE_SECRET_KEY environment variable is required");
  process.exit(1);
}

const stripe = new Stripe(key, { apiVersion: "2024-06-20" as any });

async function seedProducts() {
  console.log("Checking for existing Adavi Pro products...");

  const existing = await stripe.products.search({
    query: "name:'Adavi Pro' AND active:'true'",
  });

  if (existing.data.length > 0) {
    console.log("Adavi Pro product already exists:", existing.data[0].id);
    const prices = await stripe.prices.list({ product: existing.data[0].id, active: true });
    console.log("Existing prices:");
    for (const p of prices.data) {
      console.log(`  ${p.id}  ${p.recurring?.interval}  $${(p.unit_amount ?? 0) / 100}`);
    }
    return;
  }

  console.log("Creating Adavi Pro product...");
  const product = await stripe.products.create({
    name: "Adavi Pro",
    description: "Unlimited compensation plans, advanced tax breakdown, and strategy comparison for Canadian CCPC owners.",
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

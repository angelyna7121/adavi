import { expect, test, type Page } from "@playwright/test";
import pg from "pg";
import { parseFinancialText } from "../../server/services/pdfParser";

const { Pool } = pg;

const password = "AdaviE2E!2026";
const empireStatementText = [
  "EMPIRE MILLING LIMITED",
  "NET WORTH",
  "February 28, 2026",
  "REAL ESTATE",
  "1177 Yonge St., Toronto 12.50% $ 100,000 $ 800,000 $ - $ 800,000 $ 100,000",
  "Kingston Westney - Sutton 11.00% $ 283,250 $ 2,800,000 $ 225,000 $ 2,575,000 $ 283,250",
  "Pond Mills, London, ON $ 158,000 $ - $ - $ - $ 158,000",
  "JJJ Realty Inc. 16.66% $ 15,000 $ - $ - $ - $ 15,000",
  "136 Markland Street $ 325,020 $ - $ - $ - $ 361,623",
  "Total Real Estate $ 881,270 $ 917,873",
  "INVESTMENTS",
  "Windstone Property Corp (7661 Ker) 37.50% $ 944,625 $ 944,625",
  "MORTGAGES",
  "Jorlee - 464Elm Road $ 583,333 $ -",
].join("\n");

function uniqueEmail(prefix: string) {
  const runId = process.env.E2E_RUN_ID || "local";
  return `${prefix}.${runId}.${Date.now()}.${Math.random().toString(36).slice(2)}@example.com`;
}

async function signUp(page: Page, email: string) {
  await page.goto("/signup");
  await page.getByTestId("input-email").fill(email);
  await page.getByTestId("input-password").fill(password);
  await page.getByTestId("input-confirm-password").fill(password);
  await page.getByTestId("button-signup").click();
  await page.waitForURL(/\/onboarding|\/dashboard/);
  if (page.url().includes("/onboarding")) {
    await page.getByTestId("button-onboarding-skip").click();
  }
  await page.waitForURL(/\/dashboard/);
}

async function makePaid(email: string) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required for E2E paid-user setup.");
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    await pool.query(
      "UPDATE users SET subscription_status = 'active', plan_type = 'monthly' WHERE email = $1",
      [email],
    );
  } finally {
    await pool.end();
  }
}

async function getSavedNetWorthRows(email: string) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required for E2E database verification.");
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const result = await pool.query(
      `
        SELECT nwi.name, nwi.category, nwi.type, nwi.amount, nwi.institution_name
        FROM users u
        JOIN net_worth_items nwi ON nwi.user_id = u.id
        WHERE u.email = $1
        ORDER BY nwi.created_at ASC, nwi.id ASC
      `,
      [email],
    );
    return result.rows as Array<{
      name: string;
      category: string;
      type: "asset" | "liability";
      amount: number;
      institution_name: string | null;
    }>;
  } finally {
    await pool.end();
  }
}

async function uploadSampleStatement(page: Page) {
  await page.goto("/net-worth");
  const parseResponsePromise = page.waitForResponse((response) =>
    response.url().includes("/api/net-worth/parse") &&
    response.request().method() === "POST",
  );
  await page.getByTestId("input-net-worth-upload").setInputFiles({
    name: "net-worth-sample.csv",
    mimeType: "text/csv",
    buffer: Buffer.from([
      "description,account name,category,type,current value,notes",
      "RBC Chequing,RBC,Bank Accounts,asset,12500,Operating cash",
      "TD Mortgage,TD,Mortgages,liability,320000,Primary residence debt",
    ].join("\n")),
  });
  const parseResponse = await parseResponsePromise;
  expect(parseResponse.ok()).toBeTruthy();
  const parsePayload = await parseResponse.json();
  console.log("[e2e] /api/net-worth/parse response", JSON.stringify({
    documents: parsePayload.documents,
    items: parsePayload.items,
  }));

  expect(parsePayload.documents).toEqual(expect.arrayContaining([
    expect.objectContaining({
      originalName: "net-worth-sample.csv",
      status: "ready",
      totalRows: 2,
      skippedRows: 0,
    }),
  ]));
  expect(parsePayload.items).toEqual(expect.arrayContaining([
    expect.objectContaining({
      name: "RBC Chequing",
      category: "Bank Accounts",
      type: "asset",
      amount: 12500,
      institutionName: "RBC",
    }),
    expect.objectContaining({
      name: "TD Mortgage",
      category: "Mortgages",
      type: "liability",
      amount: 320000,
      institutionName: "TD",
    }),
  ]));

  await expect(page.getByText("Review Extracted Line Items")).toBeVisible();
  await expect(page.getByText("Source", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Institution", { exact: true })).toHaveCount(0);
  await expect(page.locator('[data-testid^="input-name-"]').nth(0)).toHaveValue("RBC Chequing");
  await expect(page.locator('[data-testid^="input-name-"]').nth(1)).toHaveValue("TD Mortgage");
  await expect(page.locator('[data-testid^="input-source-"]').nth(0)).toHaveValue("RBC");
  await expect(page.locator('[data-testid^="input-source-"]').nth(1)).toHaveValue("TD");
  await expect(page.locator('[data-testid^="input-current-"]').nth(0)).toHaveValue("12,500");
  await expect(page.locator('[data-testid^="select-category-"]').nth(0)).toHaveValue("Bank Accounts");
  await expect(page.locator('[data-testid^="select-category-"]').nth(1)).toHaveValue("Mortgages");
}

test("net worth parser preserves statement descriptions and period values", () => {
  const parsed = parseFinancialText(empireStatementText);
  const rows = new Map(parsed.items.map(item => [item.name, item]));

  expect(rows.get("1177 Yonge St., Toronto")).toEqual(expect.objectContaining({
    category: "Real Estate",
    priorValue: 100000,
    amount: 100000,
    fairMarketValue: 800000,
    netValue: 800000,
    percentInterest: "12.50%",
  }));

  expect(rows.get("Kingston Westney - Sutton")).toEqual(expect.objectContaining({
    priorValue: 283250,
    amount: 283250,
    fairMarketValue: 2800000,
    propertyMortgage: 225000,
    netValue: 2575000,
    percentInterest: "11.00%",
  }));

  expect(rows.get("Pond Mills, London, ON")).toEqual(expect.objectContaining({
    priorValue: 158000,
    amount: 158000,
  }));
  expect(rows.get("Windstone Property Corp (7661 Ker)")).toBeTruthy();
  expect(rows.get("Jorlee - 464Elm Road")).toEqual(expect.objectContaining({
    category: "Mortgages",
    type: "liability",
  }));
  expect(parsed.items.find(item => /^Total |Net Worth/i.test(item.name))).toBeFalsy();
});

async function exerciseColumnTools(page: Page) {
  await page.getByTestId("button-rename-column").click();
  await expect(page.getByTestId("column-tool-panel")).toBeVisible();
  await page.getByTestId("tool-column-institutionName").click();
  await page.getByTestId("input-column-title").fill("Source");
  await page.getByTestId("button-apply-rename-column").click();

  await page.getByTestId("button-map-column").click();
  await expect(page.getByTestId("column-tool-panel")).toBeVisible();
  await page.getByTestId("tool-column-institutionName").click();
  await page.getByTestId("select-column-semantic").selectOption("Source");
  await page.getByTestId("button-apply-map-column").click();

  await page.getByTestId("button-delete-column").click();
  await expect(page.getByTestId("column-tool-panel")).toBeVisible();
  await page.getByTestId("tool-column-reportingPeriod").click();
  await page.getByTestId("button-apply-delete-column").click();
  await expect(page.getByText("Period", { exact: true })).toHaveCount(0);

  await page.getByTestId("button-map-column").click();
  await expect(page.getByTestId("column-tool-panel")).toBeVisible();
  await page.getByTestId("tool-column-amount").click();
  await page.getByTestId("select-column-semantic").selectOption("Current Period Value");
  await page.getByTestId("button-apply-map-column").click();
  await page.getByTestId("input-current-period-title").fill("Current Period - 28-Feb-2026");
  await expect(page.getByText("Current Period - 28-Feb-2026").first()).toBeVisible();

  await page.getByTestId("button-map-column").click();
  await expect(page.getByTestId("column-tool-panel")).toBeVisible();
  await page.getByTestId("tool-column-priorValue").click();
  await page.getByTestId("select-column-semantic").selectOption("Prior Period Value");
  await page.getByTestId("button-apply-map-column").click();
  await page.getByTestId("input-prior-period-title").fill("Prior Period - 31-Jan-2026");
  await expect(page.getByText("Prior Period - 31-Jan-2026").first()).toBeVisible();

  await page.getByTestId("button-merge-columns").click();
  await expect(page.getByTestId("column-tool-panel")).toBeVisible();
  await page.getByTestId("tool-column-amount").click();
  await page.getByTestId("tool-column-priorValue").click();
  await page.getByTestId("button-close-column-tool").click();
}

async function editReviewAndGenerate(page: Page) {
  const investorInputs = page.locator('[data-testid^="input-investor-"]');
  await expect(investorInputs.first()).toBeVisible();
  await investorInputs.nth(0).fill("Angelyna");
  await investorInputs.nth(1).fill("Family Trust");

  const priorInputs = page.locator('[data-testid^="input-prior-"]');
  await priorInputs.nth(0).fill("10000");
  await priorInputs.nth(1).fill("330000");

  await page.locator('[data-testid^="button-verify-"]').nth(0).click();
  await page.getByTestId("button-add-review-row").click();
  const nameInputs = page.locator('[data-testid^="input-name-"]');
  await expect(nameInputs).toHaveCount(3);
  await nameInputs.last().fill("Manual TFSA");
  await page.locator('[data-testid^="input-investor-"]').last().fill("Angelyna");
  await page.locator('[data-testid^="select-type-"]').last().selectOption("asset");
  await page.locator('[data-testid^="select-category-"]').last().selectOption("Investments");
  await page.locator('[data-testid^="input-current-"]').last().fill("45000");
  await page.locator('[data-testid^="input-prior-"]').last().fill("42000");

  await page.getByTestId("button-generate-statement").click();
  const report = page.getByTestId("net-worth-report");
  await expect(report).toBeVisible();
  await expect(report.getByRole("heading", { name: "Statement of Net Worth" })).toBeVisible();
  await expect(page.getByText("Net Worth Variance Analysis")).toBeVisible();
  await expect(page.getByText("Manual TFSA")).toBeVisible();
  await expect(page.getByText("Source", { exact: true }).first()).toBeVisible();
}

test.describe("Net Worth workflow", () => {
  test("free user signs in, uploads, parses, reviews, generates report, sees export gating, and logs out", async ({ page }) => {
    const email = uniqueEmail("free.networth");
    await signUp(page, email);

    await page.getByTestId("card-module-create-net-worth-statement").click();
    await expect(page).toHaveURL(/\/net-worth/);
    await uploadSampleStatement(page);
    await exerciseColumnTools(page);
    await editReviewAndGenerate(page);

    await page.getByTestId("button-save-net-worth").click();
    await expect(page.getByTestId("net-worth-upgrade-modal")).toBeVisible();
    await page.getByTestId("button-upgrade-maybe-later").click();
    await expect(page.getByTestId("net-worth-upgrade-modal")).toBeHidden();

    await page.getByTestId("button-print-download").click();
    await expect(page.getByTestId("net-worth-upgrade-modal")).toBeVisible();

    await page.goto("/settings");
    await page.getByTestId("button-logout-settings").click();
    await page.waitForURL(/\/$/);
    await expect(page.getByText("Start Free").first()).toBeVisible();
  });

  test("paid user saves statement and can invoke print/download without upgrade gate", async ({ page }) => {
    const email = uniqueEmail("paid.networth");
    await signUp(page, email);
    await makePaid(email);
    await page.reload();

    await uploadSampleStatement(page);
    await editReviewAndGenerate(page);

    await page.getByTestId("button-save-net-worth").click();
    await expect(page.getByText("Statement saved", { exact: true })).toBeVisible();
    await expect.poll(async () => getSavedNetWorthRows(email)).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: "RBC Chequing",
        category: "Bank Accounts",
        type: "asset",
        amount: 12500,
        institution_name: "RBC",
      }),
      expect.objectContaining({
        name: "TD Mortgage",
        category: "Mortgage Debt",
        type: "liability",
        amount: 320000,
        institution_name: "TD",
      }),
      expect.objectContaining({
        name: "Manual TFSA",
        category: "TFSA",
        type: "asset",
        amount: 45000,
      }),
    ]));

    await page.evaluate(() => {
      window.print = () => {
        window.dispatchEvent(new Event("e2e-print-called"));
      };
    });
    const printCalled = page.evaluate(() => new Promise<boolean>((resolve) => {
      window.addEventListener("e2e-print-called", () => resolve(true), { once: true });
    }));
    await page.getByTestId("button-print-download").click();
    await expect(page.getByTestId("net-worth-upgrade-modal")).toBeHidden();
    await expect(printCalled).resolves.toBe(true);

    await page.goto("/settings");
    await page.getByTestId("button-logout-settings").click();
    await page.waitForURL(/\/$/);
  });
});

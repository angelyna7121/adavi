import { readFile } from "fs/promises";
import { parseFinancialText } from "../server/services/pdfParser";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

async function main() {
  const bundle = await readFile("dist/index.cjs", "utf-8");
  const forbidden = ["pdf.worker.mjs", "pdf-parse", "PDFParse"];
  const matches = forbidden.filter((needle) => bundle.includes(needle));

  if (matches.length > 0) {
    throw new Error(`Production bundle still references PDF worker/parser artifacts: ${matches.join(", ")}`);
  }

  if (!bundle.includes("pdfjs-dist/legacy/build/pdf.mjs")) {
    throw new Error("Production bundle does not reference the workerless pdfjs-dist import path.");
  }

  const sample = `
REAL ESTATE
1177 Yonge St., Toronto 12.50% $ 100,000 $ 800,000 $ - $ 800,000 $ 100,000
Kingston Westney - Sutton 11.00% $ 283,250 $ 2,800,000 $ 225,000 $ 2,575,000 $ 283,250
Pond Mills, London, ON $ 158,000 $ - $ - $ - $ 158,000
JJJ Realty Inc. 16.66% $ 15,000 $ - $ - $ - $ 15,000
136 Markland Street $ 325,020 $ - $ - $ - $ 361,623
INVESTMENTS
Windstone Property Corp (7661 Ker) 37.50% $ 944,625 $ 944,625
MORTGAGES
Jorlee - 464Elm Road $ 583,333 $ -
`;
  const parsed = parseFinancialText(sample);
  const byName = new Map(parsed.items.map(item => [item.name, item]));
  const yonge = byName.get("1177 Yonge St., Toronto");
  assert(yonge, "Expected 1177 Yonge St., Toronto to parse.");
  assert(yonge?.category === "Real Estate", "Yonge category should be Real Estate.");
  assert(yonge?.priorValue === 100000, "Yonge prior period should be 100,000.");
  assert(yonge?.amount === 100000, "Yonge current period should be 100,000.");

  const kingston = byName.get("Kingston Westney - Sutton");
  assert(kingston, "Expected Kingston Westney - Sutton to parse.");
  assert(kingston?.priorValue === 283250, "Kingston prior period should be 283,250.");
  assert(kingston?.amount === 283250, "Kingston current period should be 283,250.");
  assert(kingston?.fairMarketValue === 2800000, "Kingston fair market value should be 2,800,000.");
  assert(kingston?.propertyMortgage === 225000, "Kingston property mortgage should be 225,000.");
  assert(kingston?.netValue === 2575000, "Kingston net value should be 2,575,000.");

  for (const description of [
    "Pond Mills, London, ON",
    "Windstone Property Corp (7661 Ker)",
    "Jorlee - 464Elm Road",
  ]) {
    assert(byName.has(description), `Description should remain intact: ${description}`);
  }

  console.log("PDF production bundle and parser regression checks passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

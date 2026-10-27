import { chromium } from "playwright";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const BASE = "http://localhost:3000";
const PASSWORD = "password123";
const ADMIN_PASSWORD = "Fweta@100%";
const results = [];

function log(entry) {
  results.push(entry);
  console.log(entry.ok ? "✓" : "✗", JSON.stringify(entry));
}

async function login(page, email, password = PASSWORD) {
  await page.context().clearCookies();
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.getByRole("button", { name: /^continue$/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 15000 });
}

function storePaths() {
  return [
    join(process.cwd(), "data", "store.json"),
    "/workspace/data/store.json",
    "D:\\Projects\\fweta-webapp\\data\\store.json",
  ];
}

function readLocalStore() {
  const file = storePaths().find((p) => existsSync(p));
  if (!file) return null;
  return JSON.parse(readFileSync(file, "utf8"));
}

function getBrandProfileId(store) {
  return store.profiles?.find((p) => p.email === "brand@fweta.test")?.id;
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
  await login(page, "brand@fweta.test");
  log({ step: "brand login", ok: true });

  const storeBefore = readLocalStore();
  const brandId = storeBefore ? getBrandProfileId(storeBefore) : null;
  const walletBefore = storeBefore?.wallets?.find((w) => w.userId === brandId)?.availableCents ?? 0;

  // Deposits page
  await page.goto(`${BASE}/dashboard/brand/deposits`, { waitUntil: "networkidle" });
  log({ step: "deposits page loads", ok: page.url().includes("/deposits") });

  const depositNote = `QA EFT deposit ${Date.now()}`;
  await page.fill("#amount", "2500");
  await page.fill("#note", depositNote);
  await page.getByRole("button", { name: /record deposit/i }).click();
  await page.waitForTimeout(2000);
  const depositBody = await page.locator("body").innerText();
  log({
    step: "record deposit N$2500",
    ok: /2,500|2500|N\$2,500/i.test(depositBody),
  });

  const storeAfterDeposit = readLocalStore();
  const pendingDeposit = storeAfterDeposit?.brandDeposits?.find((d) => d.note === depositNote);
  const walletAfterPending =
    storeAfterDeposit?.wallets?.find((w) => w.userId === brandId)?.availableCents ?? 0;
  log({
    step: "deposit stays pending",
    ok: pendingDeposit?.status === "pending" && pendingDeposit?.amountCents === 250000,
    status: pendingDeposit?.status,
  });
  log({
    step: "wallet unchanged until admin credit",
    ok: walletAfterPending === walletBefore,
    walletBefore,
    walletAfterPending,
  });
  log({
    step: "deposits list shows pending",
    ok: /pending/i.test(depositBody),
  });

  await login(page, "hello@fweta.com", ADMIN_PASSWORD);
  await page.goto(`${BASE}/dashboard/admin/deposits`, { waitUntil: "networkidle" });
  log({ step: "admin deposits page", ok: page.url().includes("/admin/deposits") });

  const depositRow = page.locator("li.list-row", { hasText: depositNote });
  await depositRow.getByRole("button", { name: /^credit$/i }).click();
  await page.waitForTimeout(2000);
  log({
    step: "admin credits deposit",
    ok: /credited/i.test(await depositRow.innerText()),
  });

  const storeAfterCredit = readLocalStore();
  const creditedDeposit = storeAfterCredit?.brandDeposits?.find((d) => d.note === depositNote);
  const walletAfterDeposit =
    storeAfterCredit?.wallets?.find((w) => w.userId === brandId)?.availableCents ?? 0;
  log({
    step: "wallet credited after admin confirm",
    ok: creditedDeposit?.status === "credited" && walletAfterDeposit >= walletBefore + 250000,
    walletBefore,
    walletAfterDeposit,
  });

  await login(page, "brand@fweta.test");

  // Dashboard wallet stat
  await page.goto(`${BASE}/dashboard/brand`, { waitUntil: "networkidle" });
  const dashBody = await page.locator("body").innerText();
  log({
    step: "wallet shows on dashboard",
    ok: /wallet/i.test(dashBody) && /N\$/i.test(dashBody),
  });

  // Create campaign
  await page.goto(`${BASE}/dashboard/brand/campaigns/new`, { waitUntil: "networkidle" });
  const title = `Launch Campaign ${Date.now()}`;
  await page.fill("#title", title);
  await page.fill("#description", "Full brand dashboard QA test campaign with funded budget.");
  await page.fill("#category", "Tech");
  await page.fill("#budgetTotal", "1000");
  await page.fill("#cpm", "10");
  await page.fill("#maxPayout", "200");
  await page.locator('label:has-text("youtube") input[type="checkbox"]').check();
  await page.selectOption("#status", "active");
  await page.getByRole("button", { name: /create campaign/i }).click();

  await page.waitForURL(/\/dashboard\/brand\/campaigns\/[a-f0-9-]+/, { timeout: 15000 });
  const campaignUrl = page.url();
  const campaignId = campaignUrl.split("/campaigns/")[1]?.split("/")[0];
  const detailBody = await page.locator("body").innerText();
  log({
    step: "create active campaign + detail page",
    ok: detailBody.includes(title) && !detailBody.includes("404"),
    campaignId,
    url: campaignUrl,
  });

  const storeAfterCampaign = readLocalStore();
  const walletAfterCampaign =
    storeAfterCampaign?.wallets?.find((w) => w.userId === brandId)?.availableCents ?? 0;
  const campaignFundEntry = storeAfterCampaign?.ledgerEntries?.find(
    (e) => e.referenceType === "campaign_fund" && e.referenceId === campaignId,
  );
  log({
    step: "campaign budget deducted from wallet",
    ok: walletAfterCampaign === walletAfterDeposit - 100000 && Boolean(campaignFundEntry),
    walletAfterCampaign,
    expectedWallet: walletAfterDeposit - 100000,
  });

  // Campaigns list
  await page.goto(`${BASE}/dashboard/brand/campaigns`, { waitUntil: "networkidle" });
  const listBody = await page.locator("body").innerText();
  log({ step: "campaign in list", ok: listBody.includes(title) });

  // Analytics
  await page.goto(`${BASE}/dashboard/brand/analytics`, { waitUntil: "networkidle" });
  log({
    step: "analytics page",
    ok: (await page.locator("body").innerText()).length > 100,
  });

  // Verify store records
  const store = readLocalStore();
  if (store) {
    const deposit = store.brandDeposits?.find((d) => d.note === depositNote);
    const campaign = store.campaigns?.find((c) => c.title === title);
    log({
      step: "store has credited deposit record",
      ok: Boolean(deposit && deposit.amountCents === 250000 && deposit.status === "credited"),
    });
    log({
      step: "store has campaign record",
      ok: Boolean(campaign && campaign.status === "active" && campaign.budgetTotalCents === 100000),
    });
  } else {
    log({ step: "local store file", ok: false, note: "no data/store.json" });
  }
} catch (e) {
  log({ step: "fatal", ok: false, note: e.message });
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n=== BRAND QA: ${results.length - failed.length}/${results.length} passed ===`);
if (failed.length) {
  console.log("Failed:", failed);
  process.exit(1);
}

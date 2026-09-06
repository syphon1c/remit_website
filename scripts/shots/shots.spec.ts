import { test, type Page } from "@playwright/test";
import { mockApi } from "../e2e/fixtures";
const OUT = process.env.SHOTS_OUT || "/tmp/remit-shots";
const settle = (page: Page, ms = 900) => page.waitForTimeout(ms);
async function tryStep(name: string, fn: () => Promise<void>) {
  try { await fn(); console.log("ok", name); } catch (e) { console.log("FAILED", name, String(e).split("\n")[0]); }
}
async function ask(page: Page, text: string) {
  await page.getByPlaceholder(/Ask the coworker/).fill(text);
  await page.getByRole("button", { name: "Send" }).click();
  await settle(page, 1400);
}
async function focusMain(page: Page) {
  // Collapse the sidebar and hide the side panel so the conversation fills the window.
  const c = page.getByRole("button", { name: "Collapse sidebar" });
  if (await c.count()) { await c.click(); await settle(page, 400); }
  const h = page.getByRole("button", { name: "Hide side panel" });
  if (await h.count()) { await h.click(); await settle(page, 400); }
}
// Clip around the approval card: from a little above its title to just under its buttons.
async function clipCard(page: Page, name: string, anchor: string) {
  const btn = page.getByRole("button", { name: anchor }).last();
  const b = await btn.boundingBox();
  const vw = page.viewportSize()!;
  const top = Math.max(0, (b?.y ?? 400) - 200), bottom = Math.min(vw.height, (b?.y ?? 400) + (b?.height ?? 40) + 26);
  await page.screenshot({ path: `${OUT}/${name}.png`, clip: { x: 0, y: top, width: vw.width, height: bottom - top } });
}
async function openAccount(page: Page) { await page.getByRole("button", { name: /^Account/ }).click(); await settle(page, 400); }
async function openSettingsTab(page: Page, tab: string) {
  await openAccount(page);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await settle(page, 600);
  if (tab) { const r = page.getByRole("button", { name: tab, exact: true }); if (await r.count()) await r.first().click(); else await page.getByTitle(tab).first().click(); await settle(page, 700); }
}
// Settings and connector pages: clip from the settings' own navigation to the right edge.
async function clipContent(page: Page, name: string, fromX = 0) {
  const vw = page.viewportSize()!;
  await page.screenshot({ path: `${OUT}/${name}.png`, clip: { x: fromX, y: 0, width: vw.width - fromX, height: vw.height } });
}

test("conversation shots", async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.clear(); } catch {} });
  await mockApi(page);
  await page.goto("/");
  await settle(page, 1500);
  await page.screenshot({ path: `${OUT}/start.png` });
  await focusMain(page);
  await page.screenshot({ path: `${OUT}/start-focus.png` });
  await tryStep("approval-slack", async () => { await ask(page, "post the digest"); await page.screenshot({ path: `${OUT}/approval-slack.png` }); await clipCard(page, "approval-slack-card", "Allow once"); await page.getByRole("button", { name: "Allow once" }).click(); await settle(page, 900); });
  await tryStep("approval-unsure", async () => { await ask(page, "run an unsure tool"); await page.screenshot({ path: `${OUT}/approval-unsure.png` }); await clipCard(page, "approval-unsure-card", "Allow once"); await page.getByRole("button", { name: "Deny" }).last().click(); await settle(page, 600); });
  await tryStep("approval-write", async () => { await ask(page, "please write a file"); await page.screenshot({ path: `${OUT}/approval-write.png` }); await clipCard(page, "approval-write-card", "Allow"); await page.getByRole("button", { name: "Allow", exact: true }).last().click(); await settle(page, 600); });
  await tryStep("approval-automation", async () => { await ask(page, "create an automation"); await page.screenshot({ path: `${OUT}/approval-automation.png` }); await clipCard(page, "approval-automation-card", "Allow once"); await page.getByRole("button", { name: "Deny" }).last().click(); await settle(page, 600); });
});

test("surface shots", async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.clear(); } catch {} });
  await mockApi(page);
  await page.goto("/"); await settle(page, 1500);
  await tryStep("inbox", async () => { await page.getByRole("button", { name: /^Inbox/ }).click(); await settle(page, 900); await page.screenshot({ path: `${OUT}/inbox.png` }); await focusMain(page); await page.screenshot({ path: `${OUT}/inbox-focus.png` }); });
  await page.goto("/"); await settle(page, 1200);
  await tryStep("automations", async () => { await page.getByRole("button", { name: "Automations" }).first().click(); await settle(page, 900); await page.screenshot({ path: `${OUT}/automations.png` }); await focusMain(page); await page.screenshot({ path: `${OUT}/automations-focus.png` }); });
  for (const [tab, name] of [["Security & trust", "settings-trust"], ["Models", "settings-models"], ["Coworkers", "settings-coworkers"], ["", "settings-general"]] as const) {
    await page.goto("/"); await settle(page, 1200);
    await tryStep(name, async () => {
      await openSettingsTab(page, tab);
      await page.evaluate(() => {
        const walk = (n: Node) => { if (n.nodeType === 3 && /Loading\.\.\./.test(n.textContent || '')) n.textContent = (n.textContent || '').replace('Loading...', 'default'); n.childNodes.forEach(walk); };
        walk(document.body);
        document.querySelectorAll<HTMLInputElement>('input[type="number"], input:not([type])').forEach((i) => { if (!i.value && !i.placeholder) i.value = '50'; });
      });
      await page.screenshot({ path: `${OUT}/${name}.png` }); await focusMain(page); await clipContent(page, `${name}-focus`, 0);
    });
  }
  await page.goto("/"); await settle(page, 1200);
  await tryStep("connectors", async () => { await openAccount(page); await page.getByRole("button", { name: "Connectors", exact: true }).click(); await settle(page, 1000); await page.screenshot({ path: `${OUT}/connectors.png` }); await focusMain(page); await clipContent(page, "connectors-focus", 0); });
});

const { chromium } = require("playwright");
const BASE = process.env.E2E_BASE ?? "http://localhost:3000";
const out = process.env.E2E_OUT ?? "./e2e-screenshots";
require("node:fs").mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("response", (r) => { if (r.status() === 404) errors.push("404: " + r.url()); });
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
  const step = async (name, fn) => { try { await fn(); console.log("✔", name); } catch (e) { console.log("✘", name, e.message.split("\n")[0]); await page.screenshot({ path: `${out}/fail-${name.replace(/\W+/g, "_")}.png` }); } };

  await step("Age-Gate erscheint", async () => {
    await page.goto(BASE + "/frauen");
    await page.waitForURL(/altersabfrage/);
    await page.getByText("Bist du mindestens 18 Jahre alt?").waitFor();
    await page.screenshot({ path: `${out}/01-agegate.png` });
  });
  await step("Age-Gate JA → Weiterleitung", async () => {
    await page.getByRole("button", { name: "JA, ICH BIN 18 ODER ÄLTER" }).click();
    await page.waitForURL(BASE + "/frauen");
  });
  await step("Startseite", async () => { await page.goto(BASE + "/"); await page.getByText("Premium-Anzeigen").first().waitFor(); await page.screenshot({ path: `${out}/02-home.png`, fullPage: true }); });
  await step("Filter Haarfarbe", async () => {
    await page.goto(BASE + "/frauen");
    await page.getByRole("button", { name: "Blond" }).click();
    await page.waitForURL(/f_haarfarbe=blond/);
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${out}/03-filter.png` });
  });
  await step("Profilseite + Kontakt", async () => {
    await page.goto(BASE + "/frauen");
    await page.locator('a[href^="/profil/"]').first().click();
    await page.getByRole("button", { name: "Kontaktdaten anzeigen" }).click();
    await page.getByText("+49").first().waitFor();
    await page.screenshot({ path: `${out}/04-profile.png` });
  });

  const login = async (email) => {
    await ctx.clearCookies({ name: "tg_session" });
    await page.goto(BASE + "/login");
    await page.fill("#email", email); await page.fill("#password", "TopGirls!2026");
    await page.getByRole("button", { name: "Anmelden" }).click();
    await page.waitForURL(/dashboard|admin/);
  };

  await step("Login Agentur + Dashboard", async () => { await login("agentur@topgirls.local"); await page.screenshot({ path: `${out}/05-dashboard.png` }); });
  await step("Token kaufen (Sandbox)", async () => {
    await page.goto(BASE + "/dashboard/tokens");
    await page.getByRole("button", { name: "Zahlungspflichtig bestellen" }).click();
    await page.waitForURL(/sandbox/);
    await page.getByRole("button", { name: "Zahlung erfolgreich simulieren" }).click();
    await page.waitForURL(/zahlung=ok/);
    await page.getByText("Zahlung erfolgreich").waitFor();
  });
  await step("Premium buchen", async () => {
    await page.goto(BASE + "/dashboard/anzeigen");
    await page.locator("button:not([disabled])", { hasText: "Hervorhebung · 60 Token" }).first().click();
    await page.getByText(/Hervorhebung gebucht/).waitFor();
  });
  await step("Statistiken", async () => { await page.goto(BASE + "/dashboard/statistiken"); await page.locator("svg[role=img]").first().waitFor(); await page.screenshot({ path: `${out}/06-stats.png`, fullPage: true }); });
  await step("Neue Sedcard Wizard", async () => {
    await page.goto(BASE + "/dashboard/sedcards");
    await page.getByRole("button", { name: "Neue Sedcard" }).first().click();
    await page.waitForURL(/schritt=1/);
    await page.fill("#stageName", "Testprofil");
    await page.fill("#age", "25");
    await page.getByRole("button", { name: "Speichern & weiter" }).click();
    await page.waitForURL(/schritt=2/);
    await page.fill("#description", "Dies ist eine ausführliche Testbeschreibung für die Sedcard, die mindestens achtzig Zeichen lang sein muss, damit sie gültig ist.");
    await page.getByRole("button", { name: "Speichern & weiter" }).click();
    await page.waitForURL(/schritt=3/);
    await page.screenshot({ path: `${out}/07-wizard.png` });
  });
  await step("Nachricht Besucher → Anbieterin", async () => {
    await login("besucher@topgirls.local");
    await page.goto(BASE + "/frauen?q=Lara");
    await page.locator('a[href^="/profil/lara"]').first().click();
    await page.fill("#msg-body", "Hallo, Testnachricht!");
    await page.getByRole("button", { name: "Nachricht senden" }).click();
    await page.waitForURL(/nachrichten\//);
    await page.getByText("Hallo, Testnachricht!").first().waitFor();
  });
  await step("Besucher kein Admin", async () => { await page.goto(BASE + "/admin"); await page.waitForURL(/kein-zugriff/); });
  await step("Admin: Sedcard freigeben", async () => {
    await login("admin@topgirls.local");
    await page.goto(BASE + "/admin/sedcards");
    await page.screenshot({ path: `${out}/08-admin.png` });
    await page.getByRole("link", { name: "Prüfen" }).first().click();
    await page.getByRole("button", { name: "Freigeben & veröffentlichen" }).click();
    await page.waitForURL(/ok=1|fehler=/);
    console.log("   →", page.url());
  });
  await step("Admin Seiten", async () => {
    for (const p of ["meldungen", "bilder", "verifizierungen", "marktplatz", "forum", "werbung", "benutzer", "rollen", "kategorien", "filter", "produkte", "transaktionen", "zahlungen", "statistiken", "protokoll", "einstellungen"]) {
      const r = await page.goto(BASE + "/admin/" + p);
      if (r.status() !== 200) throw new Error(p + " " + r.status());
    }
    await page.goto(BASE + "/admin/meldungen"); await page.screenshot({ path: `${out}/09-reports.png` });
  });
  await step("Forum als Anbieterin", async () => {
    await login("anbieterin@topgirls.local");
    await page.goto(BASE + "/forum/sicherheit");
    await page.fill("#title", "Testthema Sicherheit");
    await page.fill("#body", "Ruft mich an unter 0171 1234567, hier wohnt sie in der Hauptstraße 5.");
    await page.getByRole("button", { name: "Thema erstellen" }).click();
    await page.getByText(/zur Prüfung zurückgehalten/).waitFor();
  });
  await step("Mobile Startseite", async () => {
    const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
    await m.addCookies((await ctx.cookies()).filter((c) => c.name === "tg_age"));
    const mp = await m.newPage();
    await mp.goto(BASE + "/");
    await mp.screenshot({ path: `${out}/10-mobile.png`, fullPage: false });
    const w = await mp.evaluate(() => document.documentElement.scrollWidth);
    if (w > 390) throw new Error("Horizontal scroll " + w);
  });
  console.log("Fehler im Browser:", errors.slice(0, 10));
  await browser.close();
})();

/**
 * Top Girls – Demo-Daten (vollständig fiktiv).
 * Alle Personen, Namen, Firmen und Kontaktdaten sind frei erfunden.
 * Profilbilder sind generierte abstrakte Grafiken – es werden keine Fotos realer Personen verwendet.
 *
 * Ausführen: npm run db:seed   (setzt die Datenbank NICHT zurück; für frischen Stand: npm run db:reset)
 */
import { PrismaClient, type Role, type FilterType } from "@prisma/client";
import { hash } from "@node-rs/argon2";
import sharp from "sharp";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID, createHash } from "node:crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const db = new PrismaClient();
const PASSWORD = "TopGirls!2026";
const DAY = 86_400_000;

// ── Speicher (gleiche Logik wie src/lib/storage, ohne server-only) ──
const s3 =
  process.env.STORAGE_DRIVER === "s3"
    ? new S3Client({
        region: process.env.S3_REGION ?? "eu-central-1",
        endpoint: process.env.S3_ENDPOINT || undefined,
        forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
        credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "", secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "" },
      })
    : null;

async function put(key: string, body: Buffer, contentType: string) {
  if (s3) {
    await s3.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key, Body: body, ContentType: contentType }));
    return;
  }
  const p = path.resolve(process.env.STORAGE_LOCAL_DIR ?? "./storage", key);
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, body);
}

// ── Generierte, abstrakte Platzhalterbilder im Dark-Luxury-Stil ──
const PALETTES = [
  ["#2b1d14", "#F3C2C6", "#0d0d0d"],
  ["#1f1526", "#8e7cc3", "#0d0d0d"],
  ["#2a1519", "#c98a95", "#0d0d0d"],
  ["#141c22", "#7fa3b5", "#0d0d0d"],
  ["#221c10", "#F8D9DC", "#0d0d0d"],
  ["#1b1b1b", "#a3a3a3", "#0d0d0d"],
];

function artSvg(seed: number, label: string, w = 900, h = 1200) {
  const [a, b, c] = PALETTES[seed % PALETTES.length];
  const r = (n: number) => ((Math.sin(seed * 9301 + n * 49297) + 1) / 2);
  const circles = Array.from({ length: 5 }, (_, i) =>
    `<circle cx="${Math.round(r(i) * w)}" cy="${Math.round(r(i + 10) * h)}" r="${Math.round(120 + r(i + 20) * 320)}" fill="${i % 2 ? b : a}" opacity="${(0.12 + r(i + 30) * 0.3).toFixed(2)}"/>`,
  ).join("");
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${c}"/></linearGradient>
    <filter id="blur"><feGaussianBlur stdDeviation="60"/></filter>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FBE3E5"/><stop offset=".5" stop-color="#F3C2C6"/><stop offset="1" stop-color="#D99BA2"/></linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <g filter="url(#blur)">${circles}</g>
  <path d="M${w * 0.5} ${h * 0.18} C ${w * 0.78} ${h * 0.3}, ${w * 0.22} ${h * 0.55}, ${w * 0.5} ${h * 0.85}" stroke="url(#gold)" stroke-width="2" fill="none" opacity="0.55"/>
  <text x="50%" y="52%" text-anchor="middle" font-family="Georgia, serif" font-size="${w * 0.22}" fill="url(#gold)" opacity="0.85">${label}</text>
  <text x="50%" y="93%" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="22" letter-spacing="8" fill="#ffffff" opacity="0.35">DEMO-BILD</text>
</svg>`);
}

async function createImage(prefix: string, seed: number, label: string) {
  const input = await sharp(artSvg(seed, label)).png().toBuffer();
  const id = randomUUID();
  const storageKey = `${prefix}/${id}.webp`;
  const thumbKey = `${prefix}/${id}_thumb.webp`;
  const main = await sharp(input).resize({ width: 900 }).webp({ quality: 80 }).toBuffer();
  const thumb = await sharp(input).resize({ width: 480, height: 640, fit: "cover" }).webp({ quality: 75 }).toBuffer();
  await put(storageKey, main, "image/webp");
  await put(thumbKey, thumb, "image/webp");
  return { storageKey, thumbKey, width: 900, height: 1200, sha256: createHash("sha256").update(input).digest("hex") };
}

async function createBannerImage(seed: number, title: string) {
  const [a, b] = PALETTES[seed % PALETTES.length];
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="500"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0d0d0d"/><stop offset="1" stop-color="${a}"/></linearGradient><filter id="b"><feGaussianBlur stdDeviation="80"/></filter></defs><rect width="1600" height="500" fill="url(#g)"/><g filter="url(#b)"><circle cx="1250" cy="200" r="260" fill="${b}" opacity=".45"/><circle cx="1450" cy="420" r="200" fill="${a}" opacity=".6"/></g><text x="1500" y="470" text-anchor="end" font-family="Georgia,serif" font-size="28" fill="#fff" opacity=".2">${title}</text></svg>`);
  const out = await sharp(svg).webp({ quality: 80 }).toBuffer();
  const key = `ads/${randomUUID()}.webp`;
  await put(key, out, "image/webp");
  return key;
}

const daysFromNow = (d: number) => new Date(Date.now() + d * DAY);
const utcDay = (offset: number) => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - offset));
};

async function main() {
  const existing = await db.user.count();
  if (existing > 0) {
    console.log("Datenbank enthält bereits Daten – Seed wird übersprungen. Für einen frischen Stand: npm run db:reset");
    return;
  }
  console.log("Erstelle Demo-Daten für Top Girls …");
  const passwordHash = await hash(PASSWORD, { memoryCost: 19456, timeCost: 2, parallelism: 1, outputLen: 32 });

  // ── Einstellungen ──
  await db.setting.createMany({
    data: [
      { key: "siteName", value: "Top Girls" },
      { key: "profileDurationDays", value: 30 },
      { key: "requireVerificationForPublish", value: true },
    ],
  });

  // ── Benutzer ──
  const mkUser = (email: string, role: Role, displayName: string, extra: Record<string, unknown> = {}) =>
    db.user.create({
      data: { email, role, displayName, passwordHash, emailVerifiedAt: new Date(), termsAcceptedAt: new Date(), forumRulesAcceptedAt: new Date(), ...extra },
    });

  const admin = await mkUser("admin@topgirls.local", "ADMIN", "Admin Top Girls", { verificationStatus: "APPROVED" });
  const moderator = await mkUser("moderator@topgirls.local", "MODERATOR", "Moderation", { verificationStatus: "APPROVED" });
  const agency = await mkUser("agentur@topgirls.local", "AGENCY", "Vanessa Demo", { companyName: "Velvet Demo Agentur GmbH", verificationStatus: "APPROVED", tokenBalance: 0 });
  const provider = await mkUser("anbieterin@topgirls.local", "PROVIDER", "Lara Demo", { verificationStatus: "APPROVED" });
  const club = await mkUser("club@topgirls.local", "CLUB", "Club-Leitung Demo", { companyName: "Club Aurum (fiktiv)", verificationStatus: "APPROVED" });
  const studio = await mkUser("massage@topgirls.local", "MASSAGE_STUDIO", "Studio-Leitung Demo", { companyName: "Lotus Massagestudio (fiktiv)", verificationStatus: "APPROVED" });
  const apartment = await mkUser("apartment@topgirls.local", "APARTMENT", "Apartment-Service Demo", { companyName: "Citylofts Vermietung (fiktiv)", verificationStatus: "APPROVED" });
  const visitor = await mkUser("besucher@topgirls.local", "VISITOR", "Max Besucher");
  const newProvider = await mkUser("neu@topgirls.local", "PROVIDER", "Nina Neu", { verificationStatus: "PENDING" });

  const extraProviders = await Promise.all(
    ["Sophie", "Mila", "Elena", "Jade"].map((n, i) => mkUser(`demo${i + 1}@topgirls.local`, "PROVIDER", `${n} Demo`, { verificationStatus: "APPROVED" })),
  );

  // ── Kategorien ──
  const catData = [
    { slug: "frauen", name: "Frauen", description: "Persönliche Sedcards volljähriger Anbieterinnen – geprüft und moderiert." },
    { slug: "online-inserate", name: "Online-Inserate", description: "Online-Angebote wie Videochat und virtuelle Begleitung." },
    { slug: "clubs", name: "Clubs", description: "Ausgewählte Clubs und Bars mit ihren Angeboten." },
    { slug: "massagen", name: "Massagen", description: "Massagestudios und Wellness-Angebote." },
  ];
  const cats: Record<string, string> = {};
  for (const [i, c] of catData.entries()) cats[c.slug] = (await db.category.create({ data: { ...c, sortOrder: i } })).id;

  // ── Dynamische Filter ──
  type F = { key: string; label: string; type: FilterType; unit?: string; min?: number; max?: number; cats: string[]; options?: string[] };
  const filterData: F[] = [
    { key: "haarfarbe", label: "Haarfarbe", type: "SELECT", cats: ["frauen", "online-inserate"], options: ["Blond", "Brünett", "Schwarz", "Rot", "Grau/Silber"] },
    { key: "augenfarbe", label: "Augenfarbe", type: "SELECT", cats: ["frauen", "online-inserate"], options: ["Blau", "Grün", "Braun", "Grau"] },
    { key: "figur", label: "Figur", type: "SELECT", cats: ["frauen"], options: ["Schlank", "Sportlich", "Normal", "Kurvig"] },
    { key: "koerpergroesse", label: "Körpergröße", type: "NUMBER", unit: "cm", min: 140, max: 210, cats: ["frauen"] },
    { key: "treffpunkt", label: "Treffpunkt", type: "MULTISELECT", cats: ["frauen"], options: ["Eigene Räumlichkeiten", "Haus- & Hotelbesuche", "Begleitung zu Events"] },
    { key: "online_format", label: "Online-Format", type: "MULTISELECT", cats: ["online-inserate"], options: ["Videochat", "Textchat", "Telefon"] },
    { key: "massagearten", label: "Massagearten", type: "MULTISELECT", cats: ["massagen"], options: ["Klassisch", "Aromaöl", "Thai", "Hot Stone", "Tantra"] },
    { key: "ausstattung", label: "Ausstattung", type: "MULTISELECT", cats: ["clubs", "massagen"], options: ["Bar", "Sauna", "Whirlpool", "Dusche", "Lounge"] },
    { key: "parkplaetze", label: "Parkplätze vorhanden", type: "BOOLEAN", cats: ["clubs", "massagen"] },
    { key: "barrierefrei", label: "Barrierefreier Zugang", type: "BOOLEAN", cats: ["clubs", "massagen"] },
    { key: "rauchfrei", label: "Rauchfrei", type: "BOOLEAN", cats: ["frauen", "clubs", "massagen"] },
  ];
  const filters: Record<string, { id: string; type: FilterType; options: { id: string; value: string }[] }> = {};
  for (const [i, f] of filterData.entries()) {
    const created = await db.filterDefinition.create({
      data: {
        key: f.key, label: f.label, type: f.type, unit: f.unit, minValue: f.min, maxValue: f.max, sortOrder: i,
        categories: { create: f.cats.map((slug) => ({ categoryId: cats[slug] })) },
        options: f.options ? { create: f.options.map((o, j) => ({ value: o.toLowerCase().replace(/[^a-z0-9äöü]+/g, "-").replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue"), label: o, sortOrder: j })) } : undefined,
      },
      include: { options: true },
    });
    filters[f.key] = { id: created.id, type: created.type, options: created.options.map((o) => ({ id: o.id, value: o.value })) };
  }

  // ── Profile ──
  const CITIES = [["Berlin", "10115", "Berlin"], ["Hamburg", "20095", "Hamburg"], ["München", "80331", "Bayern"], ["Köln", "50667", "Nordrhein-Westfalen"], ["Frankfurt am Main", "60311", "Hessen"], ["Düsseldorf", "40213", "Nordrhein-Westfalen"], ["Stuttgart", "70173", "Baden-Württemberg"], ["Leipzig", "04109", "Sachsen"]];
  const availability = { mo: { active: true, from: "12:00", to: "22:00" }, di: { active: true, from: "12:00", to: "22:00" }, mi: { active: false }, do: { active: true, from: "14:00", to: "23:00" }, fr: { active: true, from: "14:00", to: "02:00" }, sa: { active: true, from: "16:00", to: "02:00" }, so: { active: false } };

  type P = { owner: string; cat: string; name: string; age?: number; headline: string; premium?: boolean; highlight?: boolean; sponsored?: boolean; status?: "PUBLISHED" | "PENDING_REVIEW" | "DRAFT"; attrs?: Record<string, string[] | number | boolean>; langs?: string[] };
  const profiles: P[] = [
    { owner: agency.id, cat: "frauen", name: "Amélie", age: 26, headline: "Charmante Begleitung mit Stil", premium: true, attrs: { haarfarbe: ["blond"], augenfarbe: ["blau"], figur: ["schlank"], koerpergroesse: 172, treffpunkt: ["haus-hotelbesuche", "begleitung-zu-events"], rauchfrei: true }, langs: ["Deutsch", "Französisch", "Englisch"] },
    { owner: agency.id, cat: "frauen", name: "Valentina", age: 29, headline: "Elegant, gebildet, weltoffen", premium: true, highlight: true, attrs: { haarfarbe: ["bruenett"], augenfarbe: ["braun"], figur: ["sportlich"], koerpergroesse: 168, treffpunkt: ["begleitung-zu-events"] }, langs: ["Deutsch", "Italienisch"] },
    { owner: agency.id, cat: "frauen", name: "Clara", age: 31, headline: "Stilvolle Abende in Hamburg", sponsored: true, attrs: { haarfarbe: ["rot"], augenfarbe: ["gruen"], figur: ["normal"], koerpergroesse: 175, treffpunkt: ["eigene-raeumlichkeiten"], rauchfrei: true }, langs: ["Deutsch", "Englisch"] },
    { owner: agency.id, cat: "frauen", name: "Isabel", age: 24, headline: "Natürlich und herzlich", attrs: { haarfarbe: ["schwarz"], augenfarbe: ["braun"], figur: ["kurvig"], koerpergroesse: 164, treffpunkt: ["eigene-raeumlichkeiten", "haus-hotelbesuche"] }, langs: ["Deutsch", "Spanisch"] },
    { owner: agency.id, cat: "online-inserate", name: "Luna", age: 27, headline: "Virtuelle Gesellschaft am Abend", highlight: true, attrs: { haarfarbe: ["blond"], augenfarbe: ["gruen"], online_format: ["videochat", "textchat"] }, langs: ["Deutsch", "Englisch"] },
    { owner: agency.id, cat: "frauen", name: "Noemi", age: 33, headline: "Reife Eleganz", status: "PENDING_REVIEW", attrs: { haarfarbe: ["bruenett"], figur: ["schlank"], koerpergroesse: 170 } },
    { owner: provider.id, cat: "frauen", name: "Lara", age: 28, headline: "Unabhängig. Diskret. Zuverlässig.", premium: true, attrs: { haarfarbe: ["bruenett"], augenfarbe: ["gruen"], figur: ["sportlich"], koerpergroesse: 169, treffpunkt: ["eigene-raeumlichkeiten"], rauchfrei: true }, langs: ["Deutsch", "Englisch"] },
    { owner: extraProviders[0].id, cat: "frauen", name: "Sophie", age: 25, headline: "Lebensfroh und unkompliziert", attrs: { haarfarbe: ["blond"], augenfarbe: ["blau"], figur: ["normal"], koerpergroesse: 166, treffpunkt: ["haus-hotelbesuche"] }, langs: ["Deutsch"] },
    { owner: extraProviders[1].id, cat: "frauen", name: "Mila", age: 30, headline: "Kultur, Kunst und gute Gespräche", attrs: { haarfarbe: ["schwarz"], augenfarbe: ["braun"], figur: ["schlank"], koerpergroesse: 178, treffpunkt: ["begleitung-zu-events"] }, langs: ["Deutsch", "Russisch", "Englisch"] },
    { owner: extraProviders[2].id, cat: "online-inserate", name: "Elena", age: 35, headline: "Ehrliche Gespräche per Telefon und Video", attrs: { haarfarbe: ["rot"], online_format: ["telefon", "videochat"] }, langs: ["Deutsch", "Griechisch"] },
    { owner: extraProviders[3].id, cat: "frauen", name: "Jade", age: 23, headline: "Neu in Leipzig", attrs: { haarfarbe: ["schwarz"], augenfarbe: ["grau"], figur: ["sportlich"], koerpergroesse: 171 }, langs: ["Deutsch", "Englisch"] },
    { owner: club.id, cat: "clubs", name: "Club Aurum", headline: "Gehobene Bar-Atmosphäre im Herzen der Stadt", premium: true, attrs: { ausstattung: ["bar", "sauna", "lounge"], parkplaetze: true, barrierefrei: true, rauchfrei: false }, langs: ["Deutsch", "Englisch"] },
    { owner: club.id, cat: "clubs", name: "Aurum Lounge", headline: "Die neue Lounge – stilvoll entspannen", attrs: { ausstattung: ["bar", "lounge", "whirlpool"], parkplaetze: false, rauchfrei: true } },
    { owner: studio.id, cat: "massagen", name: "Lotus Studio", headline: "Entspannung auf höchstem Niveau", highlight: true, attrs: { massagearten: ["klassisch", "aromaoel", "hot-stone"], ausstattung: ["dusche", "lounge"], parkplaetze: true, barrierefrei: true, rauchfrei: true } },
    { owner: studio.id, cat: "massagen", name: "Lotus City", headline: "Massagen in zentraler Lage", sponsored: true, attrs: { massagearten: ["thai", "klassisch", "tantra"], ausstattung: ["dusche"], parkplaetze: false, rauchfrei: true } },
    { owner: newProvider.id, cat: "frauen", name: "Nina", age: 22, headline: "Bald online", status: "DRAFT", attrs: { haarfarbe: ["blond"] } },
  ];

  const DESCRIPTIONS = [
    "Willkommen auf meiner Sedcard. Ich bin eine aufgeschlossene, gepflegte Frau, die Wert auf Stil, Respekt und Diskretion legt. Ich freue mich auf niveauvolle Anfragen und einen respektvollen Umgang. Alle Bilder sind Demo-Grafiken.",
    "Mit Freude an guten Gesprächen, Kultur und schönen Abenden bin ich die richtige Begleitung für besondere Anlässe. Ich lege großen Wert auf gegenseitigen Respekt und klare Absprachen im Vorfeld. Dieses Profil ist fiktiv.",
    "Unser Haus bietet eine elegante Atmosphäre, geschultes Personal und höchste Diskretion. Wir legen Wert auf Sauberkeit, Sicherheit und faire Arbeitsbedingungen. Alle Angaben in diesem Demo-Profil sind frei erfunden.",
  ];

  const profileIds: string[] = [];
  for (const [i, p] of profiles.entries()) {
    const [city, plz, region] = CITIES[i % CITIES.length];
    const status = p.status ?? "PUBLISHED";
    const published = status === "PUBLISHED";
    const slug = `${p.name.toLowerCase().replace(/é/g, "e").replace(/[^a-z0-9]+/g, "-")}-${city.toLowerCase().replace(/ü/g, "ue").replace(/[^a-z0-9]+/g, "-")}-${i + 1}`;
    const created = await db.profile.create({
      data: {
        slug, ownerId: p.owner, categoryId: cats[p.cat], stageName: p.name, headline: p.headline, age: p.age ?? null,
        description: DESCRIPTIONS[p.cat === "clubs" || p.cat === "massagen" ? 2 : i % 2],
        city, postalCode: plz, region, languages: p.langs ?? ["Deutsch"], availability, availabilityNote: "Termine bitte mit mindestens 2 Stunden Vorlauf anfragen.",
        contactPhone: `+49 30 ${String(5550100 + i).padStart(7, "0")}`, contactWhatsapp: i % 3 === 0 ? `+49 151 ${String(5550100 + i).padStart(7, "0")}` : null,
        contactEmail: `kontakt${i + 1}@example.com`, contactWebsite: i % 4 === 0 ? "https://example.com" : null,
        status, verified: published, consentConfirmedAt: new Date(),
        publishedAt: published ? new Date(Date.now() - (i + 1) * DAY * 2) : null,
        expiresAt: published ? daysFromNow(30 - i) : null,
        submittedAt: status !== "DRAFT" ? new Date() : null,
        premiumUntil: p.premium && published ? daysFromNow(10 + i) : null,
        highlightUntil: p.highlight && published ? daysFromNow(7) : null,
        sponsoredUntil: p.sponsored && published ? daysFromNow(5) : null,
      },
    });
    profileIds.push(created.id);

    // Bilder
    const nImages = p.cat === "clubs" || p.cat === "massagen" ? 2 : 3;
    for (let k = 0; k < nImages; k++) {
      const img = await createImage(`profiles/${created.id}`, i * 3 + k, p.name.slice(0, 1));
      await db.profileImage.create({ data: { ...img, profileId: created.id, status: status === "DRAFT" ? "PENDING" : k === 2 && status === "PENDING_REVIEW" ? "PENDING" : "APPROVED", isCover: k === 0, sortOrder: k } });
    }

    // Eigenschaften
    for (const [key, val] of Object.entries(p.attrs ?? {})) {
      const f = filters[key];
      if (!f) continue;
      if (Array.isArray(val)) {
        const optIds = f.options.filter((o) => val.includes(o.value)).map((o) => o.id);
        await db.profileAttribute.create({ data: { profileId: created.id, filterId: f.id, options: { create: optIds.map((optionId) => ({ optionId })) } } });
      } else if (typeof val === "number") {
        await db.profileAttribute.create({ data: { profileId: created.id, filterId: f.id, numberValue: val } });
      } else {
        await db.profileAttribute.create({ data: { profileId: created.id, filterId: f.id, boolValue: val } });
      }
    }

    // Statistiken der letzten 60 Tage
    if (published) {
      const rows = Array.from({ length: 60 }, (_, d) => {
        const base = 40 + ((i * 17) % 60);
        const trend = (60 - d) * 0.8;
        const imp = Math.round(base + trend + Math.abs(Math.sin(d + i)) * 50);
        const views = Math.round(imp * (0.18 + (i % 4) * 0.03));
        return { profileId: created.id, date: utcDay(d), impressions: imp, views, clicks: Math.round(views * 0.12) };
      });
      await db.profileStatDaily.createMany({ data: rows });
    }
  }

  // ── Premium-Produkte & Token-Pakete ──
  await db.premiumProduct.createMany({
    data: [
      { type: "PREMIUM", name: "Premium-Sedcard", description: "Platzierung ganz oben in Suche und Kategorie, Premium-Badge und Startseiten-Präsenz.", tokenCost: 150, durationDays: 7, priority: 30 },
      { type: "HIGHLIGHT", name: "Hervorhebung", description: "Goldener Rahmen und bevorzugte Sortierung nach Premium-Profilen.", tokenCost: 60, durationDays: 7, priority: 20 },
      { type: "SPONSORED_SEARCH", name: "Gesponsertes Suchergebnis", description: "Anzeige als „Gesponsert“ oberhalb der Suchergebnisse passender Suchanfragen.", tokenCost: 90, durationDays: 7, priority: 25 },
      { type: "EXTENSION", name: "Laufzeitverlängerung", description: "Verlängert die Laufzeit deiner Sedcard um 30 Tage.", tokenCost: 40, durationDays: 30, priority: 0 },
    ],
  });
  const packages = await Promise.all(
    [
      { name: "Starter", tokens: 100, bonusTokens: 0, priceCents: 1000 },
      { name: "Plus", tokens: 300, bonusTokens: 30, priceCents: 2900 },
      { name: "Business", tokens: 1000, bonusTokens: 150, priceCents: 8900 },
      { name: "Agentur", tokens: 3000, bonusTokens: 600, priceCents: 24900 },
    ].map((p, i) => db.tokenPackage.create({ data: { ...p, sortOrder: i } })),
  );

  // ── Werbeflächen ──
  const placements = await Promise.all(
    [
      { key: "home-hero", name: "Startseite – Hauptbanner", location: "HOME_HERO" as const, width: 1600, height: 500, maxActive: 2, tokenCostPerDay: 40, priority: 30 },
      { key: "home-inline", name: "Startseite – Zwischenbanner", location: "HOME_INLINE" as const, width: 1600, height: 500, maxActive: 1, tokenCostPerDay: 25, priority: 20 },
      { key: "search-top", name: "Suche – Topbanner", location: "SEARCH_TOP" as const, width: 1600, height: 500, maxActive: 1, tokenCostPerDay: 30, priority: 25 },
      { key: "search-sidebar", name: "Suche – unter Ergebnissen", location: "SEARCH_SIDEBAR" as const, width: 1600, height: 500, maxActive: 2, tokenCostPerDay: 15, priority: 10 },
      { key: "profile-sidebar", name: "Sedcard – Seitenleiste", location: "PROFILE_SIDEBAR" as const, width: 800, height: 1000, maxActive: 1, tokenCostPerDay: 20, priority: 15 },
      { key: "marketplace-top", name: "Marktplatz – Topbanner", location: "MARKETPLACE_TOP" as const, width: 1600, height: 500, maxActive: 1, tokenCostPerDay: 15, priority: 10 },
    ].map((p) => db.adPlacement.create({ data: p })),
  );

  // ── Token-Transaktionen & Zahlungen (Agentur) ──
  let balance = 0;
  const pay1 = await db.payment.create({ data: { userId: agency.id, packageId: packages[2].id, provider: "SANDBOX", providerRef: "sbx_demo_1", idempotencyKey: randomUUID(), amountCents: 8900, tokens: 1150, status: "COMPLETED", completedAt: new Date(Date.now() - 20 * DAY), createdAt: new Date(Date.now() - 20 * DAY) } });
  balance += 1150;
  await db.tokenTransaction.create({ data: { userId: agency.id, type: "PURCHASE", tokens: 1150, amountCents: 8900, balanceAfter: balance, reference: `payment:${pay1.id}`, description: "Token-Kauf über Testzahlung (Sandbox)", paymentId: pay1.id, createdAt: new Date(Date.now() - 20 * DAY) } });

  const agencyPublished = await db.profile.findMany({ where: { ownerId: agency.id, status: "PUBLISHED" } });
  for (const pr of agencyPublished) {
    const tx = async (type: "PREMIUM" | "HIGHLIGHT" | "SPONSORED_SEARCH", cost: number, until: Date | null) => {
      if (!until) return;
      balance -= cost;
      const t = await db.tokenTransaction.create({ data: { userId: agency.id, type: "SPEND", tokens: -cost, balanceAfter: balance, reference: `promotion:${randomUUID()}`, description: `${type === "PREMIUM" ? "Premium-Sedcard" : type === "HIGHLIGHT" ? "Hervorhebung" : "Gesponsertes Suchergebnis"} für „${pr.stageName}“` } });
      await db.promotion.create({ data: { profileId: pr.id, userId: agency.id, type, startsAt: new Date(until.getTime() - 7 * DAY), endsAt: until, tokenCost: cost, transactionId: t.id } });
    };
    await tx("PREMIUM", 150, pr.premiumUntil);
    await tx("HIGHLIGHT", 60, pr.highlightUntil);
    await tx("SPONSORED_SEARCH", 90, pr.sponsoredUntil);
  }

  // Werbebuchung der Agentur
  const bannerKey = await createBannerImage(1, "Velvet Demo");
  balance -= 14 * 40;
  const adTx = await db.tokenTransaction.create({ data: { userId: agency.id, type: "SPEND", tokens: -(14 * 40), balanceAfter: balance, reference: `ad:${randomUUID()}`, description: "Werbebuchung „Startseite – Hauptbanner“ (14 Tage)" } });
  await db.adBooking.create({
    data: { placementId: placements[0].id, userId: agency.id, profileId: agencyPublished[0]?.id, title: "Velvet Demo Agentur", subtitle: "Ausgewählte Begleitungen in ganz Deutschland – fiktive Demo-Anzeige", imageKey: bannerKey, startsAt: new Date(Date.now() - 2 * DAY), endsAt: daysFromNow(12), days: 14, tokenCost: 560, status: "ACTIVE", priority: 30, transactionId: adTx.id, impressions: 1840, clicks: 76 },
  });
  await db.user.update({ where: { id: agency.id }, data: { tokenBalance: balance } });

  // Club: Kauf + Werbebuchung
  const pay2 = await db.payment.create({ data: { userId: club.id, packageId: packages[1].id, provider: "SANDBOX", providerRef: "sbx_demo_2", idempotencyKey: randomUUID(), amountCents: 2900, tokens: 330, status: "COMPLETED", completedAt: new Date(Date.now() - 5 * DAY) } });
  await db.tokenTransaction.create({ data: { userId: club.id, type: "PURCHASE", tokens: 330, amountCents: 2900, balanceAfter: 330, reference: `payment:${pay2.id}`, description: "Token-Kauf über Testzahlung (Sandbox)", paymentId: pay2.id } });
  const clubBanner = await createBannerImage(4, "Club Aurum");
  const clubTx = await db.tokenTransaction.create({ data: { userId: club.id, type: "SPEND", tokens: -210, balanceAfter: 120, reference: `ad:${randomUUID()}`, description: "Werbebuchung „Suche – Topbanner“ (7 Tage)" } });
  const clubProfile = await db.profile.findFirst({ where: { ownerId: club.id, status: "PUBLISHED" } });
  await db.adBooking.create({ data: { placementId: placements[2].id, userId: club.id, profileId: clubProfile?.id, title: "Club Aurum", subtitle: "Gehobene Bar-Atmosphäre – fiktive Demo-Anzeige", imageKey: clubBanner, startsAt: new Date(Date.now() - DAY), endsAt: daysFromNow(6), days: 7, tokenCost: 210, status: "ACTIVE", priority: 25, transactionId: clubTx.id, impressions: 620, clicks: 18 } });
  await db.user.update({ where: { id: club.id }, data: { tokenBalance: 120 } });

  // Admin-Gutschrift für Anbieterin
  await db.tokenTransaction.create({ data: { userId: provider.id, type: "ADMIN_CREDIT", tokens: 200, balanceAfter: 200, reference: `admin:${randomUUID()}`, description: "Willkommensguthaben", createdById: admin.id } });
  await db.user.update({ where: { id: provider.id }, data: { tokenBalance: 200 } });
  await db.payment.create({ data: { userId: provider.id, packageId: packages[0].id, provider: "SANDBOX", providerRef: "sbx_demo_3", idempotencyKey: randomUUID(), amountCents: 1000, tokens: 100, status: "FAILED", failureReason: "payment.failed" } });

  // ── Marktplatz ──
  const mpCats = await Promise.all(
    [
      { slug: "apartmentvermietung", name: "Apartmentvermietung", description: "Apartments und Räumlichkeiten zur gewerblichen Kurzzeitmiete." },
      { slug: "stellen-clubs", name: "Stellenanzeigen Clubs", description: "Stellenangebote von Clubs, z. B. Service, Bar, Empfang." },
      { slug: "stellen-massagestudios", name: "Stellenanzeigen Massagestudios", description: "Stellenangebote von Massagestudios." },
      { slug: "agenturangebote", name: "Agenturangebote", description: "Leistungen und Kooperationen von Agenturen." },
      { slug: "fotografie-marketing", name: "Fotografie & Marketing", description: "Fotografen, Webdesign, Marketing-Dienstleistungen." },
      { slug: "sonstiges", name: "Sonstige Geschäftsanzeigen", description: "Weitere geschäftliche Angebote." },
    ].map((c, i) => db.marketplaceCategory.create({ data: { ...c, sortOrder: i } })),
  );
  const listings = [
    { ownerId: apartment.id, categoryId: mpCats[0].id, title: "Modernes Apartment in Berlin-Mitte, wochenweise", description: "Voll ausgestattetes 2-Zimmer-Apartment mit separatem Eingang, Küche und Bad. Vermietung an Gewerbetreibende mit gültiger Anmeldung. Reinigung inklusive. Fiktives Demo-Inserat.", city: "Berlin", priceCents: 69000, priceUnit: "pro Woche" },
    { ownerId: apartment.id, categoryId: mpCats[0].id, title: "Helles Studio-Apartment in Hamburg", description: "Ruhige Lage, gute Anbindung an den ÖPNV, Parkplatz vor der Tür. Mindestmietdauer eine Woche. Fiktives Demo-Inserat.", city: "Hamburg", priceCents: 55000, priceUnit: "pro Woche" },
    { ownerId: club.id, categoryId: mpCats[1].id, title: "Servicekraft (m/w/d) für Bar & Empfang gesucht", description: "Wir suchen freundliche Verstärkung für Bar und Empfang in Teilzeit oder Vollzeit. Sozialversicherungspflichtige Anstellung, faire Bezahlung, gutes Team. Fiktives Demo-Inserat.", city: "Berlin", priceCents: null, priceUnit: null },
    { ownerId: studio.id, categoryId: mpCats[2].id, title: "Masseur/in (m/w/d) mit Ausbildung gesucht", description: "Für unser Studio suchen wir ausgebildete Masseurinnen und Masseure. Flexible Arbeitszeiten, moderne Räume. Fiktives Demo-Inserat.", city: "München", priceCents: null, priceUnit: null },
    { ownerId: agency.id, categoryId: mpCats[3].id, title: "Professionelle Profilbetreuung für Inserentinnen", description: "Wir unterstützen bei Texten, Fotos und Terminorganisation – transparent und fair. Fiktives Demo-Inserat.", city: "Köln", priceCents: 4900, priceUnit: "pro Monat" },
  ];
  for (const l of listings) await db.marketplaceListing.create({ data: { ...l, status: "PUBLISHED", publishedAt: new Date(), expiresAt: daysFromNow(30), contactEmail: "inserat@example.com" } });
  await db.marketplaceListing.create({ data: { ownerId: apartment.id, categoryId: mpCats[0].id, title: "Apartment in Frankfurt – neu", description: "Neu renoviertes Apartment nahe Hauptbahnhof. Wartet auf Freigabe. Fiktives Demo-Inserat.", city: "Frankfurt am Main", priceCents: 62000, priceUnit: "pro Woche", status: "PENDING_REVIEW" } });

  // ── Forum ──
  const forumCats = await Promise.all(
    [
      { slug: "allgemein", name: "Allgemeines", description: "Austausch unter Inserentinnen und Unternehmen." },
      { slug: "recht-steuern", name: "Recht & Steuern", description: "Fragen zu ProstSchG, Anmeldung, Steuern – keine Rechtsberatung." },
      { slug: "sicherheit", name: "Sicherheit", description: "Tipps zur eigenen Sicherheit. Keine Namen, keine Anschuldigungen gegen Einzelpersonen." },
      { slug: "marketing", name: "Marketing & Fotos", description: "Profiltexte, Fotos und Werbung." },
    ].map((c, i) => db.forumCategory.create({ data: { ...c, sortOrder: i } })),
  );
  const t1 = await db.forumThread.create({ data: { categoryId: forumCats[1].id, authorId: provider.id, title: "Anmeldebescheinigung verlängern – Erfahrungen?", lastPostAt: new Date() } });
  await db.forumPost.createMany({ data: [
    { threadId: t1.id, authorId: provider.id, body: "Hallo zusammen, meine Anmeldebescheinigung läuft bald aus. Wie lange hat die Verlängerung bei euch gedauert?" },
    { threadId: t1.id, authorId: agency.id, body: "Bei uns waren es etwa zwei Wochen. Am besten frühzeitig einen Termin bei der zuständigen Behörde vereinbaren." },
  ] });
  const t2 = await db.forumThread.create({ data: { categoryId: forumCats[3].id, authorId: agency.id, title: "Welche Bildformate funktionieren am besten?", pinned: true, lastPostAt: new Date(Date.now() - DAY) } });
  await db.forumPost.createMany({ data: [
    { threadId: t2.id, authorId: agency.id, body: "Hochformat 3:4 mit mindestens 1200 px Höhe sieht in den Karten am besten aus. Bitte nur Bilder verwenden, an denen ihr alle Rechte habt." },
    { threadId: t2.id, authorId: moderator.id, body: "Danke für den Hinweis! Ergänzend: Bilder werden vor der Veröffentlichung manuell geprüft." },
  ] });
  const t3 = await db.forumThread.create({ data: { categoryId: forumCats[2].id, authorId: extraProviders[0].id, title: "Sicherheitstipps für Hausbesuche", lastPostAt: new Date(Date.now() - 2 * DAY) } });
  await db.forumPost.createMany({ data: [
    { threadId: t3.id, authorId: extraProviders[0].id, body: "Ich teile meinen Standort immer mit einer Vertrauensperson und vereinbare ein Codewort. Was macht ihr?" },
    { threadId: t3.id, authorId: club.id, body: "Wichtig ist auch, im Notfall sofort 110 zu wählen. Es gibt außerdem Beratungsstellen, die kostenlos unterstützen.", status: "VISIBLE" },
    { threadId: t3.id, authorId: extraProviders[1].id, body: "Ein Kunde namens Thomas aus der Musterstraße 12 ist ein Betrüger!", status: "PENDING_REVIEW", flagReason: "Wohnadresse, Mögliche unbelegte Anschuldigung" },
  ] });

  // ── Nachrichten ──
  const conv = await db.conversation.create({
    data: {
      subject: "Anfrage zu Lara", profileId: profileIds[6],
      participants: { create: [{ userId: visitor.id, lastReadAt: new Date() }, { userId: provider.id }] },
    },
  });
  await db.message.createMany({ data: [
    { conversationId: conv.id, senderId: visitor.id, body: "Hallo Lara, ich interessiere mich für einen Termin am Freitagabend. Ist das möglich?", createdAt: new Date(Date.now() - 3600_000 * 5) },
    { conversationId: conv.id, senderId: provider.id, body: "Hallo Max, danke für deine Nachricht. Freitag ab 19 Uhr passt. Melde dich gerne telefonisch.", createdAt: new Date(Date.now() - 3600_000 * 4) },
    { conversationId: conv.id, senderId: visitor.id, body: "Super, ich melde mich!", createdAt: new Date(Date.now() - 3600_000 * 3) },
  ] });
  const badMsg = await db.message.create({ data: { conversationId: conv.id, senderId: visitor.id, body: "Beispiel für eine gemeldete Nachricht (Demo).", createdAt: new Date(Date.now() - 3600_000 * 2) } });

  // ── Meldungen ──
  await db.report.createMany({ data: [
    { reporterId: visitor.id, targetType: "PROFILE", targetId: profileIds[3], reason: "IDENTITY_MISUSE", details: "Demo-Meldung: Die Bilder erscheinen auch auf einer anderen Website unter anderem Namen.", priority: 60 },
    { reporterEmail: "hinweis@example.com", targetType: "LISTING", targetId: (await db.marketplaceListing.findFirstOrThrow()).id, reason: "FRAUD", details: "Demo-Meldung: Der Vermieter verlangt Vorkasse per Gutschein.", priority: 50 },
    { reporterId: provider.id, targetType: "MESSAGE", targetId: badMsg.id, reason: "OTHER", details: "Demo-Meldung: Bitte prüfen.", priority: 10 },
  ] });

  // ── Identitätsprüfung (ausstehend) ──
  const docKey = `private/verifications/${newProvider.id}/${randomUUID()}.jpg`;
  await put(docKey, await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><rect width="800" height="500" fill="#1e1e1e"/><text x="400" y="260" text-anchor="middle" font-family="Arial" font-size="40" fill="#F3C2C6">DEMO-DOKUMENT (fiktiv)</text></svg>`)).jpeg().toBuffer(), "image/jpeg");
  await db.identityVerification.create({ data: { userId: newProvider.id, docType: "ID_CARD", documentKey: docKey, birthYear: 2002, status: "PENDING" } });

  await db.notification.createMany({ data: [
    { userId: provider.id, title: "Neue Nachricht", body: "Max Besucher hat dir zu „Lara“ geschrieben.", link: `/dashboard/nachrichten/${conv.id}` },
    { userId: agency.id, title: "Sedcard in Prüfung", body: "„Noemi“ wurde zur Prüfung eingereicht.", link: "/dashboard/sedcards" },
  ] });

  await db.auditLog.create({ data: { actorId: admin.id, action: "seed.completed", details: { note: "Demo-Daten erstellt" } } });

  console.log("✔ Demo-Daten erstellt.");
  console.log(`  Passwort für alle Testkonten: ${PASSWORD}`);
  console.log("  admin@ · moderator@ · agentur@ · anbieterin@ · club@ · massage@ · apartment@ · besucher@ · neu@  (Domain: topgirls.local)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

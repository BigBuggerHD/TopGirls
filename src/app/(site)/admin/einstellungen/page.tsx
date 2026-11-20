import { requirePermission } from "@/lib/auth/session";
import { getSettings, DEFAULT_SETTINGS } from "@/lib/settings";
import { saveSettingsAction } from "@/actions/admin";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { AdminFlash, HiddenBack, inputCls } from "@/components/admin/ui";

const LABELS: Record<keyof typeof DEFAULT_SETTINGS, string> = {
  siteName: "Name der Plattform", profileDurationDays: "Laufzeit freigegebener Sedcards (Tage)", extensionDays: "Verlängerung (Tage)",
  maxImagesPerProfile: "Max. Bilder pro Sedcard", maxProfilesPerProvider: "Max. Sedcards Einzelanbieterin", maxProfilesPerBusiness: "Max. Sedcards Agentur/Club/Studio",
  listingDurationDays: "Laufzeit Marktplatz-Inserate (Tage)", requireVerificationForPublish: "Identitätsprüfung vor Veröffentlichung erzwingen",
  registrationOpen: "Registrierung geöffnet", maintenanceNotice: "Wartungshinweis", contactEmail: "Kontakt-E-Mail", reportEmail: "E-Mail der Meldestelle",
};

export default async function SettingsAdminPage({ searchParams }: { searchParams: Promise<{ ok?: string; fehler?: string }> }) {
  await requirePermission("admin.settings", "/admin");
  const sp = await searchParams;
  const s = await getSettings();
  return (
    <div>
      <PageHeader title="Systemeinstellungen" description="Globale Einstellungen von Top Girls. Secrets und Zahlungszugangsdaten werden ausschließlich über Umgebungsvariablen verwaltet." />
      <AdminFlash sp={sp} />
      <form action={saveSettingsAction} className="grid gap-4 rounded-xl border border-border bg-surface p-6 sm:grid-cols-2">
        <HiddenBack path="/admin/einstellungen" />
        {(Object.keys(DEFAULT_SETTINGS) as (keyof typeof DEFAULT_SETTINGS)[]).map((k) => {
          const v = s[k];
          if (typeof v === "boolean") return <label key={k} className="flex items-center gap-2 text-sm"><input type="checkbox" name={k} defaultChecked={v} className="size-4 accent-[#F3C2C6]" /> {LABELS[k]}</label>;
          return <label key={k} className="text-sm">{LABELS[k]}<input name={k} type={typeof v === "number" ? "number" : "text"} defaultValue={String(v)} className={`${inputCls} mt-1 w-full`} /></label>;
        })}
        <div className="sm:col-span-2"><Button>Einstellungen speichern</Button></div>
      </form>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, CircleAlert, Eye } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { mediaUrl } from "@/lib/media";
import { formatDate } from "@/lib/format";
import { PROFILE_STATUS, VERIFICATION_STATUS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { parsePrices } from "@/lib/prices";
import type { Availability } from "@/lib/availability";
import { meetingTypes, OUTCALL_PLACE_KEY } from "@/lib/meeting";
import { deleteImageAction, deleteProfileAction, getPublishChecklist, pauseProfileAction, setCoverImageAction } from "@/actions/profiles";
import { ContactDataStep, ProfileDataStep, ServiceStep, DescriptionStep, ImagesStep, TimesPricesStep, ModelConsentUpload, SubmitStep } from "@/components/dashboard/sedcard-steps";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Gallery } from "@/components/profiles/gallery";

export const metadata = { title: "Sedcard bearbeiten" };

const STEPS = ["Profildaten", "Kontaktdaten", "Service", "Verfügbarkeit & Preise", "Bilder", "Beschreibung", "Vorschau & Veröffentlichung"];

export default async function EditSedcardPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ schritt?: string }> }) {
  const user = await requirePermission("profile.own");
  const { id } = await params;
  const step = Math.min(STEPS.length, Math.max(1, Number((await searchParams).schritt) || 1));
  const p = await db.profile.findFirst({
    where: { id, ownerId: user.id },
    include: {
      category: true,
      images: { orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }] },
      attributes: { include: { filter: { select: { key: true } }, options: { include: { option: { select: { value: true, label: true } } } } } },
    },
  });
  if (!p) notFound();
  const categories = await db.category.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });
  // Schritt 1: Eigenschaften, Schritt 3: Service (Bereich der dynamischen Filter)
  const section = step === 1 ? "eigenschaften" : step === 3 ? "service" : null;
  const filters = section
    ? await db.filterDefinition.findMany({ where: { active: true, section, categories: { some: { categoryId: p.categoryId } } }, orderBy: { sortOrder: "asc" }, include: { options: { where: { active: true }, orderBy: { sortOrder: "asc" } } } })
    : [];
  const filterProps = filters.map((f) => ({ id: f.id, key: f.key, label: f.label, type: f.type, unit: f.unit, helpText: f.helpText, minValue: f.minValue, maxValue: f.maxValue, perPerson: f.perPerson, options: f.options.map((o) => ({ id: o.id, label: o.label, value: o.value })) }));
  const valueProps = p.attributes.map((a) => ({ filterId: a.filterId, person: a.person, numberValue: a.numberValue, boolValue: a.boolValue, optionIds: a.options.map((o) => o.optionId) }));
  const checklist = step === 7 ? await getPublishChecklist(p.id) : null;
  const settings = await getSettings();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/dashboard/sedcards" className="text-xs text-subtle hover:text-gold">← Alle Sedcards</Link>
          <h1 className="mt-2 font-display text-4xl text-white">{p.stageName}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant={p.status === "PUBLISHED" ? "success" : p.status === "PENDING_REVIEW" ? "warning" : p.status === "REJECTED" ? "danger" : "default"}>{PROFILE_STATUS[p.status]}</Badge>
            {p.expiresAt && p.status === "PUBLISHED" ? <span className="text-xs text-subtle">Online bis {formatDate(p.expiresAt)}</span> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {p.status === "PUBLISHED" ? (
            <>
              <Button asChild variant="outline" size="sm"><Link href={`/profil/${p.slug}`}><Eye /> Öffentlich ansehen</Link></Button>
              <form action={pauseProfileAction}><input type="hidden" name="profileId" value={p.id} /><Button variant="secondary" size="sm">Pausieren</Button></form>
            </>
          ) : null}
          <form action={deleteProfileAction}><input type="hidden" name="profileId" value={p.id} /><Button variant="ghost" size="sm" className="text-danger">Löschen</Button></form>
        </div>
      </div>

      {p.rejectionReason && ["REJECTED", "PENDING_REVIEW", "BLOCKED"].includes(p.status) ? <Alert variant="error" className="mb-6">Hinweis der Moderation: {p.rejectionReason}</Alert> : null}
      {p.status === "PUBLISHED" ? <Alert variant="info" className="mb-6">Änderungen an Künstlername, Slogan, Alter oder Beschreibung werden erneut geprüft. Die Sedcard ist währenddessen offline.</Alert> : null}

      <ol className="mb-8 flex gap-1 overflow-x-auto pb-2" aria-label="Schritte">
        {STEPS.map((s, i) => (
          <li key={s} className="shrink-0">
            <Link
              href={`?schritt=${i + 1}`}
              aria-current={step === i + 1 ? "step" : undefined}
              className={cn("flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors", step === i + 1 ? "border-gold bg-gold/10 text-gold" : "border-border text-muted hover:text-foreground")}
            >
              <span className={cn("flex size-5 items-center justify-center rounded-full text-[10px]", step === i + 1 ? "bg-gold text-background" : "bg-surface-3")}>{i + 1}</span>
              {s}
            </Link>
          </li>
        ))}
      </ol>

      <section className="rounded-xl border border-border bg-surface p-5 sm:p-8">
        <h2 className="mb-6 font-display text-2xl text-white">{STEPS[step - 1]}</h2>
        {step === 1 && (
          <ProfileDataStep
            profile={p}
            categories={categories}
            filters={filterProps}
            values={valueProps}
          />
        )}
        {step === 2 && (
          <ContactDataStep
            profile={{
              id: p.id, contactPhone: p.contactPhone, phoneVerified: !!p.phoneVerifiedAt, whatsappEnabled: p.whatsappEnabled, telegramEnabled: p.telegramEnabled, telegramUsername: p.telegramUsername,
              street: p.street, houseNumber: p.houseNumber, postalCode: p.postalCode, city: p.city, district: p.district, showAddress: p.showAddress,
            }}
          />
        )}
        {step === 3 && <ServiceStep profileId={p.id} filters={filterProps} values={valueProps} />}
        {step === 6 && <DescriptionStep profile={p} />}
        {step === 5 && (
          <ImagesStep
            profileId={p.id}
            images={p.images.map((i) => ({ id: i.id, thumb: mediaUrl(i.thumbKey)!, status: i.status, isCover: i.isCover, rejectReason: i.rejectReason }))}
            onDelete={deleteImageAction}
            onCover={setCoverImageAction}
            maxImages={settings.maxImagesPerProfile}
            nextHref="?schritt=6"
          />
        )}
        {step === 4 && (
          <TimesPricesStep
            profile={{ id: p.id, availability: (p.availability ?? {}) as Availability, prices: parsePrices(p.prices), priceNote: p.priceNote }}
            meeting={{ ...meetingTypes(p), outcallPlace: p.attributes.find((a) => a.filter.key === OUTCALL_PLACE_KEY)?.options[0]?.option.label ?? null }}
          />
        )}
        {step === 7 && checklist && (
          <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
            <div>
              <p className="mb-3 text-xs uppercase tracking-wider text-subtle">Vorschau</p>
              <Gallery name={p.stageName} images={p.images.map((i) => ({ id: i.id, src: mediaUrl(i.storageKey)!, thumb: mediaUrl(i.thumbKey)! }))} />
              <p className="mt-4 font-display text-3xl text-white">{p.stageName}{p.age ? `, ${p.age}` : ""}</p>
              <p className="text-sm text-gold-light">{p.headline}</p>
              <p className="mt-1 text-xs text-muted">{p.category.name} · {[p.district, p.city].filter(Boolean).join(", ") || "Kein Standort"}</p>
              <p className="mt-4 line-clamp-6 whitespace-pre-line text-sm text-foreground/80">{p.description || "Noch keine Beschreibung."}</p>
            </div>
            <div className="space-y-6">
              <div>
                <p className="mb-3 text-xs uppercase tracking-wider text-subtle">Checkliste</p>
                <ul className="space-y-2">
                  {checklist.items.map((i) => (
                    <li key={i.label} className="flex items-center gap-2 text-sm">
                      {i.ok ? <Check className="size-4 text-success" /> : <CircleAlert className="size-4 text-warning" />}
                      <span className={i.ok ? "text-foreground" : "text-warning"}>{i.label}</span>
                      {!i.ok && "link" in i && i.link ? <Link href={i.link as string} className="text-xs text-gold underline">erledigen</Link> : null}
                    </li>
                  ))}
                </ul>
              </div>
              {checklist.needsModelConsent ? (
                checklist.modelConsent && checklist.modelConsent.status !== "REJECTED" ? (
                  <p className="text-sm text-muted">Nachweis der dargestellten Person: <strong className="text-foreground">{VERIFICATION_STATUS[checklist.modelConsent.status]}</strong></p>
                ) : (
                  <ModelConsentUpload profileId={p.id} />
                )
              ) : null}
              <SubmitStep profileId={p.id} ready={checklist.ready} status={p.status} />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

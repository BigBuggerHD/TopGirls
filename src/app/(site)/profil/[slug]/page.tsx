import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, Car, Clock, Globe, House, Languages, Mail, MapPin } from "lucide-react";
import { meetingTypes } from "@/lib/meeting";
import { db } from "@/lib/db";
import { publicProfileWhere } from "@/lib/queries/profiles";
import { trackProfiles } from "@/lib/stats";
import { getCurrentUser } from "@/lib/auth/session";
import { mediaUrl } from "@/lib/media";
import { WEEKDAYS } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import { Gallery } from "@/components/profiles/gallery";
import { ContactReveal } from "@/components/profiles/contact-reveal";
import { ReportDialog } from "@/components/report/report-dialog";
import { AdSlot } from "@/components/ads/ad-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StartConversationForm } from "@/components/messages/start-conversation";

type Params = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  return db.profile.findFirst({
    where: { AND: [publicProfileWhere(), { slug }] },
    include: {
      category: true,
      owner: { select: { id: true, role: true, companyName: true, displayName: true } },
      images: { where: { status: "APPROVED" }, orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }] },
      attributes: { include: { filter: true, options: { include: { option: true } } }, orderBy: { filter: { sortOrder: "asc" } } },
    },
  });
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const p = await db.profile.findFirst({ where: { AND: [publicProfileWhere(), { slug }] }, select: { stageName: true, city: true, headline: true, category: { select: { name: true } } } });
  if (!p) return { title: "Profil nicht gefunden" };
  return { title: `${p.stageName} in ${p.city}`, description: p.headline ?? `${p.stageName} – ${p.category.name} in ${p.city} auf Top Girls.`, alternates: { canonical: `/profil/${slug}` } };
}

export default async function ProfilePage({ params }: Params) {
  const { slug } = await params;
  const p = await load(slug);
  if (!p) notFound();
  const user = await getCurrentUser();
  await trackProfiles([p.id], "views");

  const meeting = meetingTypes(p);
  const availability = (p.availability ?? {}) as Record<string, { active?: boolean; from?: string; to?: string }>;
  const hasAvailability = WEEKDAYS.some(([k]) => availability[k]?.active);
  const isBusinessOwner = ["AGENCY", "CLUB", "MASSAGE_STUDIO"].includes(p.owner.role);

  return (
    <div className="container-page py-10">
      <nav aria-label="Brotkrumen" className="mb-6 text-xs text-subtle">
        <Link href="/" className="hover:text-gold">Startseite</Link> / <Link href={`/${p.category.slug}`} className="hover:text-gold">{p.category.name}</Link> / <span className="text-muted">{p.stageName}</span>
      </nav>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Gallery name={p.stageName} images={p.images.map((i) => ({ id: i.id, src: mediaUrl(i.storageKey)!, thumb: mediaUrl(i.thumbKey)! }))} />

        <div>
          <div className="flex flex-wrap items-center gap-2">
            {p.verified ? <Badge variant="success"><BadgeCheck className="size-3" /> Verifiziert</Badge> : null}
            <Badge>{p.category.name}</Badge>
            {meeting.incall ? <Badge><House className="size-3" /> Incall</Badge> : null}
            {meeting.outcall ? <Badge><Car className="size-3" /> Outcall</Badge> : null}
          </div>
          <h1 className="mt-4 font-display text-5xl text-white">{p.stageName}{p.age ? <span className="text-3xl text-muted">, {p.age}</span> : null}</h1>
          {p.headline ? <p className="mt-2 text-lg text-gold-light">{p.headline}</p> : null}
          <p className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted">
            <span className="flex items-center gap-1.5"><MapPin className="size-4 text-gold" /> {p.postalCode ? `${p.postalCode} ` : ""}{p.city}{p.region ? `, ${p.region}` : ""}</span>
            {p.languages.length ? <span className="flex items-center gap-1.5"><Languages className="size-4 text-gold" /> {p.languages.join(", ")}</span> : null}
          </p>
          {isBusinessOwner && p.owner.companyName ? <p className="mt-2 text-xs text-subtle">Inserent: {p.owner.companyName}</p> : null}

          <div className="gold-hairline my-8" />

          <div className="grid gap-8 xl:grid-cols-[1fr_280px]">
            <div className="space-y-8">
              <section>
                <h2 className="mb-3 font-display text-2xl text-white">Über mich</h2>
                <div className="whitespace-pre-line text-sm leading-relaxed text-foreground/85">{p.description}</div>
              </section>

              {p.attributes.length ? (
                <section>
                  <h2 className="mb-3 font-display text-2xl text-white">Eigenschaften</h2>
                  <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                    {p.attributes.filter((a) => a.filter.active).map((a) => {
                      const value =
                        a.filter.type === "BOOLEAN" ? (a.boolValue ? "Ja" : "Nein")
                        : a.filter.type === "NUMBER" ? (a.numberValue != null ? `${a.numberValue}${a.filter.unit ? ` ${a.filter.unit}` : ""}` : null)
                        : a.options.map((o) => o.option.label).join(", ");
                      if (!value) return null;
                      return (
                        <div key={a.id} className="flex justify-between gap-3 border-b border-border pb-2 text-sm">
                          <dt className="text-subtle">{a.filter.label}</dt>
                          <dd className="text-right text-foreground">{value}</dd>
                        </div>
                      );
                    })}
                  </dl>
                </section>
              ) : null}

              {hasAvailability || p.availabilityNote ? (
                <section>
                  <h2 className="mb-3 flex items-center gap-2 font-display text-2xl text-white"><Clock className="size-5 text-gold" /> Verfügbarkeit</h2>
                  {hasAvailability ? (
                    <ul className="grid gap-1.5 text-sm sm:grid-cols-2">
                      {WEEKDAYS.map(([k, label]) => (
                        <li key={k} className="flex justify-between gap-3 rounded-md bg-surface px-3 py-2">
                          <span className="text-muted">{label}</span>
                          <span className={`whitespace-nowrap ${availability[k]?.active ? "text-foreground" : "text-subtle"}`}>{availability[k]?.active ? `${availability[k]?.from ?? ""} – ${availability[k]?.to ?? ""} Uhr` : "–"}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {p.availabilityNote ? <p className="mt-3 text-sm text-muted">{p.availabilityNote}</p> : null}
                </section>
              ) : null}
            </div>

            <aside className="space-y-4">
              <div className="rounded-xl border border-border bg-surface p-5">
                <p className="mb-4 font-display text-xl text-white">Kontakt</p>
                <div className="space-y-2">
                  <ContactReveal profileId={p.id} hasPhone={p.showPhone && !!p.contactPhone} hasWhatsapp={p.showPhone && !!p.contactWhatsapp} />
                  {p.contactEmail ? <Button asChild variant="secondary" className="w-full"><a href={`mailto:${p.contactEmail}`}><Mail /> E-Mail</a></Button> : null}
                  {p.contactWebsite ? <Button asChild variant="secondary" className="w-full"><a href={p.contactWebsite} target="_blank" rel="noopener noreferrer nofollow ugc"><Globe /> Website</a></Button> : null}
                </div>
                {p.allowMessages ? (
                  <div className="mt-5 border-t border-border pt-5">
                    {user ? (
                      user.id === p.owner.id ? <p className="text-xs text-subtle">Das ist deine eigene Sedcard.</p> : <StartConversationForm profileId={p.id} />
                    ) : (
                      <p className="text-xs text-muted"><Link href={`/login?next=/profil/${p.slug}`} className="text-gold hover:underline">Melde dich an</Link>, um eine Nachricht zu senden.</p>
                    )}
                  </div>
                ) : null}
                <p className="mt-5 text-[11px] leading-relaxed text-subtle">Top Girls vermittelt keine Dienstleistungen. Vereinbarungen kommen ausschließlich zwischen Inserent und Interessent zustande.</p>
              </div>
              <AdSlot location="PROFILE_SIDEBAR" layout="stack" />
              <div className="flex items-center justify-between px-1 text-xs text-subtle">
                <span>Online seit {formatDate(p.publishedAt)}</span>
                <ReportDialog targetType="PROFILE" targetId={p.id} loggedIn={!!user} />
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

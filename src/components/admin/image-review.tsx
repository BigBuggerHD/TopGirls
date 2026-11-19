import Image from "next/image";
import { reviewImageAction } from "@/actions/admin";
import { mediaUrl } from "@/lib/media";
import { Button } from "@/components/ui/button";
import { HiddenBack, inputCls } from "./ui";

export function ImageReviewCard({ img, back }: { img: { id: string; thumbKey: string; storageKey: string; status: string; rejectReason: string | null; width: number; height: number }; back: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface-2">
      <a href={mediaUrl(img.storageKey)!} target="_blank" rel="noreferrer" className="relative block aspect-[3/4]">
        <Image src={mediaUrl(img.thumbKey)!} alt="Zu prüfendes Bild" fill className="object-cover" unoptimized />
        <span className="absolute left-2 top-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">{img.status} · {img.width}×{img.height}</span>
      </a>
      {img.rejectReason ? <p className="px-2 pt-2 text-[11px] text-danger">{img.rejectReason}</p> : null}
      <form action={reviewImageAction} className="space-y-1.5 p-2">
        <HiddenBack path={back} />
        <input type="hidden" name="imageId" value={img.id} />
        <input name="reason" placeholder="Begründung (bei Ablehnung)" className={`${inputCls} w-full text-xs`} />
        <div className="grid grid-cols-3 gap-1">
          <Button name="decision" value="approve" size="sm" className="px-1">OK</Button>
          <Button name="decision" value="reject" size="sm" variant="secondary" className="px-1">Ablehnen</Button>
          <Button name="decision" value="ban" size="sm" variant="destructive" className="px-1" title="Ablehnen und Bild-Hash sperren">Sperren</Button>
        </div>
      </form>
    </div>
  );
}

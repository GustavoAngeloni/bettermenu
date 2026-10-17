"use client";

import { BookOpen, Download, ExternalLink, Megaphone, Newspaper, Pin, PlayCircle, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge, cn, PageHeader } from "@/components/ui";
import { embedUrl, LEARNING_KINDS, videoThumb, type LearningItem, type LearningKind } from "@/lib/learning";
import { markLearningSeen } from "./actions";

const KIND_ICON = { manual: BookOpen, video: PlayCircle, novidade: Megaphone, artigo: Newspaper };
type Filter = "tudo" | LearningKind;

const dateFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

export function LearningCenter({ items, seenAt, unavailable }: { items: LearningItem[]; seenAt: string | null; unavailable: boolean }) {
  const [filter, setFilter] = useState<Filter>("tudo");
  const [open, setOpen] = useState<LearningItem | null>(null);
  const isNew = (i: LearningItem) => !seenAt || i.published_at > seenAt;
  const newCount = items.filter(isNew).length;

  // Ao abrir a central, as novidades contam como vistas (o aviso do menu some na próxima navegação).
  useEffect(() => {
    if (newCount) markLearningSeen();
  }, [newCount]);

  const pinned = items.filter((i) => i.pinned);
  const shown = useMemo(() => items.filter((i) => filter === "tudo" || i.kind === filter), [items, filter]);
  const kinds = (Object.keys(LEARNING_KINDS) as LearningKind[]).filter((k) => items.some((i) => i.kind === k));

  return (
    <div className="space-y-8">
      <PageHeader
        title={
          <>
            Aprender <span className="italic">a usar tudo</span>
          </>
        }
        description="Manuais, vídeos tutoriais e as novidades do Better Menu, preparados pela equipe insight."
      />

      {unavailable && <p className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">A central de aprendizado está sendo preparada. Volte em breve.</p>}

      {newCount > 0 && (
        <p className="flex items-center gap-2 rounded-2xl bg-brand-soft px-4 py-3 text-sm font-semibold text-brand-fg">
          <Sparkles className="size-4" /> {newCount === 1 ? "1 novidade desde a sua última visita" : `${newCount} novidades desde a sua última visita`}
        </p>
      )}

      {pinned.length > 0 && filter === "tudo" && (
        <section aria-labelledby="destaques" className="space-y-3">
          <h2 id="destaques" className="flex items-center gap-2 font-display text-xl font-semibold">
            <Pin className="size-4 text-brand-fg" /> Comece por aqui
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {pinned.map((i) => (
              <Card key={i.id} item={i} isNew={isNew(i)} onOpen={setOpen} big />
            ))}
          </div>
        </section>
      )}

      {items.length > 0 && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto" role="group" aria-label="Filtrar materiais">
          {(["tudo", ...kinds] as Filter[]).map((k) => (
            <button
              key={k}
              aria-pressed={filter === k}
              onClick={() => setFilter(k)}
              className={cn(
                "h-10 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors",
                filter === k ? "bg-ink text-canvas" : "bg-surface text-muted ring-1 ring-line hover:text-ink",
              )}
            >
              {k === "tudo" ? "Tudo" : LEARNING_KINDS[k].plural}
            </button>
          ))}
        </div>
      )}

      {items.length === 0 && !unavailable ? (
        <div className="rounded-[1.6rem] border-2 border-dashed border-line p-12 text-center text-muted">Os primeiros materiais chegam em breve.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shown
            .filter((i) => filter !== "tudo" || !i.pinned)
            .map((i) => (
              <Card key={i.id} item={i} isNew={isNew(i)} onOpen={setOpen} />
            ))}
        </div>
      )}

      {open && <Viewer item={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function Card({ item, isNew, onOpen, big }: { item: LearningItem; isNew: boolean; onOpen: (i: LearningItem) => void; big?: boolean }) {
  const Icon = KIND_ICON[item.kind];
  const cover = item.cover_url ?? (item.kind === "video" ? videoThumb(item.url) : null);
  const external = item.kind === "manual" && item.url;
  const content = (
    <>
      {cover ? (
        <span className="relative block aspect-video overflow-hidden bg-surface-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cover} alt="" className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" loading="lazy" />
          {item.kind === "video" && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/20">
              <PlayCircle className="size-14 text-white drop-shadow-lg" />
            </span>
          )}
        </span>
      ) : (
        <span className={cn("flex items-center justify-center bg-[color-mix(in_oklch,var(--brand)_10%,var(--surface))] text-brand-fg", big ? "aspect-[3/1]" : "aspect-[5/2]")}>
          <Icon className="size-10" />
        </span>
      )}
      <span className="flex flex-1 flex-col p-5">
        <span className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-muted">
          <Icon className="size-3.5" /> {LEARNING_KINDS[item.kind].label} · {dateFmt.format(new Date(item.published_at))}
          {isNew && <Badge className="bg-brand text-on-brand">Novo</Badge>}
        </span>
        <span className={cn("mt-2 block font-display font-semibold leading-tight", big ? "text-2xl" : "text-lg")}>{item.title}</span>
        {item.summary && <span className="mt-1.5 line-clamp-3 block text-sm text-muted">{item.summary}</span>}
        <span className="mt-auto flex items-center gap-1.5 pt-4 text-sm font-semibold text-brand-fg">
          {item.kind === "manual" ? (
            <>
              <Download className="size-4" /> Abrir manual
            </>
          ) : item.kind === "video" ? (
            <>
              <PlayCircle className="size-4" /> Assistir
            </>
          ) : (
            "Ler"
          )}
        </span>
      </span>
    </>
  );
  const cls = "group flex flex-col overflow-hidden rounded-[1.4rem] border border-line bg-surface text-left transition hover:border-line-strong hover:shadow-card";
  return external ? (
    <a href={item.url!} target="_blank" rel="noreferrer" className={cls}>
      {content}
    </a>
  ) : (
    <button type="button" onClick={() => onOpen(item)} className={cls}>
      {content}
    </button>
  );
}

/** Vídeo tocando no painel, ou o texto de uma novidade/artigo. */
function Viewer({ item, onClose }: { item: LearningItem; onClose: () => void }) {
  const embed = item.kind === "video" ? embedUrl(item.url) : null;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={item.title} onClick={onClose}>
      <div className="max-h-[92dvh] w-full max-w-3xl overflow-y-auto rounded-t-[1.75rem] bg-surface sm:rounded-[1.75rem]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 p-5">
          <div>
            <div className="text-xs font-semibold text-muted">
              {LEARNING_KINDS[item.kind].label} · {dateFmt.format(new Date(item.published_at))}
            </div>
            <h2 className="mt-1 font-display text-2xl font-semibold">{item.title}</h2>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="rounded-full p-2 text-muted hover:bg-surface-2 hover:text-ink">
            <X className="size-5" />
          </button>
        </div>
        {embed ? (
          /\.(mp4|webm)$/i.test(embed) ? (
            <video src={embed} controls className="aspect-video w-full bg-black" />
          ) : (
            <iframe src={embed} title={item.title} className="aspect-video w-full bg-black" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
          )
        ) : item.kind === "video" && item.url ? (
          <a href={item.url} target="_blank" rel="noreferrer" className="mx-5 flex items-center gap-2 font-semibold text-brand-fg">
            Abrir vídeo <ExternalLink className="size-4" />
          </a>
        ) : null}
        <div className="space-y-4 p-5 pb-8 leading-relaxed">
          {item.summary && <p className="text-lg text-muted">{item.summary}</p>}
          {item.body?.split(/\n\s*\n/).map((para, n) => (
            <p key={n} className="whitespace-pre-line">
              {para}
            </p>
          ))}
          {item.kind !== "video" && item.url && (
            <a href={item.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-semibold text-brand-fg">
              Abrir link <ExternalLink className="size-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

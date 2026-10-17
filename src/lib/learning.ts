// Central de aprendizado: materiais publicados pela plataforma para os donos dos restaurantes.

export const LEARNING_KINDS = {
  manual: { label: "Manual", plural: "Manuais" },
  video: { label: "Vídeo", plural: "Vídeos tutoriais" },
  novidade: { label: "Novidade", plural: "Novidades" },
  artigo: { label: "Artigo", plural: "Artigos e dicas" },
} as const;
export type LearningKind = keyof typeof LEARNING_KINDS;

export const AUDIENCES = { owner: "Dono", manager: "Gerente", waiter: "Garçom", kitchen: "Cozinha" } as const;

export interface LearningItem {
  id: string;
  kind: LearningKind;
  title: string;
  summary: string | null;
  body: string | null;
  url: string | null;
  cover_url: string | null;
  audience: string[];
  plans: string[];
  pinned: boolean;
  published: boolean;
  published_at: string;
  created_at: string;
}

/** Vídeo do YouTube/Vimeo/Loom em formato de incorporação; null se não reconhecer. */
export function embedUrl(url: string | null) {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}`;
    if (host.endsWith("youtube.com")) {
      const id = u.searchParams.get("v") ?? u.pathname.match(/\/(?:embed|shorts|live)\/([^/?]+)/)?.[1];
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (host === "vimeo.com") return `https://player.vimeo.com/video/${u.pathname.split("/").filter(Boolean)[0]}`;
    if (host === "loom.com") return `https://www.loom.com/embed/${u.pathname.split("/").pop()}`;
    if (/\.(mp4|webm)$/i.test(u.pathname)) return url;
  } catch {}
  return null;
}

/** Miniatura do YouTube para a lista de vídeos. */
export function videoThumb(url: string | null) {
  const e = embedUrl(url);
  const id = e?.match(/youtube-nocookie\.com\/embed\/([^/?]+)/)?.[1];
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}

/** O material vale para este restaurante/perfil? (listas vazias = todos) */
export function visibleTo(item: Pick<LearningItem, "audience" | "plans">, role: string | null, plan: string) {
  return (!item.audience.length || (role != null && item.audience.includes(role))) && (!item.plans.length || item.plans.includes(plan));
}

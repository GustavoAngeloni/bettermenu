"use server";

import { revalidatePath } from "next/cache";
import { requireSuperadmin } from "@/lib/auth";
import { LEARNING_KINDS } from "@/lib/learning";
import { createAdminClient } from "@/lib/supabase/server";

const list = (form: FormData, key: string) => form.getAll(key).map(String).filter(Boolean);

/** Cria ou atualiza um material da central de aprendizado. */
export async function saveLearningItem(_prev: string | null, form: FormData): Promise<string | null> {
  await requireSuperadmin();
  const id = String(form.get("id") ?? "") || null;
  const kind = String(form.get("kind") ?? "");
  const title = String(form.get("title") ?? "").trim();
  if (!(kind in LEARNING_KINDS)) return "Escolha o tipo";
  if (!title) return "Informe o título";
  const url = String(form.get("url") ?? "").trim() || null;
  if ((kind === "manual" || kind === "video") && !url) return kind === "manual" ? "Envie o arquivo ou informe o link do manual" : "Informe o link do vídeo";
  if (url && !/^https?:\/\//.test(url)) return "O link precisa começar com https://";
  const row = {
    kind,
    title,
    summary: String(form.get("summary") ?? "").trim() || null,
    body: String(form.get("body") ?? "").trim() || null,
    url,
    cover_url: String(form.get("cover_url") ?? "").trim() || null,
    audience: list(form, "audience"),
    plans: list(form, "plans"),
    pinned: form.get("pinned") === "on",
    published: form.get("published") === "on",
    ...(id ? {} : { published_at: new Date().toISOString() }),
  };
  const db = createAdminClient();
  const { error } = id ? await db.from("learning_items").update(row).eq("id", id) : await db.from("learning_items").insert(row);
  if (error) return error.message;
  revalidatePath("/super/aprender");
  revalidatePath("/admin/aprender");
  return id ? "ok:atualizado" : "ok:publicado";
}

export async function deleteLearningItem(id: string) {
  await requireSuperadmin();
  await createAdminClient().from("learning_items").delete().eq("id", id);
  revalidatePath("/super/aprender");
  revalidatePath("/admin/aprender");
}

/** "Publicar de novo" no topo: os donos veem como novidade outra vez. */
export async function bumpLearningItem(id: string) {
  await requireSuperadmin();
  await createAdminClient().from("learning_items").update({ published_at: new Date().toISOString(), published: true }).eq("id", id);
  revalidatePath("/super/aprender");
  revalidatePath("/admin/aprender");
}

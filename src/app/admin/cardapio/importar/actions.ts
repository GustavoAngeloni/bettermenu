"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { aiImportEnabled, extractMenuFromImages, ImportedMenuSchema, type ImportedMenu } from "@/lib/menu-import";
import { createAdminClient } from "@/lib/supabase/server";
import type { Category } from "@/lib/types";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export async function readMenuPhotos(form: FormData): Promise<Result<ImportedMenu>> {
  await requireStaff(["manager"]);
  if (!aiImportEnabled()) return { ok: false, error: "Leitura por foto não configurada (falta ANTHROPIC_API_KEY)." };
  const files = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0).slice(0, 6);
  if (!files.length) return { ok: false, error: "Envie ao menos uma foto." };
  try {
    const images = await Promise.all(
      files.map(async (f) => ({
        mediaType: (["image/png", "image/webp"].includes(f.type) ? f.type : "image/jpeg") as "image/jpeg" | "image/png" | "image/webp",
        base64: Buffer.from(await f.arrayBuffer()).toString("base64"),
      })),
    );
    return { ok: true, data: await extractMenuFromImages(images) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro ao ler as fotos" };
  }
}

/** Cria as categorias (reaproveitando as que já existem com o mesmo nome) e os pratos. */
export async function saveImportedMenu(input: ImportedMenu): Promise<Result<{ categories: number; items: number }>> {
  const { restaurant } = await requireStaff(["manager"]);
  const parsed = ImportedMenuSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dados inválidos" };
  const db = createAdminClient();
  const { data: existing } = await db.from("categories").select("*").eq("restaurant_id", restaurant.id);
  const { data: stations } = await db.from("stations").select("id, name").eq("restaurant_id", restaurant.id).order("sort");
  const byName = new Map(((existing ?? []) as Category[]).map((c) => [c.name.trim().toLowerCase(), c]));
  const defaultStation = (stations ?? [])[0]?.id ?? null;
  const barStation = (stations ?? []).find((s) => /bar/i.test(s.name))?.id ?? defaultStation;
  let sort = existing?.length ?? 0;
  let createdCategories = 0;
  let createdItems = 0;

  for (const cat of parsed.data.categories) {
    const items = cat.items.filter((i) => i.name.trim());
    if (!cat.name.trim() || !items.length) continue;
    let category = byName.get(cat.name.trim().toLowerCase());
    if (!category) {
      // Bebidas vão para o Bar; o resto para a primeira estação (Cozinha).
      const isDrink = /bebida|drink|bar|vinho|cerveja|chopp|suco|refri|cocktail|coquetel|caf[eé]/i.test(cat.name);
      const { data, error } = await db
        .from("categories")
        .insert({ restaurant_id: restaurant.id, name: cat.name.trim(), station_id: isDrink ? barStation : defaultStation, sort: sort++ })
        .select()
        .single<Category>();
      if (error || !data) return { ok: false, error: error?.message ?? "Erro ao criar categoria" };
      category = data;
      byName.set(cat.name.trim().toLowerCase(), data);
      createdCategories++;
    }
    const { error } = await db.from("menu_items").insert(
      items.map((i, idx) => ({
        restaurant_id: restaurant.id,
        category_id: category!.id,
        name: i.name.trim().slice(0, 120),
        description: i.description?.trim() || null,
        price_cents: Math.max(0, Math.round((i.price ?? 0) * 100)),
        sort: idx,
      })),
    );
    if (error) return { ok: false, error: error.message };
    createdItems += items.length;
  }
  revalidatePath("/admin/cardapio");
  return { ok: true, data: { categories: createdCategories, items: createdItems } };
}

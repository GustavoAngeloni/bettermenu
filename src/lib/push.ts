import "server-only";
import webpush from "web-push";
import { resolveFeatures } from "./features";
import { createAdminClient } from "./supabase/server";

let configured = false;
function configure() {
  if (configured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "https://bettermenu.vercel.app", pub, priv);
  configured = true;
  return true;
}

/**
 * Envia um alerta para os aparelhos da equipe de salão (garçons, gerentes e dono).
 * Se a mesa pertence a um setor, garçons de outros setores não recebem.
 */
export async function notifyFloor(restaurantId: string, tableId: string | null, payload: { title: string; body: string; tag?: string }) {
  if (!configure()) return;
  const db = createAdminClient();
  const { data: restaurant } = await db.from("restaurants").select("features, plan").eq("id", restaurantId).single();
  if (!resolveFeatures(restaurant?.features, restaurant?.plan).push) return;

  const [{ data: subs }, { data: table }] = await Promise.all([
    db
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth, profile:profiles(role, sector_id, active)")
      .eq("restaurant_id", restaurantId),
    tableId ? db.from("tables").select("sector_id").eq("id", tableId).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const sector = (table as { sector_id: string | null } | null)?.sector_id ?? null;

  type Sub = { id: string; endpoint: string; p256dh: string; auth: string; profile: { role: string; sector_id: string | null; active: boolean } | null };
  const targets = ((subs ?? []) as unknown as Sub[]).filter((s) => {
    const p = s.profile;
    if (!p?.active || p.role === "kitchen") return false;
    if (p.role === "waiter" && sector && p.sector_id && p.sector_id !== sector) return false;
    return true;
  });

  const body = JSON.stringify({ ...payload, url: "/garcom" });
  await Promise.all(
    targets.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, { TTL: 120, urgency: "high" });
      } catch (err) {
        // Assinatura expirada/revogada: remove para não tentar de novo.
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) await db.from("push_subscriptions").delete().eq("id", s.id);
      }
    }),
  );
}

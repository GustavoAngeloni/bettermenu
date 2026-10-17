import { requireStaff } from "@/lib/auth";
import { visibleTo, type LearningItem } from "@/lib/learning";
import { createClient } from "@/lib/supabase/server";
import { LearningCenter } from "./learning-center";

export const metadata = { title: "Aprender" };

export default async function LearnPage() {
  const { profile, restaurant } = await requireStaff(["manager"]);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("learning_items")
    .select("*")
    .eq("published", true)
    .order("pinned", { ascending: false })
    .order("published_at", { ascending: false });
  const items = ((data ?? []) as LearningItem[]).filter((i) => visibleTo(i, profile.role, restaurant.plan));
  const seenAt = (profile as { learning_seen_at?: string | null }).learning_seen_at ?? null;
  return <LearningCenter items={items} seenAt={seenAt} unavailable={!!error} />;
}

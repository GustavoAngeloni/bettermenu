import type { ItemStatus } from "./types";

export const STATUS_CLASS: Record<ItemStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  preparing: "bg-sky-100 text-sky-800",
  ready: "bg-emerald-100 text-emerald-800",
  delivered: "bg-stone-100 text-stone-600",
  cancelled: "bg-red-100 text-red-700 line-through",
};

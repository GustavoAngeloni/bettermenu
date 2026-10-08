"use client";

import { useRouter } from "next/navigation";
import { inputClass } from "@/components/ui";

export function DayPicker({ day }: { day: string }) {
  const router = useRouter();
  return (
    <input
      type="date"
      className={inputClass}
      value={day}
      onChange={(e) => e.target.value && router.push(`/admin/caixa?dia=${e.target.value}`)}
      aria-label="Dia"
    />
  );
}

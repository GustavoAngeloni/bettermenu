"use client";

import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { useEffect, useRef } from "react";
import { createClient } from "./supabase/client";

type LiveTable = "table_sessions" | "guests" | "orders" | "order_items" | "waiter_calls";

export interface LiveEvent {
  table: LiveTable;
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: Record<string, unknown>;
  old: Record<string, unknown>;
}

/**
 * Escuta mudanças do restaurante em tempo real (Supabase Realtime).
 * `onEvent` recebe cada mudança; `onReconnect` é chamado quando a conexão volta,
 * para recarregar tudo (eventos perdidos enquanto estava offline).
 * Há também um recarregamento de segurança a cada 30s.
 */
export function useRestaurantLive(
  restaurantId: string,
  tables: LiveTable[],
  onEvent: (e: LiveEvent) => void,
  onReconnect: () => void,
) {
  const onEventRef = useRef(onEvent);
  const onReconnectRef = useRef(onReconnect);
  useEffect(() => {
    onEventRef.current = onEvent;
    onReconnectRef.current = onReconnect;
  });

  const key = tables.join(",");
  useEffect(() => {
    const supabase = createClient();
    let channel = supabase.channel(`live-${restaurantId}-${key}`);
    for (const table of key.split(",") as LiveTable[]) {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `restaurant_id=eq.${restaurantId}` },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) =>
          onEventRef.current({
            table,
            eventType: payload.eventType,
            new: payload.new as Record<string, unknown>,
            old: payload.old as Record<string, unknown>,
          }),
      );
    }
    channel.subscribe((status: string) => {
      if (status === "SUBSCRIBED") onReconnectRef.current();
    });

    const safety = setInterval(() => onReconnectRef.current(), 30000);
    const onVisible = () => document.visibilityState === "visible" && onReconnectRef.current();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(safety);
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, [restaurantId, key]);
}

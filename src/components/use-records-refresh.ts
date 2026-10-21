"use client";
import { useEffect, useEffectEvent } from "react";
export function useRecordsRefresh(refresh: () => void) {
  const run = useEffectEvent(refresh);
  useEffect(() => { const listener = () => run(); window.addEventListener("ravaal:records-updated", listener); return () => window.removeEventListener("ravaal:records-updated", listener); }, []);
}

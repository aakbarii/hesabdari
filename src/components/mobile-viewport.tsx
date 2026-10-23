"use client";

import { useEffect } from "react";

/** Keep sheets above software keyboards without rerendering the workspace. */
export function MobileViewport() {
  useEffect(() => {
    const viewport = window.visualViewport;
    const root = document.documentElement;
    let frame = 0;
    const update = () => {
      const focused = document.activeElement instanceof HTMLElement && document.activeElement.matches("input, textarea, select, [contenteditable=true]");
      const height = viewport?.height ?? window.innerHeight;
      const delta = Math.max(0, window.innerHeight - height - (viewport?.offsetTop ?? 0));
      const keyboard = focused && delta > 120;
      root.style.setProperty("--app-visible-height", `${height}px`);
      root.style.setProperty("--app-keyboard-offset", `${keyboard ? delta : 0}px`);
      root.toggleAttribute("data-keyboard-open", keyboard);
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(update); };
    update();
    viewport?.addEventListener("resize", schedule);
    viewport?.addEventListener("scroll", schedule);
    window.addEventListener("resize", schedule);
    document.addEventListener("focusin", schedule);
    document.addEventListener("focusout", schedule);
    return () => {
      cancelAnimationFrame(frame);
      viewport?.removeEventListener("resize", schedule);
      viewport?.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      document.removeEventListener("focusin", schedule);
      document.removeEventListener("focusout", schedule);
      root.removeAttribute("data-keyboard-open");
      root.style.removeProperty("--app-visible-height");
      root.style.removeProperty("--app-keyboard-offset");
    };
  }, []);
  return null;
}

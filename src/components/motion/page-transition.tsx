"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function PageTransition({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const pathname = usePathname();
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = root.current;
    if (!element || !("IntersectionObserver" in window)) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const tracked = new Set<HTMLElement>();
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          (entry.target as HTMLElement).dataset.motionState = "shown";
          observer.unobserve(entry.target);
        }
      }
    }, { threshold: 0, rootMargin: "0px 0px 40px 0px" });
    const collect = () => {
      if (preference.matches) return;
      element.querySelectorAll<HTMLElement>('[data-slot="card"]').forEach(card => {
        if (tracked.has(card) || card.parentElement?.closest('[data-slot="card"]')) return;
        tracked.add(card);
        if (card.getBoundingClientRect().top > window.innerHeight + 40) {
          card.dataset.motionState = "pending";
          observer.observe(card);
        }
      });
    };
    const revealAll = () => {
      if (!preference.matches) return;
      observer.disconnect();
      tracked.forEach(card => card.removeAttribute("data-motion-state"));
    };
    collect();
    const mutations = new MutationObserver(collect);
    mutations.observe(element, { childList: true, subtree: true });
    preference.addEventListener("change", revealAll);
    return () => { observer.disconnect(); mutations.disconnect(); preference.removeEventListener("change", revealAll); tracked.forEach(card => card.removeAttribute("data-motion-state")); };
  }, [pathname]);

  return (
    <div ref={root} key={pathname} className={cn("motion-page", className)}>
      {children}
    </div>
  );
}

export function Stagger({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("motion-stagger", className)}>{children}</div>;
}

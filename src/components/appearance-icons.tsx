"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAppearance } from "@/components/appearance-provider";

/** Keep browser/install branding in sync, including head tags replaced by navigation. */
export function AppearanceIcons() {
  const { mood } = useAppearance();
  const pathname = usePathname();
  useEffect(() => {
    if (mood !== "joojo" || pathname === "/install/joojo") return;
    const originals = new Map<HTMLLinkElement, { href: string; type: string | null }>();
    const sync = () => {
      document.head.querySelectorAll<HTMLLinkElement>('link[rel="icon"],link[rel="shortcut icon"],link[rel="apple-touch-icon"],link[rel="manifest"]').forEach(link => {
        if (!originals.has(link)) originals.set(link, { href: link.getAttribute("href") ?? "", type: link.getAttribute("type") });
        const manifest = link.rel === "manifest";
        const size = link.rel === "apple-touch-icon" ? 180 : link.sizes.contains("512x512") ? 512 : link.sizes.contains("192x192") ? 192 : 32;
        const href = manifest ? "/joojo/manifest.json?v=2" : `/joojo/icon-${size}.png?v=2`;
        if (link.getAttribute("href") !== href) link.setAttribute("href", href);
        if (!manifest && link.type !== "image/png") link.type = "image/png";
      });
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.head, { childList: true, subtree: true, attributes: true, attributeFilter: ["href", "type"] });
    return () => {
      observer.disconnect();
      originals.forEach((original, link) => {
        if (!link.isConnected) return;
        link.setAttribute("href", original.href);
        if (original.type === null) link.removeAttribute("type");
        else link.setAttribute("type", original.type);
      });
    };
  }, [mood, pathname]);
  return null;
}

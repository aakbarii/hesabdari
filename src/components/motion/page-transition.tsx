"use client";

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

  return (
    <div key={pathname} className={cn("motion-page", className)}>
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

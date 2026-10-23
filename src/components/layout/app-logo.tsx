"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";


interface AppLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  subtitle?: string;
  href?: string;
  clickable?: boolean;
}

export function AppLogo({
  className,
  size = "md",
  showText = true,
  subtitle,
  href = "/",
  clickable = true,
}: AppLogoProps) {
  const sizeMap = {
    sm: { icon: 28, box: "h-7 w-7", text: "text-sm", sub: "text-[10px]" },
    md: { icon: 36, box: "h-9 w-9", text: "text-base", sub: "text-xs" },
    lg: { icon: 48, box: "h-12 w-12", text: "text-xl", sub: "text-xs" },
    xl: { icon: 64, box: "h-16 w-16", text: "text-2xl", sub: "text-sm" },
  };

  const currentSize = sizeMap[size];

  const content = (
    <div className={cn("inline-flex items-center gap-2.5 select-none", className)}>
      <div
        className={cn(
          "relative flex shrink-0 items-center justify-center rounded-xl overflow-hidden shadow-sm transition-transform duration-200 group-hover:scale-105",
          currentSize.box
        )}
      >
        <Image
          src="/joojo/stella-icon-192.png"
          alt="جوجو"
          width={currentSize.icon}
          height={currentSize.icon}
          className="h-full w-full object-contain drop-shadow"
          priority
        />
      </div>

      {showText && (
        <div className="flex flex-col text-right leading-none">
          <div className="flex items-center gap-1.5">
            <span className={cn("font-semibold tracking-tight text-foreground", currentSize.text)}>
              جوجو
            </span>
          </div>
          {subtitle && <span className={cn("mt-1 text-muted-foreground font-medium truncate", currentSize.sub)}>{subtitle}</span>}
        </div>
      )}
    </div>
  );

  if (clickable && href) {
    return (
      <Link href={href} className="group inline-flex items-center transition-opacity hover:opacity-95">
        {content}
      </Link>
    );
  }

  return content;
}

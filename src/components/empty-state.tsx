"use client";

import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
  className,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn(className)}>
      <CardContent className="py-12 text-center space-y-3">
        {icon ? (
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            {icon}
          </div>
        ) : null}
        <div className="space-y-1">
          <p className="font-medium text-foreground">{title}</p>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actionLabel && onAction ? (
          <Button type="button" onClick={onAction} className="mt-2">
            {actionLabel}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

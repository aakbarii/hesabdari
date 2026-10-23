"use client";
import { useState } from "react";
import { Info, X } from "lucide-react";
import { PLAYBOOKS } from "@/lib/module-playbooks";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent, PopoverTitle } from "@/components/ui/popover";

export function WorkflowGuide({ module }: { module: string }) {
  const guide = PLAYBOOKS[module];
  const [open, setOpen] = useState(false);
  if (!guide) return null;
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger render={<Button variant="ghost" size="icon" className="h-11 w-11 shrink-0 rounded-full text-muted-foreground" />} aria-label="اطلاعات این بخش" title="اطلاعات این بخش"><Info className="h-[18px] w-[18px]" /></PopoverTrigger>
    <PopoverContent side="bottom" align="start" sideOffset={8} className="section-info w-80 max-w-[calc(100vw-24px)] max-h-[min(60dvh,480px)] overflow-y-auto p-4" dir="rtl">
      <div className="flex items-center justify-between gap-2"><PopoverTitle>{guide.title}</PopoverTitle><Button size="icon" variant="ghost" aria-label="بستن توضیحات" className="h-11 w-11 shrink-0" onClick={() => setOpen(false)}><X size={16} /></Button></div>
      <ol className="list-inside list-decimal space-y-3 text-xs leading-7 text-muted-foreground">{guide.steps.map(step => <li key={step}>{step}</li>)}</ol>
      <p className="mt-2 border-t pt-3 text-xs leading-7 text-muted-foreground">{guide.review}</p>
    </PopoverContent>
  </Popover>;
}

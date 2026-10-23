"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { HabitsTab } from "@/components/life/habits-tab";

export default function HabitsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/life?tab=habits");
  }, [router]);

  return (
    <>
      <Header title="عادت‌ها" />
      <div className="p-4 lg:p-8 max-w-3xl mx-auto space-y-6 motion-stagger">
        <HabitsTab />
      </div>
    </>
  );
}

"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { PasswordAccess } from "@/components/password-access";
function LoginContent() {
  const params = useSearchParams(); const from = params.get("from");
  const path = from?.startsWith("/") && !from.startsWith("//") && !from.includes("\\") ? from : "/";
  return <PasswordAccess returnPath={path} />;
}
export default function LoginPage() { return <Suspense fallback={<div className="p-8 text-center">در حال آماده‌سازی ورود…</div>}><LoginContent /></Suspense>; }

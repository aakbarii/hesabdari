"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PasskeyAccess } from "@/components/passkey-access";
function RegisterContent() {
  const params = useSearchParams(); const from = params.get("from");
  const path = from?.startsWith("/") && !from.startsWith("//") && !from.includes("\\") ? from : "/";
  return <PasskeyAccess register returnPath={path} />;
}
export default function RegisterPage() { return <Suspense fallback={<div className="p-8 text-center">در حال آماده‌سازی…</div>}><RegisterContent /></Suspense>; }

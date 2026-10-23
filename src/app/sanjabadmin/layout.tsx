import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-data";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) {
    redirect(admin.status === 401 ? "/login?from=%2Fsanjabadmin" : "/");
  }
  return children;
}

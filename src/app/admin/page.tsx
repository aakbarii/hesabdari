"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toISODate } from "@/lib/format";

type AdminUser = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  totpEnabled: boolean;
  transactionCount: number;
};

type UserDetail = {
  user: AdminUser;
  tables: Record<string, unknown[]>;
};

export default function AdminPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        const isAdmin = Boolean(d.user?.isAdmin);
        setAllowed(isAdmin);
        if (isAdmin) {
          return fetch("/api/admin/users")
            .then((r) => r.json())
            .then((list) => setUsers(list.users ?? []));
        }
      })
      .catch(() => setAllowed(false));
  }, []);

  const openUser = async (id: string) => {
    setSelectedId(id);
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/admin/users/${id}`);
      setDetail(res.ok ? await res.json() : null);
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header title="پنل مدیریت" />
      <div className="p-4 lg:p-8 space-y-6 motion-stagger">
        {allowed === false && (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              این صفحه فقط برای مدیر برنامه قابل دسترس است.
            </CardContent>
          </Card>
        )}

        {allowed && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>کاربران ({users.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {users.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => openUser(u.id)}
                    className={`w-full text-start rounded-lg border p-3 transition-colors hover:bg-muted ${
                      selectedId === u.id ? "bg-muted" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{u.name}</p>
                        <p className="text-xs text-muted-foreground truncate" dir="ltr">{u.email}</p>
                      </div>
                      <div className="text-xs text-muted-foreground text-end shrink-0">
                        <p>{u.transactionCount} تراکنش</p>
                        <p>{toISODate(new Date(u.createdAt))}</p>
                      </div>
                    </div>
                  </button>
                ))}
                {users.length === 0 && (
                  <p className="text-sm text-muted-foreground">کاربری ثبت نشده است.</p>
                )}
              </CardContent>
            </Card>

            {loadingDetail && <p className="text-sm text-muted-foreground">در حال بارگذاری…</p>}

            {detail && !loadingDetail && (
              <Card>
                <CardHeader>
                  <CardTitle>
                    {detail.user.name} <span className="text-xs text-muted-foreground" dir="ltr">{detail.user.email}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(detail.tables).map(([name, rows]) => (
                    <details key={name} className="rounded-lg border p-3">
                      <summary className="cursor-pointer flex items-center justify-between">
                        <span className="font-medium" dir="ltr">{name}</span>
                        <Badge variant="secondary">{rows.length}</Badge>
                      </summary>
                      {rows.length > 0 && (
                        <pre dir="ltr" className="mt-3 max-h-96 overflow-auto rounded-md bg-muted p-3 text-xs">
                          {JSON.stringify(rows, null, 2)}
                        </pre>
                      )}
                    </details>
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}

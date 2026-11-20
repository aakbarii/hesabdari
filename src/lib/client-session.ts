const PUBLIC_PATHS = ["/login", "/register", "/forgot-password", "/reset-password"];

export function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export type ClientSession = "in" | "out" | "error";

let inflight: Promise<ClientSession> | null = null;

/** One shared session check so the shell does not fire several unauthorized API calls. */
export function readSession(): Promise<ClientSession> {
  inflight ??= fetch("/api/auth/me", { cache: "no-store" })
    .then(async (response) => {
      if (response.status === 401) return "out";
      if (!response.ok) return "error";
      const data = await response.json();
      return data.user ? "in" : "out";
    })
    .catch(() => "error" as const)
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

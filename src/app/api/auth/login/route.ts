import { passwordAccess } from "@/lib/password-access";
export const runtime = "nodejs";
export function POST(request: Request) {
  return passwordAccess(request, false);
}

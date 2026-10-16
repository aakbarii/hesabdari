import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import {
  ensureDb,
  getUserById,
  updateUserProfile,
} from "@/lib/db/queries";
import { requireUserId } from "@/lib/api-auth";

const schema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  currentPassword: z.string().min(1).optional(),
  newPassword: z.string().min(6).optional(),
});

export async function GET() {
  ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  const user = getUserById(auth);
  if (!user) {
    return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 });
  }

  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
  });
}

export async function PATCH(request: Request) {
  ensureDb();
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "داده نامعتبر" }, { status: 400 });
  }

  const user = getUserById(auth);
  if (!user) {
    return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 });
  }

  const { name, email, currentPassword, newPassword } = parsed.data;

  if (newPassword) {
    if (!currentPassword) {
      return NextResponse.json(
        { error: "رمز فعلی را وارد کنید" },
        { status: 400 }
      );
    }
    if (!user.passwordHash) {
      return NextResponse.json({ error: "رمز تنظیم نشده" }, { status: 400 });
    }
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "رمز فعلی اشتباه است" }, { status: 400 });
    }
  }

  const passwordHash = newPassword
    ? await bcrypt.hash(newPassword, 10)
    : undefined;

  const result = updateUserProfile(auth, {
    name,
    email,
    passwordHash,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    user: {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
    },
  });
}

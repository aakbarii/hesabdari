import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { vehicleServices } from "@/lib/db/schema";
import { requireUserId } from "@/lib/api-auth";
import { nanoid } from "@/lib/db/nanoid";
import { eq, desc } from "drizzle-orm";

const serviceSchema = z.object({
  vehicleName: z.string().min(1, "نام خودرو الزامی است"),
  serviceType: z.enum(["oil_change", "filter", "brake_pads", "insurance", "inspection", "tires", "other"]),
  currentMileage: z.number().nonnegative().default(0),
  nextDueMileage: z.number().optional().nullable(),
  serviceDate: z.string(),
  nextDueDate: z.string().optional().nullable(),
  cost: z.number().nonnegative().default(0),
  notes: z.string().optional().nullable(),
});

export async function GET(request: Request) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  const services = db
    .select()
    .from(vehicleServices)
    .where(eq(vehicleServices.userId, auth))
    .orderBy(desc(vehicleServices.serviceDate))
    .all();

  return NextResponse.json({ services });
}

export async function POST(request: Request) {
  const auth = await requireUserId();
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const parsed = serviceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "اطلاعات سرویس نامعتبر است" }, { status: 400 });
  }

  const id = nanoid();
  db.insert(vehicleServices)
    .values({
      id,
      userId: auth,
      vehicleName: parsed.data.vehicleName,
      serviceType: parsed.data.serviceType,
      currentMileage: parsed.data.currentMileage,
      nextDueMileage: parsed.data.nextDueMileage ?? null,
      serviceDate: parsed.data.serviceDate,
      nextDueDate: parsed.data.nextDueDate ?? null,
      cost: parsed.data.cost,
      notes: parsed.data.notes ?? null,
    })
    .run();

  return NextResponse.json({ success: true, id });
}

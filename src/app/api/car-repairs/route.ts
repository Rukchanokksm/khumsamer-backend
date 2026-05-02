import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

const REPAIR_TYPES = [
  "oil_change", "tire", "brake", "battery", "filter",
  "inspection", "body_repair", "electrical", "ac", "wash", "other",
] as const;

const createSchema = z.object({
  carName: z.string().min(1).max(200),
  licensePlate: z.string().min(1).max(20),
  repairType: z.enum(REPAIR_TYPES),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  cost: z.number().nonnegative(),
  description: z.string().min(1).max(500),
  notes: z.string().max(1000).optional(),
  garageId: z.string().cuid().optional().nullable(),
});

function serialize(r: {
  id: string; carName: string; licensePlate: string;
  repairType: string; date: Date; cost: number; description: string;
  notes: string | null; garageId: string | null;
  receiptUrl: string | null; receiptPath: string | null;
  createdAt: Date; updatedAt: Date;
  Garage?: { id: string; name: string; mapsUrl: string | null; phones: unknown } | null;
}) {
  return {
    id: r.id,
    carName: r.carName,
    licensePlate: r.licensePlate,
    repairType: r.repairType,
    date: r.date.toISOString().slice(0, 10),
    cost: r.cost,
    description: r.description,
    notes: r.notes ?? undefined,
    garageId: r.garageId ?? undefined,
    garage: r.Garage ? {
      id: r.Garage.id,
      name: r.Garage.name,
      mapsUrl: r.Garage.mapsUrl ?? undefined,
      phones: Array.isArray(r.Garage.phones) ? (r.Garage.phones as string[]) : [],
    } : undefined,
    receiptUrl: r.receiptUrl ?? undefined,
    receiptPath: r.receiptPath ?? undefined,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const repairs = await prisma.carRepair.findMany({
    where: { userId },
    include: { Garage: true },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ repairs: repairs.map(serialize) });
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const d = parsed.data;

  // verify garage belongs to user
  if (d.garageId) {
    const garage = await prisma.garage.findUnique({ where: { id: d.garageId } });
    if (!garage || garage.userId !== userId) {
      return NextResponse.json({ error: "Garage not found" }, { status: 404 });
    }
  }

  const repair = await prisma.carRepair.create({
    data: {
      userId,
      carName: d.carName,
      licensePlate: d.licensePlate,
      repairType: d.repairType,
      date: new Date(`${d.date}T00:00:00.000Z`),
      cost: d.cost,
      description: d.description,
      notes: d.notes,
      garageId: d.garageId ?? null,
    },
    include: { Garage: true },
  });
  return NextResponse.json({ repair: serialize(repair) }, { status: 201 });
}

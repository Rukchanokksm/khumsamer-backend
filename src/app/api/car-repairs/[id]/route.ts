import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { IMAGE_BUCKET, supabaseAdmin } from "@/lib/supabase";

const REPAIR_TYPES = [
  "oil_change", "tire", "brake", "battery", "filter",
  "inspection", "body_repair", "electrical", "ac", "transmission", "wash", "other",
] as const;

const updateSchema = z.object({
  carName: z.string().min(1).max(200).optional(),
  licensePlate: z.string().min(1).max(20).optional(),
  repairType: z.enum(REPAIR_TYPES).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  cost: z.number().nonnegative().optional(),
  description: z.string().min(1).max(500).optional(),
  notes: z.string().max(1000).nullable().optional(),
  garageId: z.string().cuid().nullable().optional(),
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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.carRepair.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const json = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const d = parsed.data;
  if (d.garageId) {
    const garage = await prisma.garage.findUnique({ where: { id: d.garageId } });
    if (!garage || garage.userId !== userId) {
      return NextResponse.json({ error: "Garage not found" }, { status: 404 });
    }
  }

  const repair = await prisma.carRepair.update({
    where: { id },
    data: {
      ...(d.carName !== undefined && { carName: d.carName }),
      ...(d.licensePlate !== undefined && { licensePlate: d.licensePlate }),
      ...(d.repairType !== undefined && { repairType: d.repairType }),
      ...(d.date !== undefined && { date: new Date(`${d.date}T00:00:00.000Z`) }),
      ...(d.cost !== undefined && { cost: d.cost }),
      ...(d.description !== undefined && { description: d.description }),
      ...(d.notes !== undefined && { notes: d.notes }),
      ...(d.garageId !== undefined && { garageId: d.garageId }),
    },
    include: { Garage: true },
  });
  return NextResponse.json({ repair: serialize(repair) });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const repair = await prisma.carRepair.findUnique({ where: { id } });
  if (!repair || repair.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (repair.receiptPath) {
    await supabaseAdmin.storage.from(IMAGE_BUCKET).remove([repair.receiptPath]);
  }

  await prisma.carRepair.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

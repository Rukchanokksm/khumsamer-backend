import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

const updateSchema = z.object({
  tripName: z.string().min(1).max(100).optional(),
  carName: z.string().min(1).max(100).optional(),
  licensePlate: z.string().min(1).max(20).optional(),
  category: z
    .enum(["fuel", "toll", "parking", "accommodation", "food", "ferry", "other"])
    .optional(),
  amount: z.number().nonnegative().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  description: z.string().min(1).max(500).optional(),
  liters: z.number().nonnegative().nullable().optional(),
  pricePerLiter: z.number().nonnegative().nullable().optional(),
  distance: z.number().nonnegative().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

function serialize(e: {
  id: string; tripName: string; carName: string; licensePlate: string; category: string;
  amount: number; date: Date; description: string; liters: number | null;
  pricePerLiter: number | null; distance: number | null; notes: string | null;
  createdAt: Date; updatedAt: Date;
}) {
  return {
    id: e.id, tripName: e.tripName, carName: e.carName, licensePlate: e.licensePlate,
    category: e.category, amount: e.amount, date: e.date.toISOString().slice(0, 10),
    description: e.description, liters: e.liters ?? undefined, pricePerLiter: e.pricePerLiter ?? undefined,
    distance: e.distance ?? undefined, notes: e.notes ?? undefined,
    createdAt: e.createdAt.toISOString(), updatedAt: e.updatedAt.toISOString(),
  };
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const expense = await prisma.travelExpense.findUnique({ where: { id } });
  if (!expense || expense.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const json = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const { date, ...rest } = parsed.data;
  const updated = await prisma.travelExpense.update({
    where: { id },
    data: { ...rest, ...(date ? { date: new Date(`${date}T00:00:00.000Z`) } : {}) },
  });

  return NextResponse.json({ expense: serialize(updated) });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const expense = await prisma.travelExpense.findUnique({ where: { id } });
  if (!expense || expense.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.travelExpense.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

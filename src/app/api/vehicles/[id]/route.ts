import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

const updateSchema = z.object({
  brand: z.string().min(1).max(100).optional(),
  model: z.string().min(1).max(100).optional(),
  licensePlate: z.string().min(1).max(20).optional(),
  type: z.enum(["sedan", "pickup", "ppv", "suv", "hatchback", "other"]).nullable().optional(),
  color: z.string().max(50).nullable().optional(),
  condition: z.enum(["new", "used"]).nullable().optional(),
  purchaseDate: z.number().int().positive().nullable().optional(),
});

function serialize(v: Awaited<ReturnType<typeof prisma.vehicle.findUnique>> & object) {
  return {
    ...v,
    type: v.type ?? undefined,
    color: v.color ?? undefined,
    condition: v.condition ?? undefined,
    purchaseDate: v.purchaseDate ? Math.floor(v.purchaseDate.getTime() / 1000) : undefined,
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
  };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const vehicle = await prisma.vehicle.findUnique({ where: { id } });
  if (!vehicle || vehicle.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ vehicle: serialize(vehicle) });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const vehicle = await prisma.vehicle.findUnique({ where: { id } });
  if (!vehicle || vehicle.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { purchaseDate, ...rest } = parsed.data;
  const updated = await prisma.vehicle.update({
    where: { id },
    data: {
      ...rest,
      ...(purchaseDate !== undefined
        ? { purchaseDate: purchaseDate ? new Date(purchaseDate * 1000) : null }
        : {}),
    },
  });

  return NextResponse.json({ vehicle: serialize(updated) });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const vehicle = await prisma.vehicle.findUnique({ where: { id } });
  if (!vehicle || vehicle.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.vehicle.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

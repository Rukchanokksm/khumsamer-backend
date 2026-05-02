import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  mapsUrl: z.string().url().optional().or(z.literal("")).nullable(),
  serviceType: z.enum(["self", "full_service"]).optional(),
});

function serialize(p: {
  id: string; name: string; mapsUrl: string | null;
  serviceType: string; createdAt: Date; updatedAt: Date;
}) {
  return {
    id: p.id,
    name: p.name,
    mapsUrl: p.mapsUrl ?? undefined,
    serviceType: p.serviceType,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.carWashPlace.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const json = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const place = await prisma.carWashPlace.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.mapsUrl !== undefined && { mapsUrl: data.mapsUrl || null }),
      ...(data.serviceType !== undefined && { serviceType: data.serviceType }),
    },
  });
  return NextResponse.json({ place: serialize(place) });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.carWashPlace.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.carWashPlace.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

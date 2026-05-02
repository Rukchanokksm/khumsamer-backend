import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  mapsUrl: z.string().url().optional().or(z.literal("")).nullable(),
  phones: z.array(z.string().max(20)).max(10).optional(),
});

function serialize(g: {
  id: string; name: string; mapsUrl: string | null;
  phones: unknown; createdAt: Date; updatedAt: Date;
}) {
  return {
    id: g.id,
    name: g.name,
    mapsUrl: g.mapsUrl ?? undefined,
    phones: Array.isArray(g.phones) ? (g.phones as string[]) : [],
    createdAt: g.createdAt.toISOString(),
    updatedAt: g.updatedAt.toISOString(),
  };
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.garage.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const json = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const garage = await prisma.garage.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.mapsUrl !== undefined && { mapsUrl: data.mapsUrl || null }),
      ...(data.phones !== undefined && { phones: data.phones }),
    },
  });
  return NextResponse.json({ garage: serialize(garage) });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.garage.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.garage.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

const createSchema = z.object({
  name: z.string().min(1).max(200),
  mapsUrl: z.string().url().optional().or(z.literal("")),
  phones: z.array(z.string().max(20)).max(10).default([]),
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

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const garages = await prisma.garage.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ garages: garages.map(serialize) });
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const { name, mapsUrl, phones } = parsed.data;
  const garage = await prisma.garage.create({
    data: { userId, name, mapsUrl: mapsUrl || null, phones },
  });
  return NextResponse.json({ garage: serialize(garage) }, { status: 201 });
}

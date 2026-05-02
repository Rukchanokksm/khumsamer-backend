import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

const createSchema = z.object({
  name: z.string().min(1).max(200),
  mapsUrl: z.string().url().optional().or(z.literal("")),
  serviceType: z.enum(["self", "full_service"]).default("full_service"),
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

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const places = await prisma.carWashPlace.findMany({
    where: { userId },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ places: places.map(serialize) });
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const { name, mapsUrl, serviceType } = parsed.data;
  const place = await prisma.carWashPlace.create({
    data: { userId, name, mapsUrl: mapsUrl || null, serviceType },
  });
  return NextResponse.json({ place: serialize(place) }, { status: 201 });
}

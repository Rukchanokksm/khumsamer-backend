import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

const createSchema = z.object({
  brand: z.string().min(1).max(100),
  model: z.string().min(1).max(100),
  licensePlate: z.string().min(1).max(20),
  type: z.enum(["sedan", "pickup", "ppv", "suv", "hatchback", "other"]).optional(),
  color: z.string().max(50).optional(),
  condition: z.enum(["new", "used"]).optional(),
  purchaseDate: z.number().int().positive().optional(), // Unix timestamp (seconds)
});

function serialize(v: {
  id: string;
  brand: string;
  model: string;
  licensePlate: string;
  type: string | null;
  color: string | null;
  condition: string | null;
  purchaseDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: v.id,
    brand: v.brand,
    model: v.model,
    licensePlate: v.licensePlate,
    type: v.type ?? undefined,
    color: v.color ?? undefined,
    condition: v.condition ?? undefined,
    purchaseDate: v.purchaseDate
      ? Math.floor(v.purchaseDate.getTime() / 1000)
      : undefined,
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
  };
}

export async function GET() {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const vehicles = await prisma.vehicle.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ vehicles: vehicles.map(serialize) });
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { brand, model, licensePlate, type, color, condition, purchaseDate } =
    parsed.data;

  const vehicle = await prisma.vehicle.create({
    data: {
      userId,
      brand,
      model,
      licensePlate,
      type,
      color,
      condition,
      purchaseDate: purchaseDate
        ? new Date(purchaseDate * 1000)
        : undefined,
    },
  });

  return NextResponse.json({ vehicle: serialize(vehicle) }, { status: 201 });
}

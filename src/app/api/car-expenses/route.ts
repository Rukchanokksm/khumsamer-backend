import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

const createSchema = z.object({
  carName: z.string().min(1).max(100),
  licensePlate: z.string().min(1).max(20),
  category: z.enum([
    "fuel",
    "parking",
    "toll",
    "insurance",
    "tax",
    "wash",
    "accessories",
    "other",
  ]),
  amount: z.number().nonnegative(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD"),
  description: z.string().min(1).max(500),
  liters: z.number().nonnegative().optional(),
  pricePerLiter: z.number().nonnegative().optional(),
  notes: z.string().max(1000).optional(),
});

function serialize(e: {
  id: string;
  carName: string;
  licensePlate: string;
  category: string;
  amount: number;
  date: Date;
  description: string;
  liters: number | null;
  pricePerLiter: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: e.id,
    carName: e.carName,
    licensePlate: e.licensePlate,
    category: e.category,
    amount: e.amount,
    date: e.date.toISOString().slice(0, 10),
    description: e.description,
    liters: e.liters ?? undefined,
    pricePerLiter: e.pricePerLiter ?? undefined,
    notes: e.notes ?? undefined,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

export async function GET() {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const expenses = await prisma.carExpense.findMany({
    where: { userId },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ expenses: expenses.map(serialize) });
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

  const expense = await prisma.carExpense.create({
    data: {
      userId,
      carName: parsed.data.carName,
      licensePlate: parsed.data.licensePlate,
      category: parsed.data.category,
      amount: parsed.data.amount,
      date: new Date(`${parsed.data.date}T00:00:00.000Z`),
      description: parsed.data.description,
      liters: parsed.data.liters,
      pricePerLiter: parsed.data.pricePerLiter,
      notes: parsed.data.notes,
    },
  });

  return NextResponse.json({ expense: serialize(expense) }, { status: 201 });
}

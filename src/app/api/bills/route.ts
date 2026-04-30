import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

const createSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.enum([
    "water", "electricity", "rent", "food",
    "car_installment", "item_installment",
    "internet", "mobile", "insurance", "other",
  ]),
  amount: z.number().nonnegative(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD"),
  isInstallment: z.boolean().optional(),
  installmentNo: z.number().int().positive().optional(),
  totalInstallments: z.number().int().positive().optional(),
  notes: z.string().max(1000).optional(),
});

function computeStatus(bill: { status: string; dueDate: Date }): "pending" | "paid" | "overdue" {
  if (bill.status === "paid") return "paid";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return bill.dueDate < today ? "overdue" : "pending";
}

function serialize(b: {
  id: string;
  name: string;
  category: string;
  amount: number;
  dueDate: Date;
  paidDate: Date | null;
  status: string;
  isInstallment: boolean;
  installmentNo: number | null;
  totalInstallments: number | null;
  notes: string | null;
  receiptUrl: string | null;
  receiptPath: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: b.id,
    name: b.name,
    category: b.category,
    amount: b.amount,
    dueDate: b.dueDate.toISOString().slice(0, 10),
    paidDate: b.paidDate ? b.paidDate.toISOString().slice(0, 10) : undefined,
    status: computeStatus(b),
    isInstallment: b.isInstallment,
    installmentNo: b.installmentNo ?? undefined,
    totalInstallments: b.totalInstallments ?? undefined,
    notes: b.notes ?? undefined,
    receiptUrl: b.receiptUrl ?? undefined,
    receiptPath: b.receiptPath ?? undefined,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  };
}

export async function GET() {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bills = await prisma.bill.findMany({
    where: { userId },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ bills: bills.map(serialize) });
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

  const bill = await prisma.bill.create({
    data: {
      userId,
      name: parsed.data.name,
      category: parsed.data.category,
      amount: parsed.data.amount,
      dueDate: new Date(`${parsed.data.dueDate}T00:00:00.000Z`),
      isInstallment: parsed.data.isInstallment ?? false,
      installmentNo: parsed.data.installmentNo,
      totalInstallments: parsed.data.totalInstallments,
      notes: parsed.data.notes,
    },
  });

  return NextResponse.json({ bill: serialize(bill) }, { status: 201 });
}

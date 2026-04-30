import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { IMAGE_BUCKET, supabaseAdmin } from "@/lib/supabase";

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  category: z.enum([
    "water", "electricity", "rent", "food",
    "car_installment", "item_installment",
    "internet", "mobile", "insurance", "other",
  ]).optional(),
  amount: z.number().nonnegative().optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(["pending", "paid"]).optional(),
  paidDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  isInstallment: z.boolean().optional(),
  installmentNo: z.number().int().positive().nullable().optional(),
  totalInstallments: z.number().int().positive().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.bill.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const json = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const isMarkingPaid = data.status === "paid" && existing.status !== "paid";

  const bill = await prisma.bill.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.amount !== undefined && { amount: data.amount }),
      ...(data.dueDate !== undefined && { dueDate: new Date(`${data.dueDate}T00:00:00.000Z`) }),
      ...(data.status !== undefined && { status: data.status }),
      ...(isMarkingPaid && !data.paidDate && { paidDate: new Date() }),
      ...(data.paidDate !== undefined && {
        paidDate: data.paidDate ? new Date(`${data.paidDate}T00:00:00.000Z`) : null,
      }),
      ...(data.isInstallment !== undefined && { isInstallment: data.isInstallment }),
      ...(data.installmentNo !== undefined && { installmentNo: data.installmentNo }),
      ...(data.totalInstallments !== undefined && { totalInstallments: data.totalInstallments }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
  });

  return NextResponse.json({ bill: serialize(bill) });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const bill = await prisma.bill.findUnique({ where: { id } });
  if (!bill || bill.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (bill.receiptPath) {
    await supabaseAdmin.storage.from(IMAGE_BUCKET).remove([bill.receiptPath]);
  }

  await prisma.bill.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

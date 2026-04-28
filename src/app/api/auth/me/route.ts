import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  accessKey: true,
} as const;

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: USER_SELECT });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ user });
}

const patchSchema = z.object({
  name: z.string().min(1).max(100).trim(),
});

export async function PATCH(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "ชื่อไม่ถูกต้อง" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { name: parsed.data.name, updatedAt: new Date() },
    select: USER_SELECT,
  });

  return NextResponse.json({ user });
}

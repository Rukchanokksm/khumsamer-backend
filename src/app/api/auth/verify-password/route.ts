import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.password || typeof body.password !== "string") {
    return NextResponse.json({ ok: false, error: "Missing password" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.hashedPassword) {
    return NextResponse.json({ ok: false });
  }

  const ok = await bcrypt.compare(body.password, user.hashedPassword);
  return NextResponse.json({ ok });
}

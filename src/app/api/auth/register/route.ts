import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1).max(100),
});

const KEY_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function generateAccessKey(): string {
  let result = "";
  for (let i = 0; i < 32; i++) {
    result += KEY_CHARS[Math.floor(Math.random() * KEY_CHARS.length)];
  }
  return `fh_${result}`;
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const userCount = await prisma.user.count();
  const role = userCount === 0 ? "admin" : "user";

  const hashedPassword = await bcrypt.hash(parsed.data.password, 12);
  const now = new Date();
  const user = await prisma.user.create({
    data: {
      id: randomUUID(),
      email,
      hashedPassword,
      name: parsed.data.name,
      role,
      accessKey: generateAccessKey(),
      updatedAt: now,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      accessKey: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ user }, { status: 201 });
}

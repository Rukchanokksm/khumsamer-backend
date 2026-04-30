import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { IMAGE_BUCKET, supabaseAdmin } from "@/lib/supabase";
import { requireUserId } from "@/lib/session";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME = new Set([
  "image/jpeg", "image/png", "image/webp",
  "application/pdf",
]);

export async function POST(
  req: Request,
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

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const file = form.get("receipt");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing receipt field" }, { status: 400 });
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      { error: `Unsupported file type: ${file.type}. Use JPEG, PNG, WebP, or PDF.` },
      { status: 415 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 413 });
  }

  // Delete old receipt if exists
  if (bill.receiptPath) {
    await supabaseAdmin.storage.from(IMAGE_BUCKET).remove([bill.receiptPath]);
  }

  const ext = file.type === "application/pdf" ? "pdf" : (file.name.split(".").pop()?.toLowerCase() ?? "bin");
  const path = `bills/${userId}/${id}/${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const upload = await supabaseAdmin.storage
    .from(IMAGE_BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: false });

  if (upload.error) {
    return NextResponse.json(
      { error: "Upload failed", details: upload.error.message },
      { status: 502 },
    );
  }

  const { data: publicData } = supabaseAdmin.storage.from(IMAGE_BUCKET).getPublicUrl(path);

  const updated = await prisma.bill.update({
    where: { id },
    data: { receiptUrl: publicData.publicUrl, receiptPath: path },
  });

  return NextResponse.json({
    receiptUrl: updated.receiptUrl,
    receiptPath: updated.receiptPath,
  });
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
  if (!bill.receiptPath) {
    return NextResponse.json({ error: "No receipt attached" }, { status: 404 });
  }

  await supabaseAdmin.storage.from(IMAGE_BUCKET).remove([bill.receiptPath]);

  await prisma.bill.update({
    where: { id },
    data: { receiptUrl: null, receiptPath: null },
  });

  return NextResponse.json({ ok: true });
}

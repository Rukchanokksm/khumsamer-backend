import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { IMAGE_BUCKET, supabaseAdmin } from "@/lib/supabase";
import { requireUserId } from "@/lib/session";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const file = form.get("file");
  const caption = form.get("caption");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file field" }, { status: 400 });
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json({ error: `Unsupported mime: ${file.type}` }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 413 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const path = `${userId}/${randomUUID()}.${ext}`;
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

  const image = await prisma.image.create({
    data: {
      id: randomUUID(),
      userId,
      bucket: IMAGE_BUCKET,
      path,
      publicUrl: publicData.publicUrl,
      mimeType: file.type,
      sizeBytes: file.size,
      caption: typeof caption === "string" && caption.length > 0 ? caption : null,
    },
  });

  return NextResponse.json({ image }, { status: 201 });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { IMAGE_BUCKET, supabaseAdmin } from "@/lib/supabase";
import { requireUserId } from "@/lib/session";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const image = await prisma.image.findUnique({ where: { id } });
  if (!image || image.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const removal = await supabaseAdmin.storage.from(IMAGE_BUCKET).remove([image.path]);
  if (removal.error) {
    return NextResponse.json(
      { error: "Storage removal failed", details: removal.error.message },
      { status: 502 },
    );
  }

  await prisma.image.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

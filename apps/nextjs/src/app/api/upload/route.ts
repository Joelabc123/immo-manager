import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { getSessionFromCookies } from "@/server/auth/session";
import { db } from "@repo/shared/db";
import { documents, users } from "@repo/shared/db/schema";
import { eq } from "drizzle-orm";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
]);

const AVATAR_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const uploadType = formData.get("uploadType") as string | null;
  const propertyId = formData.get("propertyId") as string | null;
  const category = formData.get("category") as string | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const userId = session.user.id;
  const ext = path.extname(file.name) || ".jpg";
  const sanitizedExt = ext.replace(/[^a-zA-Z0-9.]/g, "");

  // Avatar upload
  if (uploadType === "avatar") {
    if (!AVATAR_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Only image files are allowed for avatars" },
        { status: 400 },
      );
    }

    if (file.size > MAX_AVATAR_SIZE) {
      return NextResponse.json(
        { error: "Avatar exceeds 5 MB limit" },
        { status: 400 },
      );
    }

    const filename = `avatar${sanitizedExt}`;
    const uploadDir = path.join(process.cwd(), "uploads", userId);
    await mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, filename);
    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    const relativePath = `${userId}/${filename}`;
    await db
      .update(users)
      .set({ avatarUrl: relativePath, updatedAt: new Date() })
      .where(eq(users.id, userId));

    return NextResponse.json({ path: relativePath });
  }

  if (!propertyId) {
    return NextResponse.json(
      { error: "propertyId is required" },
      { status: 400 },
    );
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "File type not allowed" },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File exceeds 25 MB limit" },
      { status: 400 },
    );
  }

  const bytes = await file.arrayBuffer();

  // Legacy thumbnail upload (no category)
  if (!category) {
    const filename = `thumbnail${sanitizedExt}`;
    const uploadDir = path.join(process.cwd(), "uploads", userId, propertyId);
    await mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, filename);
    await writeFile(filePath, Buffer.from(bytes));

    const relativePath = `${userId}/${propertyId}/${filename}`;
    return NextResponse.json({ path: relativePath });
  }

  // Document upload with category
  const fileId = crypto.randomUUID();
  const filename = `${fileId}${sanitizedExt}`;
  const uploadDir = path.join(
    process.cwd(),
    "uploads",
    userId,
    propertyId,
    category,
  );
  await mkdir(uploadDir, { recursive: true });

  const filePath = path.join(uploadDir, filename);
  await writeFile(filePath, Buffer.from(bytes));

  const relativePath = `${userId}/${propertyId}/${category}/${filename}`;
  const originalName = (formData.get("fileName") as string | null) || file.name;

  const [doc] = await db
    .insert(documents)
    .values({
      userId,
      propertyId,
      category,
      fileName: originalName,
      filePath: relativePath,
      fileSize: file.size,
      mimeType: file.type,
    })
    .returning();

  return NextResponse.json({ path: relativePath, documentId: doc.id });
}

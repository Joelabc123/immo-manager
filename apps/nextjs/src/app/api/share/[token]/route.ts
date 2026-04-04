import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import pathModule from "path";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@repo/shared/db";
import { shareLinks, properties } from "@repo/shared/db/schema";

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const { token } = await params;

  // Validate token and get property
  const [link] = await db
    .select({
      propertyId: shareLinks.propertyId,
      userId: shareLinks.userId,
    })
    .from(shareLinks)
    .where(
      and(eq(shareLinks.token, token), gt(shareLinks.expiresAt, new Date())),
    )
    .limit(1);

  if (!link) {
    return NextResponse.json(
      { error: "Invalid or expired link" },
      { status: 404 },
    );
  }

  // Get thumbnail path
  const [property] = await db
    .select({ thumbnailPath: properties.thumbnailPath })
    .from(properties)
    .where(eq(properties.id, link.propertyId))
    .limit(1);

  if (!property?.thumbnailPath) {
    return NextResponse.json({ error: "No thumbnail" }, { status: 404 });
  }

  // Validate path segments to prevent directory traversal
  const segments = property.thumbnailPath.split("/");
  for (const segment of segments) {
    if (segment.includes("..") || segment.includes("~")) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }
  }

  const filePath = pathModule.join(
    process.cwd(),
    "uploads",
    property.thumbnailPath,
  );

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const ext = pathModule.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] ?? "application/octet-stream";

    const fileBuffer = await readFile(filePath);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

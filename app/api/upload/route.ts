import { NextRequest } from "next/server";
import { writeFile } from "fs/promises";
import { mkdir } from "fs/promises";
import { join } from "path";
import { requireRole } from "@/lib/rbac";
import { ok, fail } from "@/lib/response";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req: NextRequest) {
  const auth = requireRole(req, ["ADMIN"] as any);
  if ("body" in auth) return auth;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return fail("No file provided", 400);
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return fail("Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.", 400);
    }

    if (file.size > MAX_SIZE) {
      return fail("File too large. Max size is 5MB.", 400);
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    const filename = `${timestamp}-${random}.${ext}`;

    const uploadsDir = join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });

    const filePath = join(uploadsDir, filename);
    await writeFile(filePath, buffer);

    return ok({ url: `/uploads/${filename}` });
  } catch (error) {
    console.error("Upload error:", error);
    return fail("Failed to upload file", 500);
  }
}

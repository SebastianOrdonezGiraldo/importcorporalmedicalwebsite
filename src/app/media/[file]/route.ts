import fs from "node:fs/promises";
import path from "node:path";
import { UPLOAD_DIR } from "@/lib/db";
import { isSafeName } from "@/lib/uploads";

const TYPES: Record<string, string> = {
  ".webp": "image/webp", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".gif": "image/gif", ".avif": "image/avif",
};

/** Serves catalog photos uploaded from the admin (stored outside /public so they survive redeploys). */
export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const type = TYPES[path.extname(file).toLowerCase()];
  if (!isSafeName(file) || !type) return new Response("Not found", { status: 404 });
  try {
    const buf = await fs.readFile(path.join(UPLOAD_DIR, file));
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

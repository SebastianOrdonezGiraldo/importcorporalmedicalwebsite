import { isSafeName } from "@/lib/storage";
import { serveImage } from "@/lib/serve-image";

/** Stable media URLs work with local files and private R2 objects. */
export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (!isSafeName(file)) return new Response("Not found", { status: 404 });
  return serveImage(`media/${file}`);
}

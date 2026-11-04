import { serveImage } from "@/lib/serve-image";

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return serveImage(`assets/${(await params).path.join("/")}`);
}

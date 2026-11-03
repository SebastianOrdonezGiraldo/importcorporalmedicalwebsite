import { notFound } from "next/navigation";
import { getCategory } from "@/lib/db";
import { mediaUrl } from "@/lib/site";
import CategoryForm from "../../../ui/CategoryForm";

export default async function EditLine({ params }: { params: Promise<{ id: string }> }) {
  const c = getCategory({ id: Number((await params).id) });
  if (!c) notFound();
  return (
    <>
      <div className="adm-head"><div><a className="adm-link" href="/admin/lineas">← Líneas</a><h1>{c.name}</h1></div></div>
      <CategoryForm category={{ ...c, imageUrl: c.image ? mediaUrl(c.image) : null }} />
    </>
  );
}

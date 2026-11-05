import { requireAdmin } from "@/lib/auth";
import CategoryForm from "../../../ui/CategoryForm";

export default async function NewLine() {
  await requireAdmin();
  return (
    <>
      <div className="adm-head"><div><a className="adm-link" href="/admin/lineas">← Líneas</a><h1>Nueva línea</h1></div></div>
      <CategoryForm category={null} />
    </>
  );
}

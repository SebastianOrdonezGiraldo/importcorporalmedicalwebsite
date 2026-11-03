import CategoryForm from "../../../ui/CategoryForm";

export default function NewLine() {
  return (
    <>
      <div className="adm-head"><div><a className="adm-link" href="/admin/lineas">← Líneas</a><h1>Nueva línea</h1></div></div>
      <CategoryForm category={null} />
    </>
  );
}

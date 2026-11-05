export default function Loading() {
  return (
    <div className="wrap page-loading" role="status" aria-live="polite">
      <p>Cargando contenido…</p>
      <div className="loading-placeholder" aria-hidden="true" />
    </div>
  );
}

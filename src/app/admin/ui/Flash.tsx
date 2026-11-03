export default function Flash({ ok }: { ok?: string }) {
  if (!ok) return null;
  return <p className="adm-alert ok" role="status">{ok.slice(0, 200)}</p>;
}

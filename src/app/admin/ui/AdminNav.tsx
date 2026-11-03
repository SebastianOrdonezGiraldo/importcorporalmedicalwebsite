"use client";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin/productos", label: "Productos" },
  { href: "/admin/lineas", label: "Líneas" },
];

export default function AdminNav() {
  const path = usePathname();
  return (
    <nav className="adm-nav" aria-label="Administración">
      {LINKS.map((l) => (
        <a key={l.href} href={l.href} aria-current={path.startsWith(l.href) ? "page" : undefined}>{l.label}</a>
      ))}
    </nav>
  );
}

import type { Metadata } from "next";
import "./admin.css";

export const metadata: Metadata = { title: "Administración", robots: { index: false, follow: false } };

export default function AdminRoot({ children }: { children: React.ReactNode }) {
  return <div className="adm">{children}</div>;
}

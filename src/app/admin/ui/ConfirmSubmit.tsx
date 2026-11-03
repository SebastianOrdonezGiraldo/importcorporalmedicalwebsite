"use client";

/** Submit button that asks for confirmation first (used for deletes). */
export default function ConfirmSubmit({ message, children, className }: { message: string; children: React.ReactNode; className?: string }) {
  return (
    <button type="submit" className={className} onClick={(e) => { if (!confirm(message)) e.preventDefault(); }}>
      {children}
    </button>
  );
}

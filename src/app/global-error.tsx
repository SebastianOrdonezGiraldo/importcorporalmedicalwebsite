"use client";

import ErrorNotice from "@/components/ErrorNotice";

export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="es">
      <head><title>No pudimos cargar el sitio · Import Corporal Medical</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{":focus-visible { outline: 3px solid #4f7f1f; outline-offset: 4px; }"}</style>
      </head>
      <body style={{ margin: 0, background: "#fff" }}><main id="main-content" tabIndex={-1}><ErrorNotice retry={retry} /></main></body>
    </html>
  );
}

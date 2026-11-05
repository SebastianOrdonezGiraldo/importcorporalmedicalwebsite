"use client";

import ErrorNotice from "@/components/ErrorNotice";

export default function AppError({ retry }: { error: unknown; retry: () => void }) {
  return <main id="main-content" tabIndex={-1}><ErrorNotice retry={retry} /></main>;
}

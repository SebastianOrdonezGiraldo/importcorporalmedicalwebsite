"use client";

import ErrorNotice from "@/components/ErrorNotice";

export default function SiteError({ retry }: { error: unknown; retry: () => void }) {
  return <ErrorNotice retry={retry} />;
}

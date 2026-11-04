"use client";

import ErrorNotice from "@/components/ErrorNotice";

export default function PanelError({ retry }: { error: unknown; retry: () => void }) {
  return <ErrorNotice retry={retry} admin />;
}

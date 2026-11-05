import { pageMetadata } from "@/lib/seo";
import LegalDocument from "@/components/LegalDocument";
import { legalDocuments } from "@/lib/legal";

const document = legalDocuments.privacy;

export const metadata = pageMetadata({
  title: document.navTitle,
  description: document.title + " de Import Corporal Medical S.A.S.",
  pathname: document.path,
});

export default function Page() {
  return <LegalDocument document={document} />;
}

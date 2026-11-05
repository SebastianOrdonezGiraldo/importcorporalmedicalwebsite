import privacy from "@/content/legal/privacy.json";
import returns from "@/content/legal/returns.json";
import terms from "@/content/legal/terms.json";

export type LegalDocumentContent = {
  title: string;
  navTitle: string;
  path: string;
  updated: string;
  intro: string[];
  sections: { id: string; title: string; paragraphs: string[] }[];
};

export const legalDocuments = { privacy, returns, terms } satisfies Record<string, LegalDocumentContent>;

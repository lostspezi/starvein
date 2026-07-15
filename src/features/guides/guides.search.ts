import type { GuideContent } from "./guides.schema";

type TipTapNode = {
  type?: string;
  text?: string;
  content?: TipTapNode[];
};

/**
 * Sammelt den reinen Fließtext aus einem TipTap-Dokument (alle text-Nodes,
 * rekursiv). Bilder/YouTube tragen keinen Suchtext bei.
 */
export function extractGuideText(content: unknown): string {
  const parts: string[] = [];
  const walk = (node: TipTapNode | undefined): void => {
    if (!node) return;
    if (typeof node.text === "string") parts.push(node.text);
    if (Array.isArray(node.content)) node.content.forEach(walk);
  };
  walk(content as TipTapNode);
  return parts.join(" ");
}

/**
 * Baut das durchsuchbare Feld eines Guides: Titel + Beschreibung + Fließtext,
 * kleingeschrieben und auf einfache Leerzeichen normalisiert. Wird beim
 * Speichern gestempelt und per Substring-Regex durchsucht.
 */
export function buildGuideSearchText(input: {
  title: string;
  description?: string;
  content: GuideContent;
}): string {
  return [input.title, input.description ?? "", extractGuideText(input.content)]
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

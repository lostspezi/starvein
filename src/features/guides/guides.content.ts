import type { JSONContent } from "@tiptap/core";
import { generateHTML } from "@tiptap/html";
import sanitizeHtml from "sanitize-html";
import { guideExtensions } from "./guides.extensions";
import type { GuideContent } from "./guides.schema";

/**
 * Zweite Verteidigungslinie beim Rendern: das aus dem JSON erzeugte HTML wird
 * gegen eine strikte Tag-/Attribut-Allowlist gefiltert. iframes nur zu
 * YouTube-(nocookie-)Hosts, Links nur http(s), Bilder nur same-origin.
 * Server-only (sanitize-html) — der Editor importiert stattdessen
 * guideExtensions direkt aus guides.extensions.ts.
 */
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p",
    "h1",
    "h2",
    "h3",
    "ul",
    "ol",
    "li",
    "strong",
    "em",
    "s",
    "code",
    "pre",
    "blockquote",
    "br",
    "a",
    "img",
    "div",
    "iframe",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    img: ["src", "alt", "title"],
    ol: ["start"],
    div: ["data-youtube-video"],
    iframe: ["src", "width", "height", "allowfullscreen", "frameborder"],
  },
  allowedSchemes: ["http", "https"],
  allowProtocolRelative: false,
  // sanitize-html verwirft iframes mit fremdem Host automatisch
  allowedIframeHostnames: [
    "www.youtube-nocookie.com",
    "youtube-nocookie.com",
    "www.youtube.com",
    "youtube.com",
  ],
};

/** Erzeugt sicheres HTML aus einem validierten Guide-Dokument. */
export function renderGuideHtml(content: GuideContent): string {
  const html = generateHTML(content as unknown as JSONContent, guideExtensions);
  return sanitizeHtml(html, SANITIZE_OPTIONS);
}

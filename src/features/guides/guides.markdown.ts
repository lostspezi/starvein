import { Extension } from "@tiptap/core";
import { Markdown } from "@tiptap/markdown";
import { Plugin } from "@tiptap/pm/state";

/**
 * Muster, an denen wir Markdown im eingefügten Text erkennen. Bewusst
 * konservativ: nur wenn eines davon zutrifft, wird geparst. Normaler Fließtext
 * landet unverändert im Editor.
 */
const MARKDOWN_HINTS: RegExp[] = [
  /^#{1,6}\s+\S/m, // # Überschrift
  /^\s*[-*+]\s+\S/m, // - Aufzählung
  /^\s*\d+\.\s+\S/m, // 1. Nummerierung
  /^\s*>\s+\S/m, // > Zitat
  /^\s*```/m, // Codeblock
  /\*\*[^*\n]+\*\*/, // **fett**
  /\[[^\]\n]+\]\([^)\s]+\)/, // [Text](url) und ![alt](url)
];

/** Sieht der Text nach Markdown aus? */
export function looksLikeMarkdown(text: string): boolean {
  return MARKDOWN_HINTS.some((hint) => hint.test(text));
}

/**
 * Fügt Markdown beim Einfügen als echte Formatierung ein. Greift nur bei
 * reinem Text-Paste (Rich-Text/HTML läuft weiter über TipTaps Standardweg)
 * und nur, wenn der Text nach Markdown aussieht.
 */
const GuideMarkdownPaste = Extension.create({
  name: "guideMarkdownPaste",

  addProseMirrorPlugins() {
    const { editor } = this;
    return [
      new Plugin({
        props: {
          handlePaste: (_view, event) => {
            const clipboard = event.clipboardData;
            if (!clipboard) return false;
            // HTML-Paste (Word, Browser, …) behält das Standardverhalten
            if (clipboard.getData("text/html")) return false;

            const text = clipboard.getData("text/plain");
            if (!text || !looksLikeMarkdown(text)) return false;

            editor.commands.insertContent(text, { contentType: "markdown" });
            return true;
          },
        },
      }),
    ];
  },
});

/** Editor-only: Markdown-Parsing plus Paste-Handler (nicht im Server-Render). */
export const guideMarkdownExtensions = [Markdown, GuideMarkdownPaste];

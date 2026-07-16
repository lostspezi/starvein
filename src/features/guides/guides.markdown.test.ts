import { Editor } from "@tiptap/core";
import { MarkdownManager } from "@tiptap/markdown";
import { describe, expect, it } from "vitest";
import { guideExtensions } from "./guides.extensions";
import { guideMarkdownExtensions, looksLikeMarkdown } from "./guides.markdown";
import { guideContentSchema } from "./guides.schema";

const editorExtensions = [...guideExtensions, ...guideMarkdownExtensions];

describe("looksLikeMarkdown", () => {
  it.each([
    ["heading", "## Wo es sich lohnt"],
    ["bullet list", "- Asteroidenfelder\n- Monde"],
    ["ordered list", "1. Scannen\n2. Gadget"],
    ["blockquote", "> Achtung"],
    ["code fence", "```\ncode\n```"],
    ["bold", "Das ist **wichtig**"],
    ["link", "Siehe [UEX](https://uexcorp.space)"],
  ])("detects %s", (_label, text) => {
    expect(looksLikeMarkdown(text)).toBe(true);
  });

  it.each([
    ["plain prose", "Quantainium ist das dickste Ding im Gürtel."],
    ["multiple paragraphs", "Erster Absatz.\n\nZweiter Absatz."],
    ["a bare url", "https://starvein.app/guides"],
    ["maths-ish text", "5 * 3 ist 15"],
  ])("leaves %s alone", (_label, text) => {
    expect(looksLikeMarkdown(text)).toBe(false);
  });
});

describe("markdown parsing", () => {
  const manager = new MarkdownManager({ extensions: editorExtensions });

  it("turns markdown into the guide node types", () => {
    const doc = manager.parse(
      "## Die Signatur\n\nDer Basiswert liegt bei **3170**.\n\n- Asteroidenfelder\n- Monde",
    );

    const types = (doc.content ?? []).map((node) => node.type);
    expect(types).toContain("heading");
    expect(types).toContain("paragraph");
    expect(types).toContain("bulletList");
  });

  it("produces content that passes the guide allowlist", () => {
    const doc = manager.parse(
      "## Ablauf\n\n1. Scannen\n2. Gadget anbringen\n\n> Nicht durchziehen\n\nSiehe [UEX](https://uexcorp.space).",
    );
    expect(guideContentSchema.safeParse(doc).success).toBe(true);
  });

  it("joins soft-wrapped lines into one paragraph", () => {
    const doc = manager.parse(
      "Dies ist eine Zeile\ndie umgebrochen wurde\nund zusammen gehört.",
    );
    expect(
      (doc.content ?? []).filter((node) => node.type === "paragraph"),
    ).toHaveLength(1);
  });
});

/** Simuliert einen Zwischenablage-Paste auf der Editor-DOM-Node. */
function paste(editor: Editor, data: Record<string, string>) {
  const event = new Event("paste", {
    bubbles: true,
    cancelable: true,
  }) as Event & { clipboardData: unknown };
  event.clipboardData = { getData: (type: string) => data[type] ?? "" };
  editor.view.dom.dispatchEvent(event);
}

describe("markdown paste", () => {
  function makeEditor() {
    return new Editor({
      element: document.createElement("div"),
      extensions: editorExtensions,
      content: "",
    });
  }

  it("turns pasted markdown into real formatting", () => {
    const editor = makeEditor();
    paste(editor, { "text/plain": "## Die Signatur\n\nBasiswert **3170**." });

    const json = editor.getJSON();
    const types = (json.content ?? []).map((node) => node.type);
    expect(types).toContain("heading");
    expect(JSON.stringify(json)).toContain("Die Signatur");
    editor.destroy();
  });

  it("leaves plain prose as plain text", () => {
    const editor = makeEditor();
    paste(editor, { "text/plain": "Einfach nur ein Satz ohne Markdown." });

    const json = editor.getJSON();
    const types = (json.content ?? []).map((node) => node.type);
    expect(types).not.toContain("heading");
    expect(JSON.stringify(json)).toContain("ohne Markdown");
    editor.destroy();
  });

  it("does not touch rich-text (HTML) pastes", () => {
    const editor = makeEditor();
    paste(editor, {
      "text/plain": "## Nicht als Markdown",
      "text/html": "<p>## Nicht als Markdown</p>",
    });

    const types = (editor.getJSON().content ?? []).map((node) => node.type);
    expect(types).not.toContain("heading");
    editor.destroy();
  });
});

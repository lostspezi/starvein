"use client";

import { type Editor, useEditorState } from "@tiptap/react";
import {
  Bold,
  Code,
  FileCode,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  MonitorPlay,
  Quote,
  Redo2,
  Strikethrough,
  Undo2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";

function ToolButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      // Selektion im Editor nicht durch den Button-Fokus verlieren
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={cn(
        "rounded p-1.5 text-text-muted transition-colors duration-150 hover:bg-bg-nebula-2 hover:text-text-primary disabled:opacity-40",
        active && "bg-bg-nebula-2 text-accent-cyan",
      )}
    >
      {children}
    </button>
  );
}

/**
 * Formatier-Leiste für den Guide-Editor. Icons ausschließlich aus
 * lucide-react (MASTER §9). Aktive Zustände über useEditorState (v3-Pattern).
 */
export function GuideToolbar({
  editor,
  onInsertImage,
  onInsertYoutube,
  onSetLink,
  uploading,
}: {
  editor: Editor;
  onInsertImage: () => void;
  onInsertYoutube: () => void;
  onSetLink: () => void;
  uploading: boolean;
}) {
  const t = useTranslations("guides.editor.toolbar");
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      strike: e.isActive("strike"),
      code: e.isActive("code"),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bulletList: e.isActive("bulletList"),
      orderedList: e.isActive("orderedList"),
      blockquote: e.isActive("blockquote"),
      codeBlock: e.isActive("codeBlock"),
      link: e.isActive("link"),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });

  const chain = () => editor.chain().focus();

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-bg-nebula-2 pb-2">
      <ToolButton
        label={t("bold")}
        active={state.bold}
        onClick={() => chain().toggleBold().run()}
      >
        <Bold className="size-4" aria-hidden />
      </ToolButton>
      <ToolButton
        label={t("italic")}
        active={state.italic}
        onClick={() => chain().toggleItalic().run()}
      >
        <Italic className="size-4" aria-hidden />
      </ToolButton>
      <ToolButton
        label={t("strike")}
        active={state.strike}
        onClick={() => chain().toggleStrike().run()}
      >
        <Strikethrough className="size-4" aria-hidden />
      </ToolButton>
      <ToolButton
        label={t("code")}
        active={state.code}
        onClick={() => chain().toggleCode().run()}
      >
        <Code className="size-4" aria-hidden />
      </ToolButton>

      <span className="mx-1 h-5 w-px bg-bg-nebula-2" aria-hidden />

      <ToolButton
        label={t("heading2")}
        active={state.h2}
        onClick={() => chain().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="size-4" aria-hidden />
      </ToolButton>
      <ToolButton
        label={t("heading3")}
        active={state.h3}
        onClick={() => chain().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 className="size-4" aria-hidden />
      </ToolButton>
      <ToolButton
        label={t("bulletList")}
        active={state.bulletList}
        onClick={() => chain().toggleBulletList().run()}
      >
        <List className="size-4" aria-hidden />
      </ToolButton>
      <ToolButton
        label={t("orderedList")}
        active={state.orderedList}
        onClick={() => chain().toggleOrderedList().run()}
      >
        <ListOrdered className="size-4" aria-hidden />
      </ToolButton>
      <ToolButton
        label={t("blockquote")}
        active={state.blockquote}
        onClick={() => chain().toggleBlockquote().run()}
      >
        <Quote className="size-4" aria-hidden />
      </ToolButton>
      <ToolButton
        label={t("codeBlock")}
        active={state.codeBlock}
        onClick={() => chain().toggleCodeBlock().run()}
      >
        <FileCode className="size-4" aria-hidden />
      </ToolButton>

      <span className="mx-1 h-5 w-px bg-bg-nebula-2" aria-hidden />

      <ToolButton label={t("link")} active={state.link} onClick={onSetLink}>
        <Link2 className="size-4" aria-hidden />
      </ToolButton>
      <ToolButton
        label={t("image")}
        disabled={uploading}
        onClick={onInsertImage}
      >
        <ImageIcon className="size-4" aria-hidden />
      </ToolButton>
      <ToolButton label={t("youtube")} onClick={onInsertYoutube}>
        <MonitorPlay className="size-4" aria-hidden />
      </ToolButton>

      <span className="mx-1 h-5 w-px bg-bg-nebula-2" aria-hidden />

      <ToolButton
        label={t("undo")}
        disabled={!state.canUndo}
        onClick={() => chain().undo().run()}
      >
        <Undo2 className="size-4" aria-hidden />
      </ToolButton>
      <ToolButton
        label={t("redo")}
        disabled={!state.canRedo}
        onClick={() => chain().redo().run()}
      >
        <Redo2 className="size-4" aria-hidden />
      </ToolButton>
    </div>
  );
}

"use client";

import { type Content, EditorContent, useEditor } from "@tiptap/react";
import { useTranslations } from "next-intl";
import { useId, useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/lib/components/ui/Button";
import { Panel } from "@/lib/components/ui/Panel";
import { guideExtensions } from "./guides.extensions";
import {
  GUIDE_DESCRIPTION_MAX,
  GUIDE_MAX_TAGS,
  GUIDE_TITLE_MAX,
  type GuideContent,
  type GuideInput,
} from "./guides.schema";
import { GuideToolbar } from "./GuideToolbar";

const inputClass =
  "w-full rounded border border-bg-nebula-2 bg-bg-void px-3 py-1.5 text-sm transition-all duration-150 placeholder:text-text-muted focus:border-accent-primary focus:outline-none";

function parseTags(raw: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const part of raw.split(",")) {
    const tag = part.trim().toLowerCase();
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    tags.push(tag);
    if (tags.length >= GUIDE_MAX_TAGS) break;
  }
  return tags;
}

/**
 * WYSIWYG-Editor zum Erstellen/Bearbeiten eines Guides: TipTap-Editor mit
 * Toolbar, Bild-Upload (GridFS) und YouTube-Einbettung, plus Titel/
 * Beschreibung/Tags/Sichtbarkeit. Im Edit-Modus (guideId gesetzt) via PATCH.
 */
export function GuideEditor({
  initialValue,
  guideId,
}: {
  initialValue?: GuideInput;
  guideId?: string;
}) {
  const t = useTranslations("guides.editor");
  const router = useRouter();
  const formId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(initialValue?.title ?? "");
  const [description, setDescription] = useState(
    initialValue?.description ?? "",
  );
  const [tags, setTags] = useState((initialValue?.tags ?? []).join(", "));
  const [isPublic, setIsPublic] = useState(initialValue?.isPublic ?? false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  const editor = useEditor({
    extensions: guideExtensions,
    content: (initialValue?.content ?? "") as Content,
    immediatelyRender: false,
    editorProps: {
      attributes: { class: "guide-prose", "aria-label": t("contentLabel") },
    },
  });

  function pickImage() {
    fileInputRef.current?.click();
  }

  async function onImagePicked(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !editor) return;
    setUploading(true);
    setImageFailed(false);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/guides/images", {
        method: "POST",
        body,
      });
      if (!response.ok) {
        setImageFailed(true);
        return;
      }
      const { url }: { url: string } = await response.json();
      editor.chain().focus().setImage({ src: url }).run();
    } catch {
      setImageFailed(true);
    } finally {
      setUploading(false);
    }
  }

  function insertYoutube() {
    if (!editor) return;
    const url = window.prompt(t("youtubePrompt"));
    if (!url) return;
    const inserted = editor.commands.setYoutubeVideo({ src: url.trim() });
    if (!inserted) window.alert(t("youtubeInvalid"));
  }

  function setLink() {
    if (!editor) return;
    const previous = (editor.getAttributes("link").href as string) ?? "";
    const url = window.prompt(t("linkPrompt"), previous);
    if (url === null) return;
    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url.trim() })
      .run();
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!editor || busy || title.trim().length === 0) return;
    setBusy(true);
    setFailed(false);
    const input: GuideInput = {
      title: title.trim(),
      description: description.trim() || undefined,
      tags: parseTags(tags),
      isPublic,
      content: editor.getJSON() as unknown as GuideContent,
    };
    try {
      const response = await fetch(
        guideId ? `/api/guides/${guideId}` : "/api/guides",
        {
          method: guideId ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(input),
        },
      );
      if (!response.ok) {
        setFailed(true);
        return;
      }
      const saved: { id: string } = await response.json();
      router.push(`/guides/${saved.id}`);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = !busy && title.trim().length > 0 && editor !== null;

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor={`${formId}-title`} className="text-xs text-text-muted">
          {t("titleLabel")}
        </label>
        <input
          id={`${formId}-title`}
          type="text"
          value={title}
          maxLength={GUIDE_TITLE_MAX}
          placeholder={t("titlePlaceholder")}
          onChange={(event) => setTitle(event.target.value)}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor={`${formId}-description`}
          className="text-xs text-text-muted"
        >
          {t("descriptionLabel")}
        </label>
        <textarea
          id={`${formId}-description`}
          value={description}
          maxLength={GUIDE_DESCRIPTION_MAX}
          rows={2}
          placeholder={t("descriptionPlaceholder")}
          onChange={(event) => setDescription(event.target.value)}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={`${formId}-tags`} className="text-xs text-text-muted">
          {t("tagsLabel")}
        </label>
        <input
          id={`${formId}-tags`}
          type="text"
          value={tags}
          placeholder={t("tagsPlaceholder")}
          onChange={(event) => setTags(event.target.value)}
          className={inputClass}
        />
        <p className="text-xs text-text-muted">{t("tagsHint")}</p>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs text-text-muted">{t("contentLabel")}</span>
        <Panel className="guide-editor flex flex-col gap-2 p-3">
          {editor && (
            <GuideToolbar
              editor={editor}
              onInsertImage={pickImage}
              onInsertYoutube={insertYoutube}
              onSetLink={setLink}
              uploading={uploading}
            />
          )}
          <EditorContent editor={editor} />
        </Panel>
        {uploading && (
          <p className="text-xs text-text-muted">{t("uploading")}</p>
        )}
        {imageFailed && (
          <p className="text-sm text-warning">{t("imageUploadError")}</p>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={onImagePicked}
      />

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isPublic}
          onChange={(event) => setIsPublic(event.target.checked)}
        />
        {t("isPublicLabel")}
      </label>

      {failed && <p className="text-sm text-warning">{t("error")}</p>}

      <div>
        <Button type="submit" disabled={!canSubmit}>
          {t(guideId ? "submitSave" : "submitCreate")}
        </Button>
      </div>
    </form>
  );
}

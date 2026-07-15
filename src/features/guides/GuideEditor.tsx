"use client";

import { type Content, EditorContent, useEditor } from "@tiptap/react";
import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { Button } from "@/lib/components/ui/Button";
import { Panel } from "@/lib/components/ui/Panel";
import { guideExtensions } from "./guides.extensions";
import {
  GUIDE_LANGUAGE_NAMES,
  GUIDE_LANGUAGES,
  type GuideLanguage,
} from "./guides.languages";
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

const emptyDoc: GuideContent = {
  type: "doc",
  content: [],
} as unknown as GuideContent;

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
 * WYSIWYG-Editor zum Erstellen/Bearbeiten eines Guides. Titel, Beschreibung
 * und Inhalt sind pro Sprache (Sprach-Tabs); Tags und Sichtbarkeit gelten
 * sprachübergreifend. Bild-Upload (GridFS) und YouTube-Einbettung arbeiten
 * auf der gerade aktiven Sprachversion. Im Edit-Modus via PATCH.
 */
export function GuideEditor({
  initialValue,
  guideId,
  defaultLanguage,
}: {
  initialValue?: GuideInput;
  guideId?: string;
  defaultLanguage: GuideLanguage;
}) {
  const t = useTranslations("guides.editor");
  const router = useRouter();
  const formId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialTranslations = initialValue?.translations ?? [];
  const initialLangs: GuideLanguage[] =
    initialTranslations.length > 0
      ? initialTranslations.map((tr) => tr.language)
      : [defaultLanguage];

  const [languages, setLanguages] = useState<GuideLanguage[]>(initialLangs);
  const [activeLang, setActiveLang] = useState<GuideLanguage>(initialLangs[0]);
  const [titles, setTitles] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      initialTranslations.map((tr) => [tr.language, tr.title]),
    ),
  );
  const [descriptions, setDescriptions] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      initialTranslations.map((tr) => [tr.language, tr.description ?? ""]),
    ),
  );
  const contentsRef = useRef<Record<string, Content>>(
    Object.fromEntries(
      initialTranslations.map((tr) => [
        tr.language,
        tr.content as unknown as Content,
      ]),
    ),
  );

  const [tags, setTags] = useState((initialValue?.tags ?? []).join(", "));
  const [isPublic, setIsPublic] = useState(initialValue?.isPublic ?? false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  // Nur der Initialinhalt (erste Sprache) — aus Props abgeleitet, kein
  // Ref-Read während des Renders. Sprachwechsel setzen den Inhalt imperativ.
  const initialContent = (initialTranslations.find(
    (tr) => tr.language === initialLangs[0],
  )?.content ?? "") as Content;

  const editor = useEditor({
    extensions: guideExtensions,
    content: initialContent,
    immediatelyRender: false,
    editorProps: {
      attributes: { class: "guide-prose", "aria-label": t("contentLabel") },
    },
  });

  function selectLang(next: GuideLanguage) {
    if (next === activeLang || !editor) return;
    contentsRef.current[activeLang] = editor.getJSON();
    setActiveLang(next);
    editor.commands.setContent(contentsRef.current[next] ?? "");
  }

  function addLanguage(next: GuideLanguage) {
    if (languages.includes(next) || !editor) return;
    contentsRef.current[activeLang] = editor.getJSON();
    contentsRef.current[next] = "";
    setLanguages((current) => [...current, next]);
    setActiveLang(next);
    editor.commands.setContent("");
  }

  function removeLanguage(lang: GuideLanguage) {
    if (languages.length <= 1) return;
    const remaining = languages.filter((value) => value !== lang);
    delete contentsRef.current[lang];
    setLanguages(remaining);
    if (lang === activeLang) {
      const next = remaining[0];
      setActiveLang(next);
      editor?.commands.setContent(contentsRef.current[next] ?? "");
    }
  }

  const unusedLanguages = GUIDE_LANGUAGES.filter(
    (lang) => !languages.includes(lang),
  );

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

  function buildTranslations(): GuideInput["translations"] {
    if (editor) contentsRef.current[activeLang] = editor.getJSON();
    return languages.map((lang) => ({
      language: lang,
      title: (titles[lang] ?? "").trim(),
      description: (descriptions[lang] ?? "").trim() || undefined,
      content: (contentsRef.current[lang] || emptyDoc) as GuideContent,
    }));
  }

  const missingTitle = languages.some((lang) => !(titles[lang] ?? "").trim());
  const canSubmit = !busy && !missingTitle && editor !== null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setFailed(false);
    const input: GuideInput = {
      tags: parseTags(tags),
      isPublic,
      translations: buildTranslations(),
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

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {/* Sprach-Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <div
          role="tablist"
          aria-label={t("languagesLabel")}
          className="flex flex-wrap gap-1"
        >
          {languages.map((lang) => {
            const active = lang === activeLang;
            return (
              <span
                key={lang}
                className={cn(
                  "flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition-colors duration-150",
                  active
                    ? "border-accent-cyan text-accent-cyan"
                    : "border-bg-nebula-2 text-text-muted",
                )}
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => selectLang(lang)}
                  className="transition-colors duration-150 hover:text-text-primary"
                >
                  {GUIDE_LANGUAGE_NAMES[lang]}
                </button>
                {languages.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLanguage(lang)}
                    aria-label={t("removeLanguage", {
                      language: GUIDE_LANGUAGE_NAMES[lang],
                    })}
                    className="text-text-muted hover:text-warning"
                  >
                    <X aria-hidden className="size-3" />
                  </button>
                )}
              </span>
            );
          })}
        </div>
        {unusedLanguages.length > 0 && (
          <label className="flex items-center gap-1 text-xs text-text-muted">
            <Plus aria-hidden className="size-3.5" />
            <span className="sr-only">{t("addLanguage")}</span>
            <select
              value=""
              onChange={(event) =>
                addLanguage(event.target.value as GuideLanguage)
              }
              aria-label={t("addLanguage")}
              className="rounded border border-bg-nebula-2 bg-bg-void px-2 py-1 text-xs focus:border-accent-primary focus:outline-none"
            >
              <option value="" disabled>
                {t("addLanguage")}
              </option>
              {unusedLanguages.map((lang) => (
                <option key={lang} value={lang}>
                  {GUIDE_LANGUAGE_NAMES[lang]}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {/* Pro-Sprache: Titel, Beschreibung, Inhalt */}
      <div className="flex flex-col gap-1">
        <label htmlFor={`${formId}-title`} className="text-xs text-text-muted">
          {t("titleLabel")} · {GUIDE_LANGUAGE_NAMES[activeLang]}
        </label>
        <input
          id={`${formId}-title`}
          type="text"
          value={titles[activeLang] ?? ""}
          maxLength={GUIDE_TITLE_MAX}
          placeholder={t("titlePlaceholder")}
          onChange={(event) =>
            setTitles((current) => ({
              ...current,
              [activeLang]: event.target.value,
            }))
          }
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
          value={descriptions[activeLang] ?? ""}
          maxLength={GUIDE_DESCRIPTION_MAX}
          rows={2}
          placeholder={t("descriptionPlaceholder")}
          onChange={(event) =>
            setDescriptions((current) => ({
              ...current,
              [activeLang]: event.target.value,
            }))
          }
          className={inputClass}
        />
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

      {/* Sprachübergreifend: Tags + Sichtbarkeit */}
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

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isPublic}
          onChange={(event) => setIsPublic(event.target.checked)}
        />
        {t("isPublicLabel")}
      </label>

      {missingTitle && (
        <p className="text-sm text-warning">{t("missingTitle")}</p>
      )}
      {failed && <p className="text-sm text-warning">{t("error")}</p>}

      <div>
        <Button type="submit" disabled={!canSubmit}>
          {t(guideId ? "submitSave" : "submitCreate")}
        </Button>
      </div>
    </form>
  );
}

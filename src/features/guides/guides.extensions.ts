import { Image } from "@tiptap/extension-image";
import { Youtube } from "@tiptap/extension-youtube";
import { StarterKit } from "@tiptap/starter-kit";
import { GUIDE_HEADING_LEVELS } from "./guides.schema";

export const GUIDE_YOUTUBE_WIDTH = 640;
export const GUIDE_YOUTUBE_HEIGHT = 360;

/**
 * Gemeinsame TipTap-Extension-Liste für Editor (Client) und Server-Render.
 * Beide müssen exakt dieselbe Konfiguration nutzen, sonst weicht das
 * gerenderte HTML vom Bearbeitungsstand ab. Headless — keine eigenen Icons
 * (Toolbar nutzt lucide-react, siehe MASTER §9). Dieses Modul ist bewusst
 * client-safe (kein sanitize-html / `@tiptap/html`), damit der Editor-Bundle
 * schlank bleibt.
 */
export const guideExtensions = [
  StarterKit.configure({
    heading: { levels: [...GUIDE_HEADING_LEVELS] },
    // Nicht angeboten → auch nicht im gespeicherten Dokument erlaubt
    underline: false,
    horizontalRule: false,
    link: {
      openOnClick: false,
      protocols: ["http", "https"],
      HTMLAttributes: {
        rel: "noopener noreferrer nofollow",
        target: "_blank",
      },
    },
  }),
  Image.configure({ inline: false }),
  Youtube.configure({
    nocookie: true,
    controls: true,
    modestBranding: true,
    width: GUIDE_YOUTUBE_WIDTH,
    height: GUIDE_YOUTUBE_HEIGHT,
  }),
];

import { renderGuideHtml } from "./guides.content";
import type { GuideContent as GuideContentDoc } from "./guides.schema";

/**
 * Rendert den (sanitisierten) Guide-Inhalt. Das HTML stammt aus
 * renderGuideHtml — bereits gegen eine strikte Allowlist gefiltert, daher ist
 * dangerouslySetInnerHTML hier vertretbar.
 */
export function GuideContent({ content }: { content: GuideContentDoc }) {
  const html = renderGuideHtml(content);
  return (
    <div className="guide-prose" dangerouslySetInnerHTML={{ __html: html }} />
  );
}

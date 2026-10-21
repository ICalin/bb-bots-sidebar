// Section → Notion project page URL. Kept in this browser only; bb sections have no metadata field.
const KEY = "bots-sidebar:section-notion-projects";

export function readSectionNotionLinks(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, string>; } catch { return {}; }
}

export function setSectionNotionLink(sectionId: string, url: string | null) {
  const links = readSectionNotionLinks();
  if (url) links[sectionId] = url; else delete links[sectionId];
  try { localStorage.setItem(KEY, JSON.stringify(links)); } catch { /* storage unavailable */ }
  window.dispatchEvent(new Event(KEY));
}

export function onSectionNotionLinksChange(listener: () => void): () => void {
  window.addEventListener(KEY, listener);
  return () => window.removeEventListener(KEY, listener);
}

export function isNotionUrl(value: string): boolean {
  try { return /(^|\.)notion\.(so|com|site)$/.test(new URL(value).hostname); } catch { return false; }
}

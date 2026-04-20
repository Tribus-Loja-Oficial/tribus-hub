import type { JSONContent } from "@tiptap/core";

/**
 * Derives plain text from a Tiptap JSON document for search indexing.
 */
export function extractTextFromJson(json: JSONContent | null | undefined): string {
  if (!json) return "";
  const parts: string[] = [];
  collectText(json, parts);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function collectText(node: JSONContent, parts: string[]): void {
  if (node.type === "text" && node.text) {
    parts.push(node.text);
  }
  if (node.content) {
    for (const child of node.content) {
      collectText(child, parts);
    }
  }
}

/**
 * Returns a short excerpt from plain text content.
 */
export function excerptFromText(text: string, maxLength = 200): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).replace(/\s\S*$/, "") + "…";
}

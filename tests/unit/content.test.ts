import { describe, it, expect } from "vitest";
import { extractTextFromJson, excerptFromText } from "@/lib/utils/content";

describe("content utils", () => {
  describe("extractTextFromJson", () => {
    it("returns empty string for null", () => {
      expect(extractTextFromJson(null)).toBe("");
    });

    it("extracts text from a simple doc", () => {
      const json = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Hello world" }],
          },
        ],
      };
      expect(extractTextFromJson(json)).toBe("Hello world");
    });

    it("extracts text from nested content", () => {
      const json = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "First " },
              { type: "text", text: "sentence." },
            ],
          },
          {
            type: "paragraph",
            content: [{ type: "text", text: "Second paragraph." }],
          },
        ],
      };
      const result = extractTextFromJson(json);
      expect(result).toContain("First sentence.");
      expect(result).toContain("Second paragraph.");
    });
  });

  describe("excerptFromText", () => {
    it("returns text as-is if shorter than maxLength", () => {
      const text = "Short text";
      expect(excerptFromText(text, 200)).toBe(text);
    });

    it("truncates at word boundary with ellipsis", () => {
      const text = "word ".repeat(60).trim();
      const result = excerptFromText(text, 50);
      expect(result.endsWith("…")).toBe(true);
      expect(result.length).toBeLessThanOrEqual(55);
    });
  });
});

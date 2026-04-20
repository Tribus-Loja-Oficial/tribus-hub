import { describe, it, expect } from "vitest";
import { createId, slugify, uniqueSlug } from "@/lib/utils/ids";

describe("ids utils", () => {
  describe("createId", () => {
    it("generates a 24-character string", () => {
      const id = createId();
      expect(typeof id).toBe("string");
      expect(id.length).toBe(24);
    });

    it("generates unique ids", () => {
      const ids = Array.from({ length: 100 }, () => createId());
      const unique = new Set(ids);
      expect(unique.size).toBe(100);
    });
  });

  describe("slugify", () => {
    it("converts to lowercase", () => {
      expect(slugify("Hello World")).toBe("hello-world");
    });

    it("removes special characters", () => {
      expect(slugify("Visão & Missão!")).toBe("visao-missao");
    });

    it("collapses multiple spaces/hyphens", () => {
      expect(slugify("hello   world")).toBe("hello-world");
    });

    it("strips leading and trailing hyphens", () => {
      expect(slugify(" hello world ")).toBe("hello-world");
    });
  });

  describe("uniqueSlug", () => {
    it("generates a slug with a suffix", () => {
      const slug = uniqueSlug("My Page");
      expect(slug).toMatch(/^my-page-[a-f0-9]{6}$/);
    });
  });
});

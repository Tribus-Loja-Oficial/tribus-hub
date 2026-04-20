import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils/cn";

describe("cn", () => {
  it("returns a single class unchanged", () => {
    expect(cn("flex")).toBe("flex");
  });

  it("joins multiple classes", () => {
    expect(cn("flex", "items-center", "gap-2")).toBe("flex items-center gap-2");
  });

  it("filters falsy values", () => {
    expect(cn("flex", false && "hidden", undefined, null, "gap-2")).toBe("flex gap-2");
  });

  it("handles conditional objects (clsx syntax)", () => {
    expect(cn({ flex: true, hidden: false, "items-center": true })).toBe("flex items-center");
  });

  it("merges conflicting tailwind classes (last wins)", () => {
    expect(cn("text-sm", "text-lg")).toBe("text-lg");
    expect(cn("p-4", "p-2")).toBe("p-2");
  });

  it("merges conflicting classes from conditional expressions", () => {
    const active = true;
    expect(cn("text-muted-foreground", active && "text-foreground")).toBe("text-foreground");
  });

  it("handles arrays", () => {
    expect(cn(["flex", "gap-2"], "items-center")).toBe("flex gap-2 items-center");
  });

  it("returns empty string with no inputs", () => {
    expect(cn()).toBe("");
  });
});

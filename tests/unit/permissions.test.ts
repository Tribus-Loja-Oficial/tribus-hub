import { describe, it, expect } from "vitest";
import { hasRole, canEditPage, canManageUsers } from "@/lib/permissions";
import { testAuthUser } from "../fixtures/test-data";

describe("permissions", () => {
  describe("hasRole", () => {
    it("owner has access to all roles", () => {
      expect(hasRole("owner", "owner")).toBe(true);
      expect(hasRole("owner", "admin")).toBe(true);
      expect(hasRole("owner", "member")).toBe(true);
    });

    it("admin has access to admin and member, not owner", () => {
      expect(hasRole("admin", "owner")).toBe(false);
      expect(hasRole("admin", "admin")).toBe(true);
      expect(hasRole("admin", "member")).toBe(true);
    });

    it("member only has access to member", () => {
      expect(hasRole("member", "owner")).toBe(false);
      expect(hasRole("member", "admin")).toBe(false);
      expect(hasRole("member", "member")).toBe(true);
    });
  });

  describe("canEditPage", () => {
    it("owner can edit pages", () => {
      expect(canEditPage(testAuthUser)).toBe(true);
    });

    it("member can edit pages", () => {
      expect(canEditPage({ ...testAuthUser, role: "member" })).toBe(true);
    });
  });

  describe("canManageUsers", () => {
    it("only owner can manage users", () => {
      expect(canManageUsers(testAuthUser)).toBe(true);
      expect(canManageUsers({ ...testAuthUser, role: "admin" })).toBe(false);
      expect(canManageUsers({ ...testAuthUser, role: "member" })).toBe(false);
    });
  });
});

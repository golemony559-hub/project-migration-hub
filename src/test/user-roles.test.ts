import { describe, expect, it } from "vitest";
import { roleLabels } from "@/lib/user-roles";

describe("roleLabels", () => {
  it("shows Admin, Creator and User for an admin who creates", () => {
    expect(roleLabels({ grantedRoles: ["admin"], isCreator: true })).toEqual(["Admin", "Creator", "User"]);
  });
  it("shows only User for a plain buyer", () => {
    expect(roleLabels({ grantedRoles: [], isCreator: false })).toEqual(["User"]);
  });
  it("shows Creator for a creator without granted roles", () => {
    expect(roleLabels({ grantedRoles: [], isCreator: true })).toEqual(["Creator", "User"]);
  });
});

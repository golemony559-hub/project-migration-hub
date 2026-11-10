export type RoleLabel = "Admin" | "Moderator" | "Creator" | "User";

/**
 * The roles shown next to a person on the admin page.
 * Admin/Moderator come from granted roles; Creator means they finished creator
 * setup or have products; everyone signed up is a User.
 */
export function roleLabels(input: {
  grantedRoles: string[];
  isCreator: boolean;
}): RoleLabel[] {
  const labels: RoleLabel[] = [];
  if (input.grantedRoles.includes("admin")) labels.push("Admin");
  if (input.grantedRoles.includes("moderator")) labels.push("Moderator");
  if (input.isCreator) labels.push("Creator");
  labels.push("User");
  return labels;
}

import { createContext, useContext } from "react";
import type { User } from "@supabase/supabase-js";
import type { Tables } from "@/integrations/supabase/types";

export type CreatorProfile = Tables<"profiles">;

type CreatorContextValue = {
  user: User;
  profile: CreatorProfile;
  reloadProfile: () => Promise<void>;
};

export const CreatorContext = createContext<CreatorContextValue | null>(null);

export function useCreator() {
  const value = useContext(CreatorContext);
  if (!value) throw new Error("useCreator must be used inside the creator dashboard");
  return value;
}

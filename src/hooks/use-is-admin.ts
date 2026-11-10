import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMarketplaceAuth } from "@/hooks/use-marketplace-auth";

/** UI hint only — every admin action is re-checked by the database. */
export function useIsAdmin() {
  const { user, ready } = useMarketplaceAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      setIsAdmin(false);
      setChecked(true);
      return;
    }
    let active = true;
    setChecked(false);
    void supabase
      .rpc("has_role", { _user_id: user.id, _role: "admin" })
      .then(({ data }) => {
        if (!active) return;
        setIsAdmin(Boolean(data));
        setChecked(true);
      });
    return () => {
      active = false;
    };
  }, [ready, user]);

  return { user, ready: ready && checked, isAdmin };
}

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Short-lived links for product thumbnails the viewer is allowed to see. */
export function useThumbnailUrls(paths: (string | null | undefined)[]) {
  const key = [...new Set(paths.filter((p): p is string => Boolean(p)))].sort().join("|");
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!key) return;
    let active = true;
    const list = key.split("|");
    void supabase.storage
      .from("product-thumbnails")
      .createSignedUrls(list, 60 * 60)
      .then(({ data }) => {
        if (!active || !data) return;
        const next: Record<string, string> = {};
        for (const item of data) if (item.path && item.signedUrl) next[item.path] = item.signedUrl;
        setUrls((current) => ({ ...current, ...next }));
      });
    return () => {
      active = false;
    };
  }, [key]);

  return urls;
}

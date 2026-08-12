import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export function useAvatarUrl(path?: string) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!path) { setUrl(""); return; }
    void supabase.storage.from("avatars").createSignedUrl(path, 3600).then(({ data }) => setUrl(data?.signedUrl ?? ""));
  }, [path]);
  return url;
}

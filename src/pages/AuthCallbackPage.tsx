import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      navigate(data.session ? "/" : "/ingresar", { replace: true });
    });
    return () => { active = false; };
  }, [navigate]);

  return <div className="auth-loading" aria-live="polite"><span className="auth-spinner" /><p>Confirmando tu cuenta...</p></div>;
}

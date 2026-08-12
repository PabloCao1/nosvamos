import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { Button } from "../components/ui/Button";
import { Icon } from "../components/ui/Icon";
import { supabase } from "../lib/supabase";

export type AuthMode = "login" | "register" | "forgot" | "update";

const copy = {
  login: { eyebrow: "Bienvenido de nuevo", title: "Ingresá a NosVamos", action: "Ingresar" },
  register: { eyebrow: "Tu próximo viaje empieza acá", title: "Creá tu cuenta", action: "Crear cuenta" },
  forgot: { eyebrow: "Recuperar acceso", title: "Restablecé tu clave", action: "Enviar enlace" },
  update: { eyebrow: "Nueva contraseña", title: "Elegí una clave nueva", action: "Guardar" },
} satisfies Record<AuthMode, { eyebrow: string; title: string; action: string }>;

const authRedirectUrl = (path: string) => `${window.location.origin}${path}`;

export function AuthPage({ mode }: { mode: AuthMode }) {
  const { session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setError("");
    setMessage("");
    setPassword("");
    setConfirmPassword("");
  }, [mode]);

  const destination = (location.state as { from?: string } | null)?.from ?? "/";
  if (session && mode !== "update") return <Navigate to={destination} replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if ((mode === "register" || mode === "update") && password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if ((mode === "register" || mode === "update") && password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setPending(true);
    try {
      if (mode === "login") {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) throw authError;
        navigate(destination, { replace: true });
      } else if (mode === "register") {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: name.trim() },
            emailRedirectTo: authRedirectUrl("/auth/callback"),
          },
        });
        if (authError) throw authError;
        if (data.session) navigate("/", { replace: true });
        else setMessage("Te enviamos un correo. Abrí el enlace para confirmar tu cuenta.");
      } else if (mode === "forgot") {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: authRedirectUrl("/actualizar-clave"),
        });
        if (authError) throw authError;
        setMessage("Si existe una cuenta con ese correo, vas a recibir un enlace para cambiar la clave.");
      } else {
        const { error: authError } = await supabase.auth.updateUser({ password });
        if (authError) throw authError;
        setMessage("Tu contraseña fue actualizada correctamente.");
        const returnTo = (location.state as { from?: string } | null)?.from ?? "/";
        window.setTimeout(() => navigate(returnTo, { replace: true }), 900);
      }
    } catch (caught) {
      const authMessage = caught instanceof Error ? caught.message : "No pudimos completar la operación.";
      const translated = authMessage === "Invalid login credentials"
        ? "El correo o la contraseña no son correctos."
        : authMessage === "User already registered"
          ? "Ya existe una cuenta con ese correo."
          : authMessage;
      setError(translated);
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-layout">
        <img src="/icons/pwa-192x192.png" alt="" className="auth-logo" />
        <section className="auth-card">
        {mode !== "login" && <p className="eyebrow">{copy[mode].eyebrow}</p>}
        <h1>{mode === "login" ? "NosVamos" : copy[mode].title}</h1>
        {mode !== "login" && (
          <p className="auth-description">
            {mode === "forgot" ? "Ingresá tu correo y te enviaremos un enlace seguro."
              : mode === "update" ? "Usá al menos 8 caracteres para proteger tu cuenta."
                : "Organizá viajes, reservas, gastos y recordatorios en un solo lugar."}
          </p>
        )}

        <form className="auth-form" onSubmit={submit}>
          {mode === "register" && (
            <label className="auth-input"><span className="sr-only">Nombre</span><Icon name="user" size={20} />
              <input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Tu nombre *" required />
            </label>
          )}
          {mode !== "update" && (
            <label className="auth-input"><span className="sr-only">Correo electrónico</span><Icon name="user" size={20} />
              <input type="email" inputMode="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nombre@correo.com *" required />
            </label>
          )}
          {mode !== "forgot" && (
            <label className="auth-input"><span className="sr-only">Contraseña</span><Icon name="lock" size={20} />
              <input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo 8 caracteres *" minLength={mode === "login" ? undefined : 8} required />
            </label>
          )}
          {(mode === "register" || mode === "update") && (
            <label className="auth-input"><span className="sr-only">Repetir contraseña</span><Icon name="lock" size={20} />
              <input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Repetí tu contraseña *" minLength={8} required />
            </label>
          )}

          {error && <p className="auth-alert auth-error" role="alert">{error}</p>}
          {message && <p className="auth-alert auth-success" role="status">{message}</p>}
          <Button type="submit" variant="primary" fullWidth disabled={pending}>{pending ? "Procesando..." : copy[mode].action}</Button>
        </form>

        <nav className="auth-links" aria-label="Opciones de cuenta">
          {mode === "login" && <><Link to="/recuperar-clave">¿Olvidaste tu contraseña?</Link><p>¿No tenés cuenta? <Link to="/crear-cuenta">Creala gratis</Link></p></>}
          {mode === "register" && <p>¿Ya tenés cuenta? <Link to="/ingresar">Ingresá</Link></p>}
          {mode === "forgot" && <Link to="/ingresar">Volver a ingresar</Link>}
          {mode === "update" && <button type="button" className="auth-cancel" onClick={() => navigate((location.state as { from?: string } | null)?.from ?? "/", { replace: true })}>Cancelar</button>}
        </nav>
      </section>
      </div>
    </main>
  );
}

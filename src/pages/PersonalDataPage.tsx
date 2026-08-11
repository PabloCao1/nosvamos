import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { PageHeader } from "../components/layout/PageHeader";
import { Button } from "../components/ui/Button";
import { supabase } from "../lib/supabase";

export function PersonalDataPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState(typeof user?.user_metadata.full_name === "string" ? user.user_metadata.full_name : "");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true); setMessage(""); setError("");
    const { error: updateError } = await supabase.auth.updateUser({ data: { full_name: fullName.trim() } });
    setPending(false);
    if (updateError) setError(updateError.message);
    else setMessage("Tus datos se guardaron correctamente.");
  };

  return <>
    <PageHeader eyebrow="Perfil" title="Datos personales" />
    <form className="section-block personal-data-form" onSubmit={save}>
      <label className="form-field"><span>Nombre y apellido</span><input value={fullName} onChange={(event) => setFullName(event.target.value)} required /></label>
      <label className="form-field"><span>Correo electrónico</span><input value={user?.email ?? ""} disabled /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      {message && <p className="form-success" role="status">{message}</p>}
      <Button type="submit" variant="primary" fullWidth disabled={pending}>{pending ? "Guardando..." : "Guardar cambios"}</Button>
    </form>
    <section className="section-block password-action-card">
      <div><strong>Contraseña</strong><p>Actualizá la clave con la que ingresás a NosVamos.</p></div>
      <Button variant="secondary" fullWidth onClick={() => navigate("/actualizar-clave", { state: { from: "/datos-personales" } })}>Cambiar contraseña</Button>
    </section>
  </>;
}

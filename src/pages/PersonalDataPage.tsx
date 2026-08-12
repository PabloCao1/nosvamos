import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { PageHeader } from "../components/layout/PageHeader";
import { Button } from "../components/ui/Button";
import { supabase } from "../lib/supabase";

export function PersonalDataPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const metadata = user?.user_metadata ?? {};
  const existingName = typeof metadata.full_name === "string" ? metadata.full_name : "";
  const [firstName, setFirstName] = useState(typeof metadata.first_name === "string" ? metadata.first_name : existingName.split(/\s+/)[0] ?? "");
  const [lastName, setLastName] = useState(typeof metadata.last_name === "string" ? metadata.last_name : existingName.split(/\s+/).slice(1).join(" "));
  const [birthDate, setBirthDate] = useState(typeof metadata.birth_date === "string" ? metadata.birth_date : "");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    void supabase.from("profiles").select("first_name,last_name,birth_date,avatar_path").eq("id", user.id).single().then(({ data }) => {
      if (!data) return;
      if (data.first_name) setFirstName(data.first_name);
      if (data.last_name) setLastName(data.last_name);
      if (data.birth_date) setBirthDate(data.birth_date);
      if (data.avatar_path) void supabase.storage.from("avatars").createSignedUrl(data.avatar_path, 3600).then(({ data: signed }) => setAvatarUrl(signed?.signedUrl ?? ""));
    });
  }, [user]);

  const uploadAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    setPending(true); setError(""); setMessage("");
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/profile.${extension}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
    if (uploadError) { setError(uploadError.message); setPending(false); return; }
    const { error: profileError } = await supabase.from("profiles").update({ avatar_path: path }).eq("id", user.id);
    const { error: authError } = await supabase.auth.updateUser({ data: { avatar_path: path } });
    setPending(false);
    if (profileError || authError) setError((profileError || authError)?.message ?? "No pudimos guardar la foto.");
    else {
      const { data: signed } = await supabase.storage.from("avatars").createSignedUrl(path, 3600);
      setAvatarUrl(signed?.signedUrl ?? ""); setMessage("Foto de perfil actualizada.");
    }
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setPending(true); setMessage(""); setError("");
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    const { error: profileError } = await supabase.from("profiles").update({ first_name: firstName.trim(), last_name: lastName.trim(), full_name: fullName, birth_date: birthDate || null }).eq("id", user.id);
    const { error: authError } = await supabase.auth.updateUser({ data: { full_name: fullName, first_name: firstName.trim(), last_name: lastName.trim(), birth_date: birthDate || null } });
    setPending(false);
    if (profileError || authError) setError((profileError || authError)?.message ?? "No pudimos guardar tus datos.");
    else setMessage("Tus datos se guardaron correctamente.");
  };

  const initials = `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase() || "NV";
  return <>
    <PageHeader eyebrow="Perfil" title="Datos personales" />
    <form className="section-block personal-data-form" onSubmit={save}>
      <div className="profile-photo-editor">
        {avatarUrl ? <img src={avatarUrl} alt="Foto de perfil" /> : <div className="large-avatar">{initials}</div>}
        <label className="profile-photo-button">Cambiar foto<input type="file" accept="image/*" onChange={(event) => void uploadAvatar(event)} hidden /></label>
      </div>
      <label className="form-field"><span>Nombre</span><input value={firstName} onChange={(event) => setFirstName(event.target.value)} required /></label>
      <label className="form-field"><span>Apellido</span><input value={lastName} onChange={(event) => setLastName(event.target.value)} required /></label>
      <label className="form-field"><span>Correo electrónico</span><input value={user?.email ?? ""} disabled /></label>
      <label className="form-field"><span>Fecha de nacimiento</span><input type="date" value={birthDate} max={new Date().toISOString().slice(0, 10)} onChange={(event) => setBirthDate(event.target.value)} /></label>
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

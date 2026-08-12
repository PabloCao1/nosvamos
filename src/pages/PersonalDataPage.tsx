import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type PointerEvent as ReactPointerEvent, type WheelEvent } from "react";
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
  const [cropSource, setCropSource] = useState("");
  const [zoom, setZoom] = useState(1);
  const [cropX, setCropX] = useState(0);
  const [cropY, setCropY] = useState(0);
  const [cropImageSize, setCropImageSize] = useState({ width: 1, height: 1 });
  const cropZoom = useRef(1);
  const cropPointers = useRef(new Map<number, { x: number; y: number }>());
  const lastGesture = useRef<{ x: number; y: number; distance: number } | null>(null);

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

  const chooseAvatar = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCropSource(typeof reader.result === "string" ? reader.result : "");
      requestAnimationFrame(() => document.getElementById("avatar-crop-editor")?.scrollIntoView({ behavior: "smooth", block: "center" }));
    };
    reader.onerror = () => setError("No pudimos abrir la foto seleccionada.");
    reader.readAsDataURL(file);
    cropZoom.current = 1;
    setZoom(1); setCropX(0); setCropY(0);
    event.target.value = "";
  };

  const closeCropper = () => {
    setCropSource("");
  };

  const readGesture = () => {
    const points = [...cropPointers.current.values()];
    if (!points.length) return null;
    if (points.length === 1) return { x: points[0].x, y: points[0].y, distance: 0 };
    const [first, second] = points;
    return {
      x: (first.x + second.x) / 2,
      y: (first.y + second.y) / 2,
      distance: Math.hypot(second.x - first.x, second.y - first.y),
    };
  };

  const limitOffset = (value: number, nextZoom: number, axis: "x" | "y") => {
    const previewSize = 230;
    const coverScale = Math.max(previewSize / cropImageSize.width, previewSize / cropImageSize.height);
    const renderedSize = (axis === "x" ? cropImageSize.width : cropImageSize.height) * coverScale * nextZoom;
    const maximum = Math.max(0, (renderedSize - previewSize) / 2);
    return Math.max(-maximum, Math.min(maximum, value));
  };

  const startCropGesture = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    cropPointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    lastGesture.current = readGesture();
  };

  const moveCropGesture = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!cropPointers.current.has(event.pointerId)) return;
    const previous = lastGesture.current;
    cropPointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const current = readGesture();
    if (!previous || !current) return;
    const zoomChange = previous.distance > 0 && current.distance > 0 ? current.distance / previous.distance : 1;
    const nextZoom = Math.max(1, Math.min(3, cropZoom.current * zoomChange));
    cropZoom.current = nextZoom;
    setZoom(nextZoom);
    setCropX((value) => limitOffset(value + current.x - previous.x, nextZoom, "x"));
    setCropY((value) => limitOffset(value + current.y - previous.y, nextZoom, "y"));
    lastGesture.current = current;
  };

  const endCropGesture = (event: ReactPointerEvent<HTMLDivElement>) => {
    cropPointers.current.delete(event.pointerId);
    lastGesture.current = readGesture();
  };

  const zoomCropWithWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const nextZoom = Math.max(1, Math.min(3, cropZoom.current - event.deltaY * .002));
    cropZoom.current = nextZoom;
    setZoom(nextZoom);
    setCropX((value) => limitOffset(value, nextZoom, "x"));
    setCropY((value) => limitOffset(value, nextZoom, "y"));
  };

  const saveCroppedAvatar = async () => {
    if (!cropSource || !user) return;
    setPending(true); setError(""); setMessage("");
    const image = new Image();
    image.src = cropSource;
    await image.decode();
    const sourceSize = Math.min(image.naturalWidth, image.naturalHeight) / zoom;
    const previewScale = 230 / sourceSize;
    const sourceX = Math.max(0, Math.min(image.naturalWidth - sourceSize, (image.naturalWidth - sourceSize) / 2 - cropX / previewScale));
    const sourceY = Math.max(0, Math.min(image.naturalHeight - sourceSize, (image.naturalHeight - sourceSize) / 2 - cropY / previewScale));
    const canvas = document.createElement("canvas");
    canvas.width = 512; canvas.height = 512;
    canvas.getContext("2d")?.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, 512, 512);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
    if (!blob) { setError("No pudimos recortar la foto."); setPending(false); return; }
    const path = `${user.id}/profile.jpg`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, blob, { upsert: true, contentType: "image/jpeg" });
    if (uploadError) { setError(uploadError.message); setPending(false); return; }
    const { error: profileError } = await supabase.from("profiles").update({ avatar_path: path }).eq("id", user.id);
    const { error: authError } = await supabase.auth.updateUser({ data: { avatar_path: path } });
    setPending(false);
    if (profileError || authError) setError((profileError || authError)?.message ?? "No pudimos guardar la foto.");
    else {
      const { data: signed } = await supabase.storage.from("avatars").createSignedUrl(path, 3600);
      setAvatarUrl(signed?.signedUrl ?? ""); setMessage("Foto de perfil actualizada."); closeCropper();
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
        <label className="profile-photo-button">Cambiar foto<input type="file" accept="image/*" onChange={chooseAvatar} hidden /></label>
      </div>
      {cropSource && <section id="avatar-crop-editor" className="avatar-crop-inline" aria-labelledby="avatar-crop-title">
        <h2 id="avatar-crop-title">Ajustar foto</h2>
        <div
          className="avatar-crop-preview"
          onPointerDown={startCropGesture}
          onPointerMove={moveCropGesture}
          onPointerUp={endCropGesture}
          onPointerCancel={endCropGesture}
          onWheel={zoomCropWithWheel}
        >
          <img
            src={cropSource}
            alt="Vista previa"
            draggable={false}
            onLoad={(event) => setCropImageSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
            style={{
              width: cropImageSize.width >= cropImageSize.height ? `${230 * cropImageSize.width / cropImageSize.height}px` : "230px",
              height: cropImageSize.height >= cropImageSize.width ? `${230 * cropImageSize.height / cropImageSize.width}px` : "230px",
              transform: `translate(${cropX}px, ${cropY}px) scale(${zoom})`,
            }}
          />
        </div>
        <p className="avatar-crop-hint">Arrastrá para centrar · Pellizcá con dos dedos para ajustar</p>
        <div className="confirm-actions">
          <Button variant="secondary" onClick={closeCropper}>Cancelar</Button>
          <Button variant="primary" disabled={pending} onClick={() => void saveCroppedAvatar()}>{pending ? "Guardando..." : "Guardar foto"}</Button>
        </div>
      </section>}
      <label className="form-field"><span>Nombre</span><input value={firstName} onChange={(event) => setFirstName(event.target.value)} /></label>
      <label className="form-field"><span>Apellido</span><input value={lastName} onChange={(event) => setLastName(event.target.value)} /></label>
      <label className="form-field"><span>Correo electrónico</span><input value={user?.email ?? ""} disabled /></label>
      <label className="form-field"><span>Fecha de nacimiento</span><input type="date" value={birthDate} max={new Date().toISOString().slice(0, 10)} onChange={(event) => setBirthDate(event.target.value)} /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      {message && <p className="form-success" role="status">{message}</p>}
      <Button type="submit" variant="primary" fullWidth disabled={pending}>{pending ? "Guardando..." : "Guardar"}</Button>
    </form>
    <section className="section-block password-action-card">
      <div><strong>Contraseña</strong><p>Actualizá la clave con la que ingresás a NosVamos.</p></div>
      <Button variant="secondary" fullWidth onClick={() => navigate("/actualizar-clave", { state: { from: "/datos-personales" } })}>Cambiar contraseña</Button>
    </section>
  </>;
}

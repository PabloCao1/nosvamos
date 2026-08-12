import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { PageHeader } from "../components/layout/PageHeader";
import { Button } from "../components/ui/Button";
import { Icon } from "../components/ui/Icon";
import { ErrorState, LoadingState } from "../components/ui/PageState";
import { useTrip } from "../hooks/useTrips";
import { supabase } from "../lib/supabase";

type TripDocument = {
  id: string; file_name: string; mime_type: string; size_bytes: number;
  storage_path: string; kind: string; created_at: string;
};

const readableSize = (bytes: number) => bytes < 1024 * 1024
  ? `${Math.max(1, Math.round(bytes / 1024))} KB`
  : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export function DocumentsPage() {
  const { tripId } = useParams();
  const { data: trip, isLoading, isError, refetch } = useTrip(tripId);
  const [documents, setDocuments] = useState<TripDocument[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(true);
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);

  const loadDocuments = useCallback(async () => {
    if (!tripId) return;
    setLoadingDocuments(true);
    const { data, error: loadError } = await supabase.from("documents").select("id,file_name,mime_type,size_bytes,storage_path,kind,created_at")
      .eq("trip_id", tripId).is("deleted_at", null).order("created_at", { ascending: false });
    if (loadError) setError("No pudimos cargar los documentos.");
    else setDocuments((data ?? []) as TripDocument[]);
    setLoadingDocuments(false);
  }, [tripId]);

  useEffect(() => { void loadDocuments(); }, [loadDocuments]);

  if (isLoading) return <LoadingState />;
  if (isError || !trip) return <ErrorState onRetry={() => void refetch()} />;

  const upload = async (file?: File) => {
    if (!file || !tripId) return;
    if (file.size > 20 * 1024 * 1024) { setError("El archivo no puede superar los 20 MB."); return; }
    setError(""); setBusy("upload");
    const id = crypto.randomUUID();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `${tripId}/${id}/${safeName}`;
    const { error: uploadError } = await supabase.storage.from("trip-documents").upload(path, file, { contentType: file.type || "application/octet-stream" });
    if (uploadError) { setError("No pudimos subir el archivo."); setBusy(undefined); return; }
    const { error: insertError } = await supabase.from("documents").insert({
      id, trip_id: tripId, storage_path: path, file_name: file.name,
      mime_type: file.type || "application/octet-stream", size_bytes: file.size,
      kind: file.type.startsWith("image/") ? "image" : file.type === "application/pdf" ? "pdf" : "other",
    });
    if (insertError) {
      await supabase.storage.from("trip-documents").remove([path]);
      setError("El archivo se subió, pero no pudimos registrarlo.");
    } else await loadDocuments();
    if (input.current) input.current.value = "";
    setBusy(undefined);
  };

  const openDocument = async (document: TripDocument) => {
    setBusy(document.id); setError("");
    const { data, error: signedError } = await supabase.storage.from("trip-documents").createSignedUrl(document.storage_path, 300);
    if (signedError || !data?.signedUrl) setError("No pudimos abrir el documento.");
    else window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    setBusy(undefined);
  };

  const removeDocument = async (document: TripDocument) => {
    if (!window.confirm(`¿Eliminar ${document.file_name}?`)) return;
    setBusy(document.id); setError("");
    const { error: storageError } = await supabase.storage.from("trip-documents").remove([document.storage_path]);
    const { error: rowError } = await supabase.from("documents").update({ deleted_at: new Date().toISOString() }).eq("id", document.id);
    if (storageError || rowError) setError("No pudimos eliminar completamente el documento.");
    else setDocuments((items) => items.filter((item) => item.id !== document.id));
    setBusy(undefined);
  };

  return <>
    <PageHeader eyebrow={trip.name} title="Documentos" />
    <section className="privacy-note">
      <Icon name="lock" size={21} />
      <div><strong>Archivos privados</strong><p>Solo los integrantes del viaje pueden abrirlos mediante enlaces temporales.</p></div>
    </section>
    <section className="section-block">
      <div className="section-heading">
        <div><p className="eyebrow">Archivos del grupo</p><h2>Documentos</h2></div><span>{documents.length}</span>
      </div>
      <input ref={input} className="sr-only" type="file" accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx" onChange={(event) => void upload(event.target.files?.[0])} />
      <Button variant="secondary" icon="plus" fullWidth disabled={busy === "upload"} onClick={() => input.current?.click()}>
        {busy === "upload" ? "Subiendo…" : "Agregar documento"}
      </Button>
      {error && <p className="form-error" role="alert">{error}</p>}
      {loadingDocuments ? <div className="document-list-loading" aria-label="Cargando documentos"><span className="skeleton-block" /><span className="skeleton-block" /></div>
        : documents.length === 0 ? <div className="empty-state compact"><span className="empty-icon"><Icon name="receipt" size={28} /></span><h2>Todavía no hay documentos</h2><p>Agregá seguros, tickets o comprobantes importantes.</p></div>
          : <div className="document-list">{documents.map((document) => <article className="document-row" key={document.id}>
            <span className="document-row-icon"><Icon name="receipt" size={22} /></span>
            <button className="document-row-main" disabled={busy === document.id} onClick={() => void openDocument(document)}>
              <strong>{document.file_name}</strong><small>{readableSize(document.size_bytes)}</small>
            </button>
            <button className="icon-action danger" aria-label={`Eliminar ${document.file_name}`} disabled={busy === document.id} onClick={() => void removeDocument(document)}><Icon name="trash" size={19} /></button>
          </article>)}</div>}
    </section>
  </>;
}

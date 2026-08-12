import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "../components/layout/PageHeader";
import { Button } from "../components/ui/Button";
import { ErrorState, LoadingState } from "../components/ui/PageState";
import { useTrip } from "../hooks/useTrips";
import { supabase } from "../lib/supabase";
import { prepareReceiptImage } from "../lib/images/receiptImage";
import type { DocumentImportDraft } from "../types/documentImport";

const readDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(file);
});

export function DocumentImportPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { data: trip, isLoading, isError, refetch } = useTrip(tripId);
  const [file, setFile] = useState<File>();
  const [draft, setDraft] = useState<DocumentImportDraft>();
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");

  if (isLoading) return <LoadingState />;
  if (isError || !trip) return <ErrorState onRetry={() => void refetch()} />;

  const analyze = async () => {
    if (!file) return;
    if (file.type === "application/pdf" && file.size > 5 * 1024 * 1024) { setError("El PDF no puede superar los 5 MB."); return; }
    setAnalyzing(true); setError(""); setDraft(undefined);
    try {
      const isImage = file.type.startsWith("image/");
      const dataUrl = isImage ? await prepareReceiptImage(file) : await readDataUrl(file);
      const { data, error: invokeError } = await supabase.functions.invoke("analyze-document", {
        body: { filename: file.name, mimeType: isImage ? "image/jpeg" : file.type, dataUrl },
      });
      if (invokeError) throw new Error("No pudimos analizar el archivo. Verificá que el servicio de análisis esté configurado.");
      setDraft(data as DocumentImportDraft);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No pudimos analizar el documento.");
    } finally { setAnalyzing(false); }
  };

  const continueToForm = () => {
    if (!draft) return;
    const formType = draft.kind === "expense" ? "expense" : ["hotel", "apartment"].includes(draft.kind) ? "lodging" : ["flight", "train", "bus", "ferry", "car"].includes(draft.kind) ? "transport" : "reservation";
    navigate(`/viaje/${trip.id}/nuevo/${formType}`, { state: { importDraft: draft } });
  };

  return <>
    <PageHeader eyebrow={trip.name} title="Escanear documento" />
    <section className="page-editor entity-form-page">
      <div className="entity-form">
        <label className="receipt-upload">
          <input type="file" accept="image/*,application/pdf" capture="environment" onChange={(event) => { setFile(event.target.files?.[0]); setDraft(undefined); setError(""); }} />
          <span>+</span><div><strong>{file?.name ?? "Elegir foto o PDF"}</strong><p>Usá la cámara, Fotos o Archivos</p></div>
        </label>
        <Button variant="primary" fullWidth disabled={!file || analyzing} onClick={() => void analyze()}>{analyzing ? "Analizando…" : "Analizar documento"}</Button>
        {error && <p className="form-error" role="alert">{error}</p>}
        {draft && <section className="event-detail-card">
          <div className="event-detail-row"><span>Detectado</span><strong>{draft.kind}</strong></div>
          <div className="event-detail-row"><span>Nombre</span><strong>{draft.title ?? "Revisar"}</strong></div>
          <div className="event-detail-row"><span>Fecha</span><strong>{draft.startAt ?? draft.expenseDate ?? "Revisar"}</strong></div>
          <div className="event-detail-row"><span>Importe</span><strong>{draft.amount == null ? "Revisar" : `${draft.currency ?? ""} ${draft.amount}`}</strong></div>
          <p className="form-note">Confianza del análisis: {Math.round(draft.confidence * 100)}%. Revisá todos los datos antes de guardar.</p>
          <Button variant="primary" fullWidth onClick={continueToForm}>Revisar y completar</Button>
        </section>}
      </div>
    </section>
  </>;
}

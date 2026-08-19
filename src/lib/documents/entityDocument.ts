import { supabase } from "../supabase";
import type { DocumentImportDraft } from "../../types/documentImport";

export type EntityDocument = {
  id?: string;
  fileName: string;
  mimeType: string;
  size: number;
  url: string;
};

type EntityLink = { reservationId?: string; expenseId?: string; activityId?: string };

const linkColumn = (link: EntityLink): [string, string | undefined] => link.reservationId
  ? ["reservation_id", link.reservationId]
  : link.expenseId
    ? ["expense_id", link.expenseId]
    : ["activity_id", link.activityId];

export async function loadEntityDocument(link: EntityLink): Promise<EntityDocument | undefined> {
  const [column, id] = linkColumn(link);
  if (!id) return undefined;
  const { data, error } = await supabase.from("documents")
    .select("id,file_name,mime_type,size_bytes,storage_path")
    .eq(column, id).is("deleted_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  if (!data) return undefined;
  const { data: signed, error: signedError } = await supabase.storage.from("trip-documents").createSignedUrl(data.storage_path, 60 * 60);
  if (signedError || !signed?.signedUrl) throw signedError ?? new Error("No pudimos abrir el documento.");
  return { id: data.id, fileName: data.file_name, mimeType: data.mime_type, size: data.size_bytes, url: signed.signedUrl };
}

export async function saveImportedDocument(tripId: string, attachment: NonNullable<DocumentImportDraft["attachment"]>, link: EntityLink) {
  const id = crypto.randomUUID();
  const safeName = attachment.fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `${tripId}/${id}/${safeName}`;
  const blob = await fetch(attachment.dataUrl).then((response) => response.blob());
  const { error: uploadError } = await supabase.storage.from("trip-documents").upload(path, blob, { contentType: attachment.mimeType });
  if (uploadError) throw uploadError;
  const { error: insertError } = await supabase.from("documents").insert({
    id,
    trip_id: tripId,
    reservation_id: link.reservationId ?? null,
    expense_id: link.expenseId ?? null,
    activity_id: link.activityId ?? null,
    storage_path: path,
    file_name: attachment.fileName,
    mime_type: attachment.mimeType,
    size_bytes: blob.size,
    kind: attachment.mimeType.startsWith("image/") ? "image" : attachment.mimeType === "application/pdf" ? "pdf" : "other",
  });
  if (insertError) {
    await supabase.storage.from("trip-documents").remove([path]);
    throw insertError;
  }
}

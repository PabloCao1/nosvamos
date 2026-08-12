import OpenAI from "npm:openai@5";
import { createClient } from "npm:@supabase/supabase-js@2";

const nullable = (type: string) => ({ type: [type, "null"] });
const schema = {
  type: "object", additionalProperties: false,
  properties: {
    kind: { type: "string", enum: ["flight", "hotel", "apartment", "car", "train", "bus", "ferry", "expense", "other"] },
    title: nullable("string"), providerName: nullable("string"), providerReference: nullable("string"), confirmationCode: nullable("string"),
    startAt: nullable("string"), endAt: nullable("string"), city: nullable("string"), country: nullable("string"),
    originCity: nullable("string"), destinationCity: nullable("string"), originPlace: nullable("string"), destinationPlace: nullable("string"),
    serviceNumber: nullable("string"), address: nullable("string"), amount: nullable("number"), currency: nullable("string"), paid: nullable("boolean"),
    expenseCategory: { type: ["string", "null"], enum: ["transport", "lodging", "food", "activities", "shopping", "insurance", "other", null] },
    expenseDate: nullable("string"), confidence: { type: "number", minimum: 0, maximum: 1 },
  },
  required: ["kind", "title", "providerName", "providerReference", "confirmationCode", "startAt", "endAt", "city", "country", "originCity", "destinationCity", "originPlace", "destinationPlace", "serviceNumber", "address", "amount", "currency", "paid", "expenseCategory", "expenseDate", "confidence"],
};

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info" };
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: corsHeaders });

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const authorization = request.headers.get("authorization") ?? "";
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authorization } } });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: "Unauthorized" }, 401);
  const { filename, mimeType, dataUrl } = await request.json();
  if (!filename || !dataUrl || !["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"].includes(mimeType)) return json({ error: "Archivo no compatible" }, 400);
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return json({ error: "El servicio de análisis todavía no está configurado." }, 503);
  const openai = new OpenAI({ apiKey });
  const fileContent = mimeType === "application/pdf"
    ? { type: "input_file" as const, filename, file_data: dataUrl }
    : { type: "input_image" as const, image_url: dataUrl, detail: "high" as const };
  try {
    const response = await openai.responses.create({
    model: "gpt-4o-mini",
    input: [{ role: "user", content: [
      { type: "input_text", text: "Analizá este documento de viaje o comprobante. Extraé sólo datos visibles. Fechas y horas en formato YYYY-MM-DDTHH:mm, sin convertir zona horaria. Si falta un dato usá null. Clasificá con precisión y no inventes." },
      fileContent,
    ] }],
    text: { format: { type: "json_schema", name: "travel_document", strict: true, schema } },
    });
    return json(JSON.parse(response.output_text));
  } catch (error) {
    console.error("Document analysis failed", error);
    return json({ error: "No pudimos interpretar el documento." }, 502);
  }
});

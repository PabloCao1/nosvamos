export interface CitySuggestion {
  id: number;
  name: string;
  country: string;
  region?: string;
  latitude: number;
  longitude: number;
}

interface OpenMeteoResult {
  id: number;
  name: string;
  country?: string;
  admin1?: string;
  latitude: number;
  longitude: number;
}

export async function searchCities(query: string, signal?: AbortSignal): Promise<CitySuggestion[]> {
  const normalized = query.trim().toLocaleLowerCase("es");
  if (normalized.length < 2) return [];
  const key = `brujula:cities:${normalized}`;

  try {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=7&language=es&format=json`,
      { signal },
    );
    if (!response.ok) throw new Error("No se pudieron buscar ciudades");
    const payload = (await response.json()) as { results?: OpenMeteoResult[] };
    const results = (payload.results ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      country: item.country ?? "",
      region: item.admin1,
      latitude: item.latitude,
      longitude: item.longitude,
    }));
    localStorage.setItem(key, JSON.stringify(results));
    return results;
  } catch (error) {
    if (signal?.aborted) throw error;
    return JSON.parse(localStorage.getItem(key) ?? "[]") as CitySuggestion[];
  }
}

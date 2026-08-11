export interface CityImageResult {
  url: string;
  sourcePage: string;
  title: string;
}

interface WikiPage {
  pageid: number;
  title: string;
  thumbnail?: { source: string };
}

export async function findCityImage(city: string, country?: string): Promise<CityImageResult | null> {
  const query = [city.replace(" Aeropuerto", ""), country].filter(Boolean).join(" ");
  const key = `brujula:city-image:${query.toLocaleLowerCase("es")}`;
  const cached = localStorage.getItem(key);
  if (cached) return JSON.parse(cached) as CityImageResult;

  const params = new URLSearchParams({
    action: "query",
    format: "json",
    origin: "*",
    generator: "search",
    gsrsearch: query,
    gsrlimit: "5",
    prop: "pageimages",
    piprop: "thumbnail",
    pithumbsize: "900",
  });
  try {
    const response = await fetch(`https://es.wikipedia.org/w/api.php?${params}`);
    if (!response.ok) return null;
    const payload = (await response.json()) as { query?: { pages?: Record<string, WikiPage> } };
    const page = Object.values(payload.query?.pages ?? {}).find((item) => item.thumbnail?.source);
    if (!page?.thumbnail) return null;
    const result = {
      url: page.thumbnail.source,
      sourcePage: `https://es.wikipedia.org/?curid=${page.pageid}`,
      title: page.title,
    };
    localStorage.setItem(key, JSON.stringify(result));
    return result;
  } catch {
    return null;
  }
}

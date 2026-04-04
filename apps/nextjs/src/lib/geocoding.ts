const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

interface GeocodingResult {
  latitude: number;
  longitude: number;
  displayName: string;
}

export async function geocodeAddressClient(
  query: string,
): Promise<GeocodingResult | null> {
  if (!query || query.length < 3) return null;

  try {
    const url = new URL("/search", NOMINATIM_BASE_URL);
    url.searchParams.set("q", query);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "ImmoManager/1.0",
      },
    });

    if (!response.ok) return null;

    const results: NominatimResult[] = await response.json();

    if (results.length === 0) return null;

    return {
      latitude: parseFloat(results[0].lat),
      longitude: parseFloat(results[0].lon),
      displayName: results[0].display_name,
    };
  } catch {
    return null;
  }
}

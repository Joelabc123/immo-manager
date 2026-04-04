import { logger } from "@/lib/logger";

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

const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";

export async function geocodeAddress(
  street: string | null | undefined,
  city: string | null | undefined,
  zipCode: string | null | undefined,
  country: string,
): Promise<GeocodingResult | null> {
  const parts = [street, zipCode, city, country].filter(Boolean);
  if (parts.length < 2) return null;

  const query = parts.join(", ");

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

    if (!response.ok) {
      logger.warn({ status: response.status }, "Nominatim geocoding failed");
      return null;
    }

    const results: NominatimResult[] = await response.json();

    if (results.length === 0) {
      return null;
    }

    return {
      latitude: parseFloat(results[0].lat),
      longitude: parseFloat(results[0].lon),
      displayName: results[0].display_name,
    };
  } catch (error) {
    logger.error({ error }, "Geocoding error");
    return null;
  }
}

interface OverpassPoi {
  type: string;
  id: number;
  lat: number;
  lon: number;
  tags: Record<string, string>;
}

interface PoiResult {
  category: string;
  name: string;
  distance: number;
  lat: number;
  lon: number;
}

interface PoiSummary {
  pois: PoiResult[];
  score: number;
}

const POI_CATEGORIES: Record<string, string> = {
  restaurant: "[amenity=restaurant]",
  supermarket: "[shop=supermarket]",
  doctor: "[amenity=doctors]",
  kindergarten: "[amenity=kindergarten]",
  pharmacy: "[amenity=pharmacy]",
  school: "[amenity=school]",
  public_transport: "[public_transport=stop_position]",
};

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculatePoiScore(pois: PoiResult[]): number {
  if (pois.length === 0) return 0;

  const categoryScores: Record<string, number> = {};

  for (const poi of pois) {
    const distanceScore = Math.max(0, 100 - (poi.distance / 1000) * 100);
    const current = categoryScores[poi.category] ?? 0;
    categoryScores[poi.category] = Math.max(current, distanceScore);
  }

  const scores = Object.values(categoryScores);
  const avgScore =
    scores.reduce((a, b) => a + b, 0) / Object.keys(POI_CATEGORIES).length;

  return Math.round(Math.min(100, avgScore));
}

export async function fetchPois(
  latitude: number,
  longitude: number,
  radiusMeters = 1000,
): Promise<PoiSummary> {
  const queries = Object.entries(POI_CATEGORIES)
    .map(
      ([, filter]) =>
        `node${filter}(around:${radiusMeters},${latitude},${longitude});`,
    )
    .join("\n");

  const query = `[out:json][timeout:10];(\n${queries}\n);out body;`;

  try {
    const response = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!response.ok) {
      logger.warn({ status: response.status }, "Overpass API request failed");
      return { pois: [], score: 0 };
    }

    const data = await response.json();
    const elements: OverpassPoi[] = data.elements ?? [];

    const pois: PoiResult[] = elements.map((el) => {
      const distance = haversineDistance(latitude, longitude, el.lat, el.lon);

      let category = "other";
      for (const [cat, filter] of Object.entries(POI_CATEGORIES)) {
        const match = filter.match(/\[(\w+)=(\w+)\]/);
        if (match && el.tags[match[1]] === match[2]) {
          category = cat;
          break;
        }
      }

      return {
        category,
        name: el.tags.name ?? category,
        distance: Math.round(distance),
        lat: el.lat,
        lon: el.lon,
      };
    });

    // Keep only the 5 closest per category
    const grouped = new Map<string, PoiResult[]>();
    for (const poi of pois) {
      const existing = grouped.get(poi.category) ?? [];
      existing.push(poi);
      grouped.set(poi.category, existing);
    }
    const filtered: PoiResult[] = [];
    for (const [, items] of grouped) {
      items.sort((a, b) => a.distance - b.distance);
      filtered.push(...items.slice(0, 5));
    }

    return {
      pois: filtered,
      score: calculatePoiScore(filtered),
    };
  } catch (error) {
    logger.error({ error }, "Overpass API error");
    return { pois: [], score: 0 };
  }
}

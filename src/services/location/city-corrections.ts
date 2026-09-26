/**
 * City name spell-correction and alias resolution for geocoding search.
 * Resolves frequent typos, transpositions (e.g. 'duabi' -> 'Dubai'), and regional aliases.
 */

export const COMMON_CITY_TYPOS: Record<string, string> = {
  // Common transpositions & global typos
  duabi: "Dubai",
  dubay: "Dubai",
  dibai: "Dubai",
  mubai: "Mumbai",
  mumbay: "Mumbai",
  bombay: "Mumbai",
  dehli: "Delhi",
  dilli: "Delhi",
  newdehli: "New Delhi",
  banglore: "Bengaluru",
  bangalore: "Bengaluru",
  kolkatta: "Kolkata",
  calcutta: "Kolkata",
  chandigadh: "Chandigarh",
  ahmdabad: "Ahmedabad",
  ahmedbad: "Ahmedabad",
  hydrabad: "Hyderabad",
  hydarabad: "Hyderabad",
  chenai: "Chennai",
  madras: "Chennai",
  jaiput: "Jaipur",
  lakhnau: "Lucknow",
  lucknoww: "Lucknow",
  cawnpore: "Kanpur",
  kanpu: "Kanpur",
  kanpurr: "Kanpur",
  varanasi: "Varanasi",
  banaras: "Varanasi",
  kashi: "Varanasi",
  benares: "Varanasi",
  gurgaon: "Gurugram",
  gurgao: "Gurugram",
  gurugam: "Gurugram",
  noida: "Noida",
  nodia: "Noida",
  noidaa: "Noida",
  noeda: "Noida",
  ghaziabad: "Ghaziabad",
  faridabad: "Faridabad",
  pune: "Pune",
  poona: "Pune",
  nagpur: "Nagpur",
  indore: "Indore",
  bhopal: "Bhopal",
  patna: "Patna",
  vadodara: "Vadodara",
  baroda: "Vadodara",
  amritsar: "Amritsar",
  ludhiana: "Ludhiana",
  agra: "Agra",
  shimla: "Shimla",
  dehradun: "Dehradun",
  srinagar: "Srinagar",
  singapur: "Singapore",
  singapore: "Singapore",
  londan: "London",
  londn: "London",
  newyork: "New York",
  newyorkcity: "New York",
  tokio: "Tokyo",
  bejing: "Beijing",
  moskow: "Moscow",
  barcelone: "Barcelona",
  peris: "Paris",
  roma: "Rome",
  sidney: "Sydney",
};

/**
 * Prominent global and Indian metropolitan cities used for fuzzy distance matching.
 */
export const MAJOR_CITIES: string[] = [
  // Global Metropolises
  "Dubai",
  "Abu Dhabi",
  "Doha",
  "Riyadh",
  "London",
  "New York",
  "Paris",
  "Tokyo",
  "Singapore",
  "Bangkok",
  "Sydney",
  "Melbourne",
  "Toronto",
  "Vancouver",
  "Los Angeles",
  "San Francisco",
  "Chicago",
  "Berlin",
  "Frankfurt",
  "Madrid",
  "Barcelona",
  "Rome",
  "Milan",
  "Amsterdam",
  "Zurich",
  "Cairo",
  "Istanbul",
  "Moscow",
  "Beijing",
  "Shanghai",
  "Hong Kong",
  "Seoul",
  "Kuala Lumpur",
  "Jakarta",
  "Dhaka",
  "Colombo",
  "Kathmandu",
  // Top Indian Metros & Capitals
  "Delhi",
  "New Delhi",
  "Mumbai",
  "Bengaluru",
  "Kolkata",
  "Chennai",
  "Hyderabad",
  "Ahmedabad",
  "Pune",
  "Surat",
  "Jaipur",
  "Lucknow",
  "Kanpur",
  "Nagpur",
  "Indore",
  "Bhopal",
  "Patna",
  "Vadodara",
  "Ghaziabad",
  "Ludhiana",
  "Agra",
  "Nashik",
  "Faridabad",
  "Meerut",
  "Rajkot",
  "Varanasi",
  "Srinagar",
  "Aurangabad",
  "Dhanbad",
  "Amritsar",
  "Navi Mumbai",
  "Prayagraj",
  "Ranchi",
  "Gwalior",
  "Jabalpur",
  "Coimbatore",
  "Vijayawada",
  "Jodhpur",
  "Madurai",
  "Raipur",
  "Kota",
  "Chandigarh",
  "Guwahati",
  "Mysore",
  "Gurugram",
  "Noida",
  "Jalandhar",
  "Bhubaneswar",
  "Salem",
  "Warangal",
  "Thiruvananthapuram",
  "Kochi",
  "Dehradun",
  "Shimla",
];

/**
 * Calculates the Damerau-Levenshtein distance between two strings,
 * which counts insertions, deletions, substitutions, and adjacent transpositions.
 */
export function damerauLevenshtein(a: string, b: string): number {
  const al = a.length;
  const bl = b.length;
  if (!al) return bl;
  if (!bl) return al;

  const matrix: number[][] = [];
  for (let i = 0; i <= al; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= bl; j++) {
    matrix[0]![j] = j;
  }

  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i]![j] = Math.min(
        matrix[i - 1]![j]! + 1, // deletion
        matrix[i]![j - 1]! + 1, // insertion
        matrix[i - 1]![j - 1]! + cost // substitution
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        matrix[i]![j] = Math.min(matrix[i]![j]!, matrix[i - 2]![j - 2]! + 1); // transposition
      }
    }
  }

  return matrix[al]![bl]!;
}

/**
 * Attempt to find a high-confidence correction for a potentially misspelled city query.
 * Returns the corrected canonical city name if found, or null otherwise.
 */
export function getCityCorrection(query: string): string | null {
  const normalized = query.trim().toLowerCase().replace(/[^a-z0-9\s]/g, "");
  if (normalized.length < 3) return null;

  // 1. Direct dictionary match for known typos / aliases
  if (COMMON_CITY_TYPOS[normalized]) {
    return COMMON_CITY_TYPOS[normalized]!;
  }

  // 2. Transposition / fuzzy distance matching against major cities
  let bestCandidate: string | null = null;
  let minDistance = Infinity;

  for (const city of MAJOR_CITIES) {
    const cityNorm = city.toLowerCase();
    // Allow edit distance of 1 for 4-5 letter queries, and up to 2 for >= 6 letter queries
    const maxAllowedDistance = normalized.length <= 5 ? 1 : 2;
    const dist = damerauLevenshtein(normalized, cityNorm);

    if (dist <= maxAllowedDistance && dist < minDistance) {
      minDistance = dist;
      bestCandidate = city;
    }
  }

  return bestCandidate;
}

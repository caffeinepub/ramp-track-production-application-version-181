// Automatic Gate Location System - GPS-based gate detection using Haversine formula

interface GateCoordinate {
  gate: string;
  lat: number;
  lng: number;
}

// Internal constant gate coordinate table
const GATE_COORDINATES: readonly GateCoordinate[] = [
  { gate: "B1", lat: 33.43652941271447, lng: -111.99648442024326 },
  { gate: "B2", lat: 33.43668190654748, lng: -111.99705682189241 },
  { gate: "B3", lat: 33.43673513220326, lng: -111.99651112464439 },
  { gate: "B4", lat: 33.43688154066052, lng: -111.99706718842459 },
  { gate: "B5", lat: 33.43718145515051, lng: -111.99650353821168 },
  { gate: "B6", lat: 33.43741056883996, lng: -111.99706240387128 },
  { gate: "B7", lat: 33.43737137911717, lng: -111.99651965938126 },
  { gate: "B8", lat: 33.4376780762007, lng: -111.99706798585063 },
  { gate: "B9", lat: 33.43776458337843, lng: -111.99654248243465 },
  { gate: "B10", lat: 33.43794225554831, lng: -111.99706878327603 },
  { gate: "B11", lat: 33.43794225554789, lng: -111.99654487471129 },
  { gate: "B12", lat: 33.43803741314922, lng: -111.99696511795754 },
  { gate: "B13", lat: 33.43805338364498, lng: -111.99676097702903 },
  { gate: "B14", lat: 33.43804140577353, lng: -111.99689574193673 },
  { gate: "B15A", lat: 33.43647778584341, lng: -111.99387927676857 },
  { gate: "B15B", lat: 33.43670936191042, lng: -111.99284421844931 },
  { gate: "B16", lat: 33.43666411146744, lng: -111.99464161556904 },
  { gate: "B17", lat: 33.43661220651089, lng: -111.99393350170439 },
  { gate: "B18", lat: 33.43687040008856, lng: -111.99464480527213 },
  { gate: "B19", lat: 33.43679587005656, lng: -111.99398294208704 },
  { gate: "B20", lat: 33.43691964310474, lng: -111.9946527795274 },
  { gate: "B21", lat: 33.43724438013012, lng: -111.99399410604437 },
  { gate: "B22", lat: 33.43746530709402, lng: -111.99463364131637 },
  { gate: "B23", lat: 33.43766760116439, lng: -111.99403397732058 },
  { gate: "B24", lat: 33.43766627028742, lng: -111.99465756408296 },
  { gate: "B25", lat: 33.43792978422625, lng: -111.99400048544894 },
  { gate: "B26", lat: 33.43792179896715, lng: -111.99464161557242 },
  { gate: "B27", lat: 33.43805355564857, lng: -111.99427161012802 },
  { gate: "B28", lat: 33.43807618051315, lng: -111.99438005999964 },
  { gate: "A1", lat: 33.43651899128809, lng: -111.99903042276948 },
] as const;

const THRESHOLD_METERS = 120;

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * Returns distance in meters
 */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth's radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Get automatic location label based on GPS coordinates
 * Returns nearest gate label if within 120m threshold, otherwise "Out of area"
 */
export function getAutoLocation(lat: number, lng: number): string {
  let nearestGate: string | null = null;
  let minDistance = Infinity;

  for (const gate of GATE_COORDINATES) {
    const distance = haversineDistance(lat, lng, gate.lat, gate.lng);
    if (distance < minDistance) {
      minDistance = distance;
      nearestGate = gate.gate;
    }
  }

  if (minDistance <= THRESHOLD_METERS && nearestGate) {
    return nearestGate;
  }

  return "Out of area";
}


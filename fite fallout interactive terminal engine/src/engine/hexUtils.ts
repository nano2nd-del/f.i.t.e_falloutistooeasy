export interface HexCoord {
  q: number;
  r: number;
}

export function axialDistance(a: HexCoord, b: HexCoord): number {
  return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
}

export function getAgentsInRadius<T extends { hex: HexCoord }>(agents: T[], center: HexCoord, radius: number): T[] {
  return agents.filter(a => axialDistance(a.hex, center) <= radius);
}

// Flat-top hex direction vectors for q, r (starting east and rotating clockwise)
export const HEX_DIRECTIONS: HexCoord[] = [
  { q: 1, r: 0 },   // East
  { q: 0, r: 1 },   // Southeast
  { q: -1, r: 1 },  // Southwest
  { q: -1, r: 0 },  // West
  { q: 0, r: -1 },  // Northwest
  { q: 1, r: -1 }   // Northeast
];

export function getNeighbor(hex: HexCoord, directionIndex: number): HexCoord {
  const dir = HEX_DIRECTIONS[directionIndex % 6];
  return { q: hex.q + dir.q, r: hex.r + dir.r };
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function hexLerp(a: HexCoord, b: HexCoord, t: number): HexCoord {
  // Convert axial to cube
  const ax = a.q, ay = -a.q - a.r, az = a.r;
  const bx = b.q, by = -b.q - b.r, bz = b.r;

  const rx = lerp(ax, bx, t);
  const ry = lerp(ay, by, t);
  const rz = lerp(az, bz, t);

  // Cube round
  let qRound = Math.round(rx);
  let yRound = Math.round(ry);
  let rRound = Math.round(rz);

  const qDiff = Math.abs(qRound - rx);
  const yDiff = Math.abs(yRound - ry);
  const rDiff = Math.abs(rRound - rz);

  if (qDiff > yDiff && qDiff > rDiff) {
    qRound = -yRound - rRound;
  } else if (rDiff > yDiff) {
    rRound = -qRound - yRound;
  }

  return { q: qRound, r: rRound };
}

export function getHexLine(a: HexCoord, b: HexCoord): HexCoord[] {
  const N = axialDistance(a, b);
  const results: HexCoord[] = [];
  for (let i = 0; i <= N; i++) {
    results.push(hexLerp(a, b, N === 0 ? 0 : i / N));
  }
  return results;
}

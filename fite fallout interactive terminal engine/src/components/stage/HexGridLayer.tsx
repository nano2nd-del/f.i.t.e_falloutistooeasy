import React from 'react';
import { HexCoord } from '../../engine/types';
import { Landmark } from '../../engine/content';
import { getTerrainAt } from '../../engine/worldgen';

interface TerrainStyle {
  fill: string;
  stroke: string;
  label: string;
  emoji: string;
}

interface HexGridLayerProps {
  fullFalloutMapHexes: HexCoord[];
  playerCoords: HexCoord;
  visibilityRadius: number;
  discoveredHexes: HexCoord[];
  terrainStyles: Record<string, TerrainStyle>;
  selectedHex: HexCoord | null;
  hoveredHex: HexCoord | null;
  setHoveredHex: (hex: HexCoord | null) => void;
  onClickHex: (hex: HexCoord) => void;
  currentPath: HexCoord[];
  hexSize: number;
  zoom: number;
  buildingScale: number;
  playerScale: number;
  shadowEnabled: boolean;
  focusedObject: any;
  getLandmarkAt: (q: number, r: number) => Landmark | undefined;
  renderAgentsHandler: (q: number, r: number, cx: number, cy: number, landmarkPresent: boolean) => React.ReactNode;
  getPlayerEmoji: () => string;
}

// Flat-top hex vertices points calculator
export function getFlatTopHexPoints(cx: number, cy: number, size: number): string {
  const points = [];
  for (let i = 0; i < 6; i++) {
    const angle_rad = (Math.PI / 180) * (60 * i);
    const x = cx + size * Math.cos(angle_rad);
    const y = cy + size * Math.sin(angle_rad);
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return points.join(' ');
}

export const HexGridLayer: React.FC<HexGridLayerProps> = ({
  fullFalloutMapHexes,
  playerCoords,
  visibilityRadius,
  discoveredHexes = [],
  terrainStyles,
  selectedHex,
  hoveredHex,
  setHoveredHex,
  onClickHex,
  currentPath,
  hexSize,
  zoom,
  buildingScale,
  playerScale,
  shadowEnabled,
  focusedObject,
  getLandmarkAt,
  renderAgentsHandler,
  getPlayerEmoji,
}) => {
  // Axial distance calculation helper
  const calculateAxialDistance = (a: HexCoord, b: HexCoord): number => {
    return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
  };

  return (
    <g id="world-hex-cells">
      {fullFalloutMapHexes.map(({ q, r }) => {
        const isPlayer = playerCoords.q === q && playerCoords.r === r;
        const distToPlayer = calculateAxialDistance(playerCoords, { q, r });
        const isDiscovered = discoveredHexes?.some(h => h.q === q && h.r === r) || false;
        const isVisible = distToPlayer <= visibilityRadius || isDiscovered;

        if (!isVisible) {
          return null;
        }

        const terrain = getTerrainAt({ q, r });
        const config = terrainStyles[terrain] || terrainStyles['Wasteland'] || { fill: '#141414', stroke: '#33312e', label: 'Wasteland', emoji: '☠️' };
        const landmark = getLandmarkAt(q, r);

        const cx = hexSize * 1.5 * q;
        const cy = hexSize * Math.sqrt(3) * (r + q / 2);

        const isSelected = selectedHex && selectedHex.q === q && selectedHex.r === r;
        const isHovered = hoveredHex && hoveredHex.q === q && hoveredHex.r === r;
        const isOnPath = currentPath.some(h => h.q === q && h.r === r);

        let strokeColor = config.stroke;
        let strokeWidth = '0.5';
        let strokeDasharray: string | undefined = undefined;

        if (isPlayer) {
          strokeColor = '#f59e0b';
          strokeWidth = '1.8';
        } else if (isHovered) {
          strokeColor = '#ffffff';
          strokeWidth = '1.8';
        } else if (isSelected) {
          strokeColor = '#3b82f6';
          strokeWidth = '1.8';
        } else if (isOnPath) {
          strokeColor = '#10b981';
          strokeWidth = '1.2';
          strokeDasharray = '2,2';
        }

        return (
          <g 
            key={`cell_${q}_${r}`}
            onMouseEnter={() => setHoveredHex({ q, r })}
            onMouseLeave={() => setHoveredHex(null)}
            onClick={() => onClickHex({ q, r })}
            className="group cursor-pointer"
            id={`hex_cell_${q}_${r}`}
          >
            <polygon
              points={getFlatTopHexPoints(cx, cy, hexSize)}
              fill={config.fill}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDasharray}
              className="transition duration-100 hover:brightness-125"
              style={{ fillOpacity: isPlayer ? 1 : 0.8 }}
            />

            {zoom >= 1.3 && (
              <text
                x={cx}
                y={cy + 11}
                fill="rgba(245, 158, 11, 0.12)"
                fontSize="5.5"
                fontFamily="monospace"
                textAnchor="middle"
                className="pointer-events-none select-none"
              >
                {q},{r}
              </text>
            )}

            {landmark && (
              <g transform={`translate(${cx}, ${cy - 11})`} className="pointer-events-none select-none">
                {/* Main scaled landmark emoji with drop-shadows */}
                <text 
                  fontSize={(11 * buildingScale).toFixed(1)} 
                  textAnchor="middle" 
                  dominantBaseline="central"
                  style={{
                    textShadow: shadowEnabled ? '2px 2px 4px rgba(0,0,0,0.9)' : 'none'
                  }}
                >
                  {landmark.emoji}
                </text>

                {/* Multiple Objects placed in a single Grid cell */}
                {landmark.objectTemplates && landmark.objectTemplates.map((objId, idx) => {
                  const offsetAngle = (idx * Math.PI * 2) / Math.max(1, landmark.objectTemplates.length);
                  const offsetDist = 8 * playerScale;
                  const kx = offsetDist * Math.cos(offsetAngle);
                  const ky = offsetDist * Math.sin(offsetAngle);
                  // simple display icons for helper tags
                  const objEmoji = objId.includes('Terminal') ? '🖥️' : objId.includes('Grave') ? '🪦' : objId.includes('Chest') ? '📦' : '⚙️';
                  return (
                    <text
                      key={objId}
                      x={kx}
                      y={ky}
                      fontSize={(6.5 * playerScale).toFixed(1)}
                      textAnchor="middle"
                      dominantBaseline="central"
                      style={{
                        textShadow: shadowEnabled ? '1px 1px 3px rgba(0,0,0,0.9)' : 'none'
                      }}
                    >
                      {objEmoji}
                    </text>
                  );
                })}

                <text
                  y={13}
                  fontSize="5"
                  fill="#f59e0b"
                  fontWeight="bold"
                  fontFamily="sans-serif"
                  textAnchor="middle"
                  className="tracking-wider uppercase"
                >
                  {landmark.name.split(' ')[0].substring(0, 10)}
                </text>
              </g>
            )}

            {!landmark && !isPlayer && (
              <g className="pointer-events-none select-none">
                <text
                  x={cx}
                  y={cy - 2}
                  fontSize={(7.5 * playerScale).toFixed(1)}
                  opacity="0.12"
                  textAnchor="middle"
                  style={{
                    textShadow: shadowEnabled ? '1px 1px 2px rgba(0,0,0,0.6)' : 'none'
                  }}
                >
                  {config.emoji}
                </text>
                {/* Procedural cache indicators side-by-side within a single cell coordinate! */}
                {focusedObject && focusedObject.id === `scrap_${q}_${r}` && (
                  <g transform={`translate(${cx}, ${cy})`}>
                    <text x="-5" y="4" fontSize={(4.5 * playerScale).toFixed(1)} opacity="0.65">📦</text>
                    <text x="5" y="4" fontSize={(4.5 * playerScale).toFixed(1)} opacity="0.65">🔩</text>
                  </g>
                )}
              </g>
            )}

            {isPlayer && (
              <g transform={`translate(${cx}, ${cy + (landmark ? 8 : 0)})`} className="pointer-events-none select-none">
                <circle r={(10 * playerScale).toFixed(1)} fill="rgba(245, 158, 11, 0.15)" stroke="#f59e0b" strokeWidth="0.5" strokeDasharray="2,1" />
                <text 
                  fontSize={(13 * playerScale).toFixed(1)} 
                  textAnchor="middle" 
                  dominantBaseline="central" 
                  y="-1"
                  style={{
                    textShadow: shadowEnabled ? '2px 2px 4px rgba(0,0,0,0.85)' : 'none'
                  }}
                >
                  {getPlayerEmoji()}
                </text>
              </g>
            )}

            {!isPlayer && renderAgentsHandler(q, r, cx, cy, !!landmark)}
          </g>
        );
      })}
    </g>
  );
};

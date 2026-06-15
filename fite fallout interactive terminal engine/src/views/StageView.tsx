/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * StageView - Fallout 1 Inspired Tacticle Hex Map and HUD Overlays
 */

import React, { useState, useEffect, useMemo } from 'react';
import { HexCoord, Agent, AgentType, Landmark, WorldState, LogEntry, WorldEntity, GameEvent } from '../engine/types';
import { GameAction } from '../engine/reducer';
import { getTerrainAt, getScenicLocationName } from '../engine/worldgen';
import { axialDistance, getHexLine } from '../engine/hexUtils';
import { WORLD_LANDMARKS } from '../engine/content';
import { HexGridLayer } from '../components/stage/HexGridLayer';
import { AgentLayer } from '../components/stage/AgentLayer';
import { UIOverlayLayer } from '../components/stage/UIOverlayLayer';

export interface TerrainStyle {
  fill: string;
  stroke: string;
  label: string;
  emoji: string;
}

const DEFAULT_TERRAIN_STYLES: Record<string, TerrainStyle> = {
  Desert: { fill: '#1f160e', stroke: '#8c642d', label: 'Desert', emoji: '🏜️' },
  Swamp: { fill: '#0a0d0a', stroke: '#2d3f2a', label: 'Swamp', emoji: '🐊' },
  Mountain: { fill: '#14151a', stroke: '#353a45', label: 'Mountain', emoji: '🏔️' },
  Ruins: { fill: '#161616', stroke: '#3d3a36', label: 'Ruins', emoji: '🏚️' },
  Canyon: { fill: '#221310', stroke: '#502a24', label: 'Canyon', emoji: '🧱' },
  Wasteland: { fill: '#141414', stroke: '#33312e', label: 'Wasteland', emoji: '☠️' }
};

interface TightenedStageViewProps {
  player: WorldState['player'];
  inventory: WorldState['inventory'];
  world: WorldState['world'];
  encounter: WorldState['encounter'];
  travel: WorldState['travel'];
  simulation: WorldState['simulation'];
  flags?: WorldState['flags'];
  graves: WorldState['graves'];
  log: WorldState['log'];
  phase: WorldState['phase'];
  dispatch: React.Dispatch<GameAction>;
  selectedHex: HexCoord | null;
  setSelectedHex: (hex: HexCoord | null) => void;
  showAgentEmojis: boolean;
  onActiveComboChange?: (emoji: string, label: string) => void;
  buildingScale?: number;
  npcScale?: number;
  playerScale?: number;
  shadowEnabled?: boolean;
  terrainStyles?: Record<string, TerrainStyle>;
}

export const StageView: React.FC<TightenedStageViewProps> = ({ 
  player,
  inventory,
  world,
  encounter,
  travel,
  simulation,
  flags,
  graves,
  log,
  phase,
  dispatch, 
  selectedHex, 
  setSelectedHex,
  showAgentEmojis,
  onActiveComboChange,
  buildingScale = 3.0,
  npcScale = 1.3,
  playerScale = 1.5,
  shadowEnabled = true,
  terrainStyles = DEFAULT_TERRAIN_STYLES
}) => {
  // --- Grid and Camera Settings ---
  const [mapHeight, setMapHeight] = useState<number>(440); // Standard layout height targeting 1280x720 perfectly
  const [zoom, setZoom] = useState<number>(1.25); // Zoom scale
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 }); // drag/pan offset
  const [autoCenter, setAutoCenter] = useState<boolean>(true); // lock camera onto player coordinates
  const [hoveredHex, setHoveredHex] = useState<HexCoord | null>(null);

  // --- Active Character Animation Cycles (Emoji Combos) ---
  const [animationQueue, setAnimationQueue] = useState<string[]>([]);
  const [animationIndex, setAnimationIndex] = useState<number>(0);
  const [isWalking, setIsWalking] = useState<boolean>(false);
  const [walkingPath, setWalkingPath] = useState<HexCoord[]>([]);
  const [walkStateToggle, setWalkStateToggle] = useState<boolean>(false);
  const [isCampingInTent, setIsCampingInTent] = useState<boolean>(false);
  const [activeComboLabel, setActiveComboLabel] = useState<string>('Idle (Ready for action cycle)');
  const [firingFlash, setFiringFlash] = useState<boolean>(false);
  const [showCombatStage, setShowCombatStage] = useState<boolean>(true);

  const hexSize = 28;
  const playerCoords = player.coords;

  // Track coordinates of full board map - Doubled map size!
  const fullFalloutMapHexes = useMemo(() => {
    const list: HexCoord[] = [];
    const minQ = -17;
    const maxQ = 17;
    const minR = -12;
    const maxR = 22;
    for (let q = minQ; q <= maxQ; q++) {
      for (let r = minR; r <= maxR; r++) {
        // limit rendering range so it's a beautiful circular-hexagon map of size radius 20
        const dist = axialDistance({ q: 0, r: 0 }, { q, r });
        if (dist <= 20) {
          list.push({ q, r });
        }
      }
    }
    return list;
  }, []);

  const getLandmarkAt = (q: number, r: number) => {
    return WORLD_LANDMARKS.find(l => l.coords.q === q && l.coords.r === r);
  };

  // --- Coordinate Mapping: O(1) lookup during render pass instead of running array filter repeatedly ---
  const activeAgentsByHex = useMemo(() => {
    const map = new Map<string, Agent[]>();
    simulation.agents.forEach(agent => {
      if (agent.behaviorState !== 'dead') {
        const key = `${agent.hex.q},${agent.hex.r}`;
        let list = map.get(key);
        if (!list) {
          list = [];
          map.set(key, list);
        }
        list.push(agent);
      }
    });
    return map;
  }, [simulation.agents]);

  const getAgentsAt = (q: number, r: number) => {
    return activeAgentsByHex.get(`${q},${r}`) || [];
  };

  // Resolve current active frame emoji representation
  const getPlayerEmoji = (): string => {
    if (animationQueue.length > 0) {
      return animationQueue[animationIndex];
    }
    if (isWalking) {
      return walkStateToggle ? '🦿' : '🦵';
    }
    if (isCampingInTent) {
      return '🛏️';
    }
    return '🧍‍♂️';
  };

  // Report active physical loop back to state parent
  useEffect(() => {
    if (onActiveComboChange) {
      onActiveComboChange(getPlayerEmoji(), activeComboLabel);
    }
  }, [animationQueue, animationIndex, isWalking, walkStateToggle, isCampingInTent, activeComboLabel]);

  // Handle click movement sequences
  useEffect(() => {
    if (travel.ticksRemaining > 0 && travel.destination) {
      setIsWalking(true);
      setActiveComboLabel(`Traversing toward Sector [${travel.destination.q}, ${travel.destination.r}]`);
    } else if (walkingPath.length === 0) {
      setIsWalking(false);
      if (animationQueue.length === 0) {
        setActiveComboLabel('Idle (Ready for action cycle)');
      }
    }
  }, [travel.ticksRemaining, travel.destination, walkingPath.length]);

  // Handle micro walking step animation path triggering
  useEffect(() => {
    if (!isWalking || walkingPath.length === 0) return;

    let stepInterval = 400; // standard walking
    if (player.movementMode === 'running') {
      stepInterval = 220; // rapid sprint
    } else if (player.movementMode === 'sneaking') {
      stepInterval = 550; // slow sneak crouch
    }

    const timer = setTimeout(() => {
      const nextStep = walkingPath[0];
      dispatch({ type: 'TRAVEL_TO', payload: nextStep });
      setWalkStateToggle(prev => !prev);
      setWalkingPath(prev => prev.slice(1));
    }, stepInterval);

    return () => clearTimeout(timer);
  }, [isWalking, walkingPath, player.movementMode, dispatch]);

  // Auto-Centering Camera Logic
  useEffect(() => {
    if (autoCenter) {
      const px = hexSize * 1.5 * playerCoords.q;
      const py = hexSize * Math.sqrt(3) * (playerCoords.r + playerCoords.q / 2);
      setPanOffset({ x: -px, y: -py });
    }
  }, [playerCoords.q, playerCoords.r, autoCenter]);

  // Live Background NPC Simulation Tick - linked to customizable intervals and toggles
  const simInterval = (typeof flags?.globalSimInterval === 'number') ? flags.globalSimInterval : 3500;
  const enableSim = flags?.enableGlobalSimulation !== false;

  useEffect(() => {
    if (phase !== 'playing' || !enableSim) return;

    const interval = setInterval(() => {
      dispatch({ type: 'BACKGROUND_SIM_TICK' });
    }, simInterval);

    return () => clearInterval(interval);
  }, [phase, dispatch, simInterval, enableSim]);

  // Frame anim timer
  useEffect(() => {
    if (animationQueue.length === 0) return;

    const currentFrame = animationQueue[animationIndex];
    if (currentFrame === '💥') {
      setFiringFlash(true);
      setTimeout(() => setFiringFlash(false), 150);
    }

    const frameDuration = 450;
    const timer = setTimeout(() => {
      if (animationIndex < animationQueue.length - 1) {
        setAnimationIndex(prev => prev + 1);
      } else {
        if (animationQueue[animationQueue.length - 1] === '🛏️') {
          setIsCampingInTent(true);
        }
        setAnimationQueue([]);
        setAnimationIndex(0);
        setActiveComboLabel('Idle (Ready for action cycle)');
      }
    }, frameDuration);

    return () => clearTimeout(timer);
  }, [animationQueue, animationIndex]);

  // Trigger Cot rest sequence (2 hours)
  const handleBedTrigger = () => {
    setIsCampingInTent(false);
    setAnimationQueue(['🧍‍♂️', '🧎‍♂️➡️', '🛏️']);
    setAnimationIndex(0);
    setActiveComboLabel('Taking a short rest (🧍‍♂️ → 🧎‍♂️➡️ → 🛏️)');
    
    setTimeout(() => {
      dispatch({ type: 'REST_BED' });
    }, 1350);
  };

  // Cycle through movement postures: walking -> running -> sneaking -> walking
  const cyclePosture = () => {
    const modes = ['walking', 'running', 'sneaking'] as const;
    const currentIndex = modes.indexOf(player.movementMode || 'walking');
    const nextIndex = (currentIndex + 1) % modes.length;
    dispatch({ type: 'SET_MOVEMENT_MODE', payload: modes[nextIndex] });
  };

  // Fast action triggers for food/water
  const foodCount = inventory.items.filter(i => i.id.startsWith('ItemCannedBeans')).length;
  const waterCount = inventory.items.filter(i => i.id.startsWith('ItemWaterPurified') || i.id.startsWith('ItemWaterDirty')).length;

  const handleEatAction = () => {
    const foodItem = inventory.items.find(i => i.id.startsWith('ItemCannedBeans'));
    if (foodItem) {
      dispatch({ type: 'USE_ITEM', payload: foodItem.id });
    }
  };

  const handleDrinkAction = () => {
    const waterItem = inventory.items.find(i => i.id.startsWith('ItemWaterPurified') || i.id.startsWith('ItemWaterDirty'));
    if (waterItem) {
      dispatch({ type: 'USE_ITEM', payload: waterItem.id });
    }
  };

  // Combat checks
  const hostileNpc = world.nearbyEntities.find(e => e.behavior === 'hostile' && !e.isDead);
  const combatActive = !!hostileNpc;

  // Auto-open combat screen when combat starts
  useEffect(() => {
    if (combatActive) {
      setShowCombatStage(true);
    }
  }, [combatActive]);

  const currentPath = useMemo(() => {
    if (!selectedHex) return [];
    return getHexLine(playerCoords, selectedHex);
  }, [playerCoords, selectedHex]);

  const handleHexClick = (coords: HexCoord) => {
    // Check if within world boundaries (task 3: validate using axial distance)
    const distFromCenter = axialDistance({ q: 0, r: 0 }, coords);
    if (distFromCenter > 20) {
      console.warn("Input location falls out of world boundary limits");
      return;
    }

    // If we clicked on the player's current position, reset selection
    if (coords.q === playerCoords.q && coords.r === playerCoords.r) {
      setSelectedHex(null);
      return;
    }

    if (selectedHex && selectedHex.q === coords.q && selectedHex.r === coords.r) {
      // CONFIRM MOVEMENT!
      const path = getHexLine(playerCoords, coords);
      const steps = path.slice(1);
      const pathLength = steps.length;
      const apCost = pathLength;

      // AP validation
      if (player.ap.current < apCost) {
        return; // Insufficient AP
      }

      // Survival Upkeep validation
      if (pathLength > 5) {
        if (inventory.food < 1 || inventory.water < 1) {
          return; // Insufficient supplies
        }
        // Deduct resources on departure!
        dispatch({ type: 'DEDUCT_TRAVEL_RESOURCES', payload: { pathLength } });
      }

      setWalkingPath(steps);
      setIsWalking(true);
      setSelectedHex(null);
    } else {
      setSelectedHex(coords);
      setAutoCenter(false);
    }
  };

  const adjustCamera = (direction: 'N' | 'S' | 'W' | 'E' | 'C') => {
    setAutoCenter(false);
    const amount = 60;
    if (direction === 'C') {
      setAutoCenter(true);
    } else if (direction === 'N') {
      setPanOffset(prev => ({ ...prev, y: prev.y + amount }));
    } else if (direction === 'S') {
      setPanOffset(prev => ({ ...prev, y: prev.y - amount }));
    } else if (direction === 'W') {
      setPanOffset(prev => ({ ...prev, x: prev.x + amount }));
    } else if (direction === 'E') {
      setPanOffset(prev => ({ ...prev, x: prev.x - amount }));
    }
  };

  // Render handler callback to render agents purely without prop drilling too much down
  const renderAgentsHandler = (q: number, r: number, cx: number, cy: number, landmarkPresent: boolean) => {
    const localAgents = getAgentsAt(q, r);
    return (
      <AgentLayer
        localAgents={localAgents}
        cx={cx}
        cy={cy}
        landmarkPresent={landmarkPresent}
        npcScale={npcScale}
        showAgentEmojis={showAgentEmojis}
        shadowEnabled={shadowEnabled}
      />
    );
  };

  // Re-encode a compatible WorldState representation to feed down to overlay layers correctly
  const compositeWorldState: WorldState = useMemo(() => {
    return {
      phase,
      player,
      inventory,
      world,
      encounter,
      skilldex: { open: false, availableSkills: [] },
      travel,
      flags: flags || {},
      graves,
      log,
      run: { number: 1, seed: world.seed || 1111, startDay: 1 },
      simulation
    };
  }, [phase, player, inventory, world, encounter, travel, flags, graves, log, simulation]);

  return (
    <div className="relative w-full overflow-hidden flex flex-col border border-amber-955/40 rounded bg-black shadow-inner" id="stage_render_viewport">
      {/* Visual Retro Monitor Screen Flash on Live Fire */}
      {firingFlash && (
        <div className="absolute inset-0 bg-[#3bcf1e]/25 animate-pulse z-50 pointer-events-none" />
      )}
      
      {/* Scanline filter overlay for CRT atmosphere */}
      <div className="absolute inset-0 bg-scanlines pointer-events-none opacity-[0.14] z-30" />

      {/* Main Tactical Map Grid Wrapper */}
      <div 
        className="w-full relative overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-950 via-black to-[#050608]"
        style={{ height: `${mapHeight}px` }}
      >
        <svg 
          width="100%" 
          height="100%" 
          viewBox="0 0 600 450" 
          className="w-full h-full"
        >
          <g transform={`translate(${300 + panOffset.x}, ${225 + panOffset.y}) scale(${zoom})`}>
            {/* Grid Cell Layer (Pure Component) */}
            <HexGridLayer
              fullFalloutMapHexes={fullFalloutMapHexes}
              playerCoords={playerCoords}
              visibilityRadius={player.special.PE || 5}
              discoveredHexes={world.discoveredHexes || []}
              terrainStyles={terrainStyles}
              selectedHex={selectedHex}
              hoveredHex={hoveredHex}
              setHoveredHex={setHoveredHex}
              onClickHex={handleHexClick}
              currentPath={currentPath}
              hexSize={hexSize}
              zoom={zoom}
              buildingScale={buildingScale}
              playerScale={playerScale}
              shadowEnabled={shadowEnabled}
              focusedObject={world.focusedObject}
              getLandmarkAt={getLandmarkAt}
              renderAgentsHandler={renderAgentsHandler}
              getPlayerEmoji={getPlayerEmoji}
            />

            {/* Travel Path Line Overlay */}
            {currentPath.length > 1 && (
              <polyline
                points={currentPath.map(h => {
                  const cx = hexSize * 1.5 * h.q;
                  const cy = hexSize * Math.sqrt(3) * (h.r + h.q / 2);
                  return `${cx},${cy}`;
                }).join(' ')}
                fill="none"
                stroke="#10b981"
                strokeWidth="1.2"
                strokeDasharray="4,3"
                opacity="0.85"
                className="pointer-events-none"
              />
            )}

            {selectedHex && (
              <g transform={`translate(${hexSize * 1.5 * selectedHex.q}, ${hexSize * Math.sqrt(3) * (selectedHex.r + selectedHex.q / 2)})`} className="pointer-events-none">
                <circle r="12" fill="none" stroke="#3b82f6" strokeWidth="0.8" strokeDasharray="2,2" />
                <line x1="-14" y1="0" x2="-8" y2="0" stroke="#3b82f6" strokeWidth="0.8" />
                <line x1="8" y1="0" x2="14" y2="0" stroke="#3b82f6" strokeWidth="0.8" />
              </g>
            )}
          </g>
        </svg>

        {/* UI Overlay Systems Layer (Pure Visual controls & overlays) */}
        <UIOverlayLayer
          state={compositeWorldState}
          dispatch={dispatch}
          combatActive={combatActive}
          hostileNpc={hostileNpc}
          showCombatStage={showCombatStage}
          setShowCombatStage={setShowCombatStage}
          foodCount={foodCount}
          waterCount={waterCount}
          handleEatAction={handleEatAction}
          handleDrinkAction={handleDrinkAction}
          handleBedTrigger={handleBedTrigger}
          cyclePosture={cyclePosture}
          zoom={zoom}
          setZoom={setZoom}
          selectedHex={selectedHex}
          currentPath={currentPath}
          activeComboLabel={activeComboLabel}
        />

        {/* OVERLAY: RESIZING HEIGHT SLIDER (Kept at Bottom-Right for sizing panel slices) */}
        <div className="absolute bottom-3 right-3 z-30 flex items-center gap-1 bg-black/75 border border-zinc-911/40 rounded p-1 select-none">
          <span className="text-zinc-500 font-mono text-[7.5px] uppercase tracking-wider pl-0.5" title="Sizing Panel Slices">HEIGHT</span>
          <input 
            type="range" 
            min="300" 
            max="650" 
            value={mapHeight}
            onChange={(e) => setMapHeight(parseInt(e.target.value))}
            className="w-12 h-0.5 bg-neutral-900 roundedappearance-none cursor-pointer accent-amber-500"
            title="Sizing Panel Slices"
          />
        </div>

        {/* OVERLAY: MULTI-DIRECTION DIAGONISTIC SCAN CAMERA PANNING (Top-Right, ultra-compact) */}
        <div className="absolute top-2.5 right-2.5 flex flex-col items-center gap-0.5 bg-black/75 border border-zinc-911/40 rounded p-1 shadow-md z-30 opacity-70 hover:opacity-100 transition duration-150">
          <button 
            type="button" 
            onClick={() => adjustCamera('N')} 
            className="p-0.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition cursor-pointer"
          >
            <span className="text-[9px]">▲</span>
          </button>
          <div className="flex gap-0.5">
            <button 
              type="button" 
              onClick={() => adjustCamera('W')} 
              className="p-0.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition cursor-pointer"
            >
              <span className="text-[9px]">◀</span>
            </button>
            <button 
              type="button" 
              onClick={() => adjustCamera('C')} 
              className="p-0.5 bg-amber-955/20 hover:bg-amber-900/30 text-amber-500 rounded transition text-[7.5px] cursor-pointer"
              title="Center Cam"
            >
              🎯
            </button>
            <button 
              type="button" 
              onClick={() => adjustCamera('E')} 
              className="p-0.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition cursor-pointer"
            >
              <span className="text-[9px]">▶</span>
            </button>
          </div>
          <button 
            type="button" 
            onClick={() => adjustCamera('S')} 
            className="p-0.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition cursor-pointer"
          >
            <span className="text-[9px]">▼</span>
          </button>
        </div>
      </div>
    </div>
  );
};

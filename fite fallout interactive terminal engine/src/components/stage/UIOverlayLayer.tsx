import React from 'react';
import { WorldState, HexCoord, Agent } from '../../engine/types';
import { GameAction } from '../../engine/reducer';
import { ZoomIn, ZoomOut } from 'lucide-react';
import TerminalView from '../../views/TerminalView';
import { CombatStage } from '../combat/CombatStage';

interface UIOverlayLayerProps {
  state: WorldState;
  dispatch: React.Dispatch<GameAction>;
  combatActive: boolean;
  hostileNpc: Agent | undefined;
  showCombatStage: boolean;
  setShowCombatStage: (val: boolean) => void;
  foodCount: number;
  waterCount: number;
  handleEatAction: () => void;
  handleDrinkAction: () => void;
  handleBedTrigger: () => void;
  cyclePosture: () => void;
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  selectedHex: HexCoord | null;
  currentPath: HexCoord[];
  activeComboLabel: string;
}

export const UIOverlayLayer: React.FC<UIOverlayLayerProps> = ({
  state,
  dispatch,
  combatActive,
  hostileNpc,
  showCombatStage,
  setShowCombatStage,
  foodCount,
  waterCount,
  handleEatAction,
  handleDrinkAction,
  handleBedTrigger,
  cyclePosture,
  zoom,
  setZoom,
  selectedHex,
  currentPath,
}) => {
  return (
    <>
      {/* OVERLAY: SNEAKING AND ENEMY HEALTH STATUS (Top-Center of stage, highly visible) */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-35 flex flex-col items-center pointer-events-none select-none" id="sneaking_status_overlay">
        {state.player.movementMode === 'sneaking' && (
          <div className="text-amber-500 font-mono text-[10px] font-black tracking-widest bg-black/60 border border-amber-500/35 px-2.5 py-0.5 rounded shadow-lg uppercase animate-pulse">
            [ SNEAKING ]
          </div>
        )}
        {combatActive && hostileNpc && (
          <div className="mt-1 flex flex-col items-center bg-black/85 border border-red-500/40 px-3 py-1.5 rounded shadow-xl text-center font-mono min-w-[140px]" id="enemy_health_overlay">
            <span className="text-[7.5px] text-zinc-500 font-extrabold tracking-widest uppercase mb-0.5">TARGET HP</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs">{hostileNpc.emoji}</span>
              <span className="text-[10px] text-red-500 font-black uppercase tracking-wide">{hostileNpc.name}</span>
            </div>
            <div className="flex items-center gap-2 mt-1 w-full">
              <div className="w-[80px] h-2 border border-red-955/50 bg-black/90 rounded overflow-hidden">
                <div 
                  className="h-full bg-red-650 transition-all duration-300"
                  style={{ width: `${Math.max(0, Math.min(100, (hostileNpc.hp.current / hostileNpc.hp.max) * 100))}%` }}
                />
              </div>
              <span className="text-[9px] text-zinc-300 font-black">{hostileNpc.hp.current}/{hostileNpc.hp.max}</span>
            </div>
          </div>
        )}
      </div>

      {/* OVERLAY: CHRONOLOGY LOGS (Top-Left of Map canvas, with semi-transparent dark backers) */}
      {!state.encounter.active && (
        <div className="absolute top-3 left-3 z-30 pointer-events-none flex flex-col gap-1.5 w-full max-w-[340px] select-none bg-black/65 p-2 px-2.5 rounded border border-amber-955/20 backdrop-blur-xs shadow-lg" id="chronology_logs_overlay">
          {state.log.slice(-4).map((log, idx, arr) => {
            const opacity = 0.5 + (idx / (arr.length - 1)) * 0.5;
            
            // Standardize typography coloring by category
            let typeColor = 'text-amber-500/90';
            if (log.type === 'combat') {
              typeColor = 'text-red-400 font-bold';
            } else if (log.type === 'survival') {
              typeColor = 'text-emerald-400';
            }
            
            return (
              <div 
                key={log.id} 
                style={{ opacity }}
                className={`text-[9.5px] font-mono leading-tight ${typeColor} [text-shadow:_0_1px_2px_rgba(0,0,0,0.9)] whitespace-normal break-words`}
              >
                <span className="text-zinc-500/90 mr-1.5 font-normal select-none">[{log.timestamp}]</span>
                <span>{log.text}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* OVERLAY: HP & AP BARS (Bottom-Left of Map canvas, below logs) */}
      <div className="absolute bottom-3 left-3 z-30 flex flex-col gap-1 text-[10px] font-mono select-none pointer-events-auto bg-black/40 p-1.5 rounded border border-zinc-911/10 backdrop-blur-xs" id="hp_ap_bars_overlay">
        <div className="flex items-center gap-1.5 text-red-500 font-bold">
          <span className="w-4">HP</span>
          <div className="w-[100px] h-1.5 border border-red-955/40 bg-zinc-950/90 rounded overflow-hidden">
            <div 
              className="h-full bg-red-600 transition-all duration-300"
              style={{ width: `${Math.max(0, Math.min(100, (state.player.hp.current / state.player.hp.max) * 100))}%` }}
            />
          </div>
          <span className="text-[9px] text-zinc-300">{state.player.hp.current}/{state.player.hp.max}</span>
        </div>
        <div className="flex items-center gap-1.5 text-green-500 font-bold">
          <span className="w-4">AP</span>
          <div className="w-[100px] h-1.5 border border-green-955/40 bg-zinc-950/90 rounded overflow-hidden">
            <div 
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${Math.max(0, Math.min(100, (state.player.ap.current / state.player.ap.max) * 100))}%` }}
            />
          </div>
          <span className="text-[9px] text-zinc-300">{state.player.ap.current}/{state.player.ap.max}</span>
        </div>
      </div>

      {/* OVERLAY: ACTIONS CONTROLS (Bottom-Middle of Map canvas) */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-[#05070a]/95 border border-amber-955/45 px-2.5 py-1.5 rounded-md shadow-lg" id="action_controls_overlay">
        {!combatActive ? (
          /* Explorer / Non-combat: emojis, NO label */
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBedTrigger}
              className="text-lg hover:scale-125 transition cursor-pointer"
              title="🛏️ Take rest/sleep (Cot rest 2 hours)"
            >
              🛏️
            </button>
            
            <button
              type="button"
              disabled={foodCount === 0}
              onClick={handleEatAction}
              className={`text-lg hover:scale-125 transition ${foodCount === 0 ? 'opacity-25 cursor-not-allowed filter grayscale' : 'cursor-pointer'}`}
              title={`🍖 Consume Beans (x${foodCount} in inventory)`}
            >
              🍖
            </button>
            
            <button
              type="button"
              disabled={waterCount === 0}
              onClick={handleDrinkAction}
              className={`text-lg hover:scale-125 transition ${waterCount === 0 ? 'opacity-25 cursor-not-allowed filter grayscale' : 'cursor-pointer'}`}
              title={`💧 Drink Water (x${waterCount} in inventory)`}
            >
              💧
            </button>

            {/* Stance cycle button with a divider */}
            <div className="w-px h-5 bg-amber-955/40 self-center mx-0.5" />

            <button
              type="button"
              onClick={cyclePosture}
              className="text-lg hover:scale-125 transition cursor-pointer"
              title={`Cycle Stance Posture (Current: ${state.player.movementMode})`}
            >
              {state.player.movementMode === 'running' ? '🏃' : state.player.movementMode === 'sneaking' ? '👣' : '🚶'}
            </button>
          </div>
        ) : (
          /* Combat: streamlined active tactical action grid launcher */
          <div className="flex items-center gap-1.5 font-mono">
            <span className="text-[10px] text-red-500 font-extrabold animate-pulse uppercase pr-1">⚠️ Hostile Enemy In Range!</span>
            <button
              type="button"
              onClick={() => setShowCombatStage(true)}
              className="px-2.5 py-1 border border-red-800/70 bg-[#1f0d0d] text-red-400 hover:bg-[#3d1212] text-[10px] font-black rounded transition shadow uppercase cursor-pointer"
            >
              ⚡ TACTICAL GRID ARENA
            </button>

            {/* Stance cycle button with a divider */}
            <div className="w-px h-5 bg-amber-955/40 self-center mx-1" />

            <button
              type="button"
              onClick={cyclePosture}
              className="text-lg hover:scale-125 transition cursor-pointer"
              title={`Cycle Stance Posture (Current: ${state.player.movementMode})`}
            >
              {state.player.movementMode === 'running' ? '🏃' : state.player.movementMode === 'sneaking' ? '👣' : '🚶'}
            </button>
          </div>
        )}
      </div>

      {/* OVERLAY: MAP ZOOM CONTROLS (Moved to Top-Right next to camera controls) */}
      <div className="absolute top-2.5 right-18 z-30 flex items-center gap-1 bg-black/75 border border-zinc-911/40 rounded p-1 shadow-md select-none" id="zoom_controls_overlay">
        <button 
          type="button"
          onClick={() => setZoom(prev => Math.max(0.5, prev - 0.1))}
          className="p-1 text-zinc-400 hover:text-white rounded border border-zinc-920 transition bg-black/80 cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut size={10} />
        </button>
        <span className="text-zinc-400 font-mono text-[9px] font-extrabold select-none px-0.5">{Math.round(zoom * 100)}%</span>
        <button 
          type="button"
          onClick={() => setZoom(prev => Math.min(2.0, prev + 0.1))}
          className="p-1 text-zinc-400 hover:text-white rounded border border-zinc-920 transition bg-black/80 cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn size={10} />
        </button>
      </div>

      {/* Travel Pathing Preview HUD overlay */}
      {selectedHex && currentPath.length > 1 && (
        <div className="absolute top-14 right-3 z-30 flex flex-col gap-1.5 bg-black/95 border border-emerald-500/45 rounded p-2.5 shadow-2xl select-none max-w-[190px] font-mono leading-none" id="path_preview_overlay">
          <span className="text-[7.5px] text-emerald-400 font-extrabold uppercase tracking-widest block mb-0.5">Expedition Preview</span>
          <div className="flex justify-between items-center text-[10px] mt-0.5 gap-4">
            <span className="text-zinc-500 font-bold">Distance:</span>
            <span className="text-zinc-200 font-extrabold">{currentPath.length - 1} Hexes</span>
          </div>
          <div className="flex justify-between items-center text-[10px] gap-4">
            <span className="text-zinc-500 font-bold">AP Cost:</span>
            <span className="text-emerald-400 font-extrabold">{currentPath.length - 1} AP</span>
          </div>
          
          {/* If distance > 5 hexes, display upkeep warning */}
          {(currentPath.length - 1) > 5 && (
            <div className="mt-1 pb-1 pt-1 border-t border-dashed border-emerald-700/30 text-[8.5px] leading-tight flex flex-col gap-1 text-center">
              <span className="text-amber-500 font-bold uppercase tracking-wider block">⚠️ Survival Upkeep Required</span>
              <span className="text-zinc-400 leading-normal mb-0.5">Requires 1 Food & 1 Water.</span>
              <div className="flex justify-around text-[9px] mt-0.5">
                <span className={state.inventory.food >= 1 ? "text-green-500" : "text-red-500 font-bold animate-pulse"}>
                  🍖 Food ({state.inventory.food}/1)
                </span>
                <span className={state.inventory.water >= 1 ? "text-green-500" : "text-red-500 font-bold animate-pulse"}>
                  💧 Water ({state.inventory.water}/1)
                </span>
              </div>
            </div>
          )}

          {/* Confirmation instruction */}
          <div className="mt-1.5 pt-1.5 border-t border-zinc-900 text-center">
            {state.player.ap.current < (currentPath.length - 1) ? (
              <span className="text-red-500 text-[8.5px] font-bold block animate-pulse">❌ Insufficient AP to Move</span>
            ) : (currentPath.length - 1) > 5 && (state.inventory.food < 1 || state.inventory.water < 1) ? (
              <span className="text-red-500 text-[8.5px] font-bold block animate-pulse">❌ Insufficient Supplies</span>
            ) : (
              <span className="text-blue-400 text-[8.5px] font-bold block animate-pulse">👉 Click cell again to move</span>
            )}
          </div>
        </div>
      )}

      {/* OVERLAY: FLOATING STORY Dialog CRT Panel Overlay - OVER THE GRID directly! */}
      {state.encounter.active && (
        <div className="absolute inset-0 bg-black/85 flex items-center justify-center p-4 z-40 animate-fade-in" id="encounter_pop_window_stage">
          <div className="w-full max-w-lg bg-[#07090d] border border-amber-500/50 p-1.5 rounded shadow-2xl relative">
            {/* Close / Interruption alert message */}
            <div className="pointer-events-auto">
              <TerminalView state={state} dispatch={dispatch} />
            </div>
          </div>
        </div>
      )}

      {/* OVERLAY: REAL-TIME TACTICAL GRID COMBAT ARENA */}
      {combatActive && hostileNpc && showCombatStage && (
        <div className="absolute inset-0 bg-[#06080b]/98 flex items-center justify-center p-4 z-45 animate-fade-in" id="combat_arena_stage_overlay">
          <div className="w-full max-w-2xl bg-[#070a0e] border border-red-500/55 rounded-lg shadow-2xl overflow-hidden relative p-1">
            <div className="pointer-events-auto">
              <CombatStage
                state={state}
                dispatch={dispatch}
                hostileNpc={hostileNpc}
                onClose={() => setShowCombatStage(false)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

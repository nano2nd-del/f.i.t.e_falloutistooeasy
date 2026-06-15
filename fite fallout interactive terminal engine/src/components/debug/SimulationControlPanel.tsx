import React from 'react';
import { WorldState, AgentType, HexCoord } from '../../engine/types';

interface SimulationControlPanelProps {
  state: WorldState;
  dispatch: React.Dispatch<any>;
}

export const SimulationControlPanel: React.FC<SimulationControlPanelProps> = ({ state, dispatch }) => {
  // Extract simulation properties with defaults if missing
  const globalSimInterval = state.flags?.globalSimInterval ?? 3500;
  const enableGlobalSimulation = state.flags?.enableGlobalSimulation !== false;
  const simRadiusConstraint = state.flags?.simRadiusConstraint ?? 10;
  
  const tickCount = state.simulation?.tick ?? 0;
  const agentCount = state.simulation?.agents?.filter(a => a.behaviorState !== 'dead').length ?? 0;

  const handleToggleSim = () => {
    dispatch({
      type: 'SET_FLAG',
      payload: { key: 'enableGlobalSimulation', value: !enableGlobalSimulation }
    });
  };

  const handleIntervalChange = (val: number) => {
    dispatch({
      type: 'SET_FLAG',
      payload: { key: 'globalSimInterval', value: val }
    });
  };

  const handleRadiusChange = (val: number) => {
    dispatch({
      type: 'SET_FLAG',
      payload: { key: 'simRadiusConstraint', value: val }
    });
  };

  const handleSpawnAgent = (type: AgentType) => {
    // Spawn nearby the player coordinate
    const offsetQ = Math.floor(Math.random() * 3) - 1;
    const offsetR = Math.floor(Math.random() * 3) - 1;
    const spawnHex: HexCoord = {
      q: state.player.coords.q + offsetQ,
      r: state.player.coords.r + offsetR
    };
    dispatch({ type: 'DEV_SPAWN_AGENT', payload: { type, hex: spawnHex } });
  };

  return (
    <div className="bg-[#0c0f13] border border-amber-950/45 p-4 rounded-lg shadow-xl" id="simulation_settings_panel">
      {/* Title block */}
      <div className="flex justify-between items-center pb-2.5 border-b border-amber-950/30 mb-4 animate-fade-in">
        <div>
          <h3 className="text-xs font-black tracking-widest text-amber-500 uppercase">
            🛠️ SIMULATION TUNING & CONTROL CONSOLE
          </h3>
          <p className="text-[10px] text-zinc-500 font-mono">
            Direct telemetry manipulation of background threads
          </p>
        </div>
        <div className="flex gap-2 text-[10px] font-mono text-zinc-400">
          <span>Tick: <strong className="text-amber-500 font-bold">#{tickCount}</strong></span>
          <span>Alive Agents: <strong className="text-amber-500 font-bold">{agentCount}</strong></span>
        </div>
      </div>

      {/* Control Sliders and Toggles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Toggle Box */}
        <div className="bg-[#030508] p-3 rounded border border-zinc-900 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold text-zinc-300 block mb-1 uppercase tracking-wider">
              Thread State Execution
            </span>
            <p className="text-[9.5px] text-zinc-400 leading-snug">
              Allow faction agents (Mutants, Raiders, Merchants) to wander, interact, and trigger conversions across the wasteland coordinates dynamically.
            </p>
          </div>
          <button
            type="button"
            onClick={handleToggleSim}
            className={`mt-3 w-full py-1.5 rounded text-xs font-black uppercase tracking-wider transition cursor-pointer ${
              enableGlobalSimulation
                ? 'bg-emerald-950 border border-emerald-700 text-emerald-400 hover:bg-emerald-900/60'
                : 'bg-zinc-950 border border-zinc-800 text-zinc-400 hover:bg-zinc-900'
            }`}
          >
            {enableGlobalSimulation ? '● Active: Global Simulation running' : '○ Locked: Global Simulation stopped'}
          </button>
        </div>

        {/* Sliders Container */}
        <div className="bg-[#030508] p-3 rounded border border-zinc-900 space-y-3.5">
          
          {/* Tick Interval Slider */}
          <div>
            <div className="flex justify-between text-[10px] font-bold text-zinc-300 mb-1 uppercase">
              <span>Tick Interval Space</span>
              <span className="text-amber-500">{globalSimInterval} ms</span>
            </div>
            <input
              type="range"
              min="1000"
              max="10000"
              step="500"
              value={globalSimInterval}
              onChange={(e) => handleIntervalChange(Number(e.target.value))}
              className="w-full accent-amber-500 bg-[#0c0e12] h-1.5 rounded cursor-pointer"
            />
            <p className="text-[9px] text-zinc-500 font-mono mt-0.5">
              Defines clock cycles for passive background moves
            </p>
          </div>

          {/* Radius constraint constraint slider */}
          <div>
            <div className="flex justify-between text-[10px] font-bold text-zinc-300 mb-1 uppercase">
              <span>Sim Area Radius Constraint</span>
              <span className="text-amber-500">{simRadiusConstraint} Hexes</span>
            </div>
            <input
              type="range"
              min="2"
              max="20"
              step="1"
              value={simRadiusConstraint}
              onChange={(e) => handleRadiusChange(Number(e.target.value))}
              className="w-full accent-amber-500 bg-[#0c0e12] h-1.5 rounded cursor-pointer"
            />
            <p className="text-[9px] text-zinc-500 font-mono mt-0.5">
              Restricts physical updates of characters beyond sector scope
            </p>
          </div>

        </div>
      </div>

      {/* Manual spawning trigger console */}
      <div className="mt-4 pt-3.5 border-t border-zinc-900 bg-[#030508]/40 p-3 rounded border border-zinc-900/50">
        <h4 className="text-[10px] font-extrabold text-amber-500 tracking-wider mb-2 uppercase">
          Inject Real-Time AI Faction Factions
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {([AgentType.VaultDweller, AgentType.Raider, AgentType.SuperMutant, AgentType.Scavenger] as AgentType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => handleSpawnAgent(type)}
              className="bg-[#090d12] border border-zinc-800 hover:border-amber-900 hover:bg-[#121721] text-zinc-300 text-[10px] py-1 px-2 rounded cursor-pointer transition uppercase font-mono text-center"
            >
              ➕ {type === AgentType.VaultDweller ? 'Dweller' : type === AgentType.SuperMutant ? 'Mutant' : type}
            </button>
          ))}
        </div>
        <div className="flex gap-2 mt-2">
          <button
            type="button"
            onClick={() => dispatch({ type: 'DEV_SIM_TICK' })}
            className="flex-1 bg-amber-950/60 border border-amber-800 text-amber-400 text-[10px] font-bold py-1 px-2.5 rounded hover:bg-amber-900 cursor-pointer text-center uppercase"
          >
            ⚡ Force-Step Tick Simulation
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: 'DEV_CLEAR_AGENTS' })}
            className="bg-red-950/40 border border-red-900/50 text-red-400 text-[10px] font-bold py-1 px-2.5 rounded hover:bg-red-950/80 cursor-pointer text-center uppercase"
          >
            🧹 Clear Agents
          </button>
        </div>
      </div>
    </div>
  );
};

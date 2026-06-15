import { SimulationState, AgentType, HexCoord } from './types';
import { createSpawners, runSpawners, runMigrationEvents, spawnAgent } from './spawners';
import { updateAgents, handleCombat, handleGECK } from './behaviors';

export function initSimulation(): SimulationState {
  return {
    agents: [],
    spawners: createSpawners(),
    tick: 0,
    nextId: 0
  };
}

export function tickSimulation(state: SimulationState): void {
  state.tick++;

  // Order matters:
  // 1. Spawn new agents
  runSpawners(state);
  runMigrationEvents(state);

  // 2. Update behaviors
  updateAgents(state);

  // 3. Combat resolution
  handleCombat(state);

  // 4. GECK logic
  handleGECK(state);

  // 5. Cleanup dead agents after 100 ticks
  if (state.tick % 100 === 0) {
    state.agents = state.agents.filter(a => a.behaviorState !== "dead" || state.tick - a.lastAction < 100);
  }
}

export function devSpawnAgent(state: SimulationState, type: AgentType, hex: HexCoord): void {
  spawnAgent(state, type, hex);
}

export function devClearAgents(state: SimulationState): void {
  state.agents = [];
}

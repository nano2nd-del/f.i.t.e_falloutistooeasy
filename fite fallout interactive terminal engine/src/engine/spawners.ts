import { Agent, AgentType, HexCoord, Spawner, SimulationState } from './types';
import { getAgentsInRadius } from './hexUtils';

export function createSpawners(): Spawner[] {
  return [
    // VAULT DWELLERS (Blue) — Spawn from Vault 13 ruins
    {
      id: "vault_13",
      type: AgentType.VaultDweller,
      hex: { q: 0, r: 0 }, // Center
      rate: 200,
      lastSpawn: 0,
      active: true,
      spawnLimit: 8
    },
    // WASTELANDERS (Brown) — Shady Sands
    {
      id: "town_shady_sands",
      type: AgentType.Wastelander,
      hex: { q: 8, r: -2 }, // Shady Sands
      rate: 150,
      lastSpawn: 0,
      active: true,
      spawnLimit: 6
    },
    // CARAVANS (Brown) — The Hub
    {
      id: "caravan_route_1",
      type: AgentType.Caravan,
      hex: { q: 2, r: 10 }, // The Hub
      rate: 400,
      lastSpawn: 0,
      active: true,
      spawnLimit: 4
    },
    // TOWN GUARDS (Gold) — Protect settlements (Shady Sands)
    {
      id: "guards_shady_sands",
      type: AgentType.TownGuard,
      hex: { q: 8, r: -2 }, // Shady Sands
      rate: 300,
      lastSpawn: 0,
      active: true,
      spawnLimit: 4
    },
    // CRITTERS (Brown) — The Glow
    {
      id: "critters_wasteland",
      type: AgentType.Critter,
      hex: { q: 12, r: 20 }, // The Glow
      rate: 100,
      lastSpawn: 0,
      active: true,
      spawnLimit: 10
    },
    // ENEMIES/RAIDERS (Red) — Raider Khan Camp
    {
      id: "raiders_camp",
      type: AgentType.Enemy,
      hex: { q: 10, r: 2 }, // Raider Camp
      rate: 120,
      lastSpawn: 0,
      active: true,
      spawnLimit: 6
    },
    // SUPER MUTANTS (Green) — Mariposa Military Base
    {
      id: "mutants_vault",
      type: AgentType.SuperMutant,
      hex: { q: -12, r: 0 }, // Mariposa Military Base
      rate: 300,
      lastSpawn: 0,
      active: true,
      spawnLimit: 5
    },
    // SCAVENGERS (Grey) — Vault 15 Ruins
    {
      id: "scavengers_vault_15",
      type: AgentType.Scavenger,
      hex: { q: 14, r: -2 }, // Vault 15 Ruins
      rate: 180,
      lastSpawn: 0,
      active: true,
      spawnLimit: 5
    },
    // PALADINS / GUARDS (Gold) — Brotherhood of Steel
    {
      id: "brotherhood_paladins",
      type: AgentType.TownGuard,
      hex: { q: -6, r: 6 }, // Brotherhood bunker
      rate: 240,
      lastSpawn: 0,
      active: true,
      spawnLimit: 4
    },
    // WASTELAND CITIZENS (Brown) — Junktown Frontier
    {
      id: "junktown_citizens",
      type: AgentType.Wastelander,
      hex: { q: 2, r: 4 }, // Junktown
      rate: 160,
      lastSpawn: 0,
      active: true,
      spawnLimit: 5
    },
    // TOWN GUARDS (Gold) — Junktown
    {
      id: "junktown_guards",
      type: AgentType.TownGuard,
      hex: { q: 2, r: 4 }, // Junktown
      rate: 250,
      lastSpawn: 0,
      active: true,
      spawnLimit: 3
    },
    // GHOULS/ENEMIES (Red) — Necropolis sewers
    {
      id: "necropolis_ghouls",
      type: AgentType.Enemy,
      hex: { q: 14, r: 6 }, // Necropolis
      rate: 200,
      lastSpawn: 0,
      active: true,
      spawnLimit: 6
    },
    // SCAVENGERS (Grey) — L.A. Boneyard concrete ruins
    {
      id: "boneyard_scavengers",
      type: AgentType.Scavenger,
      hex: { q: -2, r: 14 }, // Boneyard
      rate: 220,
      lastSpawn: 0,
      active: true,
      spawnLimit: 5
    },
    // NIGHTKINS/TEMPLE INFILTRATORS (Purple) — Cathedral of the Master
    {
      id: "cathedral_nightkins",
      type: AgentType.Nightkin,
      hex: { q: -2, r: 18 }, // Cathedral
      rate: 280,
      lastSpawn: 0,
      active: true,
      spawnLimit: 4
    },
    // HUB POLICE / TOWN GUARDS — The Hub
    {
      id: "hub_patrol",
      type: AgentType.TownGuard,
      hex: { q: 2, r: 10 }, // The Hub
      rate: 350,
      lastSpawn: 0,
      active: true,
      spawnLimit: 3
    }
  ];
}

export function spawnAgent(state: SimulationState, type: AgentType, hex: HexCoord): Agent {
  const agent: Agent = {
    id: `agent_${state.nextId++}`,
    type,
    hex: { ...hex },
    hunger: 100,
    fear: 0,
    behaviorState: "idle",
    spawnHex: { ...hex },
    createdAt: state.tick,
    lastAction: state.tick
  };

  state.agents.push(agent);
  return agent;
}

export function adjustSpawner(spawner: Spawner, state: SimulationState): void {
  const nearby = getAgentsInRadius(state.agents, spawner.hex, 6);
  const allies = nearby.filter(a => a.type === spawner.type).length;

  if (allies < 3) {
    spawner.rate = Math.max(50, spawner.rate - 20); // speed up when depleted
  } else {
    spawner.rate = Math.min(600, spawner.rate + 10); // slow down when crowded
  }
}

export function runSpawners(state: SimulationState): void {
  for (const spawner of state.spawners) {
    if (!spawner.active) continue;

    // Adjust spawn rate based on local pressure
    adjustSpawner(spawner, state);

    // Check if enough time has passed to spawn
    if (state.tick - spawner.lastSpawn >= spawner.rate) {
      // Check spawn limit
      if (spawner.spawnLimit) {
        const count = state.agents.filter(a => a.type === spawner.type && a.spawnHex.q === spawner.hex.q && a.spawnHex.r === spawner.hex.r).length;
        if (count >= spawner.spawnLimit) continue;
      }

      spawnAgent(state, spawner.type, spawner.hex);
      spawner.lastSpawn = state.tick;
    }
  }
}

export function runMigrationEvents(state: SimulationState): void {
  if (state.tick % 800 !== 0) return;

  const events = [
    "caravan_wave",
    "critter_migration",
    "raider_warband",
    "mutant_hunt",
    "vault_expedition"
  ];

  const event = events[Math.floor(Math.random() * events.length)];

  switch (event) {
    case "caravan_wave":
      for (let i = 0; i < 5; i++) {
        spawnAgent(state, AgentType.Caravan, { q: 2, r: 10 });
      }
      break;
    case "critter_migration":
      for (let i = 0; i < 8; i++) {
        spawnAgent(state, AgentType.Critter, { q: 12, r: 20 });
      }
      break;
    case "raider_warband":
      for (let i = 0; i < 6; i++) {
        spawnAgent(state, AgentType.Enemy, { q: 10, r: 2 });
      }
      break;
    case "mutant_hunt":
      for (let i = 0; i < 4; i++) {
        spawnAgent(state, AgentType.SuperMutant, { q: -12, r: 0 });
      }
      break;
    case "vault_expedition":
      for (let i = 0; i < 3; i++) {
        spawnAgent(state, AgentType.VaultDweller, { q: 0, r: 0 });
      }
      break;
  }
}

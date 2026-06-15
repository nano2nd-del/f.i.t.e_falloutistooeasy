import { SimulationState, Agent, AgentType, FACTION_RELATIONSHIPS, CONVERSION_RULES } from './types';
import { axialDistance, getAgentsInRadius, HEX_DIRECTIONS } from './hexUtils';

/**
 * Returns Agility (AG) and Sequence traits for virtual NPCs to model turn order.
 */
export function getAgentSequence(type: AgentType): { ag: number; sequence: number } {
  switch (type) {
    case AgentType.Enemy: // represents Deathclaw/dangerous hostile beasts
      return { ag: 9, sequence: 10 };
    case AgentType.Critter: // represents Radscorpions/standard beasts
      return { ag: 8, sequence: 9 };
    case AgentType.Raider:
      return { ag: 7, sequence: 8 };
    case AgentType.Nightkin:
      return { ag: 7, sequence: 8 };
    case AgentType.VaultDweller:
      return { ag: 6, sequence: 6 };
    case AgentType.Scavenger:
      return { ag: 6, sequence: 7 };
    case AgentType.TownGuard: // represents Sentry/Guardian forces
      return { ag: 5, sequence: 5 };
    case AgentType.SuperMutant:
      return { ag: 4, sequence: 4 };
    default:
      return { ag: 5, sequence: 5 };
  }
}

export function updateAgents(state: SimulationState): void {
  // Sort agents by Turn Priority: (Sequence, AG) descending!
  const sortedAgents = [...state.agents].sort((a, b) => {
    const seqA = getAgentSequence(a.type).sequence;
    const seqB = getAgentSequence(b.type).sequence;
    if (seqA !== seqB) return seqB - seqA;
    return getAgentSequence(b.type).ag - getAgentSequence(a.type).ag;
  });

  for (const agent of sortedAgents) {
    if (agent.behaviorState === "dead") {
      continue;
    }

    // 1. Handling ongoing conversions
    if (agent.behaviorState === "converting" && agent.turnIntoAt !== undefined && agent.convertIntoType) {
      if (state.tick >= agent.turnIntoAt) {
        agent.type = agent.convertIntoType;
        agent.behaviorState = "idle";
        agent.convertIntoType = undefined;
        agent.turnIntoAt = undefined;
        agent.capturedBy = undefined;
        agent.lastAction = state.tick;
        agent.tension = 0;
        agent.consecutiveHostileTicks = 0;
      }
      continue;
    }

    const relations = FACTION_RELATIONSHIPS[agent.type];
    if (!relations) continue;

    // --- TENSION & AGGRO DETECTION IN 3-HEX RADIUS ---
    const scaryTypes = relations.fleesFrom;
    const preyTypes = relations.hunts;
    
    // Check if any hostile adversary is in a 3-hex radius
    const hostileAgentsInRange = state.agents.filter(a => 
      a.id !== agent.id && 
      a.behaviorState !== "dead" && 
      a.behaviorState !== "converting" &&
      (scaryTypes.includes(a.type) || preyTypes.includes(a.type)) &&
      axialDistance(a.hex, agent.hex) <= 3
    );

    if (hostileAgentsInRange.length > 0) {
      agent.consecutiveHostileTicks = (agent.consecutiveHostileTicks || 0) + 1;
      agent.tension = Math.min(100, (agent.tension || 0) + 35);
    } else {
      agent.consecutiveHostileTicks = 0;
      agent.tension = Math.max(0, (agent.tension || 0) - 15);
    }

    // Only trigger action if hostile presence persisted for > 2 ticks (stand-off suspense!)
    const isAggro = (agent.consecutiveHostileTicks || 0) > 2;

    if (isAggro) {
      let fled = false;
      for (const scaryType of scaryTypes) {
        const scaryHostiles = state.agents.filter(a => a.type === scaryType && a.behaviorState !== "dead" && axialDistance(a.hex, agent.hex) <= 3);
        if (scaryHostiles.length > 0) {
          fled = true;
          agent.behaviorState = "fleeing";
          const hostile = scaryHostiles[0];
          let bestHex = agent.hex;
          let maxDist = axialDistance(agent.hex, hostile.hex);

          for (const dir of HEX_DIRECTIONS) {
            const testHex = { q: agent.hex.q + dir.q, r: agent.hex.r + dir.r };
            const dist = axialDistance(testHex, hostile.hex);
            if (dist > maxDist) {
              maxDist = dist;
              bestHex = testHex;
            }
          }
          agent.hex = bestHex;
          agent.lastAction = state.tick;
          break;
        }
      }

      if (fled) continue;

      let hunting = false;
      for (const preyType of preyTypes) {
        const preyList = state.agents.filter(a => a.type === preyType && a.behaviorState !== "dead" && a.behaviorState !== "converting" && axialDistance(a.hex, agent.hex) <= 3);
        if (preyList.length > 0) {
          hunting = true;
          agent.behaviorState = "hunting";
          const prey = preyList[0];
          agent.targetHex = { ...prey.hex };

          let bestHex = agent.hex;
          let minDist = axialDistance(agent.hex, prey.hex);

          for (const dir of HEX_DIRECTIONS) {
            const testHex = { q: agent.hex.q + dir.q, r: agent.hex.r + dir.r };
            const dist = axialDistance(testHex, prey.hex);
            if (dist < minDist) {
              minDist = dist;
              bestHex = testHex;
            }
          }
          agent.hex = bestHex;
          agent.lastAction = state.tick;
          break;
        }
      }

      if (hunting) continue;
    }

    // Alert idle mode: suspiciously freeze or wander less if tension is high
    if (agent.behaviorState !== "converting") {
      agent.behaviorState = "idle";
    }
    
    const wanderRoll = Math.random();
    const wanderChance = (agent.tension || 0) > 50 ? 0.05 : 0.3;
    
    if (wanderRoll < wanderChance) {
      const randomDir = HEX_DIRECTIONS[Math.floor(Math.random() * HEX_DIRECTIONS.length)];
      agent.hex = {
        q: agent.hex.q + randomDir.q,
        r: agent.hex.r + randomDir.r
      };
      agent.lastAction = state.tick;
    }
  }
}

export function handleCombat(state: SimulationState): void {
  // Sort active agents by Priority (Sequence, AG) so higher Sequence acts/strikes first
  const activeAgents = state.agents
    .filter(a => a.behaviorState !== "dead" && a.behaviorState !== "converting")
    .sort((a, b) => {
      const seqA = getAgentSequence(a.type).sequence;
      const seqB = getAgentSequence(b.type).sequence;
      if (seqA !== seqB) return seqB - seqA;
      return getAgentSequence(b.type).ag - getAgentSequence(a.type).ag;
    });

  for (let i = 0; i < activeAgents.length; i++) {
    const a = activeAgents[i];
    if (a.behaviorState === "dead" || a.behaviorState === "converting") continue;
    
    const relationsA = FACTION_RELATIONSHIPS[a.type];
    if (!relationsA) continue;

    for (let j = 0; j < activeAgents.length; j++) {
      if (i === j) continue;
      const b = activeAgents[j];
      if (b.behaviorState === "dead" || b.behaviorState === "converting") continue;

      if (axialDistance(a.hex, b.hex) > 1) continue;

      // Check if A hunts B
      const aHuntsB = relationsA.hunts.includes(b.type);
      if (aHuntsB) {
        resolveClash(state, a, b);
        break; // Attack made
      }
    }
  }
}

function resolveClash(state: SimulationState, attacker: Agent, defender: Agent): void {
  const conversionList = CONVERSION_RULES[defender.type] || [];
  const converterRule = conversionList.find(rule => rule.capturedBy === attacker.type);

  if (converterRule) {
    defender.behaviorState = "converting";
    defender.capturedBy = attacker.id;
    defender.turnIntoAt = state.tick + converterRule.ticksToConvert;
    defender.convertIntoType = converterRule.convertsTo;
    defender.lastAction = state.tick;
  } else {
    defender.behaviorState = "dead";
    defender.lastAction = state.tick;
  }
}

export function handleGECK(state: SimulationState): void {
  if (state.activeGECK) {
    const geck = state.activeGECK;
    const nearby = getAgentsInRadius(state.agents, geck.hex, 3);
    for (const agent of nearby) {
      if (agent.behaviorState !== "dead") {
        agent.hunger = Math.min(100, agent.hunger + 10);
      }
    }
  }
}

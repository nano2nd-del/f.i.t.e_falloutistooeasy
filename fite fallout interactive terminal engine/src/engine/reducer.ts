/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WorldState, HexCoord, SPECIAL, SkillName, InventoryItem, WeaponItem, ArmorItem, AidItem, GraveRecord, LogEntry, GameEvent, WorldObject, AgentType } from './types';
import { calculateDerivedStats, SKILL_BASE_FORMULAS, getLuckCritInfo, getActiveRadiationDebuffs, calculateBarterPriceMultiplier } from './stats';
import { generateThreatsAndObjects, axialDistance, getTerrainAt, getRandomWeather, findLandmarkAt, getScenicLocationName } from './worldgen';
import { ITEM_TEMPLATES, RANDOM_EVENTS } from './content';
import { initSimulation, tickSimulation, devSpawnAgent, devClearAgents } from './simulation';
import { evaluateSkillCheck } from '../utils/skillsEvaluator';

export function createUniqueItem(template: InventoryItem): InventoryItem {
  const item = JSON.parse(JSON.stringify(template));
  item.id = `${template.id}_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
  return item;
}

export type GameAction =
  | { type: 'CREATE_CHARACTER'; payload: { name: string; originId: string; special: SPECIAL; traits: string[]; tagged: SkillName[] } }
  | { type: 'TRAVEL_TO'; payload: HexCoord }
  | { type: 'FAST_TRAVEL_TO'; payload: HexCoord }
  | { type: 'REST_CAMP' }
  | { type: 'REST_BED' }
  | { type: 'PASS_TIME' }
  | { type: 'USE_ITEM'; payload: string } // Item ID
  | { type: 'REPAIR_ITEM'; payload: { itemId: string } }
  | { type: 'EQUIP_ITEM'; payload: string } // Item ID
  | { type: 'SKILLDEX_TOGGLE'; payload?: boolean }
  | { type: 'TRIGGER_SKILL_CHECK'; payload: { skill: SkillName; objectId: string } }
  | { type: 'RESOLVE_DIAL_OPTION'; payload: { nextStepId: string | null; optionIdx: number; skillCheckPassed?: boolean } }
  | { type: 'ATTACK_ENTITY'; payload: { targetId: string } }
  | { type: 'CLOSE_OUTCOME' }
  | { type: 'RESTART_RUN' }
  | { type: 'SET_MOVEMENT_MODE'; payload: 'walking' | 'running' | 'sneaking' }
  | { type: 'CLEAR_WORLD_HISTORY' }
  | { type: 'DEV_ADD_CAPS'; payload: number }
  | { type: 'DEV_ADD_XP'; payload: number }
  | { type: 'DEV_ADD_ITEM'; payload: string }
  | { type: 'DEV_SPAWN_AGENT'; payload: { type: AgentType; hex: HexCoord } }
  | { type: 'DEV_CLEAR_AGENTS' }
  | { type: 'DEV_SIM_TICK' }
  | { type: 'BACKGROUND_SIM_TICK' }
  | { type: 'DEDUCT_TRAVEL_RESOURCES'; payload: { pathLength: number } }
  | { type: 'SET_FLAG'; payload: { key: string; value: any } }
  | { type: 'COMBAT_DAMAGE_PLAYER'; payload: { damage: number; message: string } }
  | { type: 'COMBAT_STRIKE_NPCS'; payload: { targetId: string; damage: number; isDead: boolean } }
  | { type: 'DEDUCT_AP'; payload: number }
  | { type: 'UNLOCK_PERK'; payload: string };

// Create initial blank state for setup view
export function getInitialState(): WorldState {
  let initialGraves: GraveRecord[] = [];
  try {
    const saved = localStorage.getItem('fite_graves');
    if (saved) {
      initialGraves = JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load graves from localStorage:', e);
  }

  return {
    phase: 'setup',
    player: {
      name: 'Chosen Scholar',
      origin: 'Vault Dweller',
      coords: { q: 0, r: 0 },
      hp: { current: 30, max: 30 },
      ap: { current: 8, max: 8 },
      rad: 0,
      hunger: 10,
      thirst: 10,
      fatigue: 10,
      special: { ST: 5, PE: 5, EN: 5, CH: 5, IN: 5, AG: 5, LK: 5 },
      skills: {} as Record<SkillName, number>,
      taggedSkills: [],
      injuries: [],
      addictions: [],
      statusEffects: [],
      level: 1,
      xp: 0,
      perks: [],
      traits: [],
      skillPoints: 0,
      movementMode: 'walking',
    },
    inventory: {
      caps: 10,
      food: 3,
      water: 3,
      meds: 2,
      ammo: { '10mm Ammo': 24 },
      items: [],
      equippedWeapon: null,
      equippedArmor: null,
    },
    world: {
      seed: 42,
      timeOfDay: 8, // 8:00 AM
      day: 1,
      year: 2161,
      weather: 'Clear',
      activeTerrain: 'Canyon',
      nearbyEntities: [],
      focusedObject: null,
      hasVisitedLandmark: [],
      historyEvents: [],
      discoveredHexes: [{ q: 0, r: 0 }],
    },
    encounter: {
      active: null,
      phase: 'idle',
      lastOutcome: null,
      combatInvolvedEntityId: null,
    },
    skilldex: {
      open: false,
      availableSkills: [],
    },
    travel: {
      destination: null,
      ticksRemaining: 0,
      pathTerrain: [],
    },
    flags: {},
    graves: initialGraves,
    log: [
      { id: 'l1', timestamp: 'Day 1, 08:00', text: 'Welcome to FITE. Prepare your S.P.E.C.I.A.L parameters.', type: 'general' }
    ],
    run: {
      number: initialGraves.length + 1,
      seed: Math.floor(Math.random() * 10000) + 1,
      startDay: 1,
    },
    simulation: initSimulation()
  };
}

// Generate a random timestamp string based on game clock
function getGameTimestamp(state: WorldState): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `Day ${state.world.day}, ${pad(state.world.timeOfDay)}:00`;
}

// Add logs helper
function pushLog(logs: LogEntry[], text: string, type: LogEntry['type'], timestamp: string): LogEntry[] {
  const entry: LogEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    timestamp,
    text,
    type,
  };
  return [entry, ...logs.slice(0, 49)]; // restrict logs history to 50 lines
}

// Force-evaluate survival consequences and counter-attacks
function evaluateWorldPressures(state: WorldState, hoursSpent: number, newLogs: LogEntry[]): {
  playerHP: number;
  playerHunger: number;
  playerThirst: number;
  playerFatigue: number;
  playerRad: number;
  updatedLogs: LogEntry[];
} {
  let hp = state.player.hp.current;
  let hunger = state.player.hunger;
  let thirst = state.player.thirst;
  let fatigue = state.player.fatigue;
  let rad = state.player.rad;
  let logs = [...newLogs];
  const timestamp = getGameTimestamp(state);

  // Fatigue, Hunger, Thirst drains per tick
  const hungerCost = 1 * hoursSpent;
  const thirstCost = 1.5 * hoursSpent;
  const fatigueCost = 0.8 * hoursSpent;

  hunger = Math.max(0, hunger - hungerCost);
  thirst = Math.max(0, thirst - thirstCost);
  fatigue = Math.max(0, fatigue - fatigueCost);

  // Weather modifiers to radiation accumulation
  let envRadIncrease = 0;
  if (state.world.weather === 'RadiationStorm') {
    envRadIncrease += 15 * hoursSpent;
    logs = pushLog(logs, '⚠️ The green ionizing glow of the Radiation Storm burns your cells (+15 Rads)!', 'survival', timestamp);
  } else if (state.world.weather === 'DustStorm') {
    thirst = Math.max(0, thirst - 1.0 * hoursSpent); // dehydrates quicker
  }

  // Geographic rad increases
  if (state.world.activeTerrain === 'Canyon' && state.player.coords.q === 4) {
    // Near The Glow craters
    envRadIncrease += 40 * hoursSpent;
    logs = pushLog(logs, '☢️ Intense pre-war fission fallout hums in your skull (+40 Rads)!', 'survival', timestamp);
  }

  // Apply Radiation resistances (PnP exact modifier)
  const statsObj = calculateDerivedStats(state.player.special, state.player.level, state.player.traits);
  const adjustedRadIncrease = envRadIncrease * (1 - statsObj.radiationResistance / 100);
  if (adjustedRadIncrease > 0) {
    rad = Math.min(1000, rad + adjustedRadIncrease);
  }

  // Starving & Dehydrating penalty
  if (hunger <= 0) {
    hp -= 5 * hoursSpent;
    logs = pushLog(logs, '💀 You are STARVING! Your organs are failing (-5 HP per step).', 'survival', timestamp);
  }
  if (thirst <= 0) {
    hp -= 8 * hoursSpent;
    logs = pushLog(logs, '💀 You are severely DEHYDRATED! Your blood thickens (-8 HP per step).', 'survival', timestamp);
  }
  if (fatigue <= 0) {
    logs = pushLog(logs, '😴 Exhaustion sets in. Action Points fully halved.', 'survival', timestamp);
  }

  return {
    playerHP: Math.max(0, hp),
    playerHunger: parseFloat(hunger.toFixed(1)),
    playerThirst: parseFloat(thirst.toFixed(1)),
    playerFatigue: parseFloat(fatigue.toFixed(1)),
    playerRad: Math.min(1000, Math.floor(rad)),
    updatedLogs: logs,
  };
}

function onYearStart(state: WorldState): WorldState {
  const nextYear = (state.world.year || 2161) + 1;
  const pad = (n: number) => n.toString().padStart(2, '0');
  const timestamp = `Day 1, ${pad(state.world.timeOfDay)}:00`;
  const text = `📅 CHRONICLE YEAR ${nextYear} INITIATED: The cycle of the irradiated waste turns. Resource nodes replenishment scheduled.`;
  return {
    ...state,
    world: {
      ...state.world,
      day: 1,
      year: nextYear,
    },
    log: pushLog(state.log, text, 'general', timestamp),
  };
}

function checkYearTransition(state: WorldState): WorldState {
  if (state.world && state.world.day > 365) {
    return onYearStart(state);
  }
  return state;
}

export function gameReducer(state: WorldState, action: GameAction): WorldState {
  const nextState = rawGameReducer(state, action);
  return checkYearTransition(nextState);
}

function rawGameReducer(state: WorldState, action: GameAction): WorldState {
  const timestamp = getGameTimestamp(state);

  switch (action.type) {
    case 'CREATE_CHARACTER': {
      const { name, originId, special, traits, tagged } = action.payload;

      // Calculate base skills from formulas
      const skills: Record<SkillName, number> = {} as Record<SkillName, number>;
      Object.keys(SKILL_BASE_FORMULAS).forEach(skillKey => {
        const sKey = skillKey as SkillName;
        let baseVal = SKILL_BASE_FORMULAS[sKey](special);
        
        // Gifted penalty represents -10% all skills
        if (traits.includes('Gifted')) {
          baseVal = Math.max(1, baseVal - 10);
        }
        
        // Tagged skills add +20% raw
        if (tagged.includes(sKey)) {
          baseVal += 20;
        }

        skills[sKey] = Math.min(200, Math.max(1, baseVal));
      });

      // Vault dweller or specific origin items
      const startingItems: InventoryItem[] = [];
      let startingCaps = statsDerivedBase(special, traits).startingCaps;

      // Handle Origin templates
      if (originId === 'VaultDweller') {
        startingItems.push(createUniqueItem(ITEM_TEMPLATES.ArmorJumpsuit));
        startingItems.push(createUniqueItem(ITEM_TEMPLATES.Item10mmPistol));
        startingItems.push(createUniqueItem(ITEM_TEMPLATES.ItemStimpak));
        startingItems.push(createUniqueItem(ITEM_TEMPLATES.ItemStimpak));
        startingItems.push(createUniqueItem(ITEM_TEMPLATES.ItemWaterPurified));
        startingCaps += 15;
      } else if (originId === 'Drifter') {
        startingItems.push(createUniqueItem(ITEM_TEMPLATES.ArmorLeatherJacket));
        startingItems.push(createUniqueItem(ITEM_TEMPLATES.ItemCombatKnife));
        startingItems.push(createUniqueItem(ITEM_TEMPLATES.ItemWaterPurified));
        startingItems.push(createUniqueItem(ITEM_TEMPLATES.ItemCannedBeans));
        startingCaps += 50;
      } else if (originId === 'Scavenger') {
        startingItems.push(createUniqueItem(ITEM_TEMPLATES.ArmorLeatherJacket));
        startingItems.push(createUniqueItem(ITEM_TEMPLATES.ItemCrowbar));
        startingItems.push(createUniqueItem(ITEM_TEMPLATES.ItemRadAway));
        startingItems.push(createUniqueItem(ITEM_TEMPLATES.ItemCannedBeans));
        startingCaps += 30;
      } else {
        // Initiates
        startingItems.push(createUniqueItem(ITEM_TEMPLATES.ArmorLeatherJacket));
        startingItems.push(createUniqueItem(ITEM_TEMPLATES.ItemSecurityBaton));
        startingCaps += 10;
      }

      // Find the starting weapon and armor if they exist
      const equippedArmorItem = startingItems.find(i => i.type === 'Armor') || null;
      const equippedWeaponItem = startingItems.find(i => i.type === 'Weapon') || null;

      const initialHPMax = 15 + special.ST + (2 * special.EN) + (traits.includes('Berserker') ? 10 : 0);
      const initialAPMax = Math.max(1, (special.AG <= 3 ? 6 : special.AG <= 5 ? 7 : special.AG <= 7 ? 8 : special.AG <= 9 ? 9 : 10) - (traits.includes('Bruiser' ) ? 2 : 0));

      const newRunNum = state.graves.length + 1;

      // Seed setup world targets
      const initialWorld = generateThreatsAndObjects({ q: 0, r: 0 }, state.run.seed);

      let createdLogs = pushLog([], `Wasteland chronicle opened. Survivor: ${name || 'Nomad'} (${originId}).`, 'general', 'Day 1, 08:00');
      createdLogs = pushLog(createdLogs, `S.P.E.C.I.A.L values verified: S:${special.ST} P:${special.PE} E:${special.EN} C:${special.CH} I:${special.IN} A:${special.AG} L:${special.LK}`, 'general', 'Day 1, 08:00');

      return {
        ...state,
        phase: 'playing',
        player: {
          name: name || 'Chosen Nomad',
          origin: originId,
          coords: { q: 0, r: 0 },
          hp: { current: initialHPMax, max: initialHPMax },
          ap: { current: initialAPMax, max: initialAPMax },
          rad: 0,
          hunger: 10,
          thirst: 10,
          fatigue: 10,
          special,
          skills,
          taggedSkills: tagged,
          injuries: [],
          addictions: [],
          statusEffects: [],
          level: 1,
          xp: 0,
          perks: [],
          traits,
          skillPoints: 0,
          movementMode: 'walking',
        },
        inventory: {
          caps: startingCaps,
          food: 3,
          water: 3,
          meds: 2,
          ammo: { '10mm Ammo': 24 },
          items: startingItems,
          equippedWeapon: equippedWeaponItem ? equippedWeaponItem.id : null,
          equippedArmor: equippedArmorItem ? equippedArmorItem.id : null,
        },
        world: {
          seed: state.run.seed,
          timeOfDay: 8,
          day: 1,
          year: 2161,
          weather: 'Clear',
          activeTerrain: 'Canyon',
          nearbyEntities: initialWorld.entities,
          focusedObject: initialWorld.focused,
          hasVisitedLandmark: ['Vault13'],
          historyEvents: ['Spawned at Vault 13 ruins'],
          discoveredHexes: [{ q: 0, r: 0 }],
        },
        encounter: {
          active: null,
          phase: 'idle',
          lastOutcome: null,
          combatInvolvedEntityId: null,
        },
        skilldex: {
          open: false,
          availableSkills: initialWorld.focused ? initialWorld.focused.skillsApplicable : [],
        },
        travel: {
          destination: null,
          ticksRemaining: 0,
          pathTerrain: [],
        },
        log: createdLogs,
        run: {
          number: newRunNum,
          seed: state.run.seed,
          startDay: 1,
        },
        simulation: initSimulation()
      };
    }

    case 'TRAVEL_TO': {
      const targetCoords = action.payload;
      
      let hoursCost = 2;
      let apCost = 1;
      let encounterMod = 0;
      let travelStanceDesc = 'at a steady walking pace';

      if (state.player.movementMode === 'running') {
        hoursCost = 1;
        apCost = 1;
        encounterMod = 15;
        travelStanceDesc = 'running hastily (faster, but exhaustively)';
      } else if (state.player.movementMode === 'sneaking') {
        hoursCost = 3;
        apCost = 1;
        encounterMod = -25;
        travelStanceDesc = 'sneaking stealthily under radar';
      }

      if (state.player.ap.current < apCost) {
        return {
          ...state,
          log: pushLog(state.log, `⚠️ Not enough Action Points (AP) to travel with ${state.player.movementMode.toUpperCase()} stance (Requires ${apCost} AP)! REST first.`, 'survival', timestamp)
        };
      }

      // Time incremental
      let nextHour = state.world.timeOfDay + hoursCost;
      let nextDay = state.world.day;
      if (nextHour >= 24) {
        nextHour -= 24;
        nextDay += 1;
      }

      // Spend AP
      const nextAPVal = Math.max(0, state.player.ap.current - apCost);

      const dTerrain = getTerrainAt(targetCoords);
      const randomWeatherRoll = (nextDay * 37 + nextHour * 13) % 100;
      let nextWeather = state.world.weather;
      if (randomWeatherRoll < 20) {
        nextWeather = getRandomWeather(randomWeatherRoll);
      }

      // Generate items/NPCs at destination
      const generationResult = generateThreatsAndObjects(targetCoords, state.run.seed + nextDay + nextHour);

      const isAlreadyDiscovered = state.world.discoveredHexes?.some(h => h.q === targetCoords.q && h.r === targetCoords.r);
      const nextDiscoveredHexes = isAlreadyDiscovered
        ? (state.world.discoveredHexes || [])
        : [...(state.world.discoveredHexes || []), targetCoords];

      // Assemble new world state temporary
      let nextState: WorldState = {
        ...state,
        player: {
          ...state.player,
          coords: targetCoords,
          ap: { ...state.player.ap, current: nextAPVal }
        },
        world: {
          ...state.world,
          timeOfDay: nextHour,
          day: nextDay,
          activeTerrain: dTerrain,
          weather: nextWeather,
          nearbyEntities: generationResult.entities,
          focusedObject: generationResult.focused,
          discoveredHexes: nextDiscoveredHexes,
        },
        skilldex: {
          open: false,
          availableSkills: generationResult.focused ? generationResult.focused.skillsApplicable : [],
        }
      };

      // Apply environment calculations
      let cleanLogs = [...state.log];
      const distance = axialDistance({ q: 0, r: 0 }, targetCoords);
      cleanLogs = pushLog(cleanLogs, `Expedition: Advanced to Sector [q: ${targetCoords.q}, r: ${targetCoords.r}] (${dTerrain}) ${travelStanceDesc}. Weather is ${nextWeather}.`, 'general', getGameTimestamp(nextState));

      const survivalResults = evaluateWorldPressures(nextState, hoursCost, cleanLogs);
      nextState.player.hp.current = survivalResults.playerHP;
      nextState.player.hunger = survivalResults.playerHunger;
      nextState.player.thirst = survivalResults.playerThirst;
      nextState.player.fatigue = survivalResults.playerFatigue;
      nextState.player.rad = survivalResults.playerRad;
      nextState.log = survivalResults.updatedLogs;

      // Ensure Sneaking movement adds sneak log
      if (state.player.movementMode === 'sneaking') {
        nextState.log = pushLog(nextState.log, `🕵️ Sneak Active: Low profile maintained, reducing random threat detection by 25%.`, 'skill', getGameTimestamp(nextState));
      }

      // Handle Death checks immediately
      if (nextState.player.hp.current <= 0) {
        return triggerDeceaseTransition(nextState, `Fell to survival exposure (Severe hydration/starvation) at Sector [q: ${targetCoords.q}, r: ${targetCoords.r}].`);
      }

      // Handle Random dialogue encounter trigger
      const encounterOpportunityChance = Math.max(5, 35 + distance * 5 + encounterMod); // higher chance further away, affected by movement stance
      const randomTriggerRoll = (Math.abs(targetCoords.q * 17 ^ targetCoords.r * 29 ^ nextHour) * 31) % 100;
      if (randomTriggerRoll < encounterOpportunityChance && generationResult.entities.some(e => e.behavior === 'hostile' || e.behavior === 'neutral')) {
        // Trigger a random story dialogue event
        const dialogueIdx = (randomTriggerRoll + nextDay) % RANDOM_EVENTS.length;
        const freshEncounterTemplate = RANDOM_EVENTS[dialogueIdx];
        
        nextState.encounter = {
          active: JSON.parse(JSON.stringify(freshEncounterTemplate)), // deep clone
          phase: 'presented',
          lastOutcome: null,
          combatInvolvedEntityId: null,
        };
        nextState.log = pushLog(nextState.log, `⚠️ EVENT DISTURBANCE: ${freshEncounterTemplate.title}!`, 'general', getGameTimestamp(nextState));
      }

      // Tick simulation 3 times per travel step
      const updatedSimulation = { ...nextState.simulation };
      tickSimulation(updatedSimulation);
      tickSimulation(updatedSimulation);
      tickSimulation(updatedSimulation);
      nextState.simulation = updatedSimulation;

      return nextState;
    }

    case 'FAST_TRAVEL_TO': {
      const targetCoords = action.payload;
      const targetTerrain = getTerrainAt(targetCoords);
      const generationResult = generateThreatsAndObjects(targetCoords, state.run.seed + state.world.day + state.world.timeOfDay);
      
      const targetLandmark = findLandmarkAt(targetCoords);
      const locName = targetLandmark ? targetLandmark.name : getScenicLocationName(targetCoords.q, targetCoords.r, targetTerrain);
      
      let nextVisited = [...state.world.hasVisitedLandmark];
      if (targetLandmark && !nextVisited.includes(targetLandmark.id)) {
        nextVisited.push(targetLandmark.id);
      }

      let updatedLogs = pushLog(
        state.log, 
        `🚀 Fast traveled instantly and free to Sector [${targetCoords.q}, ${targetCoords.r}] (${locName}).`, 
        'general', 
        timestamp
      );

      const isAlreadyDiscoveredFast = state.world.discoveredHexes?.some(h => h.q === targetCoords.q && h.r === targetCoords.r);
      const nextDiscoveredHexesFast = isAlreadyDiscoveredFast
        ? (state.world.discoveredHexes || [])
        : [...(state.world.discoveredHexes || []), targetCoords];

      return {
        ...state,
        player: {
          ...state.player,
          coords: targetCoords,
          ap: { ...state.player.ap, current: Math.max(state.player.ap.current, 1) } // make sure AP is at least 1 so movement doesn't lock
        },
        world: {
          ...state.world,
          activeTerrain: targetTerrain,
          nearbyEntities: generationResult.entities,
          focusedObject: generationResult.focused,
          hasVisitedLandmark: nextVisited,
          historyEvents: [...state.world.historyEvents, `Fast traveled to ${locName}`],
          discoveredHexes: nextDiscoveredHexesFast
        },
        log: updatedLogs
      };
    }

    case 'REST_CAMP': {
      // Resting restores Action Points to max, and regenerates HP.
      // Costs 2 hunger and 3 thirst units.
      const maxStats = statsDerivedBase(state.player.special, state.player.traits);
      
      const hungerPenalty = 2;
      const thirstPenalty = 3;

      if (state.player.hunger < hungerPenalty || state.player.thirst < thirstPenalty) {
        return {
          ...state,
          log: pushLog(state.log, '⚠️ Severe famine! You do not have enough bodily energy to establish camp. Drink dirty fluids or feed!', 'survival', timestamp)
        };
      }

      let nextHour = state.world.timeOfDay + 6; // sleep takes 6 hours
      let nextDay = state.world.day;
      if (nextHour >= 24) {
        nextHour -= 24;
        nextDay += 1;
      }

      // Fast metabolism boosts heal by +5
      const healingRate = 12 + (state.player.traits.includes('FastMetabolism') ? 5 : 0);
      const nextHPVal = Math.min(maxStats.maxHP, state.player.hp.current + healingRate);
      const nextAPVal = maxStats.maxAP;

      // Auto-nourishment on wake up if available in inventory
      let cleanItems = [...state.inventory.items];
      let hunger = Math.max(0, state.player.hunger - hungerPenalty);
      let thirst = Math.max(0, state.player.thirst - thirstPenalty);
      let currentRads = state.player.rad;
      let consumedItemsList: string[] = [];

      // Auto eat food if hunger < 10 (10 is max)
      while (hunger < 10) {
        const itemIdx = cleanItems.findIndex(it => it.id.startsWith('ItemCannedBeans'));
        if (itemIdx === -1) break;
        cleanItems.splice(itemIdx, 1);
        hunger = Math.min(10, hunger + 5);
        consumedItemsList.push('🍖 Canned Beans');
      }

      // Auto drink water if thirst < 10
      while (thirst < 10) {
        // Try purified water first
        let itemIdx = cleanItems.findIndex(it => it.id.startsWith('ItemWaterPurified'));
        if (itemIdx !== -1) {
          cleanItems.splice(itemIdx, 1);
          thirst = Math.min(10, thirst + 5);
          consumedItemsList.push('💧 Purified Water');
        } else {
          // Then try dirty water
          itemIdx = cleanItems.findIndex(it => it.id.startsWith('ItemWaterDirty'));
          if (itemIdx !== -1) {
            cleanItems.splice(itemIdx, 1);
            thirst = Math.min(10, thirst + 4);
            currentRads = Math.min(1000, currentRads + 15);
            consumedItemsList.push('☢️ Dirty Water (+15 Rads)');
          } else {
            break; // No water left
          }
        }
      }

      let logMessage = `⛺ Established camp. RESTED 6 hours. HP restored (+${healingRate} HP). AP fully replenished.`;
      if (consumedItemsList.length > 0) {
        logMessage += ` On wake up, you auto-consumed: ${consumedItemsList.join(', ')}.`;
      }

      let nextState: WorldState = {
        ...state,
        player: {
          ...state.player,
          hp: { ...state.player.hp, current: nextHPVal },
          ap: { ...state.player.ap, current: nextAPVal },
          rad: currentRads,
          hunger: parseFloat(hunger.toFixed(1)),
          thirst: parseFloat(thirst.toFixed(1)),
          fatigue: Math.min(10, state.player.fatigue + 4), // gains sleep rest
        },
        inventory: {
          ...state.inventory,
          items: cleanItems
        },
        world: {
          ...state.world,
          timeOfDay: nextHour,
          day: nextDay,
        },
        log: pushLog(state.log, logMessage, 'survival', timestamp)
      };

      // Hunger check
      if (nextState.player.hunger <= 0 || nextState.player.thirst <= 0) {
        const doubleCheckResults = evaluateWorldPressures(nextState, 1, nextState.log);
        nextState.player.hp.current = doubleCheckResults.playerHP;
        nextState.log = doubleCheckResults.updatedLogs;
      }

      if (nextState.player.hp.current <= 0) {
        return triggerDeceaseTransition(nextState, 'Died of dehydration during long sleep rest cycle.');
      }

      // Tick simulation 10 times for camping
      const updatedSimulation = { ...nextState.simulation };
      for (let i = 0; i < 10; i++) {
        tickSimulation(updatedSimulation);
      }
      nextState.simulation = updatedSimulation;

      return nextState;
    }

    case 'REST_BED': {
      // Resting on physical bed cots takes only 2 hours. Restores AP and heals some HP.
      // Costs only 0.7 hunger and 1.0 thirst units.
      const maxStats = statsDerivedBase(state.player.special, state.player.traits);
      
      const hungerPenalty = 0.7;
      const thirstPenalty = 1.0;

      if (state.player.hunger < hungerPenalty || state.player.thirst < thirstPenalty) {
        return {
          ...state,
          log: pushLog(state.log, '⚠️ Severe famine! You do not have enough bodily energy to rest on the cot. Drink dirty fluids or feed!', 'survival', timestamp)
        };
      }

      let nextHour = state.world.timeOfDay + 2; // rest takes 2 hours
      let nextDay = state.world.day;
      if (nextHour >= 24) {
        nextHour -= 24;
        nextDay += 1;
      }

      // Fast metabolism boosts slightly
      const healingRate = 4 + (state.player.traits.includes('FastMetabolism') ? 1 : 0);
      const nextHPVal = Math.min(maxStats.maxHP, state.player.hp.current + healingRate);
      const nextAPVal = maxStats.maxAP;

      let nextState: WorldState = {
        ...state,
        player: {
          ...state.player,
          hp: { ...state.player.hp, current: nextHPVal },
          ap: { ...state.player.ap, current: nextAPVal },
          hunger: parseFloat(Math.max(0, state.player.hunger - hungerPenalty).toFixed(1)),
          thirst: parseFloat(Math.max(0, state.player.thirst - thirstPenalty).toFixed(1)),
          fatigue: Math.min(10, state.player.fatigue + 1.5), // slight fatigue cure
        },
        world: {
          ...state.world,
          timeOfDay: nextHour,
          day: nextDay,
        },
        log: pushLog(state.log, `🛏️ Rested 2 hours on cot. HP restored (+${healingRate} HP). AP fully replenished.`, 'survival', timestamp)
      };

      // Hunger check
      if (nextState.player.hunger <= 0 || nextState.player.thirst <= 0) {
        const doubleCheckResults = evaluateWorldPressures(nextState, 1, nextState.log);
        nextState.player.hp.current = doubleCheckResults.playerHP;
        nextState.log = doubleCheckResults.updatedLogs;
      }

      if (nextState.player.hp.current <= 0) {
        return triggerDeceaseTransition(nextState, 'Died of dehydration during short sleep rest cycle.');
      }

      // Tick simulation 3 times for short rest
      const updatedSimulation = { ...nextState.simulation };
      for (let i = 0; i < 3; i++) {
        tickSimulation(updatedSimulation);
      }
      nextState.simulation = updatedSimulation;

      return nextState;
    }

    case 'PASS_TIME': {
      const maxStats = statsDerivedBase(state.player.special, state.player.traits);
      const nextAPVal = maxStats.maxAP; // Fully restore AP to max!

      let nextHour = state.world.timeOfDay + 1;
      let nextDay = state.world.day;
      if (nextHour >= 24) {
        nextHour -= 24;
        nextDay += 1;
      }

      let nextState: WorldState = {
        ...state,
        player: {
          ...state.player,
          ap: { ...state.player.ap, current: nextAPVal },
          hunger: Math.max(0, state.player.hunger - 1),
          thirst: Math.max(0, state.player.thirst - 1),
        },
        world: {
          ...state.world,
          timeOfDay: nextHour,
          day: nextDay,
        },
        log: pushLog(state.log, `⏳ Waited 1 hour. Time passes. AP fully replenished, and simulated agents moved.`, 'general', timestamp)
      };

      if (nextState.player.hunger <= 0 || nextState.player.thirst <= 0) {
        const doubleCheckResults = evaluateWorldPressures(nextState, 1, nextState.log);
        nextState.player.hp.current = doubleCheckResults.playerHP;
        nextState.log = doubleCheckResults.updatedLogs;
      }

      if (nextState.player.hp.current <= 0) {
        return triggerDeceaseTransition(nextState, 'Succumbed to hunger/dehydration while waiting.');
      }

      // Tick simulation 3 times for passing time
      const updatedSimulation = { ...nextState.simulation };
      tickSimulation(updatedSimulation);
      tickSimulation(updatedSimulation);
      tickSimulation(updatedSimulation);
      nextState.simulation = updatedSimulation;

      return nextState;
    }

    case 'USE_ITEM': {
      const itemId = action.payload;
      const maxStats = statsDerivedBase(state.player.special, state.player.traits);

      const itemIdx = state.inventory.items.findIndex(it => it.id === itemId);
      if (itemIdx === -1) return state;

      const item = state.inventory.items[itemIdx];
      let cleanItems = [...state.inventory.items];
      cleanItems.splice(itemIdx, 1); // remove consumed asset

      let currentHP = state.player.hp.current;
      let currentRads = state.player.rad;
      let hunger = state.player.hunger;
      let thirst = state.player.thirst;
      let textLog = `Consumed item: ${item.name}.`;

      if (item.type === 'Aid') {
        const aid = item as AidItem;
        if (aid.healAmount) {
          currentHP = Math.min(maxStats.maxHP, currentHP + aid.healAmount);
          textLog += ` Recovered +${aid.healAmount} HP.`;
        }
        if (aid.radRemoval) {
          // positive removes rad, negative dirty water adds
          currentRads = Math.max(0, currentRads - aid.radRemoval);
          textLog += aid.radRemoval > 0 
            ? ` Cleansed -${aid.radRemoval} Rads.`
            : ` Chemical impurities spike radiation by +${Math.abs(aid.radRemoval)} Rads.`;
        }

        // Hydration & nourishment triggers
        if (item.id.startsWith('ItemWaterPurified')) {
          thirst = Math.min(10, thirst + 5);
          textLog += ' Thirst quenched.';
        } else if (item.id.startsWith('ItemCannedBeans')) {
          hunger = Math.min(10, hunger + 5);
          textLog += ' Hunger averted.';
        } else if (item.id.startsWith('ItemWaterDirty')) {
          thirst = Math.min(10, thirst + 4);
          currentRads = Math.min(1000, currentRads + 15);
          textLog += ' Quenched but irradiated (+15 Rads).';
        }
      }

      return {
        ...state,
        player: {
          ...state.player,
          hp: { ...state.player.hp, current: currentHP },
          rad: currentRads,
          hunger: parseFloat(hunger.toFixed(1)),
          thirst: parseFloat(thirst.toFixed(1)),
        },
        inventory: {
          ...state.inventory,
          items: cleanItems,
        },
        log: pushLog(state.log, textLog, 'survival', timestamp)
      };
    }

    case 'REPAIR_ITEM': {
      const { itemId } = action.payload;
      const itemIdx = state.inventory.items.findIndex(it => it.id === itemId);
      if (itemIdx === -1) return state;

      const item = state.inventory.items[itemIdx];
      if (item.type !== 'Weapon' && item.type !== 'Armor') {
        return {
          ...state,
          log: pushLog(state.log, `⚠️ Maintenance failure: ${item.name} is not a mechanical asset and cannot be repaired.`, 'general', timestamp)
        };
      }

      if ((item.conditionMarks || 0) === 0) {
        return {
          ...state,
          log: pushLog(state.log, `✅ Shielding & chambers on ${item.name} are already at pristine condition.`, 'general', timestamp)
        };
      }

      const scrapIdx = state.inventory.items.findIndex(it => it.id.startsWith('ItemScrap'));
      if (scrapIdx === -1) {
        return {
          ...state,
          log: pushLog(state.log, `⚠️ Resources Depleted: You require 'Scrap Metal & Components' to restore ${item.name}!`, 'general', timestamp)
        };
      }

      let nextItems = [...state.inventory.items];
      nextItems.splice(scrapIdx, 1); // consume scrap

      const targetItem = { ...nextItems.find(it => it.id === itemId)! };
      const currentMarks = targetItem.conditionMarks || 0;
      
      const engineerSkill = state.player.skills.Engineer || 25;
      const roll = Math.floor(Math.random() * 100) + 1;
      
      let restorePoints = 0;
      let outcomeMessage = '';
      
      if (roll <= 5) {
        restorePoints = currentMarks;
        outcomeMessage = `⚙️ CRITICAL SUCCESS! Your Engineer skill perfectly calibrated ${item.name} back to structural pristine order.`;
      } else if (roll <= engineerSkill) {
        restorePoints = Math.min(3, currentMarks);
        outcomeMessage = `🔧 Success: Refabricated ${item.name} structural plating utilizing scrap salvage (+${restorePoints} Condition points).`;
      } else if (roll >= 95) {
        restorePoints = -1;
        outcomeMessage = `💥 CRITICAL FAILURE! Plating fracture occurred while working on ${item.name} (-1 additional Condition point).`;
      } else {
        restorePoints = Math.min(1, currentMarks);
        outcomeMessage = `🔧 Salvage: Attempt yielded minor structural improvements to ${item.name} (+1 Condition point).`;
      }

      targetItem.conditionMarks = Math.max(0, Math.min(10, currentMarks - restorePoints));

      const repIdx = nextItems.findIndex(it => it.id === itemId);
      nextItems[repIdx] = targetItem;

      return {
        ...state,
        inventory: {
          ...state.inventory,
          items: nextItems
        },
        log: pushLog(state.log, outcomeMessage, 'general', timestamp)
      };
    }

    case 'EQUIP_ITEM': {
      const itemId = action.payload;
      const item = state.inventory.items.find(i => i.id === itemId);
      if (!item) return state;

      let prevWeapon = state.inventory.equippedWeapon;
      let prevArmor = state.inventory.equippedArmor;

      if (item.type === 'Weapon') {
        if (prevWeapon === itemId) {
          prevWeapon = null; // Toggle unequip
        } else {
          prevWeapon = itemId;
        }
      } else if (item.type === 'Armor') {
        if (prevArmor === itemId) {
          prevArmor = null; // Toggle unequip
        } else {
          prevArmor = itemId;
        }
      }

      const equipName = item.name;
      const logString = (item.type === 'Weapon')
        ? (prevWeapon ? `Equipped weapon: ${equipName}.` : `Unequipped weapon: ${equipName}.`)
        : (prevArmor  ? `Equipped protective armor bodysuit: ${equipName}.` : `Unequipped armor: ${equipName}.`);

      return {
        ...state,
        inventory: {
          ...state.inventory,
          equippedWeapon: prevWeapon,
          equippedArmor: prevArmor,
        },
        log: pushLog(state.log, logString, 'general', timestamp)
      };
    }

    case 'SKILLDEX_TOGGLE': {
      const explicit = action.payload;
      const isOpen = (explicit !== undefined) ? explicit : !state.skilldex.open;
      return {
        ...state,
        skilldex: {
          ...state.skilldex,
          open: isOpen,
        }
      };
    }

    case 'TRIGGER_SKILL_CHECK': {
      const { skill, objectId } = action.payload;
      const focused = state.world.focusedObject;

      if (!focused || focused.id !== objectId) return state;
      if (!focused.gates[skill]) return state;

      const flatApCost = 4;
      if (state.player.ap.current < flatApCost) {
        return {
          ...state,
          log: pushLog(state.log, '⚠️ Insufficient AP! All Skilldex attempts demand exactly 4 Action Points.', 'skill', timestamp)
        };
      }

      const gate = focused.gates[skill];
      const checkResult = evaluateSkillCheck(state.player.skills, skill, gate.difficulty, state.player.perks);
      const isSuccess = checkResult.success;
      const roll = checkResult.roll;
      const adjustedChance = checkResult.successThreshold;
      const userSkillVal = checkResult.baseValue;

      let nextAPVal = Math.max(0, state.player.ap.current - flatApCost);
      let logs = [...state.log];

      // Reclaim / allocate outcome
      const outcome = isSuccess ? gate.passOutcome : gate.failOutcome;
      let hp = state.player.hp.current;
      let rad = state.player.rad;
      let caps = state.inventory.caps;
      let xp = state.player.xp;
      let itemsList = [...state.inventory.items];

      logs = pushLog(logs, `[SKILLDEX] Used 4 AP on ${skill} check vs ${focused.name}. Roll: ${roll} / Need <= ${adjustedChance} (Skill %${userSkillVal} + Perk Bonus %${checkResult.perkBonus} - Diff ${gate.difficulty}).`, 'skill', timestamp);
      logs = pushLog(logs, `${isSuccess ? '✅ SUCCESS!' : '❌ FAILURE!'} ${outcome.message}`, 'skill', timestamp);

      if (outcome.mechanic === 'health') {
        hp = Math.max(0, hp + outcome.value);
      } else if (outcome.mechanic === 'rads') {
        rad = Math.min(1000, rad + outcome.value);
      } else if (outcome.mechanic === 'caps') {
        caps = Math.max(0, caps + outcome.value);
      } else if (outcome.mechanic === 'xp') {
        xp += outcome.value;
      } else if (outcome.mechanic === 'item' && outcome.itemTemplateId) {
        const generatedItem = ITEM_TEMPLATES[outcome.itemTemplateId];
        if (generatedItem) {
          itemsList.push(createUniqueItem(generatedItem));
        }
      }

      // Check level-up threshold: XP boundaries
      let lvl = state.player.level;
      let sp = state.player.skillPoints;
      const xpNeeded = lvl === 1 ? 1000 : lvl === 2 ? 3000 : lvl === 3 ? 6000 : 10000;
      if (xp >= xpNeeded && lvl < 5) {
        lvl += 1;
        const derived = calculateDerivedStats(state.player.special, lvl, state.player.traits);
        sp += derived.skillPointsPerLevel;
        logs = pushLog(logs, `✨ LEVEL UP! You have ascended to Level ${lvl}! Spent SP to customize skills in SPECIAL tab (+${derived.skillPointsPerLevel} Skill Points).`, 'general', timestamp);
      }

      // Mutate focused object as interacted
      const mutatedObject: WorldObject = {
        ...focused,
        interacted: true,
      };

      let finalState: WorldState = {
        ...state,
        player: {
          ...state.player,
          hp: { ...state.player.hp, current: hp },
          ap: { ...state.player.ap, current: nextAPVal },
          rad,
          xp,
          level: lvl,
          skillPoints: sp
        },
        inventory: {
          ...state.inventory,
          caps,
          items: itemsList
        },
        world: {
          ...state.world,
          focusedObject: mutatedObject,
        },
        skilldex: {
          open: false,
          availableSkills: [],
        },
      };

      // If dead
      if (finalState.player.hp.current <= 0) {
        return triggerDeceaseTransition(finalState, `Killed during security backlash resolving ${skill} checks against ${focused.name}.`);
      }

      return finalState;
    }

    case 'RESOLVE_DIAL_OPTION': {
      const { nextStepId, optionIdx, skillCheckPassed } = action.payload;
      const activeEv = state.encounter.active;
      if (!activeEv) return state;

      const currentStepId = activeEv.currentStepId;
      const option = activeEv.steps[currentStepId].options[optionIdx];

      let cleanLogs = [...state.log];
      cleanLogs = pushLog(cleanLogs, `🗣️ Option: "${option.text}"`, 'general', timestamp);
      cleanLogs = pushLog(cleanLogs, option.outcomeLog, 'general', timestamp);

      let caps = state.inventory.caps;
      let hp = state.player.hp.current;
      let rad = state.player.rad;
      let xp = state.player.xp;
      let itemsList = [...state.inventory.items];

      // Deduct or add costs and gains defined in content json dialogue
      if (option.costs) {
        if (option.costs.caps) {
          const playerBarter = state.player.skills.Barter || 25;
          const multiplier = calculateBarterPriceMultiplier(playerBarter, 30);
          const adjustedCost = Math.max(1, Math.round(option.costs.caps * multiplier));
          caps = Math.max(0, caps - adjustedCost);

          if (adjustedCost !== option.costs.caps) {
            const difference = option.costs.caps - adjustedCost;
            if (difference > 0) {
              cleanLogs = pushLog(cleanLogs, `💰 Barter Advantage: Saved ${difference} Caps due to trade leverage!`, 'general', timestamp);
            } else if (difference < 0) {
              cleanLogs = pushLog(cleanLogs, `💸 Trade Penalty: Surcharged ${Math.abs(difference)} Caps due to poor barter negotiation.`, 'general', timestamp);
            }
          }
        }
        if (option.costs.health) hp = Math.max(0, hp - option.costs.health);
      }

      if (option.gains) {
        if (option.gains.caps) caps += option.gains.caps;
        if (option.gains.xp) xp += option.gains.xp;
        if (option.gains.health) hp = Math.min(statsDerivedBase(state.player.special, state.player.traits).maxHP, hp + option.gains.health);
        if (option.gains.rads) rad = Math.min(1000, rad + option.gains.rads);
        if (option.gains.itemTemplateId) {
          const t = ITEM_TEMPLATES[option.gains.itemTemplateId];
          if (t) {
            itemsList.push(createUniqueItem(t));
          }
        }
      }

      // Check level-up
      let lvl = state.player.level;
      let sp = state.player.skillPoints;
      const xpNeeded = lvl === 1 ? 1000 : lvl === 2 ? 3000 : lvl === 3 ? 6000 : 10000;
      if (xp >= xpNeeded && lvl < 5) {
        lvl += 1;
        const derived = calculateDerivedStats(state.player.special, lvl, state.player.traits);
        sp += derived.skillPointsPerLevel;
        cleanLogs = pushLog(cleanLogs, `✨ LEVEL UP! Extended capability to Level ${lvl}.`, 'general', timestamp);
      }

      let updatedEncounter: GameEvent | null = null;
      if (nextStepId && activeEv) {
        // Create a deep copy of the active encounter to be completely immutable and side-effect free.
        const clonedEncounter = JSON.parse(JSON.stringify(activeEv)) as GameEvent;
        clonedEncounter.currentStepId = nextStepId;

        // If skillCheckPassed parameter was provided, filter the next step's options
        if (skillCheckPassed !== undefined) {
          const step = clonedEncounter.steps[nextStepId];
          if (step && step.options.length >= 2) {
            if (skillCheckPassed) {
              // Player succeeds! Keep only the first option (Success path)
              step.options = [step.options[0]];
            } else {
              // Player fails! Keep only the second option (Failure path)
              step.options = [step.options[1]];
            }
          }
        }
        updatedEncounter = clonedEncounter;
      }

      let nextState: WorldState = {
        ...state,
        player: { 
          ...state.player, 
          hp: { ...state.player.hp, current: hp }, 
          rad, 
          xp, 
          level: lvl, 
          skillPoints: sp 
        },
        inventory: { ...state.inventory, caps, items: itemsList },
        encounter: {
          active: updatedEncounter,
          phase: updatedEncounter ? 'resolving' : 'idle',
          lastOutcome: null,
          combatInvolvedEntityId: null,
        },
        log: cleanLogs,
      };

      if (nextState.player.hp.current <= 0) {
        return triggerDeceaseTransition(nextState, `Executed by raiders during caravan incident.`);
      }

      return nextState;
    }

    case 'ATTACK_ENTITY': {
      const { targetId } = action.payload;
      const entityIdx = state.world.nearbyEntities.findIndex(e => e.id === targetId);
      if (entityIdx === -1) return state;

      const entity = state.world.nearbyEntities[entityIdx];
      const equippedWeaponId = state.inventory.equippedWeapon;
      
      const weaponItem = equippedWeaponId 
        ? (state.inventory.items.find(i => i.id === equippedWeaponId) as WeaponItem)
        : null;

      // AP constraints checking
      const apCost = weaponItem ? weaponItem.apCostRanged : 4; // punches are 4 AP base

      if (state.player.ap.current < apCost) {
        return {
          ...state,
          log: pushLog(state.log, `⚠️ Too tired to initiate strike. Demands ${apCost} AP!`, 'combat', timestamp)
        };
      }

      let nextAPVal = Math.max(0, state.player.ap.current - apCost);
      const activeSkillName: SkillName = weaponItem 
        ? weaponItem.combatSkillRequired 
        : 'Unarmed';

      const userSkillPct = state.player.skills[activeSkillName] || 25;
      const targetAC = 10; // Simple base target defensive Armor Class
      const roll = Math.floor(Math.random() * 100) + 1;

      // Storm and dust checks
      let envMod = 0;
      if (state.world.weather === 'DustStorm') envMod = -20;
      else if (state.world.weather === 'NightTime') envMod = -30;

      const toHitChance = Math.max(5, userSkillPct - targetAC + envMod);
      const didHit = roll <= toHitChance;

      let logs = [...state.log];
      let updatedEntities = [...state.world.nearbyEntities];

      logs = pushLog(logs, `⚔️ Attacked ${entity.name} using ${weaponItem ? weaponItem.name : 'Unarmed punch'}. Roll: ${roll} / Need <= ${toHitChance}%.`, 'combat', timestamp);

      if (didHit) {
        // Evaluate Luck Critical hit success limits
        const critLimits = getLuckCritInfo(state.player.special.LK);
        const isCritical = roll <= critLimits.successRange;

        // Damage Calculation
        let baseDmg = 5; // standard unarmed base punch
        if (weaponItem) {
          if (weaponItem.damageBase === '1d6+2') baseDmg = 1 + Math.floor(Math.random() * 6) + 2;
          else if (weaponItem.damageBase === '2d6') baseDmg = (1 + Math.floor(Math.random() * 6)) + (1 + Math.floor(Math.random() * 6));
          else if (weaponItem.damageBase === '1d8') baseDmg = 1 + Math.floor(Math.random() * 8);
          else if (weaponItem.damageBase === '1d8+1') baseDmg = 1 + Math.floor(Math.random() * 8) + 1;
        } else {
          // add Melee Damage bonus stat to Unarmed punches
          const derived = calculateDerivedStats(state.player.special, state.player.level, state.player.traits);
          baseDmg += derived.meleeDamage;
        }

        if (isCritical) {
          baseDmg = Math.floor(baseDmg * 2.0);
          logs = pushLog(logs, '🔥 CRITICAL SUCCESS DIRECT STRIKE! 2.0x Damage inflicted, piercing armor plates!', 'combat', timestamp);
        }

        const nextEnHP = Math.max(0, entity.hp.current - baseDmg);
        updatedEntities[entityIdx] = {
          ...entity,
          hp: { ...entity.hp, current: nextEnHP },
          isDead: nextEnHP <= 0 ? true : false,
        };

        logs = pushLog(logs, `💥 Smashed ${entity.name} for ${baseDmg} raw physical damages!`, 'combat', timestamp);

        if (nextEnHP <= 0) {
          logs = pushLog(logs, `💀 Slain! ${entity.name} collapses into an radioactive pool. Gained +150 XP.`, 'combat', timestamp);
          // XP increase
          let nextXP = state.player.xp + 150;
          let lvl = state.player.level;
          let sp = state.player.skillPoints;
          const xpNeeded = lvl === 1 ? 1000 : lvl === 2 ? 3000 : lvl === 3 ? 6000 : 10000;
          if (nextXP >= xpNeeded && lvl < 5) {
            lvl += 1;
            const derived = calculateDerivedStats(state.player.special, lvl, state.player.traits);
            sp += derived.skillPointsPerLevel;
            logs = pushLog(logs, `✨ LEVEL UP! Escaped mortality to Level ${lvl}.`, 'general', timestamp);
          }

          return {
            ...state,
            player: {
              ...state.player,
              ap: { ...state.player.ap, current: nextAPVal },
              xp: nextXP,
              level: lvl,
              skillPoints: sp
            },
            world: {
              ...state.world,
              nearbyEntities: updatedEntities,
            },
            log: logs,
          };
        }
      } else {
        logs = pushLog(logs, `💨 Missed completely. Your blow strikes air dust.`, 'combat', timestamp);

        // Check weapon decay marks on failures or standard ticks
        const isCritFail = roll >= ToHitCritFailThreshold(state.player.special.LK);
        if (state.inventory.equippedWeapon && isCritFail) {
          logs = pushLog(logs, '⚠️ CRITICAL WEAPON FAILURE! Gun jammed or edge warped (+2 Condition decay marks inflicted).', 'combat', timestamp);
        }
      }

      // ENTITY COUNTER ATTACK
      // Hostiles immediately trade damage if close
      let hpVal = state.player.hp.current;
      if (updatedEntities[entityIdx].behavior === 'hostile' && !updatedEntities[entityIdx].isDead) {
        const entDmg = 8 + (axialDistance({ q: 0, r: 0 }, state.player.coords)); // scales with danger
        
        // Armor reduction (DT and DR exact calculation)
        const armorId = state.inventory.equippedArmor;
        const armor = armorId 
          ? (state.inventory.items.find(i => i.id === armorId) as ArmorItem)
          : null;

        const dtVal = armor ? (armor.dt.Normal || 0) : 0;
        const drVal = armor ? (armor.dr.Normal || 0) : 0;

        const mitigatedDmg = Math.max(1, Math.floor((entDmg - dtVal) * (1 - drVal / 100)));
        hpVal = Math.max(0, hpVal - mitigatedDmg);

        logs = pushLog(logs, `🩸 Counterstrike: ${entity.name} slices you back, bypassing armor DT and dealing -${mitigatedDmg} HP.`, 'combat', timestamp);
      }

      let nextState: WorldState = {
        ...state,
        player: {
          ...state.player,
          hp: { ...state.player.hp, current: hpVal },
          ap: { ...state.player.ap, current: nextAPVal },
        },
        world: {
          ...state.world,
          nearbyEntities: updatedEntities,
        },
        log: logs,
      };

      if (nextState.player.hp.current <= 0) {
        return triggerDeceaseTransition(nextState, `Annihilated by ${entity.name} on the field.`);
      }

      return nextState;
    }

    case 'CLOSE_OUTCOME': {
      return {
        ...state,
        encounter: {
          ...state.encounter,
          lastOutcome: null,
        }
      };
    }

    case 'DEDUCT_TRAVEL_RESOURCES': {
      const { pathLength } = action.payload;
      if (pathLength > 5) {
        const nextFood = Math.max(0, state.inventory.food - 1);
        const nextWater = Math.max(0, state.inventory.water - 1);
        return {
          ...state,
          inventory: {
            ...state.inventory,
            food: nextFood,
            water: nextWater,
          },
          log: pushLog(
            state.log,
            `🍗💧 LONG-DISTANCE TRAVEL: Spent 1 Food and 1 Water from inventory survival pools.`,
            'survival',
            timestamp
          ),
        };
      }
      return state;
    }

    case 'RESTART_RUN': {
      const resetState = getInitialState();
      return resetState;
    }

    case 'SET_MOVEMENT_MODE': {
      const mode = action.payload;
      return {
        ...state,
        player: {
          ...state.player,
          movementMode: mode
        },
        log: pushLog(state.log, `Stance adjusted: You are now ${mode.toUpperCase()} on your expedition.`, 'general', timestamp)
      };
    }

    case 'CLEAR_WORLD_HISTORY': {
      localStorage.removeItem('fite_graves');
      return {
        ...state,
        graves: [],
        log: pushLog(state.log, '🧹 Legacies erased! Cemeteries are cleared of past gravestones.', 'general', timestamp)
      };
    }

    case 'DEV_ADD_CAPS': {
      const caps = action.payload;
      return {
        ...state,
        inventory: {
          ...state.inventory,
          caps: Math.max(0, state.inventory.caps + caps)
        },
        log: pushLog(state.log, `🛠️ Dev Console: Adjusted player caps by ${caps >= 0 ? '+' : ''}${caps} Caps.`, 'general', timestamp)
      };
    }

    case 'DEV_ADD_XP': {
      const xpValue = action.payload;
      const nextXp = Math.max(0, state.player.xp + xpValue);
      const neededForLevelUp = state.player.level * 1000;
      let nextLevel = state.player.level;
      let finalXp = nextXp;
      let logs = [...state.log];
      if (finalXp >= neededForLevelUp) {
        nextLevel += 1;
        finalXp -= neededForLevelUp;
        logs = pushLog(logs, `✨ Dev Console: LEVEL UP! Advanced to Level ${nextLevel}! Rejuvenated vital energy.`, 'general', timestamp);
      }
      return {
        ...state,
        player: {
          ...state.player,
          xp: finalXp,
          level: nextLevel,
          hp: { ...state.player.hp, current: state.player.hp.max }
        },
        log: pushLog(logs, `🛠️ Dev Console: Added ${xpValue} XP to simulation profile.`, 'general', timestamp)
      };
    }

    case 'DEV_ADD_ITEM': {
      const itemTemplateId = action.payload;
      const template = ITEM_TEMPLATES[itemTemplateId];
      if (!template) {
        return {
          ...state,
          log: pushLog(state.log, `⚠️ Dev Error: Item template '${itemTemplateId}' was not found in content catalog.`, 'general', timestamp)
        };
      }
      const newItem = createUniqueItem(template);
      return {
        ...state,
        inventory: {
          ...state.inventory,
          items: [...state.inventory.items, newItem]
        },
        log: pushLog(state.log, `🛠️ Dev Console: Spawned '${template.name}' into direct inventory possession.`, 'general', timestamp)
      };
    }

    case 'DEV_SPAWN_AGENT': {
      const { type: agentType, hex } = action.payload;
      const nextSim = JSON.parse(JSON.stringify(state.simulation));
      devSpawnAgent(nextSim, agentType, hex);
      return {
        ...state,
        simulation: nextSim,
        log: pushLog(state.log, `🛠️ Dev Console: Materialized AI Agent [${agentType.toUpperCase()}] at Sector [q: ${hex.q}, r: ${hex.r}].`, 'general', timestamp)
      };
    }

    case 'DEV_CLEAR_AGENTS': {
      const nextSim = JSON.parse(JSON.stringify(state.simulation));
      devClearAgents(nextSim);
      return {
        ...state,
        simulation: nextSim,
        log: pushLog(state.log, '🛠️ Dev Console: Scrubbed all active active AI faction agents from world grid.', 'general', timestamp)
      };
    }

    case 'DEV_SIM_TICK': {
      const nextSim = { ...state.simulation };
      tickSimulation(nextSim);
      return {
        ...state,
        simulation: nextSim,
        log: pushLog(state.log, `🛠️ Dev Console: Force-accelerated simulation tick engine (Tick #${nextSim.tick}).`, 'general', timestamp)
      };
    }

    case 'BACKGROUND_SIM_TICK': {
      const nextSim = { ...state.simulation };
      const hasSimulatedAgentNearPlayer = state.simulation.agents.some(agent => {
        if (agent.behaviorState === 'dead') return false;
        return axialDistance(state.player.coords, agent.hex) <= 5;
      });
      const shouldUpdate = state.flags?.enableGlobalSimulation !== false || hasSimulatedAgentNearPlayer;
      
      let logs = [...state.log];
      if (shouldUpdate) {
        const preAgents = JSON.parse(JSON.stringify(nextSim.agents));

        tickSimulation(nextSim);

        const playerPE = state.player.special.PE || 5;

        nextSim.agents.forEach((agent: any) => {
          const oldAgent = preAgents.find((a: any) => a.id === agent.id);
          if (oldAgent) {
            const distFromPlayer = axialDistance(state.player.coords, agent.hex);
            if (distFromPlayer <= playerPE) {
              if (agent.behaviorState === 'dead' && oldAgent.behaviorState !== 'dead') {
                logs = pushLog(logs, `📡 Biometer [Local PE Area]: Simulated ${agent.type} was slain at Sector [${agent.hex.q}, ${agent.hex.r}].`, 'general', timestamp);
              } else if (agent.behaviorState === 'converting' && oldAgent.behaviorState !== 'converting') {
                logs = pushLog(logs, `🧪 Biometer [Local PE Area]: Simulated ${agent.type} converting at Sector [${agent.hex.q}, ${agent.hex.r}].`, 'general', timestamp);
              } else if (oldAgent.hex.q !== agent.hex.q || oldAgent.hex.r !== agent.hex.r) {
                const actionWord = agent.behaviorState === 'fleeing' ? 'fled' : agent.behaviorState === 'hunting' ? 'hunted' : 'wandered';
                logs = pushLog(logs, `📡 Biometer [Local PE Area]: Simulated ${agent.type} ${actionWord} to Sector [${agent.hex.q}, ${agent.hex.r}].`, 'general', timestamp);
              }
            }
          }
        });
      } else {
        nextSim.tick += 1;
      }
      return {
        ...state,
        simulation: nextSim,
        log: logs
      };
    }

    case 'SET_FLAG': {
      const { key, value } = action.payload;
      return {
        ...state,
        flags: {
          ...state.flags,
          [key]: value
        }
      };
    }

    case 'COMBAT_DAMAGE_PLAYER': {
      const { damage, message } = action.payload;
      const finalHp = Math.max(0, state.player.hp.current - damage);
      let logs = pushLog(state.log, `💥 TAKEN DAMAGE: Spent vital health: -${damage} HP (${message}).`, 'survival', timestamp);
      
      let nextState = {
        ...state,
        player: {
          ...state.player,
          hp: { ...state.player.hp, current: finalHp }
        },
        log: logs
      };

      if (finalHp <= 0) {
        return triggerDeceaseTransition(nextState, `Fell during physical combat: ${message}`);
      }
      return nextState;
    }

    case 'COMBAT_STRIKE_NPCS': {
      const { targetId, damage, isDead } = action.payload;
      const entityIdx = state.world.nearbyEntities.findIndex(e => e.id === targetId);
      if (entityIdx === -1) return state;

      const entity = state.world.nearbyEntities[entityIdx];
      const updatedEntities = [...state.world.nearbyEntities];
      const nextNpcHp = Math.max(0, entity.hp.current - damage);
      
      updatedEntities[entityIdx] = {
        ...entity,
        hp: { ...entity.hp, current: nextNpcHp },
        isDead: isDead || nextNpcHp <= 0
      };

      let logs = [...state.log];
      logs = pushLog(logs, `💥 VATS Shot: Inflicted ${damage} damage to ${entity.name}.`, 'combat', timestamp);

      let xpGained = 0;
      let lvl = state.player.level;
      let sp = state.player.skillPoints;

      if (isDead || nextNpcHp <= 0) {
        logs = pushLog(logs, `💀 Slain! ${entity.name} collapses. Gained +150 XP.`, 'combat', timestamp);
        xpGained = 150;
      }

      let nextXP = state.player.xp + xpGained;
      const xpNeeded = lvl === 1 ? 1000 : lvl === 2 ? 3000 : lvl === 3 ? 6000 : 10000;
      if (nextXP >= xpNeeded && lvl < 5) {
        lvl += 1;
        const derived = calculateDerivedStats(state.player.special, lvl, state.player.traits);
        sp += derived.skillPointsPerLevel;
        logs = pushLog(logs, `✨ LEVEL UP! Extracted wasteland capabilities to Level ${lvl}!`, 'general', timestamp);
      }

      return {
        ...state,
        player: {
          ...state.player,
          xp: nextXP,
          level: lvl,
          skillPoints: sp
        },
        world: {
          ...state.world,
          nearbyEntities: updatedEntities
        },
        log: logs
      };
    }

    case 'DEDUCT_AP': {
      const apDeducted = action.payload;
      return {
        ...state,
        player: {
          ...state.player,
          ap: {
            ...state.player.ap,
            current: Math.max(0, state.player.ap.current - apDeducted)
          }
        }
      };
    }

    case 'UNLOCK_PERK': {
      const perkId = action.payload;
      if (state.player.perks.includes(perkId)) return state;
      return {
        ...state,
        log: pushLog(state.log, `⭐ PERK UNLOCKED: You purchased the [${perkId.toUpperCase()}] perk!`, 'general', timestamp),
        player: {
          ...state.player,
          perks: [...state.player.perks, perkId]
        }
      };
    }

    default:
      return state;
  }
}

// Stats helper
function statsDerivedBase(special: SPECIAL, traits: string[]) {
  return calculateDerivedStats(special, 1, traits);
}

// Critical failure threshold map
function ToHitCritFailThreshold(lk: number): number {
  if (lk === 10) return 100;
  return 91 + (lk - 1);
}

// Transition state and serialize graveyard
function triggerDeceaseTransition(state: WorldState, cause: string): WorldState {
  const finalLog = pushLog(state.log, `💀 SURVIVOR ELIMINATED: ${state.player.name} has fell. Reason: ${cause}`, 'death', getGameTimestamp(state));
  
  // Format Grave Record snapshot
  const record: GraveRecord = {
    runNumber: state.run.number,
    playerName: state.player.name,
    special: state.player.special,
    causeOfDeath: cause,
    coords: state.player.coords,
    day: state.world.day,
    inventorySnapshot: state.inventory.items.map(item => ({
      name: item.name,
      emoji: item.emoji
    }))
  };

  const updatedGraves = [record, ...state.graves];

  try {
    localStorage.setItem('fite_graves', JSON.stringify(updatedGraves));
  } catch (err) {
    console.error('Failed to serialize FITE grave legacy catalog:', err);
  }

  return {
    ...state,
    phase: 'dead',
    graves: updatedGraves,
    log: finalLog,
  };
}

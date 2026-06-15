/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HexCoord, WorldState, WorldEntity, WorldObject, TerrainType, WeatherType, AgentType } from './types';
import { WORLD_LANDMARKS, Landmark, OBJECT_TEMPLATES } from './content';
import { createSpawners } from './spawners';

// Metric distance in axial coordinates
export function axialDistance(a: HexCoord, b: HexCoord): number {
  return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
}

// Generate terrain based on coordinates
export function getTerrainAt(coords: HexCoord): TerrainType {
  const d = axialDistance({ q: 0, r: 0 }, coords);
  if (d === 0) return 'Canyon';
  
  // Static map regions
  if (coords.q > 1 && coords.r < 0) return 'Desert';
  if (coords.q < 0 && coords.r > 2) return 'Ruins';
  if (coords.q < -1 && coords.r < 0) return 'Mountain';
  if (coords.q > 1 && coords.r > 1) return 'Canyon'; // The Glow area
  
  const hash = Math.abs((coords.q * 12345) ^ (coords.r * 54321)) % 100;
  if (hash < 30) return 'Wasteland';
  if (hash < 55) return 'Desert';
  if (hash < 75) return 'Ruins';
  if (hash < 90) return 'Canyon';
  return 'Swamp';
}

// Generate procedural weather variations
export function getRandomWeather(seed: number): WeatherType {
  const roll = Math.abs(seed ^ 987654) % 100;
  if (roll < 45) return 'Clear';
  if (roll < 65) return 'NightTime';
  if (roll < 80) return 'Fog';
  if (roll < 90) return 'DustStorm';
  if (roll < 97) return 'HeavyStorm';
  return 'RadiationStorm'; // Deadly!
}

// Check if a landmark exists at coordinates
export function findLandmarkAt(coords: HexCoord): Landmark | null {
  return WORLD_LANDMARKS.find(l => l.coords.q === coords.q && l.coords.r === coords.r) || null;
}

// Generate entities dynamically inside a world coordinate
export function generateThreatsAndObjects(coords: HexCoord, seed: number): {
  entities: WorldEntity[];
  focused: WorldObject | null;
} {
  const distance = axialDistance({ q: 0, r: 0 }, coords);
  const landmark = findLandmarkAt(coords);

  const entities: WorldEntity[] = [];
  let focused: WorldObject | null = null;

  // Dynamically load spawners from the engine and inject them into the local entities to reflect Fallout-inspired geography
  const spawnersList = createSpawners();
  const matchingSpawners = spawnersList.filter(s => s.hex.q === coords.q && s.hex.r === coords.r);
  
  for (const s of matchingSpawners) {
    let spawnerName = '';
    let emoji = '⚙️';
    let factionName: any = 'Wastelanders';
    let behavior: 'friendly' | 'neutral' | 'hostile' = 'neutral';
    
    switch (s.type) {
      case AgentType.VaultDweller:
        spawnerName = 'Vault Dweller Squad Outpost';
        emoji = '🚪';
        factionName = 'VaultSecurity';
        behavior = 'friendly';
        break;
      case AgentType.Raider:
        spawnerName = 'Khan Raider Outcamp';
        emoji = '🥷';
        factionName = 'Raiders';
        behavior = 'hostile';
        break;
      case AgentType.Wastelander:
        spawnerName = 'Wasteland Settler Gathering';
        emoji = '🧍‍♂️';
        factionName = 'NewCalifornia';
        behavior = 'friendly';
        break;
      case AgentType.Scavenger:
        spawnerName = 'Scavenger Salvage Site';
        emoji = '🕵️‍♂️';
        factionName = 'Wastelanders';
        behavior = 'neutral';
        break;
      case AgentType.Caravan:
        spawnerName = 'Crimson Caravan Terminus';
        emoji = '🐫';
        factionName = 'NewCalifornia';
        behavior = 'friendly';
        break;
      case AgentType.TownGuard:
        spawnerName = 'Sentry Patrol Post';
        emoji = '👮‍♂️';
        factionName = 'NewCalifornia';
        behavior = 'neutral';
        break;
      case AgentType.Critter:
        spawnerName = 'Radscorpion Nesting Hole';
        emoji = '🦂';
        factionName = 'Raiders';
        behavior = 'hostile';
        break;
      case AgentType.Enemy:
        spawnerName = 'Hostile Threat Campfire';
        emoji = '💀';
        factionName = 'Raiders';
        behavior = 'hostile';
        break;
      case AgentType.SuperMutant:
        spawnerName = 'FEV SuperMutant Stronghold';
        emoji = '👹';
        factionName = 'SuperMutants';
        behavior = 'hostile';
        break;
      case AgentType.Nightkin:
        spawnerName = 'Nightkin Stealth Outpost';
        emoji = '😈';
        factionName = 'SuperMutants';
        behavior = 'hostile';
        break;
      default:
        spawnerName = `Active Spawner [${s.id}]`;
        emoji = '⚙️';
        factionName = 'Wastelanders';
        behavior = 'neutral';
    }
    
    entities.push({
      id: `spawner_entity_${s.id}`,
      name: spawnerName,
      emoji: emoji,
      faction: factionName,
      hp: { current: 155, max: 155 },
      behavior: behavior,
      posOffset: {
        x: -35 + (Math.abs(s.id.charCodeAt(0) * 17) % 70),
        y: -15 + (Math.abs(s.id.charCodeAt(1) * 11) % 30),
        z: 0.5 + ((Math.abs(s.id.charCodeAt(2) * 3) % 4) / 10)
      }
    });
  }

  if (landmark) {
    // Spawn corresponding landmark's static interactive objects
    if (landmark.objectTemplates.length > 0) {
      const templateId = landmark.objectTemplates[0];
      const template = OBJECT_TEMPLATES[templateId];
      if (template) {
        focused = { ...template, interacted: false };
      }
    }

    // Spawn guards or local residents of the Landmark
    if (landmark.id === 'Vault13') {
      entities.push({
        id: 'vault_sec_1',
        name: 'Automated Sentry Turret',
        emoji: '🤖',
        faction: 'VaultSecurity',
        hp: { current: 50, max: 50 },
        behavior: 'neutral',
        posOffset: { x: -30, y: 10, z: 0.6 }
      });
    } else if (landmark.id === 'ShadySands') {
      entities.push({
        id: 'shady_guard',
        name: 'Settlement Defender',
        emoji: '👳',
        faction: 'NewCalifornia',
        hp: { current: 65, max: 65 },
        behavior: 'friendly',
        posOffset: { x: -40, y: 0, z: 0.5 }
      });
      entities.push({
        id: 'shady_merchant',
        name: 'Aradesh the Elder',
        emoji: '🧙',
        faction: 'NewCalifornia',
        hp: { current: 40, max: 40 },
        behavior: 'friendly',
        posOffset: { x: 35, y: -5, z: 0.4 }
      });
    } else if (landmark.id === 'Necropolis') {
      entities.push({
        id: 'feral_ghoul_1',
        name: 'Glowing Feral Ghoul',
        emoji: '🤢',
        faction: 'SuperMutants',
        hp: { current: 45, max: 45 },
        behavior: 'hostile',
        posOffset: { x: -25, y: -5, z: 0.7 }
      });
    } else if (landmark.id === 'CrashedHighwayman') {
      entities.push({
        id: 'raider_junk',
        name: 'Scrapper Raider',
        emoji: '🧗',
        faction: 'Raiders',
        hp: { current: 40, max: 40 },
        behavior: 'hostile',
        posOffset: { x: -15, y: 10, z: 0.65 }
      });
    } else if (landmark.id === 'MilitaryBunker') {
      entities.push({
        id: 'mariposa_guard',
        name: 'Brotherhood Guardian',
        emoji: '💂',
        faction: 'Brotherhood',
        hp: { current: 120, max: 120 },
        behavior: 'neutral',
        posOffset: { x: -40, y: 0, z: 0.45 }
      });
    } else if (landmark.id === 'TheGlow') {
      entities.push({
        id: 'glowing_mutant',
        name: 'Mutated Abomination',
        emoji: '👺',
        faction: 'SuperMutants',
        hp: { current: 150, max: 150 },
        behavior: 'hostile',
        posOffset: { x: 20, y: -10, z: 0.5 }
      });
    }
  } else {
    // PROCEDURAL WILDERNESS GENERATION
    // Danger increases linearly with distance from Vault 13 coordinates
    const localSeed = Math.abs((coords.q * 101) ^ (coords.r * 999) ^ seed);
    const hasThreat = (localSeed % 100) < (20 + distance * 10); // danger scaling

    if (hasThreat) {
      if (distance < 3) {
        // Lower level threats like Rats, Scavengers
        entities.push({
          id: `procedural_rat_${localSeed}`,
          name: 'Glowing Rad-Rat',
          emoji: '🐀',
          faction: 'Raiders',
          hp: { current: 15 + (localSeed % 10), max: 15 + (localSeed % 10) },
          behavior: 'hostile',
          posOffset: { x: -25 + (localSeed % 40), y: -15, z: 0.75 }
        });
      } else if (distance < 5) {
        // Medium threats
        entities.push({
          id: `procedural_raider_${localSeed}`,
          name: 'Wasteland Chem-Raider',
          emoji: '🤺',
          faction: 'Raiders',
          hp: { current: 40 + (localSeed % 20), max: 40 + (localSeed % 20) },
          behavior: 'hostile',
          posOffset: { x: -30 + (localSeed % 50), y: 5, z: 0.6 }
        });
      } else {
        // Elite threats
        entities.push({
          id: `procedural_mutant_${localSeed}`,
          name: 'Raging SuperMutant',
          emoji: '👹',
          faction: 'SuperMutants',
          hp: { current: 90 + (localSeed % 40), max: 90 + (localSeed % 40) },
          behavior: 'hostile',
          posOffset: { x: -20 + (localSeed % 35), y: -10, z: 0.55 }
        });
      }
    }

    // Spawn a scrap heap or small lockbox procedurally
    const hasScrap = (localSeed % 100) > 40;
    if (hasScrap) {
      focused = {
        id: `scrap_${coords.q}_${coords.r}`,
        name: 'Desert Scrap Heap',
        emoji: '📦',
        description: 'Twisted rusted chassis, circuit boards, and old copper coils.',
        skillsApplicable: ['Detection', 'Engineer', 'Traps'],
        gates: {
          Detection: {
            skill: 'Detection',
            difficulty: 5 + (coords.q * 2),
            passOutcome: { mechanic: 'caps', value: 10 + (localSeed % 40), message: 'You scout the heap and find a cluster of caps!' },
            failOutcome: { mechanic: 'health', value: -5, message: 'You cut your palm on rusty rebar while searching (-5 HP).' }
          },
          Engineer: {
            skill: 'Engineer',
            difficulty: 10,
            passOutcome: { mechanic: 'item', value: 1, itemTemplateId: 'Item10mmAmmo', message: 'You secure high-quality 10mm magazine shells from a locked safe pile!' },
            failOutcome: { mechanic: 'log', value: 0, message: 'You fail to dismantle the ancient heavy circuitry without breaking it.' }
          }
        }
      };
    }
  }

  return { entities, focused };
}

export function getScenicLocationName(q: number, r: number, terrain: string): string {
  // Check if there is an exact landmark matches
  const exactLandmark = WORLD_LANDMARKS.find(l => l.coords.q === q && l.coords.r === r);
  if (exactLandmark) {
    return exactLandmark.name;
  }

  // Check if we are right next to a landmark
  for (const l of WORLD_LANDMARKS) {
    // Distance 1
    const d = (Math.abs(q - l.coords.q) + Math.abs(q + r - l.coords.q - l.coords.r) + Math.abs(r - l.coords.r)) / 2;
    if (d === 1) {
      return `Outskirts of ${l.name}`;
    }
  }

  const hash = Math.abs((q * 123 + r * 37) % 7);
  if (q === 0 && r === 0) return "Shattered Crater Oasis (Camp)";
  
  const landmarks: Record<string, string[]> = {
    Desert: [
      "Whispering Dunes", "Scorched Salt Flats", "Bleached Bones Hollow",
      "Sun-Baked Clay Sinks", "Fuming Glass Flats", "Silt-Storm Gulch", "The Silent Expanse"
    ],
    Ruins: [
      "Crumbled Bottling Depot Ruins", "Desolate Warehouse Skeleton", "Shattered Reactor Perimeter",
      "Twisted Steel Cemetery", "Rust-Dust Avenues", "Fallen Highway Overpass", "Ashen Concrete Foundations"
    ],
    Canyon: [
      "Ochre Shadow Depths", "Jagged Sulfur Ridge", "Echoing Stone Fissures",
      "Wind-Carved Basalt Monuments", "Red Dust Ravines", "Crumbling Rock Bridge", "Onyx Gravel Gulches"
    ],
    Swamp: [
      "Phosphorescent Sludge Bog", "Glowing Rot Pools", "Acid-Mist Hollows",
      "Sunken Iron Carcasses", "Stagnant Marshy Gullies", "Toxic Lichen Swamps", "Luminescent Peat Sinks"
    ],
    Wasteland: [
      "Ashen Gravel Sands", "Desolate Cinder Wastes", "Iron Scrap Rubble Fields",
      "Shackleton Crater Flats", "Barren Shale Dunes", "Smoldering Copper Pits", "Endless Gray Horizon"
    ],
    Mountain: [
      "Frozen Obsidian Peaks", "Jagged Basalt Bluffs", "Shattered Slate Slabs",
      "Smoldering Cinder Gorges", "Iron-Ore Basalt Buttes", "Desolate Scree Slides", "The Wind-Swept Col"
    ]
  };
  const list = landmarks[terrain] || landmarks["Wasteland"];
  return list[hash % list.length];
}

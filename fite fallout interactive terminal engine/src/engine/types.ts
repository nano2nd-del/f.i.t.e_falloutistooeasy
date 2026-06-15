/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ==========================================
// S.P.E.C.I.A.L. STATS (Baseline: 1–10)
// ==========================================
export interface SPECIAL {
  ST: number; // Strength
  PE: number; // Perception
  EN: number; // Endurance
  CH: number; // Charisma
  IN: number; // Intelligence
  AG: number; // Agility
  LK: number; // Luck
}

// ==========================================
// DAMAGE & DAMAGE TYPES
// ==========================================
export type DamageType =
  | 'Normal'      // Ballistic, physical strikes, lacerations
  | 'Laser'       // Cohered light
  | 'Fire'        // Flame and combustion
  | 'Plasma'      // Superheated ionized gas
  | 'Explosive'   // Concussive detonations
  | 'Electricity' // Shocking arcs (stun/EM effects)
  | 'Gas'         // Toxic vapors (usually binary resistance)
  | 'Poison'      // Biological envenomations
  | 'Radiation'   // Environmental mutagens
  | 'TrueDamage'; // Absolute force bypassing DT/DR entirely

// ==========================================
// INJURY, ADDICTION, AND STATUS EFFECTS
// ==========================================
export interface Injury {
  id: string;
  name: string;
  bodyPart: 'Eye' | 'Arm' | 'Leg' | 'Torso' | 'Head';
  effectDescription: string;
  durationHoursRemaining?: number;
}

export interface Addiction {
  id: string;
  name: string; // e.g. "Jet", "Psycho", "Alcohol"
  withdrawalEffects: Partial<SPECIAL>;
  description: string;
}

export interface StatusEffect {
  id: string;
  name: string;
  icon?: string;
  statModifiers?: Partial<SPECIAL>;
  description: string;
  durationRemaining: number; // in hours or ticks
}

// ==========================================
// INVENTORY SECTIONS & ITEMS
// ==========================================
export enum ItemTemplateId {
  Item10mmPistol = 'Item10mmPistol',
  ItemCombatKnife = 'ItemCombatKnife',
  ItemSecurityBaton = 'ItemSecurityBaton',
  ItemCrowbar = 'ItemCrowbar',
  ArmorLeatherJacket = 'ArmorLeatherJacket',
  ArmorJumpsuit = 'ArmorJumpsuit',
  ArmorRobes = 'ArmorRobes',
  ArmorCombatArmor = 'ArmorCombatArmor',
  ItemStimpak = 'ItemStimpak',
  ItemSuperStimpak = 'ItemSuperStimpak',
  ItemRadAway = 'ItemRadAway',
  ItemRadX = 'ItemRadX',
  ItemScrap = 'ItemScrap',
  ItemWaterPurified = 'ItemWaterPurified',
  ItemCannedBeans = 'ItemCannedBeans',
  ItemWaterDirty = 'ItemWaterDirty',
  Item10mmAmmo = 'Item10mmAmmo'
}

export type ItemType = 'Weapon' | 'Armor' | 'Aid' | 'Misc';

export interface BaseItem {
  id: string;
  name: string;
  type: ItemType;
  description: string;
  weight: number; // carrying weight pressure
  cost: number;   // default values in caps
  emoji: string;  // visual cue
  conditionMarks?: number;
}

export interface WeaponItem extends BaseItem {
  type: 'Weapon';
  damageType: DamageType;
  damageBase: string; // e.g., "2d10", "1d8"
  strengthRequirement: number;
  combatSkillRequired: CombatSkill;
  apCostRanged: number;
  ammoTypeRequired?: string;
  maxAmmo?: number;
  currentAmmo?: number;
  conditionMarks: number; // 0 to 10 (8+ to-hit penalty, 10 is broken)
}

export interface ArmorItem extends BaseItem {
  type: 'Armor';
  dt: Record<DamageType, number>; // Damage Threshold
  dr: Record<DamageType, number>; // Damage Resistance (%)
  acBonus: number;                 // Armor Class addition
  equipped?: boolean;
  conditionMarks: number; // 0 to 10 (broken at 10)
}

export interface AidItem extends BaseItem {
  type: 'Aid';
  healAmount?: number;
  radRemoval?: number;
  statBoost?: Partial<SPECIAL>;
  boostDuration?: number; // in hours
  addictionChance?: number; // percentage (0-100)
  addictionId?: string;
}

export interface MiscItem extends BaseItem {
  type: 'Misc';
  isQuestItem?: boolean;
}

export type InventoryItem = WeaponItem | ArmorItem | AidItem | MiscItem;

// ==========================================
// SKILLS (PnP 4.0 COMPLETE LIST)
// ==========================================
export type CombatSkill =
  | 'SmallGuns'
  | 'BigGuns'
  | 'EnergyWeapons'
  | 'Unarmed'
  | 'MeleeWeapons'
  | 'Throwing'
  | 'Traps'
  | 'Archery';

export type SupportSkill =
  | 'Animalism'
  | 'Barter'
  | 'Blacksmith'
  | 'Charm'
  | 'ComputerScience'
  | 'Deception'
  | 'Detection'
  | 'Doctor'
  | 'Engineer'
  | 'Gambling'
  | 'Gunsmith'
  | 'Insight'
  | 'Intimidation'
  | 'Investigation'
  | 'Lockpick'
  | 'NatureSciences'
  | 'Pilot'
  | 'Robotics'
  | 'SleightOfHand'
  | 'Sneak'
  | 'Survival';

export type SkillName = CombatSkill | SupportSkill;

// ==========================================
// WORLD COORDINATES, TERRAIN & WEATHER
// ==========================================
export interface HexCoord {
  q: number; // column coordinate (axial)
  r: number; // row coordinate (axial)
}

export type TerrainType =
  | 'Wasteland'
  | 'Desert'
  | 'Mountain'
  | 'Swamp'
  | 'Ruins'
  | 'Canyon';

export type WeatherType =
  | 'Clear'
  | 'HeavyStorm'
  | 'NightTime'
  | 'RadiationStorm'
  | 'DustStorm'
  | 'Fog';

// ==========================================
// FACTIONS & REPUTATIONS
// ==========================================
export type FactionName =
  | 'Player'
  | 'Raiders'
  | 'VaultSecurity'
  | 'Brotherhood'
  | 'NewCalifornia'
  | 'Wastelanders'
  | 'SuperMutants';

export type KarmaAlignment =
  | 'Upstanding'
  | 'Vigilant'
  | 'Samaritan'
  | 'TrueMortal'
  | 'Fiend'
  | 'Renegade'
  | 'DemonSpawn';

// ==========================================
// WORLD ENTITIES & INTERACTION OBJECTS
// ==========================================
export interface SkillGateOutcome {
  mechanic: 'health' | 'rads' | 'caps' | 'item' | 'xp' | 'log';
  value: number;
  itemTemplateId?: string;
  message: string;
}

export interface SkillGate {
  skill: SkillName;
  difficulty: number; // target d100 roll (must roll <= skill% - difficulty_mod)
  passOutcome: SkillGateOutcome;
  failOutcome: SkillGateOutcome;
}

export interface WorldObject {
  id: string;
  name: string;
  emoji: string;
  description: string;
  skillsApplicable: SkillName[];
  gates: Record<string, SkillGate>; // skill name mapped to details
  interacted?: boolean;
}

export interface WorldEntity {
  id: string;
  name: string;
  emoji: string;
  faction: FactionName;
  hp: { current: number; max: number };
  behavior: 'friendly' | 'neutral' | 'hostile';
  posOffset: { x: number; y: number; z: number }; // z represents perspective depth
  isDead?: boolean;
}

// ==========================================
// GAME ENCOUNTERS, EVENTS & DIALOGUES
// ==========================================
export interface DialogueOption {
  text: string;
  outcomeLog: string;
  statRequirement?: { stat: keyof SPECIAL; val: number };
  skillCheck?: { skill: SkillName; difficulty: number };
  costs?: { caps?: number; health?: number; item?: string };
  gains?: { caps?: number; xp?: number; itemTemplateId?: string; health?: number; rads?: number };
  nextStepId: string | null;  // null finishes the event
}

export interface DialogueStep {
  id: string;
  text: string;
  options: DialogueOption[];
}

export interface GameEvent {
  id: string;
  title: string;
  description: string;
  emoji: string;
  faction?: FactionName;
  steps: Record<string, DialogueStep>;
  currentStepId: string;
}

export interface EncounterOutcome {
  success: boolean;
  message: string;
  rewardDetails?: string;
}

// ==========================================
// TRAIT & PERK DEFINITIONS
// ==========================================
export interface TraitDefinition {
  id: string;
  name: string;
  description: string;
}

export interface PerkDefinition {
  id: string;
  name: string;
  description: string;
  levelRequired: number;
}

// ==========================================
// GRAVEMENT RECORD FOR LEGACY
// ==========================================
export interface GraveRecord {
  runNumber: number;
  playerName: string;
  special: SPECIAL;
  causeOfDeath: string;
  coords: HexCoord;
  day: number;
  inventorySnapshot: { name: string; emoji: string }[];
}

// ==========================================
// LOG FILE RECORD FOR TERMINAL VIEW
// ==========================================
export interface LogEntry {
  id: string;
  timestamp: string;
  text: string;
  type: 'general' | 'combat' | 'survival' | 'skill' | 'quest' | 'death';
}

// ==========================================
// AGENT SIMULATION SPECIFICATION
// ==========================================
export enum AgentType {
  VaultDweller = "vault_dweller",
  Raider = "raider",
  Wastelander = "wastelander",
  Scavenger = "scavenger",
  Caravan = "caravan",
  TownGuard = "town_guard",
  Critter = "critter",
  Enemy = "enemy",
  SuperMutant = "super_mutant",
  Nightkin = "nightkin"
}

export const AGENT_COLORS: Record<AgentType, string> = {
  [AgentType.VaultDweller]: "#0066ff",
  [AgentType.Raider]: "#ff0000",
  [AgentType.Wastelander]: "#8B4513",
  [AgentType.Scavenger]: "#888888",
  [AgentType.Caravan]: "#D2691E",
  [AgentType.TownGuard]: "#FFD700",
  [AgentType.Critter]: "#FF8C00",
  [AgentType.Enemy]: "#ff0000",
  [AgentType.SuperMutant]: "#00AA00",
  [AgentType.Nightkin]: "#AA00AA"
};

export interface Agent {
  id: string;
  type: AgentType;
  hex: HexCoord;
  hunger: number;
  fear: number;
  behaviorState: "idle" | "hunting" | "fleeing" | "patrolling" | "moving" | "converting" | "dead";
  targetHex?: HexCoord;
  targetAgent?: string;
  hasGECK?: boolean;
  capturedBy?: string;
  turnIntoAt?: number;
  convertIntoType?: AgentType;
  spawnHex: HexCoord;
  createdAt: number;
  lastAction: number;
  patrolRoute?: HexCoord[];
  patrolIndex?: number;
  tension?: number;
  consecutiveHostileTicks?: number;
}

export interface Spawner {
  id: string;
  type: AgentType;
  hex: HexCoord;
  rate: number;
  lastSpawn: number;
  active: boolean;
  spawnLimit?: number;
  currentCount?: number;
}

export interface SimulationState {
  agents: Agent[];
  spawners: Spawner[];
  tick: number;
  activeGECK?: {
    hex: HexCoord;
    droppedAt: number;
  };
  nextId: number;
}

export const FACTION_RELATIONSHIPS: Record<AgentType, {
  hunts: AgentType[];
  fleesFrom: AgentType[];
}> = {
  [AgentType.VaultDweller]: {
    hunts: [],
    fleesFrom: [AgentType.Enemy, AgentType.SuperMutant, AgentType.Raider, AgentType.Critter]
  },
  [AgentType.Raider]: {
    hunts: [AgentType.Wastelander, AgentType.Scavenger, AgentType.Caravan, AgentType.VaultDweller],
    fleesFrom: [AgentType.SuperMutant, AgentType.TownGuard]
  },
  [AgentType.Wastelander]: {
    hunts: [],
    fleesFrom: [AgentType.Enemy, AgentType.SuperMutant, AgentType.Raider, AgentType.Critter]
  },
  [AgentType.Scavenger]: {
    hunts: [],
    fleesFrom: [AgentType.Enemy, AgentType.SuperMutant, AgentType.Raider, AgentType.Critter]
  },
  [AgentType.Caravan]: {
    hunts: [],
    fleesFrom: [AgentType.Enemy, AgentType.SuperMutant, AgentType.Raider, AgentType.Critter]
  },
  [AgentType.TownGuard]: {
    hunts: [AgentType.Enemy, AgentType.Raider],
    fleesFrom: [AgentType.SuperMutant]
  },
  [AgentType.Critter]: {
    hunts: [AgentType.Wastelander, AgentType.Scavenger, AgentType.Caravan, AgentType.VaultDweller],
    fleesFrom: [AgentType.SuperMutant, AgentType.Enemy]
  },
  [AgentType.Enemy]: {
    hunts: [AgentType.Wastelander, AgentType.Scavenger, AgentType.Caravan, AgentType.VaultDweller, AgentType.Critter],
    fleesFrom: [AgentType.TownGuard]
  },
  [AgentType.SuperMutant]: {
    hunts: [AgentType.Raider, AgentType.Wastelander, AgentType.VaultDweller, AgentType.Enemy, AgentType.Scavenger, AgentType.Caravan],
    fleesFrom: []
  },
  [AgentType.Nightkin]: {
    hunts: [],
    fleesFrom: [AgentType.SuperMutant]
  }
};

export const CONVERSION_RULES: Record<AgentType, {
  capturedBy: AgentType;
  convertsTo: AgentType;
  ticksToConvert: number;
}[]> = {
  [AgentType.VaultDweller]: [
    { capturedBy: AgentType.SuperMutant, convertsTo: AgentType.Nightkin, ticksToConvert: 300 },
    { capturedBy: AgentType.Enemy, convertsTo: AgentType.SuperMutant, ticksToConvert: 200 }
  ],
  [AgentType.Raider]: [
    { capturedBy: AgentType.SuperMutant, convertsTo: AgentType.SuperMutant, ticksToConvert: 250 }
  ],
  [AgentType.Wastelander]: [
    { capturedBy: AgentType.SuperMutant, convertsTo: AgentType.SuperMutant, ticksToConvert: 250 }
  ],
  [AgentType.Enemy]: [
    { capturedBy: AgentType.SuperMutant, convertsTo: AgentType.SuperMutant, ticksToConvert: 200 }
  ],
  [AgentType.Scavenger]: [
    { capturedBy: AgentType.SuperMutant, convertsTo: AgentType.SuperMutant, ticksToConvert: 250 }
  ],
  [AgentType.Caravan]: [
    { capturedBy: AgentType.SuperMutant, convertsTo: AgentType.SuperMutant, ticksToConvert: 250 }
  ],
  [AgentType.Critter]: [],
  [AgentType.TownGuard]: [
    { capturedBy: AgentType.SuperMutant, convertsTo: AgentType.SuperMutant, ticksToConvert: 250 }
  ],
  [AgentType.SuperMutant]: [],
  [AgentType.Nightkin]: []
};

// ==========================================
// WORLD STATE ENVELOPE
// ==========================================
export interface WorldState {
  // Character Creation / Screen Phase
  phase: 'setup' | 'playing' | 'dead';
  
  // Player Character
  player: {
    name: string;
    origin: string; // e.g. "Vault Dweller", "Drifter", etc.
    coords: HexCoord;
    hp: { current: number; max: number };
    ap: { current: number; max: number };
    rad: number;      // 0–1000
    hunger: number;   // 0–10 (10 full, 0 starving)
    thirst: number;   // 0–10 (10 full, 0 dehydrating)
    fatigue: number;  // 0–10 (10 rests, 0 exhausted)
    special: SPECIAL;
    skills: Record<SkillName, number>;
    taggedSkills: SkillName[];
    injuries: Injury[];
    addictions: Addiction[];
    statusEffects: StatusEffect[];
    level: number;
    xp: number;
    perks: string[];
    traits: string[];
    skillPoints: number;
    movementMode: 'walking' | 'running' | 'sneaking';
  };

  // Inventory
  inventory: {
    caps: number;
    food: number;
    water: number;
    meds: number;
    ammo: Record<string, number>;
    items: InventoryItem[];
    equippedWeapon: string | null; // Item ID
    equippedArmor: string | null;  // Item ID
  };

  // World Context
  world: {
    seed: number;
    timeOfDay: number; // 0-23
    day: number;
    year: number;
    weather: WeatherType;
    activeTerrain: TerrainType;
    nearbyEntities: WorldEntity[];
    focusedObject: WorldObject | null; // active lootbox or terminal near player
    hasVisitedLandmark: string[];
    historyEvents: string[];
    discoveredHexes?: HexCoord[];
  };

  // Encounters & Battle System
  encounter: {
    active: GameEvent | null;
    phase: 'idle' | 'presented' | 'resolving' | 'complete';
    lastOutcome: EncounterOutcome | null;
    combatInvolvedEntityId: string | null;
  };

  // Skilldex Window
  skilldex: {
    open: boolean;
    availableSkills: SkillName[]; // contextual glowing list
  };

  // Navigation / Expedition state
  travel: {
    destination: HexCoord | null;
    ticksRemaining: number;
    pathTerrain: TerrainType[];
  };

  // Factions, Global Quest Flags, counters
  flags: Record<string, boolean | number | string>;

  // Graveyard Legacy runs
  graves: GraveRecord[];

  // Action log historical lines
  log: LogEntry[];

  // Current run info
  run: {
    number: number;
    seed: number;
    startDay: number;
  };

  // Background Agent Simulation state
  simulation: SimulationState;
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { InventoryItem, GameEvent, WorldObject, HexCoord, TerrainType, FactionName, ItemTemplateId } from './types';

// ==========================================================
// ITEM TEMPLATES DEFINITIONS
// ==========================================================
export const ITEM_TEMPLATES: Record<ItemTemplateId, InventoryItem> = {
  Item10mmPistol: {
    id: 'Item10mmPistol',
    name: '10mm Pistol',
    type: 'Weapon',
    description: 'Classic military-grade sidearm. Uses 10mm Ammo.',
    weight: 3,
    cost: 250,
    emoji: '🔫',
    damageType: 'Normal',
    damageBase: '2d6',
    strengthRequirement: 3,
    combatSkillRequired: 'SmallGuns',
    apCostRanged: 5,
    ammoTypeRequired: '10mm Ammo',
    maxAmmo: 12,
    currentAmmo: 12,
    conditionMarks: 0,
  },
  ItemCombatKnife: {
    id: 'ItemCombatKnife',
    name: 'Combat Knife',
    type: 'Weapon',
    description: 'Sturdy carbon stainless-steel blade. Quick and deadly.',
    weight: 1,
    cost: 40,
    emoji: '🔪',
    damageType: 'Normal',
    damageBase: '1d6+2',
    strengthRequirement: 2,
    combatSkillRequired: 'MeleeWeapons',
    apCostRanged: 3,
    conditionMarks: 0,
  },
  ItemSecurityBaton: {
    id: 'ItemSecurityBaton',
    name: 'Vault Security Baton',
    type: 'Weapon',
    description: 'A conductive poly-shield baton. Delivers heavy concussive strikes.',
    weight: 2,
    cost: 75,
    emoji: '🪄',
    damageType: 'Normal',
    damageBase: '1d8',
    strengthRequirement: 3,
    combatSkillRequired: 'Unarmed',
    apCostRanged: 4,
    conditionMarks: 0,
  },
  ItemCrowbar: {
    id: 'ItemCrowbar',
    name: 'Rusty Crowbar',
    type: 'Weapon',
    description: 'Heavy prying tool. Excellent for forced entry or skull fracturing.',
    weight: 5,
    cost: 20,
    emoji: '🔨',
    damageType: 'Normal',
    damageBase: '1d8+1',
    strengthRequirement: 4,
    combatSkillRequired: 'MeleeWeapons',
    apCostRanged: 4,
    conditionMarks: 0,
  },
  ArmorLeatherJacket: {
    id: 'ArmorLeatherJacket',
    name: 'Road Warrior Leather Jacket',
    type: 'Armor',
    description: 'Sturdy black leather jacket with one sleeve cut off. Stylized wasteland standard.',
    weight: 8,
    cost: 150,
    emoji: '🧥',
    dt: { Normal: 2, Laser: 0, Fire: 1, Plasma: 0, Explosive: 1, Electricity: 1, Gas: 0, Poison: 0, Radiation: 0, TrueDamage: 0 },
    dr: { Normal: 15, Laser: 5, Fire: 10, Plasma: 0, Explosive: 10, Electricity: 10, Gas: 0, Poison: 0, Radiation: 0, TrueDamage: 0 },
    acBonus: 8,
    conditionMarks: 0,
  },
  ArmorJumpsuit: {
    id: 'ArmorJumpsuit',
    name: 'Vault 13 Jumpsuit',
    type: 'Armor',
    description: 'Tight-fitting blue-and-yellow pre-war vault apparel. Insulated.',
    weight: 4,
    cost: 100,
    emoji: '👕',
    dt: { Normal: 1, Laser: 2, Fire: 1, Plasma: 0, Explosive: 0, Electricity: 5, Gas: 0, Poison: 0, Radiation: 5, TrueDamage: 0 },
    dr: { Normal: 10, Laser: 15, Fire: 5, Plasma: 5, Explosive: 5, Electricity: 20, Gas: 0, Poison: 0, Radiation: 10, TrueDamage: 0 },
    acBonus: 5,
    conditionMarks: 0,
  },
  ArmorRobes: {
    id: 'ArmorRobes',
    name: 'Purple Cultist Robes',
    type: 'Armor',
    description: 'Worn by acolytes of the Cathedral. Highly insulated.',
    weight: 5,
    cost: 200,
    emoji: '🥋',
    dt: { Normal: 1, Laser: 3, Fire: 5, Plasma: 2, Explosive: 1, Electricity: 3, Gas: 0, Poison: 0, Radiation: 15, TrueDamage: 0 },
    dr: { Normal: 10, Laser: 20, Fire: 25, Plasma: 15, Explosive: 10, Electricity: 15, Gas: 10, Poison: 0, Radiation: 25, TrueDamage: 0 },
    acBonus: 8,
    conditionMarks: 0,
  },
  ArmorCombatArmor: {
    id: 'ArmorCombatArmor',
    name: 'Brotherhood Combat Armor',
    type: 'Armor',
    description: 'High-tech composite plating designed for combat infantry. Outrageous protection.',
    weight: 25,
    cost: 1200,
    emoji: '🛡️',
    dt: { Normal: 8, Laser: 8, Fire: 4, Plasma: 4, Explosive: 6, Electricity: 4, Gas: 0, Poison: 0, Radiation: 20, TrueDamage: 0 },
    dr: { Normal: 40, Laser: 40, Fire: 30, Plasma: 25, Explosive: 35, Electricity: 15, Gas: 0, Poison: 0, Radiation: 15, TrueDamage: 0 },
    acBonus: 15,
    conditionMarks: 0,
  },
  ItemStimpak: {
    id: 'ItemStimpak',
    name: 'Stimpak',
    type: 'Aid',
    description: 'Dermal delivery syringe containing healing serum. Recovers 30% HP instantly.',
    weight: 0.5,
    cost: 40,
    emoji: '🧪',
    healAmount: 25,
  },
  ItemSuperStimpak: {
    id: 'ItemSuperStimpak',
    name: 'Super Stimpak',
    type: 'Aid',
    description: 'Heavy duty healing. Heals 75 HP instantly, but causes moderate fatigue.',
    weight: 1,
    cost: 120,
    emoji: '💉',
    healAmount: 75,
    addictionChance: 0,
  },
  ItemRadAway: {
    id: 'ItemRadAway',
    name: 'Rad-Away',
    type: 'Aid',
    description: 'Intravenous chemical drip that binds with radiating isotopes, removing 150 Rads.',
    weight: 1,
    cost: 80,
    emoji: '🧃',
    radRemoval: 150,
  },
  ItemRadX: {
    id: 'ItemRadX',
    name: 'Rad-X',
    type: 'Aid',
    description: 'Pills designed to fortify cells against radiation exposure. Boosts RAD resistance temporary.',
    weight: 0.1,
    cost: 100,
    emoji: '💊',
    statBoost: { EN: 3 },
    boostDuration: 4,
  },
  ItemWaterPurified: {
    id: 'ItemWaterPurified',
    name: 'Purified Water',
    type: 'Aid',
    description: 'No dirt, no glow. Crystal clear pre-war water.',
    weight: 1,
    cost: 15,
    emoji: '💧',
  },
  ItemCannedBeans: {
    id: 'ItemCannedBeans',
    name: 'Old Canned Beans',
    type: 'Aid',
    description: 'Pre-war preserved beans. High sodium, high calorie.',
    weight: 1,
    cost: 10,
    emoji: '🥫',
  },
  ItemWaterDirty: {
    id: 'ItemWaterDirty',
    name: 'Glowing Swamp Water',
    type: 'Aid',
    description: 'Tastes like mercury and silt. Hydrates, but adds +15 rads.',
    weight: 1,
    cost: 5,
    emoji: '🥤',
    radRemoval: -15,
  },
  Item10mmAmmo: {
    id: 'Item10mmAmmo',
    name: '10mm AP Magazine',
    type: 'Misc',
    description: 'A pack of high-penetration 10mm rounds.',
    weight: 0.5,
    cost: 25,
    emoji: '📦',
  },
  ItemScrap: {
    id: 'ItemScrap',
    name: 'Scrap Metal & Components',
    type: 'Misc',
    description: 'A bundle of wires, screws, rusty springs, and steel plating. Highly valuable for repairing cracked armor or weapons using the Engineer skill.',
    weight: 1.5,
    cost: 10,
    emoji: '⚙️',
  }
};

// ==========================================================
// LANDMARKS & WORLD SEED MATRIX
// ==========================================================
export interface Landmark {
  id: string;
  name: string;
  emoji: string;
  description: string;
  coords: HexCoord;
  terrain: TerrainType;
  faction: FactionName;
  objectTemplates: string[]; // references interactive objects
}

export const WORLD_LANDMARKS: Landmark[] = [
  {
    id: 'Vault13',
    name: 'Vault 13 Ruins',
    emoji: '🚪',
    description: 'A giant circular gears-door embedded in the canyon face. Once a haven, now a chilly monument.',
    coords: { q: 0, r: 0 },
    terrain: 'Canyon',
    faction: 'VaultSecurity',
    objectTemplates: ['Vault13Terminal', 'VaultGrave'],
  },
  {
    id: 'ShadySands',
    name: 'Shady Sands Settlement',
    emoji: '🏘️',
    description: 'An adobe-crafted walled settlement. Armed guards stand watch near corn farms and well heads.',
    coords: { q: 8, r: -2 },
    terrain: 'Desert',
    faction: 'NewCalifornia',
    objectTemplates: ['ShadyMerchantChest', 'AdobeWell'],
  },
  {
    id: 'Vault15',
    name: 'Vault 15 Ruins',
    emoji: '🏢',
    description: 'A collapsed sibling vault of Vault 13. Buried under tons of rock and sand.',
    coords: { q: 14, r: -2 },
    terrain: 'Ruins',
    faction: 'Wastelanders',
    objectTemplates: ['ScrapPile'],
  },
  {
    id: 'MilitaryBase',
    name: 'Mariposa Military Base',
    emoji: '🔥',
    description: 'A heavily fortified military facility. Source of the FEV mutagen, guarded by elite mutants.',
    coords: { q: -12, r: 0 },
    terrain: 'Mountain',
    faction: 'SuperMutants',
    objectTemplates: ['LaserSecurityGrid'],
  },
  {
    id: 'Raiders',
    name: 'Raider Khan Camp',
    emoji: '🏕️',
    description: 'A lawless, spiked encampment housing the savage Desert Raiders.',
    coords: { q: 10, r: 2 },
    terrain: 'Wasteland',
    faction: 'Raiders',
    objectTemplates: ['HighwaymanTrunk'],
  },
  {
    id: 'Brotherhood',
    name: 'Brotherhood of Steel',
    emoji: '🛡️',
    description: 'A high-tech bunker populated by Power-Armored paladins dedicated to preserving old-world technology.',
    coords: { q: -6, r: 6 },
    terrain: 'Mountain',
    faction: 'Brotherhood',
    objectTemplates: ['LaserSecurityGrid'],
  },
  {
    id: 'Junktown',
    name: 'Junktown Frontier',
    emoji: '🪵',
    description: 'A bustling settlement constructed from junked vehicles and log walls.',
    coords: { q: 2, r: 4 },
    terrain: 'Desert',
    faction: 'Wastelanders',
    objectTemplates: ['ShadyMerchantChest'],
  },
  {
    id: 'Necropolis',
    name: 'Necropolis Ghouls',
    emoji: '💀',
    description: 'The City of the Dead. Steam-venting sewers populated by radioactive ghouls searching for water.',
    coords: { q: 14, r: 6 },
    terrain: 'Ruins',
    faction: 'SuperMutants',
    objectTemplates: ['TerminalMainframe'],
  },
  {
    id: 'TheHub',
    name: 'The Hub Trading Sector',
    emoji: '🐫',
    description: 'The largest mercantile city-state in the wastes. Home to Water Merchants and caravans.',
    coords: { q: 2, r: 10 },
    terrain: 'Desert',
    faction: 'NewCalifornia',
    objectTemplates: ['ShadyMerchantChest', 'AdobeWell'],
  },
  {
    id: 'Boneyard',
    name: 'The L.A. Boneyard',
    emoji: '🏚️',
    description: 'The crumbling concrete ruins of ancient Los Angeles. Controlled by scavengers and industrial blades.',
    coords: { q: -2, r: 14 },
    terrain: 'Ruins',
    faction: 'Wastelanders',
    objectTemplates: ['ScrapPile', 'VaultGrave'],
  },
  {
    id: 'Cathedral',
    name: 'Cathedral of the Master',
    emoji: '⛪',
    description: 'A gothic cathedral hiding dark vats of FEV down below, led by strange cloaked cultists.',
    coords: { q: -2, r: 18 },
    terrain: 'Swamp',
    faction: 'SuperMutants',
    objectTemplates: ['TerminalMainframe'],
  },
  {
    id: 'TheGlow',
    name: 'The Glow Crater',
    emoji: '☢️',
    description: 'A deep radioactive crater where the West-Tek research labs once stood. Deeply radioactive.',
    coords: { q: 12, r: 20 },
    terrain: 'Canyon',
    faction: 'SuperMutants',
    objectTemplates: ['TerminalMainframe', 'RadGrave'],
  },
];


// ==========================================================
// INTERACTIVE OBJECTS (Loot chests, Terminals, Hazards)
// ==========================================================
export const OBJECT_TEMPLATES: Record<string, WorldObject> = {
  Vault13Terminal: {
    id: 'Vault13Terminal',
    name: 'Primary Vault Console',
    emoji: '🖥️',
    description: 'The green monochromatic console controls access to the lower vault levels.',
    skillsApplicable: ['ComputerScience', 'NatureSciences', 'Engineer'],
    gates: {
      ComputerScience: {
        skill: 'ComputerScience',
        difficulty: 20,
        passOutcome: { mechanic: 'xp', value: 150, message: 'You bypass the database lockout! Releasing emergency vault cache.', itemTemplateId: 'ItemSuperStimpak' },
        failOutcome: { mechanic: 'rads', value: 20, message: 'Access denied. Security counter-measures discharge a high-energy microwave shock (+20 Rads).' }
      },
      Engineer: {
        skill: 'Engineer',
        difficulty: 30,
        passOutcome: { mechanic: 'caps', value: 100, message: 'You splice the backup power conduits, reclaiming residual energy caps (+100 Caps).' },
        failOutcome: { mechanic: 'health', value: -15, message: 'The relay bursts in your face, inflicting a medium burn (-15 HP).' }
      }
    }
  },
  AdobeWell: {
    id: 'AdobeWell',
    name: 'Shady Well Head',
    emoji: '💧',
    description: 'A concrete-lined well extracting deep desert groundwater.',
    skillsApplicable: ['Engineer', 'Survival', 'Detection'],
    gates: {
      Engineer: {
        skill: 'Engineer',
        difficulty: 15,
        passOutcome: { mechanic: 'item', value: 1, itemTemplateId: 'ItemWaterPurified', message: 'You calibrate the carbon pumps! Generating premium Purified Water.' },
        failOutcome: { mechanic: 'log', value: 0, message: 'You strip a brass gear. The mechanism jams, rendering the well static.' }
      },
      Survival: {
        skill: 'Survival',
        difficulty: 20,
        passOutcome: { mechanic: 'xp', value: 75, message: 'You successfully filter out desert particulates and take a cold drink (+75 XP, hunger/thirst fully recovered).' },
        failOutcome: { mechanic: 'rads', value: 15, message: 'You ingest glowing sediment (-10 Health, +15 Rads).' }
      }
    }
  },
  ShadyMerchantChest: {
    id: 'ShadyMerchantChest',
    name: 'Merchant Iron Footlocker',
    emoji: '🧳',
    description: 'A heavy metal locker belonging to the caravan guards. Securely locked.',
    skillsApplicable: ['Lockpick', 'SleightOfHand', 'Sneak'],
    gates: {
      Lockpick: {
        skill: 'Lockpick',
        difficulty: 25,
        passOutcome: { mechanic: 'item', value: 1, itemTemplateId: 'Item10mmPistol', message: 'The tumbler clicks open! You retrieve a pristine 10mm hand cannon.' },
        failOutcome: { mechanic: 'caps', value: -15, message: 'Your lockpick snaps, jamming the barrel (-15 Caps to buy a replacement pick).' }
      },
      SleightOfHand: {
        skill: 'SleightOfHand',
        difficulty: 30,
        passOutcome: { mechanic: 'caps', value: 200, message: 'You swipe high-grade caravan tokens unnoticed (+200 Caps)!' },
        failOutcome: { mechanic: 'caps', value: -50, message: 'You are caught red-handed! Guards fine you 50 caps.' }
      }
    }
  },
  HighwaymanTrunk: {
    id: 'HighwaymanTrunk',
    name: ' highwayman Nuclear Battery Trunk',
    emoji: '📦',
    description: 'A rusty vehicle trunk housing active microfusion matrices.',
    skillsApplicable: ['Engineer', 'Traps', 'Detection'],
    gates: {
      Engineer: {
        skill: 'Engineer',
        difficulty: 30,
        passOutcome: { mechanic: 'item', value: 1, itemTemplateId: 'ItemRadAway', message: 'You safely extract the chemical filtration core (+1 Rad-Away, +150 XP).' },
        failOutcome: { mechanic: 'rads', value: 80, message: 'An explosive venting of toxic coolants dumps extreme radiation (+80 Rads).' }
      },
      Traps: {
        skill: 'Traps',
        difficulty: 20,
        passOutcome: { mechanic: 'xp', value: 100, message: 'You disarm a pressure-plate explosive set inside the boot (+100 XP, salvaging raw parts).' },
        failOutcome: { mechanic: 'health', value: -40, message: 'BOOM! A fragmentation shell triggers in your hands, dealing heavy shrapnel damages (-40 HP).' }
      }
    }
  },
  LaserSecurityGrid: {
    id: 'LaserSecurityGrid',
    name: 'Laser Security Grid',
    emoji: '⚡',
    description: 'Eerie red laser bars crisscross the entrance to the inner vault complex.',
    skillsApplicable: ['ComputerScience', 'NatureSciences', 'Traps'],
    gates: {
      ComputerScience: {
        skill: 'ComputerScience',
        difficulty: 40,
        passOutcome: { mechanic: 'xp', value: 300, message: 'You hack the laser terminal! Disabling all defenses. Retreived Brotherhood Armor.' },
        failOutcome: { mechanic: 'health', value: -50, message: 'LASER BURN! The grids flare, singing your flesh (-50 HP).' }
      },
      Traps: {
        skill: 'Traps',
        difficulty: 35,
        passOutcome: { mechanic: 'xp', value: 200, message: 'You redirect optical sensors safely with a mirror lens (+200 XP).' },
        failOutcome: { mechanic: 'health', value: -30, message: 'The sensor trips, discharging an electrostatic discharge (-30 HP).' }
      }
    }
  },
  TerminalMainframe: {
    id: 'TerminalMainframe',
    name: 'Vaporized Mainframe Core',
    emoji: '💾',
    description: 'The atomic reactor engine core of the central laboratory.',
    skillsApplicable: ['ComputerScience', 'NatureSciences', 'Doctor'],
    gates: {
      ComputerScience: {
        skill: 'ComputerScience',
        difficulty: 45,
        passOutcome: { mechanic: 'item', value: 1, itemTemplateId: 'ArmorRobes', message: 'You download ancient genetic research, obtaining Brotherhood robes!' },
        failOutcome: { mechanic: 'rads', value: 120, message: 'Nuclear meltdown! Core vents radioactive fuel directly into your lungs (+120 Rads).' }
      },
      Doctor: {
        skill: 'Doctor',
        difficulty: 30,
        passOutcome: { mechanic: 'item', value: 1, itemTemplateId: 'ItemRadX', message: 'You scavenge high-radiation containment injectors (+1 Rad-X, +100 XP).' },
        failOutcome: { mechanic: 'rads', value: 40, message: 'Leaky biological capsules expose you to experimental mutagenic gases (+40 Rads).' }
      }
    }
  },
  VaultGrave: {
    id: 'VaultGrave',
    name: 'Fallen Jumpsuit Corpse',
    emoji: '💀',
    description: 'A skeleton clad in a blue vault jumpsuit, clutch of ancient keys in their skeletal grip.',
    skillsApplicable: ['Doctor', 'Detection', 'SleightOfHand'],
    gates: {
      Doctor: {
        skill: 'Doctor',
        difficulty: 10,
        passOutcome: { mechanic: 'item', value: 1, itemTemplateId: 'ItemStimpak', message: 'You perform a forensic analysis and retrieve a sterile Stimpak (+100 XP).' },
        failOutcome: { mechanic: 'health', value: -10, message: 'A hidden poisoned bone needle pricks your digit (-10 HP).' }
      }
    }
  },
  // Default interactive spot for procedural spaces
  ScrapPile: {
    id: 'ScrapPile',
    name: 'Scrub Scrap Pile',
    emoji: '📦',
    description: 'A twisted mass of rebar, rusty appliances, and junk.',
    skillsApplicable: ['Engineer', 'Traps', 'Detection'],
    gates: {
      Detection: {
        skill: 'Detection',
        difficulty: 10,
        passOutcome: { mechanic: 'caps', value: 30, message: 'You spot buried trade coins from old worlds (+30 Caps, +50 XP).' },
        failOutcome: { mechanic: 'health', value: -5, message: 'You slice your fingertips raw on jagged metal sheeting (-5 HP).' }
      }
    }
  }
};


export { RANDOM_EVENTS } from '../data/encountersData';


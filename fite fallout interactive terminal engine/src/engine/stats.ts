/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SPECIAL, SkillName, CombatSkill, SupportSkill } from './types';

// S.P.E.C.I.A.L. Derived Stats Calculator
export interface DerivedStats {
  maxHP: number;
  maxAP: number;
  carryWeight: number;
  meleeDamage: number;
  detectionRange: number;
  poisonResistance: number;
  radiationResistance: number;
  armorClass: number;
  sequence: number;
  startingCaps: number;
  skillPointsPerLevel: number;
}

export function calculateDerivedStats(
  special: SPECIAL,
  level: number,
  traits: string[]
): DerivedStats {
  const ST = special.ST;
  const PE = special.PE;
  const EN = special.EN;
  const CH = special.CH;
  const IN = special.IN;
  const AG = special.AG;
  const LK = special.LK;

  // HP Formula
  // Base: 15 + (ST + (2 * EN))
  // Plus per level: (level - 1) * (3 + floor(EN / 2))
  const baseHP = 15 + ST + (2 * EN);
  const hpGainPerLevel = 3 + Math.floor(EN / 2);
  let maxHP = Math.floor(baseHP + (level - 1) * hpGainPerLevel);

  // Berserker Trait adds +10 HP
  if (traits.includes('Berserker')) {
    maxHP += 10;
  }

  // AP Agility lookup table
  let baseAP = 5;
  if (AG === 1) baseAP = 5;
  else if (AG <= 3) baseAP = 6;
  else if (AG <= 5) baseAP = 7;
  else if (AG <= 7) baseAP = 8;
  else if (AG <= 9) baseAP = 9;
  else baseAP = 10;

  // Bruiser Trait reduces AP by 2
  if (traits.includes('Bruiser')) {
    baseAP -= 2;
  }
  // Fast Shot reduces AP of weapons but not max player AP pool typically,
  // but if needed we can handle weapon action costs. we store max AP as baseAP
  const maxAP = Math.max(1, baseAP);

  // Carry Weight
  // 25 + (10 * ST) + (10 * EN)
  // Small Frame Trait overrides to: 15 * ST only
  let carryWeight = 25 + (10 * ST) + (10 * EN);
  if (traits.includes('SmallFrame')) {
    carryWeight = 15 * ST;
  }

  // Melee Damage
  // max(0, ST - 5) + lookup table lookup ST 1-6 -> 1, 7->2, 8->3, 9->4, 10->5
  let meleeDamage = Math.max(0, ST - 5);
  if (ST <= 6) meleeDamage = Math.max(1, meleeDamage); // fallback
  else if (ST === 7) meleeDamage = 2;
  else if (ST === 8) meleeDamage = 3;
  else if (ST === 9) meleeDamage = 4;
  else if (ST >= 10) meleeDamage = 5;

  // Heavy Handed adds +4 Melee Damage
  if (traits.includes('HeavyHanded')) {
    meleeDamage += 4;
  }
  // Bar Room Bouncer adds +2 Melee Damage
  if (traits.includes('BarRoomBouncer')) {
    meleeDamage += 2;
  }

  // Detection Range - PE * 2 spaces
  const detectionRange = PE * 2;

  // Poison Resistance - EN * 5
  let poisonResistance = EN * 5;
  if (traits.includes('FastMetabolism')) {
    poisonResistance = 0; // fast metabolism overrides resistance to 0%
  }

  // Radiation Resistance - EN * 2
  let radiationResistance = EN * 2;
  if (traits.includes('GlowingOne')) {
    radiationResistance += 50; // GlowingOne adds +50% rad resist
  }
  if (traits.includes('FastMetabolism')) {
    radiationResistance = 0; // fast metabolism overrides resistance to 0%
  }

  // Skill points per level - 5 + (IN * 3)
  // Gifted Trait reduces skill points by 5 per level (-5 SP/level)
  // Skilled Trait adds +5 SP/level
  let skillPointsPerLevel = 5 + (IN * 3);
  if (traits.includes('Gifted')) {
    skillPointsPerLevel -= 5;
  }
  if (traits.includes('Skilled')) {
    skillPointsPerLevel += 5;
  }
  skillPointsPerLevel = Math.max(1, skillPointsPerLevel);

  // Armor Class (base Agility)
  // Kamikaze Trait AC = armor only (base AG AC is ignored, so 0)
  let armorClass = AG;
  if (traits.includes('Kamikaze')) {
    armorClass = 0;
  }

  // Sequence (base AG, plus sequence buffs)
  let sequence = AG;
  if (traits.includes('Kamikaze')) {
    sequence += 5; // Kamikaze adds +5 sequence
  }
  if (traits.includes('BarRoomBouncer')) {
    sequence -= 4; // Bar Room Bouncer minimizes sequence by 4
  }

  // Starting caps - LK * 5
  let startingCaps = LK * 5;

  return {
    maxHP,
    maxAP,
    carryWeight,
    meleeDamage,
    detectionRange,
    poisonResistance,
    radiationResistance,
    armorClass,
    sequence,
    startingCaps,
    skillPointsPerLevel,
  };
}

// Global lookup table for Skill base starting % (before tag)
export const SKILL_BASE_FORMULAS: Record<SkillName, (s: SPECIAL) => number> = {
  // Combat
  SmallGuns:      s => 5 + s.PE + s.PE,
  BigGuns:        s => s.ST + s.PE + s.AG,
  EnergyWeapons:  s => 5 + s.PE + s.PE,
  Unarmed:        s => s.ST + s.AG,
  MeleeWeapons:   s => s.ST + s.AG,
  Throwing:       s => s.ST + s.AG,
  Traps:          s => s.PE + s.IN + s.AG,
  Archery:        s => s.ST + s.PE + s.AG,

  // Support
  Animalism:      s => s.CH + s.IN + s.AG,
  Barter:         s => s.CH + s.CH,
  Blacksmith:     s => s.ST + s.PE + s.AG,
  Charm:          s => 5 + s.CH + s.CH,
  ComputerScience:s => s.IN + s.PE,
  Deception:      s => s.CH + s.CH,
  Detection:      s => s.PE + s.PE,
  Doctor:         s => s.PE + s.IN,
  Engineer:       s => s.IN + s.IN,
  Gambling:       s => s.LK + s.LK,
  Gunsmith:       s => s.PE + s.IN + s.AG,
  Insight:        s => s.CH + s.IN + s.PE,
  Intimidation:   s => 5 + s.CH + s.CH,
  Investigation:  s => s.PE + s.CH + s.IN,
  Lockpick:       s => 5 + s.PE + s.AG,
  NatureSciences: s => 5 + s.IN + s.IN,
  Pilot:          s => s.PE + s.IN + s.AG,
  Robotics:       s => s.IN + s.IN,
  SleightOfHand:  s => 5 + s.AG + s.AG,
  Sneak:          s => s.AG + s.AG,
  Survival:       s => 5 + s.EN + s.IN,
};

// Luck Critical failure checks & success rates
export interface LuckCritInfo {
  successRange: number;
  failCheckRange: number; // 91-99 check thresholds or automatic at 100
}

export function getLuckCritInfo(lk: number): LuckCritInfo {
  const boundedLK = Math.max(1, Math.min(12, Math.floor(lk)));
  // Luck success range: roll <= LK on d100
  // Critical failure check: roll 91-99 requires roll <= LK to succeed, else crit fail
  return {
    successRange: boundedLK,
    failCheckRange: 91 + (boundedLK - 1), // fail starts above this
  };
}

// Radiation effects thresholds list
export interface RadiationEffectDetails {
  threshold: number;
  debuffs: Partial<SPECIAL>;
  maxHPPenalty: number;
  description: string;
}

export const RADIATION_TABLE: RadiationEffectDetails[] = [
  {
    threshold: 50,
    debuffs: { EN: -1 },
    maxHPPenalty: 0,
    description: 'Abnormally tired',
  },
  {
    threshold: 100,
    debuffs: { EN: -2 },
    maxHPPenalty: 0,
    description: 'Weak, achy, skin rash',
  },
  {
    threshold: 400,
    debuffs: { ST: -1, EN: -2, AG: -1 },
    maxHPPenalty: 10,
    description: 'Muscle/joint pain, open sores, hair loss',
  },
  {
    threshold: 600,
    debuffs: { ST: -2, EN: -2, CH: -1, AG: -2 },
    maxHPPenalty: 20,
    description: 'Vomiting, diarrhea, glowing skin',
  },
  {
    threshold: 800,
    debuffs: { ST: -5, EN: -5, CH: -3, AG: -4 },
    maxHPPenalty: 30,
    description: 'Vomiting blood, death in 72h without treatment',
  },
  {
    threshold: 1000,
    debuffs: {},
    maxHPPenalty: 100, // fatal death save
    description: 'Environmental collapse / extreme lethality',
  },
];

export function getActiveRadiationDebuffs(rads: number): {
  debuffs: Partial<SPECIAL>;
  hpPenaltyPct: number;
  description: string;
} {
  let activeDebuffs: Partial<SPECIAL> = {};
  let hpPenalty = 0;
  let activeDesc = 'Unradiated';

  for (const row of RADIATION_TABLE) {
    if (rads >= row.threshold) {
      activeDesc = row.description;
      hpPenalty = row.maxHPPenalty;
      // accumulate or overwrite debuffs
      activeDebuffs = { ...activeDebuffs, ...row.debuffs };
    }
  }

  return {
    debuffs: activeDebuffs,
    hpPenaltyPct: hpPenalty,
    description: activeDesc,
  };
}

export interface TraitDetails {
  id: string;
  name: string;
  description: string;
}

export const WASTELAND_TRAITS: TraitDetails[] = [
  {
    id: 'BarRoomBouncer',
    name: 'Bar-Room Bouncer',
    description: '+2 EN, +2 Melee Damage, but -4 Sequence initiative.',
  },
  {
    id: 'Berserker',
    name: 'Berserker',
    description: '+10 Max HP, +10% Damage Resistance, but armor class is reduced to 0.',
  },
  {
    id: 'BloodyMess',
    name: 'Bloody Mess',
    description: 'Things die in highly spectacular, over-the-top ways (pure cosmetic flavor).',
  },
  {
    id: 'Bruiser',
    name: 'Bruiser',
    description: '+2 Strength, but reduces player Action Points pool by -2 AP.',
  },
  {
    id: 'FastMetabolism',
    name: 'Fast Metabolism',
    description: '+5 Healing Rate per rest tick, but Radiation & Poison resistance is 0%.',
  },
  {
    id: 'Gifted',
    name: 'Gifted',
    description: '+1 to all S.P.E.C.I.A.L. stats, but reduces starting skills by -10% and yields -5 Skill Points per level.',
  },
  {
    id: 'HeavyHanded',
    name: 'Heavy Handed',
    description: '+4 Melee damage, but critical physical hits deal -20% less damage.',
  },
  {
    id: 'Kamikaze',
    name: 'Kamikaze',
    description: '+5 Sequence, but Armor Class ignores basic Agility bonuses.',
  },
  {
    id: 'Skilled',
    name: 'Skilled',
    description: '+5 Skill Points per level, +10% to all skills, but you choose perks every 3 levels instead of 2.',
  },
  {
    id: 'SmallFrame',
    name: 'Small Frame',
    description: '+1 Agility, but carry weight is calculated strictly as 15 * Strength.',
  },
];

export const STARTING_ORIGINS = [
  {
    id: 'VaultDweller',
    name: 'Vault Dweller',
    description: 'Grows up safe behind sealed doors. Starts with a Pip-Boy, standard jumpsuit, and clean pre-war meds.',
    statsBoost: { PE: 1, IN: 1 },
    items: ['ArmorJumpsuit', 'Item10mmPistol', 'ItemStimpak', 'ItemStimpak', 'Item10mmAmmo'],
  },
  {
    id: 'Drifter',
    name: 'Drifter',
    description: 'Raised on the dust-laden highways. Starts with a worn leather jacket, a robust blade, and more caps.',
    statsBoost: { AG: 1, EN: 1 },
    items: ['ArmorLeatherJacket', 'ItemCombatKnife', 'ItemWaterPurified', 'ItemCannedBeans'],
    caps: 50,
  },
  {
    id: 'Scavenger',
    name: 'Scavenger',
    description: 'Sifts through the rusty ruins. Expert at turning junk into gold. Starts with a crowbar and toolkits.',
    statsBoost: { PE: 1, ST: 1 },
    items: ['ItemCrowbar', 'ItemRadAway', 'ItemCannedBeans', 'ArmorLeatherJacket'],
    caps: 25,
  },
  {
    id: 'BrotherhoodInitiate',
    name: 'Brotherhood Initiate',
    description: 'Disciplined apprentice of the techno-religious knights. Trained to maintain and preserve ancient lore.',
    statsBoost: { IN: 1, ST: 1 },
    items: ['ArmorLeatherJacket', 'ItemSecurityBaton', 'Item10mmPistol', 'Item10mmAmmo'],
    caps: 10,
  },
];

/**
 * Calculates trading price multiplier based on Barter skill difference.
 * Clamps the advantage shift at a maximum of 50% shift either way to prevent free items.
 */
export function calculateBarterPriceMultiplier(playerBarter: number, merchantBarter: number = 30): number {
  const diff = playerBarter - merchantBarter;
  
  // 1% advantage per skill difference point
  let advantage = diff * 0.01;
  
  // Cap the shift at 50%
  advantage = Math.max(-0.5, Math.min(0.5, advantage));
  
  // High barter decreases buyer price, i.e., 1 - advantage
  return 1 - advantage;
}


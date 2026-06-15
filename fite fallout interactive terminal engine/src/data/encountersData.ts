import { GameEvent } from '../engine/types';

export const RANDOM_EVENTS: GameEvent[] = [
  {
    id: 'EventMerchant',
    title: 'Wandering Merchant caravan',
    description: 'An old pack Brahmin guarded by two nervous mercs clad in leather. A weathered merchant approaches with open palms.',
    emoji: '🐫',
    faction: 'Wastelanders',
    currentStepId: 'start',
    steps: {
      start: {
        id: 'start',
        text: '"Greetings, traveler. Safe roads? I deal in waters and meds. What say we make a bargain, or is business slow?"',
        options: [
          {
            text: 'Trade 50 Caps for Purified Water and Beans',
            outcomeLog: 'You exchange shiny metal caps for precious sustenance (-50 Caps, +1 Purified Water, +1 Old Canned Beans).',
            costs: { caps: 50 },
            gains: { itemTemplateId: 'ItemWaterPurified', caps: 0 },
            nextStepId: 'traded'
          },
          {
            text: 'Tempt Fate: Try to steal from the Brahmin pack (SleightOfHand Check, Diff 15)',
            outcomeLog: 'You slip your fingers into the side pouch of the pack...',
            skillCheck: { skill: 'SleightOfHand', difficulty: 15 },
            nextStepId: 'steal_check'
          },
          {
            text: 'Politely decline and walk away',
            outcomeLog: '"Safe travels, friend. Watch out for Raiders to the north."',
            nextStepId: null
          }
        ]
      },
      traded: {
        id: 'traded',
        text: '"A fine transaction. May your hydration gauges remain high, wanderer."',
        options: [
          {
            text: 'Leave caravan',
            outcomeLog: 'You depart from the merchant caravans.',
            nextStepId: null
          }
        ]
      },
      steal_check: {
        id: 'steal_check',
        text: 'The merchant has back-turned. Your palms are sweating.',
        options: [
          {
            text: 'Pull out stash (Success)',
            outcomeLog: 'Success! You pull out 150 Caps and a Stimpak without a rustle (+150 Caps, +1 Stimpak, +100 XP)!',
            gains: { caps: 150, xp: 100, itemTemplateId: 'ItemStimpak' },
            nextStepId: null
          },
          {
            text: 'Get caught (Fail)',
            outcomeLog: 'The Brahmin brays! "THIEF!" The merc guards pistol-whip you, reclaiming 60 caps before driving you away at gunpoint (-60 Caps, -15 HP).',
            costs: { caps: 60, health: 15 },
            nextStepId: null
          }
        ]
      }
    }
  },
  {
    id: 'EventRaiders',
    title: 'Steel-Spiked Raiders',
    description: 'Three raiders in spiked shoulder pads step from behind a boulder, brandishing rusty pipes and a smoking pipe pistol.',
    emoji: '💀',
    faction: 'Raiders',
    currentStepId: 'start',
    steps: {
      start: {
        id: 'start',
        text: '"Well, lookie here. A fresh lamb. Toss us 100 Caps and we might let you keep your skin!"',
        options: [
          {
            text: 'Pay 100 Caps to bypass peacefully',
            outcomeLog: '"Good choice. Now beat it before we change our mind!" (-100 Caps)',
            costs: { caps: 100 },
            nextStepId: null
          },
          {
            text: 'Intimidate them: "My gun talks louder than you." (Intimidation Check, Diff 20)',
            outcomeLog: 'You puff out your chest, resting a steady hand on your waistband...',
            skillCheck: { skill: 'Intimidation', difficulty: 20 },
            nextStepId: 'intim_check'
          },
          {
            text: 'Fight! Draw your weapon and attack (SmallGuns Check, Diff 15)',
            outcomeLog: 'You raise your firearm, taking aim at the leader...',
            skillCheck: { skill: 'SmallGuns', difficulty: 15 },
            nextStepId: 'fight_check'
          }
        ]
      },
      intim_check: {
        id: 'intim_check',
        text: 'The leader watches your weapon holster. His pupils contract.',
        options: [
          {
            text: 'Raiders retreat (Success)',
            outcomeLog: 'They back down! "Alright! No trouble! We\'re leaving!" (+150 XP, Raiders dropped 30 Caps in their haste).',
            gains: { caps: 30, xp: 150 },
            nextStepId: null
          },
          {
            text: 'They laugh (Fail)',
            outcomeLog: '"Nice words, squirt! Now die!" They assault you, inflicting severe cuts before you escape (-35 HP, -40 Caps).',
            costs: { health: 35, caps: 40 },
            nextStepId: null
          }
        ]
      },
      fight_check: {
        id: 'fight_check',
        text: 'Gunpowder fills your nose. Guns chatter.',
        options: [
          {
            text: 'Shoot them down (Success)',
            outcomeLog: 'Direct headshot blows the captain away! The remaining raiders scatter, discarding their gun and pockets (+150 XP, +1 10mm Pistol).',
            gains: { xp: 150, itemTemplateId: 'Item10mmPistol' },
            nextStepId: null
          },
          {
            text: 'Receive backfire (Fail)',
            outcomeLog: 'Your gun jams! They beat you senseless and strip your pockets before dumping you in the gulley (-45 HP, -1 Stimpak).',
            costs: { health: 45 },
            nextStepId: null
          }
        ]
      }
    }
  },
  {
    id: 'EventMutants',
    title: 'Feral Super Mutant Scourge',
    description: 'An enormous, pale-green monstrosity clad in heavy metal plates barricades the highway, chewing on a two-headed rat.',
    emoji: '👹',
    faction: 'SuperMutants',
    currentStepId: 'start',
    steps: {
      start: {
        id: 'start',
        text: 'The Super Mutant spots you and roars: "Puny human! More food for the vat!"',
        options: [
          {
            text: 'Sneak past through the radioactive gully (Sneak check, Diff 25)',
            outcomeLog: 'You crouch down, sliding under the emerald fog grids...',
            skillCheck: { skill: 'Sneak', difficulty: 25 },
            nextStepId: 'sneak_check'
          },
          {
            text: 'Assault with energy/melee (MeleeWeapons Check, Diff 30)',
            outcomeLog: 'You lunge with weapon raised at its thick calf...',
            skillCheck: { skill: 'MeleeWeapons', difficulty: 30 },
            nextStepId: 'combat_check'
          },
          {
            text: 'Run like hell back into the wastes',
            outcomeLog: 'You flee instantly, but stress fractures your footing (-10 AP).',
            nextStepId: null
          }
        ]
      },
      sneak_check: {
        id: 'sneak_check',
        text: 'Gravel crunches under your sole. The brute sniffs the air.',
        options: [
          {
            text: 'Unseen bypass (Success)',
            outcomeLog: 'Success! You slide past completely, looting a discarded Brotherhood armor chest from their scrap pile (+250 XP, +1 Combat Armor)!',
            gains: { xp: 250, itemTemplateId: 'ArmorCombatArmor' },
            nextStepId: null
          },
          {
            text: 'Tripped (Fail)',
            outcomeLog: 'You kick a radioactive canister! The creature bats you 30 feet into the boulders (+20 Rads, -45 HP).',
            costs: { health: 45 },
            nextStepId: null
          }
        ]
      },
      combat_check: {
        id: 'combat_check',
        text: 'You slice against thick mutant hide.',
        options: [
          {
            text: 'Behead the beast (Success)',
            outcomeLog: 'You sever a major artery! The green titan falls like wet timber (+350 XP, looting a pristine Combat Knife and 150 Caps).',
            gains: { xp: 350, caps: 150, itemTemplateId: 'ItemCombatKnife' },
            nextStepId: null
          },
          {
            text: 'Crushed (Fail)',
            outcomeLog: 'He catches your blade and throws you like a ragdoll. Your leg crumbles (-60 HP).',
            costs: { health: 60 },
            nextStepId: null
          }
        ]
      }
    }
  },
  {
    id: 'EventTheGlowCore',
    title: 'The Whispering Pre-War AI',
    description: 'You stumble upon a glowing active junction terminal panel sticking out of sandy radioactive sludge.',
    emoji: '📟',
    faction: 'VaultSecurity',
    currentStepId: 'start',
    steps: {
      start: {
        id: 'start',
        text: 'A mechanical synthetic voice clicks: "EMERGENCY POWER MATRIX ONLINE. STATE PROTOCOL: USER IDENTITY REQUIRED. ENGAGE?"',
        options: [
          {
            text: 'Inject bypass scripts (ComputerScience Check, Diff 30)',
            outcomeLog: 'You plug in your Pip-Boy link, overriding the bios gates...',
            skillCheck: { skill: 'ComputerScience', difficulty: 30 },
            nextStepId: 'hack_check'
          },
          {
            text: 'Examine medical research records (NatureSciences Check, Diff 20)',
            outcomeLog: 'You cycle system files looking for vaccine formulas...',
            skillCheck: { skill: 'NatureSciences', difficulty: 20 },
            nextStepId: 'science_check'
          },
          {
            text: 'Smash panel to reclaim copper filaments (ST >= 7)',
            outcomeLog: 'You tear the faceplate off with bare iron hands (+50 Caps, +30 XP).',
            statRequirement: { stat: 'ST', val: 7 },
            gains: { caps: 50, xp: 30 },
            nextStepId: null
          },
          {
            text: 'Back away slowly',
            outcomeLog: 'You ignore the buzzing synthetic terminal.',
            nextStepId: null
          }
        ]
      },
      hack_check: {
        id: 'hack_check',
        text: 'The Pip-Boy screen is scrolling green amber text.',
        options: [
          {
            text: 'Decrypt Vault Core (Success)',
            outcomeLog: 'Hacked! The backup vault matrix unlocks (+200 XP, ejecting a Super Stimpak!).',
            gains: { xp: 200, itemTemplateId: 'ItemSuperStimpak' },
            nextStepId: null
          },
          {
            text: 'Electrical Backlash (Fail)',
            outcomeLog: 'System feedback triggers a battery rupture (-20 HP).',
            costs: { health: 20 },
            nextStepId: null
          }
        ]
      },
      science_check: {
        id: 'science_check',
        text: 'Medical diagrams of experimental genetic filters display.',
        options: [
          {
            text: 'Extract vaccine formulas (Success)',
            outcomeLog: 'You formulate high-density anti-rad tablets! (+150 XP, +1 Rad-X created).',
            gains: { xp: 150, itemTemplateId: 'ItemRadX' },
            nextStepId: null
          },
          {
            text: 'Expose toxic vials (Fail)',
            outcomeLog: 'Coolant tubes explode, spraying chemical toxins, giving you immediate radiation poison (+50 Rads).',
            nextStepId: null
          }
        ]
      }
    }
  }
];

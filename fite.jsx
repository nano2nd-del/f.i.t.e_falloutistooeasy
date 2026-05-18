import { useState } from "react";

const v093Changes = {
  resolved: [
    { item: "TRUE - F76 Damage REMOVED", impact: "Damage overhaul conflict gone" },
    { item: "TRUE - F76 Enemy Scaling REMOVED", impact: "Double-scaling risk eliminated" },
    { item: "FiftyTifty's Damage Overhaul REMOVED", impact: "Two-damage-overhaul incompatibility resolved" },
    { item: "We Cook With Fire REMOVED", impact: "Confirmed outdoor cooking/workbench conflict resolved" },
    { item: "Hardcore SotC (main esp) REMOVED", impact: "Largest FR158 perk conflict source gone" },
    { item: "Power Armor Defensive Improvements (FR158) REMOVED", impact: "PA perk edits gone" },
    { item: "Falltoxin + Fallock REMOVED", impact: "Toxin/lock perk edits simplified" },
    { item: "NPCs Use Items REMOVED", impact: "NPC chem AI concern resolved" },
    { item: "CHALLENGES - F4NV REMOVED", impact: "bp42s perk cluster reduced" },
    { item: "Radiation Overhaul 4x REMOVED", impact: "Stacking hazard with Agony removed" },
    { item: "RobCo Smarter Dynamic Dismember System REMOVED", impact: "Intentional — lightening RobCo load, clearing overlapping damage systems" },
    { item: "Settlement Innkeeper + Scrapper's Cookhouse REMOVED", impact: "Settlement/recipe stacking reduced" },
  ],
  added: [
    { item: ".45 Machine Pistol, 12.7mm SMG, Shotgun Revolver (DegenerateDak)", note: "✅ STS non-issue (adds scopes, doesn't patch). TR has built-in STS MCM setting." },
    { item: "Marine AMR - Barrett M82 (DegenerateDak)", note: "Wasteland Ballistics auto-patcher — check coverage. Otherwise clean." },
    { item: "Dak's Explosive Pack (DegenerateDak)", note: "⚠ Still needs xEdit check vs Explosive Improvements on shared records" },
    { item: "See Through Scopes (henkspamadres)", note: "✅ RESOLVED: STS adds new scope attachments — no patches needed for custom weapons" },
  ],
  openQuestions: [
    {
      q: "Hunkered Down vs Commonwealth Wilderness Overhaul",
      answer: "User will choose ONE. Decision needed before patch work.",
      status: "DECISION",
      detail: "Both are Commonwealth world/landscape overhauls (Undernier vs LiquidBronze). These almost certainly share cell and landscape records. Pick which philosophy fits the collection — then the other gets removed. Hunkered Down is more survival-settlement focused; CWO is more visual/encounter diversity focused."
    },
    {
      q: "Dak's Explosive Pack vs Explosive Improvements",
      answer: "Not checked yet — needs xEdit inspection.",
      status: "PENDING",
      detail: "Open xEdit with both active. Look at EXPL (explosion) records and WEAP records for the Fat Man, frag grenades, Molotov. If Dak's only adds new records and doesn't edit vanilla ones, it's clean. If they both touch the same vanilla explosion records, last-loader wins — may need a forward patch."
    },
  ],
  strategyNotes: [
    {
      title: "S7 as the Injury/Medical Backbone",
      body: "S7 Skill System has patches for MAIM (the heavy injury overhaul). User wants the MAIM-philosophy result but lighter: just bleeding + simple bandages. Recommended direction: keep Agony (bleeding/injury detection) + Wasteland Wound Care (bandages) + Stimpaks Heal No Limbs (forces bandage use for limbs) as the slim stack. Let S7's skill checks gate medical effectiveness. The 3-way chem patch (IPC ↔ Better Chems ↔ Deep Addiction) is still needed as the chem side of this.",
    },
    {
      title: "See Through Scopes — Non-Issue",
      body: "STS works by adding new scope attachments as weapon mods rather than patching existing scopes. Custom weapons either have STS-aware scope slots built in (Dak's weapons do) or they don't have STS scopes — either way, no conflicts, no patches needed.",
    },
    {
      title: "Tactical Reload + STS",
      body: "STS includes an MCM/holotape option for Tactical Reload compatibility. These two are already designed to work together. No patch needed.",
    },
    {
      title: "Fallsouls — Only Lockpick/Hack/Pip-Boy Unpaused",
      body: "Crafting Takes Time, Vulture, and Sleep or Save are all unaffected — game pauses normally for those interactions. Fallsouls scope is much narrower than feared. Remove from concern list.",
    },
    {
      title: "SimpleCraft — Master/Plugin Relationship",
      body: "corpseletter's SimpleCraft is the master ESP. TheCrawlingDark's 'SimpleCraft Crafting' is a plugin that requires it. They are designed as a pair. No conflict.",
    },
    {
      title: "RobCo Load — Intentional Lightening",
      body: "Dynamic Dismember System removed intentionally. RobCo Patcher + RobCo Smarter Bastion Penetration remain. The overlapping damage/dismember system layers have been cleared. This is clean.",
    },
  ],
};

const data = {
  clusters: [
    {
      id: "chems",
      label: "Chem & Drug System",
      color: "#e05c00",
      priority: "HIGH",
      description: "Multiple overlapping systems editing drug effects, addiction, and chem durations. The screenshot shows this exact conflict in xEdit.",
      mods: [
        { name: "Deep Addiction", author: "FroZenGuard", esp: "DeepAddiction.esp", role: "Overhauls addiction system" },
        { name: "Better Chems", author: "Zzyxzz", esp: "Better Chems.esp", role: "Rebalances all chem effects" },
        { name: "Better Chems - Revert Med X", author: "skytechman", esp: "Better Chems - Revert Med X.esp", role: "Reverts Med-X changes from Better Chems" },
        { name: "Immersive Partial Chems", author: "LeahTheUnknown", esp: "Leah's Partial Chems.esp", role: "Partial chem doses with diminishing returns" },
        { name: "Wana's Agony Tweaks", author: "Wanaming0", esp: "Wana_AgonyTweaks.esp", role: "Tweaks Agony chem interactions" },
        { name: "Chem Visuals", author: "Ceftadzime", esp: "ChemVisuals.esp", role: "Adds visual effects to chems" },
        { name: "Alcohol Effects", author: "Ceftadzime", esp: "AlcoholEffects.esp", role: "Overhauls alcohol effects" },
        { name: "Falltoxin", author: "FR158", esp: "Falltoxin.esp", role: "Poison/toxin system overhaul" },
        { name: "Agony", author: "meysamkhr", esp: "Agony.esp", role: "Injury/pain system, interacts with chems" },
        { name: "Stimpaks Heal No Limbs", author: "Pantheashen", esp: "StimpaksHealNoLimbs.esp", role: "Changes stimpak healing behavior" },
        { name: "Stimpaks Help You Breathe", author: "elzee", esp: "StimpaksHelpYouBreathe.esp", role: "Stimpaks restore AP/breath" },
        { name: "NPCs Use Items", author: "Zzyxzz", esp: "NPCsUseItems.esp", role: "NPCs consume chems/stimpaks in combat" },
        { name: "DrugEffects.esp", author: "(collection)", esp: "DrugEffects.esp", role: "Patch esp visible in screenshot — likely hand-built" },
      ],
      existingPatches: [
        { name: "Better Chems - Deep Addiction - Patch", author: "Neyjamin", status: "IN COLLECTION", note: "Covers Better Chems ↔ Deep Addiction" },
        { name: "Agony Animation Fixes", author: "GloriousWarrior", status: "IN COLLECTION", note: "IAF compat for Agony" },
        { name: "Wasteland Ballistics and Wasteland Wound Care Compatibility Patch", author: "jojosmo", status: "IN COLLECTION" },
      ],
      neededPatches: [
        "Immersive Partial Chems ↔ Better Chems ↔ Deep Addiction — 3-way (the screenshot's subject, FIRST PATCH TO MAKE)",
        "Wana's Agony Tweaks ↔ Better Chems — both edit Agony-related chem records",
        "✅ v0.93: Falltoxin removed — toxin/injury overlap simplified",
        "✅ v0.93: NPCs Use Items removed — NPC chem AI concern gone",
      ],
    },
    {
      id: "perks",
      label: "Perk & Leveling System",
      color: "#b5a200",
      priority: "MEDIUM",
      description: "v0.93: Main Hardcore SotC and Power Armor Improvements (FR158) REMOVED — biggest perk conflict sources gone. S7 ↔ bp42s suite still needs checking.",
      mods: [
        { name: "Salvage Yield Improvements", author: "FR158", esp: "SalvageYield.esp", role: "Edits scrapper/salvage perks (FR158 still present)" },
        { name: "FallMisc", author: "FR158", esp: "FallMisc.esp", role: "Misc crafting, minor perk touches" },
        { name: "S7 Skill System", author: "alegendv1", esp: "S7SkillSystem.esp", role: "MAJOR: Skyrim-style leveling overhaul, rebuilds perk system" },
        { name: "LevelUpMenuEx", author: "Neanka", esp: "LevelUpMenuEx.esp", role: "Perk menu overhaul" },
        { name: "LevelUpMenuEx - Extended", author: "alegendv1", esp: "LevelUpMenuEx-Extended.esp", role: "Extends LevelUpMenuEx" },
        { name: "KARMA", author: "bp42s", esp: "KARMA.esp", role: "Karma system via perks/quests" },
        { name: "REPUTATION", author: "bp42s", esp: "REPUTATION.esp", role: "Faction reputation via perks" },
        { name: "FORTITUDE", author: "bp42s", esp: "FORTITUDE.esp", role: "Survival mechanics via perks" },
        { name: "MUTATION", author: "bp42s", esp: "MUTATION.esp", role: "Mutation perk system" },
        { name: "PerkPointsPerLevel NG", author: "TheGamerX20", esp: "PerkPointsPerLevel.esp", role: "Adjusts perk point gain rate" },
        { name: "Water Purifiers Locked Behind Perks", author: "shreddah4", esp: "WaterPurifiersLockedBehindPerks.esp", role: "Perk gating for settlement water" },
        { name: "Legacy Fallout Starting SPECIAL Points", author: "VaBhodi", esp: "LegacySPECIAL.esp", role: "Changes SPECIAL allocation" },
      ],
      existingPatches: [],
      neededPatches: [
        "Remaining FR158 (Salvage Yield, FallMisc) ↔ S7 Skill System — verify scrapper/crafting perks aren't doubled",
        "KARMA/REPUTATION/FORTITUDE/MUTATION ↔ S7 Skill System — bp42s perk additions vs S7 perk tree structure",
        "✅ v0.93: Main Hardcore SotC removed — largest FR158 perk conflict gone",
        "✅ v0.93: CHALLENGES removed — one less bp42s perk system",
      ],
    },
    {
      id: "damage",
      label: "Damage & Combat",
      color: "#cc2222",
      priority: "HIGH",
      description: "v0.93: TRUE F76 Damage AND FiftyTifty both removed — damage cluster massively simplified. Wasteland Ballistics now stands alone as the damage overhaul. Agony calibration question remains.",
      mods: [
        { name: "Wasteland Ballistics", author: "Hedieded", esp: "WastelandBallistics.esp", role: "Now the SOLE damage overhaul — ballistics/penetration" },
        { name: "Agony", author: "meysamkhr", esp: "Agony.esp", role: "Injury system, damage thresholds" },
        { name: "Dak's Explosive Pack", author: "DegenerateDak", esp: "DaksExplosivePack.esp", role: "NEW v0.93: adds/modifies explosives" },
        { name: "Encounter Zone Recalculation", author: "Ea6t", esp: "EZRecalculation.esp", role: "Continuous level scaling" },
        { name: "Weapon Strength Requirements", author: "Fantafaust", esp: "WeaponStrengthReq.esp", role: "STR reqs on weapons" },
        { name: "Brutal Recoil", author: "gurutar", esp: "BrutalRecoil.esp", role: "Edits weapon recoil/accuracy stats" },
        { name: "DirectHit", author: "Zzyxzz", esp: "DirectHit.esp", role: "Hit detection and damage direction" },
        { name: "Explosive Improvements", author: "PlayerInfinite", esp: "ExplosiveImprovements.esp", role: "Explosive damage and radius overhaul" },
        { name: "Bastion - A Power Armor Overhaul", author: "Zzyxzz", esp: "Bastion.esp", role: "PA damage resist overhaul" },
      ],
      existingPatches: [
        { name: "RobCo - Smarter Bastion Penetration", author: "Rantanplan76", status: "IN COLLECTION" },
        { name: "Bastion - Munitions Penetration Patch", author: "ThatGhostBox", status: "IN COLLECTION" },
        { name: "Wasteland Ballistics - Water Impact Fix", author: "D3GMAN", status: "IN COLLECTION" },
        { name: "Wasteland Ballistics + Wound Care Compat", author: "jojosmo", status: "IN COLLECTION" },
      ],
      neededPatches: [
        "⚠ OPEN Q: Agony injury thresholds — calibrated for vanilla or Wasteland Ballistics damage values? TRUE/FiftyTifty removed.",
        "Encounter Zone Recalculation — verify not doubling with any remaining scaling source",
        "Dak's Explosive Pack ↔ Explosive Improvements — both touch grenade/Fat Man explosion records",
        "Weapon Strength Requirements ↔ Wasteland Ballistics — script-on-equip interaction check",
      ],
    },
    {
      id: "survival",
      label: "Survival Mechanics",
      color: "#2a7a3b",
      priority: "MEDIUM",
      description: "v0.93: Main Hardcore SotC (FR158) removed — overlap with FORTITUDE reduced. MoBSS vs Sleep or Save still active concern.",
      mods: [
        { name: "FORTITUDE", author: "bp42s", esp: "FORTITUDE.esp", role: "Survival mechanics system" },
        { name: "Swimout", author: "FR158", esp: "Swimout.esp", role: "Deadly water/drowning" },
        { name: "Dirty Water from Pumps", author: "Finparasite", esp: "DirtyWaterFromPumps.esp", role: "Settlement water mechanics" },
        { name: "Goodneighbor Immersive Water Pump", author: "CapnLilNemo", esp: "GoodneighborWaterPump.esp", role: "Water pump placement" },
        { name: "More Beds to Save in Survival", author: "destructor36", esp: "MoBSS.esp", role: "Adds bed saves" },
        { name: "Sleep or Save", author: "Loganbacca", esp: "SleepOrSave.esp", role: "Sleep-based saving" },
        { name: "Fallfall", author: "FR158", esp: "Fallfall.esp", role: "Fall damage overhaul" },
        { name: "Cough", author: "elzee", esp: "Cough.esp", role: "Coughing in dust/rad zones" },
        { name: "Running Breathing", author: "elzee", esp: "RunningBreathing.esp", role: "Stamina/breathing" },
        { name: "Pain Sound FX", author: "craig228azaz", esp: "PainSoundFX.esp", role: "Pain feedback" },
        { name: "Fallsouls - Unpaused Game Menus", author: "kassent", esp: "Fallsouls.esp", role: "⚠ Unpauses ALL menus — interacts with timed mods" },
        { name: "Crafting Takes Time", author: "JanuarySnow", esp: "CraftingTakesTime.esp", role: "Adds time delay to crafting" },
        { name: "Vulture - Looting Takes Time", author: "eclix", esp: "Vulture.esp", role: "Looting has time cost + sound" },
      ],
      existingPatches: [
        { name: "Sleep Or Save Fixes", author: "Goldtiger01", status: "IN COLLECTION" },
      ],
      neededPatches: [
        "MoBSS ↔ Sleep or Save — two bed-saving systems; both edit bed activation; check for doubled prompt",
        "Swimout ↔ Dirty Water from Pumps — water hazard overlap on pump water sources",
        "⚠ OPEN Q: Fallsouls (unpaused menus) ↔ Crafting Takes Time / Vulture / Sleep or Save — timed mods break when menus don't pause",
      ],
    },
    {
      id: "workbench",
      label: "Crafting & Workbenches",
      color: "#1a6fa0",
      priority: "LOW",
      description: "v0.93: We Cook With Fire removed — the confirmed outdoor cooking conflict is RESOLVED. Remaining issues are recipe stacking and SimpleCraft relationship.",
      mods: [
        { name: "Workshop Workbenches to BOS", author: "capracapra", esp: "WorkshopWorkbenchestoBOS.esp", role: "Replaces ALL vanilla outdoor workbench visuals/refs" },
        { name: "Compact Crafting", author: "fadingsignal", esp: "CompactCrafting.esp", role: "Mini crafting stations" },
        { name: "Conquest", author: "Chesko", esp: "Conquest.esp", role: "Camping + build workbenches anywhere" },
        { name: "BARREN - Remove Modular Armor", author: "Lumineer235", esp: "BARREN.esp", role: "Removes modular armor workbench usage" },
        { name: "New Recipes 2", author: "KimChiBenny0", esp: "NewRecipes2.esp", role: "Adds cooking recipes" },
        { name: "New Recipe 2 - IAF Compatibility", author: "BLACKPINKS", esp: "NewRecipe2_IAF.esp", role: "Patch" },
        { name: "Animated Coffee Drinking", author: "Itchytreasuresack", esp: "AnimatedCoffeeDrinking.esp", role: "Coffee crafting at cooking station" },
        { name: "SimpleCraft", author: "corpseletter", esp: "SimpleCraft.esp", role: "Crafting overhaul" },
        { name: "SimpleCraft Crafting", author: "TheCrawlingDark", esp: "SimpleCraftCrafting.esp", role: "⚠ OPEN Q: Addon or competitor to SimpleCraft?" },
        { name: "Wild Soup Recipes", author: "zed140", esp: "WildSoupRecipes.esp", role: "New soup recipes" },
        { name: "Hardcore SotC - Settlement Building", author: "FR158", esp: "HardcoreSotC_Settlement.esp", role: "Settlement workbench record changes" },
        { name: "Portable Crafting Tools", author: "seanms1991", esp: "PortableCraftingTools.esp", role: "Craft/modify anywhere" },
      ],
      existingPatches: [
        { name: "Compact Crafting with Conquest support", author: "Eireamhoin", status: "IN COLLECTION" },
        { name: "Campsite with Conquest support", author: "Eireamhoin", status: "IN COLLECTION" },
        { name: "New Recipe 2 - IAF Compat", author: "BLACKPINKS", status: "IN COLLECTION" },
        { name: "Consumables of the Commonwealth IAF FIS Patch", author: "lance5", status: "IN COLLECTION" },
      ],
      neededPatches: [
        "✅ RESOLVED v0.93: We Cook With Fire ↔ Workshop Workbenches to BOS — We Cook With Fire removed",
        "New Recipes 2 ↔ Yellowcake ↔ Consumables of the Commonwealth — recipe/ingredient record overlap",
        "⚠ OPEN Q: SimpleCraft (corpseletter) vs SimpleCraft Crafting (TheCrawlingDark) — same records?",
        "BARREN ↔ Eli's Armour Compendium — BARREN removes modular armor slots, EAC adds many modular pieces",
      ],
    },
    {
      id: "animation",
      label: "Animation Framework",
      color: "#7a2a8a",
      priority: "MEDIUM",
      description: "IAF is the central animation framework. Several mods have IAF patches already in collection; several do not.",
      mods: [
        { name: "Immersive Animation Framework", author: "GloriousWarrior", esp: "IAF.esp", role: "Central animation framework" },
        { name: "Animated Chems Redone", author: "Flip777", esp: "AnimatedChemsRedone.esp", role: "Chem use animations" },
        { name: "Animated Chems Redone - Jet Fix", author: "ArcanicVoid", esp: "AnimatedChemsRedone_JetFix.esp", role: "Bug fix" },
        { name: "Grab the Damn Mag", author: "MonkatrazBri", esp: "GrabTheDamnMag.esp", role: "Magazine grab animation" },
        { name: "Quick Draw", author: "Bunslinger", esp: "QuickDraw.esp", role: "Draw/holster animations" },
        { name: "Quick Draw Sprint Reload Merged", author: "dbs156", esp: "QuickDrawSprintReloadMerged.esp", role: "Sprint reload anims" },
        { name: "Companion Command Animations", author: "Stentorious", esp: "CompanionCommandAnimations.esp", role: "Companion animations" },
        { name: "First-Person Running with Hands", author: "neeher", esp: "FPRunning.esp", role: "1P movement animations" },
        { name: "First-Person Swimming Animations", author: "neeher", esp: "FPSwimming.esp", role: "1P swim animations" },
        { name: "Reanimation Pack - Combat Shotgun/Rifle", author: "wardaddy755", esp: "ReanimationPack.esp", role: "Weapon animations" },
        { name: "Chinese Assault Rifle Animations", author: "wardaddy755", esp: "ChineseARAnimations.esp", role: "Weapon animations" },
        { name: "Explosion Reactions", author: "Stentorious", esp: "ExplosionReactions.esp", role: "Hit/explosion reactions" },
        { name: "Simple Attack Reactions", author: "i3ncore", esp: "SimpleAttackReactions.esp", role: "Limb-specific reactions" },
        { name: "Human Grab Attacks", author: "elzee", esp: "HumanGrabAttacks.esp", role: "Grab attack animations" },
        { name: "Power Armor Fast Exit and Enter", author: "UlithiumDragon", esp: "PAFastExit.esp", role: "PA entry/exit animations" },
        { name: "Improved Animated Accessible Backpack", author: "Flip777", esp: "IABackpack.esp", role: "Backpack equip animations" },
      ],
      existingPatches: [
        { name: "IAF - ESP-less Patches", author: "Shackleberry", status: "IN COLLECTION" },
        { name: "IAF - Patch Repository", author: "Omega4D2", status: "IN COLLECTION" },
        { name: "Wasteland Medic - IAF Patch", author: "PJSAS", status: "IN COLLECTION" },
        { name: "Agony Animation Fixes", author: "GloriousWarrior", status: "IN COLLECTION" },
        { name: "Animated Chems Redone - Jet Fix", author: "ArcanicVoid", status: "IN COLLECTION" },
        { name: "New Recipe 2 - IAF Compatibility", author: "BLACKPINKS", status: "IN COLLECTION" },
        { name: "Consumables of the Commonwealth IAF FIS Patch", author: "lance5", status: "IN COLLECTION" },
      ],
      neededPatches: [
        "Verify Animated Chems Redone ↔ IAF has full coverage (screenshot shows possible gap)",
        "Quick Draw Sprint Reload Merged ↔ IAF — sprint reload conflicts with IAF behavior",
        "Power Armor Fast Exit ↔ IAF — PA animations may clash",
      ],
    },
    {
      id: "loot",
      label: "Loot & Economy",
      color: "#2a6060",
      priority: "LOW",
      description: "Multiple loot reduction mods stacking — risk of making the game too sparse or conflicting on container/item lists.",
      mods: [
        { name: "Less Dungeon Loot", author: "WhiskyTangoFawks", esp: "LessDungeonLoot.esp", role: "Reduces dungeon container loot" },
        { name: "Less Loot - Assorted Patches", author: "WhiskyTangoFawks", esp: "LessLoot_Patches.esp", role: "Location patches for loot reduction" },
        { name: "Less Loot for Mutant Menagerie", author: "Nartaga", esp: "LessLoot_MM.esp", role: "Patch for MM creature loot" },
        { name: "Lootable World", author: "Qrsr", esp: "LootableWorld.esp", role: "Makes more world objects lootable" },
        { name: "Looted World Expansion", author: "Qrsr", esp: "LootedWorldExpansion.esp", role: "Expands Looted World" },
        { name: "Lootable Crates", author: "Richwizard", esp: "LootableCrates.esp", role: "Crates become lootable" },
        { name: "Lootable Crates - Reduced Loot", author: "Olioster", esp: "LootableCrates_Reduced.esp", role: "Reduces Lootable Crates loot" },
        { name: "Lootable Stoves", author: "TrickyVein", esp: "LootableStoves.esp", role: "Stoves lootable" },
        { name: "Lootable Fatman Crates", author: "teekayell", esp: "LootableFatmanCrates.esp", role: "Fat Man crates lootable" },
        { name: "Lootable Vertibirds", author: "PJMail", esp: "LootableVertibirds.esp", role: "Vertibirds lootable" },
        { name: "Lootable Terminals", author: "JustWanya", esp: "LootableTerminals.esp", role: "Terminals lootable" },
        { name: "Lootable AC Unit", author: "Qrsr", esp: "LootableACUnit.esp", role: "AC units lootable" },
        { name: "Lootable Glowing Oil Lamp", author: "Qrsr", esp: "LootableGlowingOilLamp.esp", role: "Oil lamps lootable" },
        { name: "Vulture - Looting Takes Time", author: "eclix", esp: "Vulture.esp", role: "Loot animations/time cost" },
        { name: "Scrap Heap", author: "DesmondBeGood", esp: "ScrapHeap.esp", role: "Junk/scrap items overhaul" },
        { name: "Scrap Heap Rebalanced", author: "Kallerothima", esp: "ScrapHeapRebalanced.esp", role: "Rebalances Scrap Heap" },
        { name: "Mine Swapper", author: "WhiskyTangoFawks", esp: "MineSwapper.esp", role: "Caps stashes → mines" },
        { name: "4444 Better Safe Loot", author: "flavius1", esp: "BetterSafeLoot.esp", role: "Improves safe loot tables" },
        { name: "Yellowcake - A Food Overhaul", author: "rusalka9", esp: "Yellowcake.esp", role: "Food item overhaul" },
        { name: "Consumables of the Commonwealth", author: "DesmondBeGood", esp: "ConsumablesOTC.esp", role: "New consumable items" },
        { name: "Wasteland Medic", author: "Hedieded", esp: "WastelandMedic.esp", role: "Medical items overhaul" },
        { name: "Wasteland Wound Care", author: "PaddyGarcia", esp: "WastelandWoundCare.esp", role: "Bandages/wound items" },
      ],
      existingPatches: [
        { name: "Lootable Crates - Reduced Loot", author: "Olioster", status: "IN COLLECTION" },
        { name: "Scrap Heap Rebalanced", author: "Kallerothima", status: "IN COLLECTION" },
        { name: "Less Loot for Mutant Menagerie", author: "Nartaga", status: "IN COLLECTION" },
        { name: "Wasteland Ballistics and Wasteland Wound Care Compat Patch", author: "jojosmo", status: "IN COLLECTION" },
      ],
      neededPatches: [
        "Yellowcake ↔ Consumables of the Commonwealth ↔ New Recipes 2 — food/ingredient record overlap",
        "Wasteland Medic ↔ Wasteland Wound Care ↔ Agony — medical item availability vs injury severity",
        "Lootable World suite stacking — LessLoot and Lootable World editing same containers in opposite directions",
      ],
    },
    {
      id: "spawns",
      label: "Spawning & Encounters",
      color: "#7a4020",
      priority: "LOW",
      description: "Multiple spawn overhaul mods with potential to stack spawn density to unplayable levels, or conflict on cell/encounter zone records.",
      mods: [
        { name: "Lightweight More Spawns", author: "Parabellum1901", esp: "LightweightMoreSpawns.esp", role: "Increases enemy spawns" },
        { name: "Populated Interiors", author: "Deleted38374460", esp: "PopulatedInteriors.esp", role: "Adds NPCs to interiors" },
        { name: "Vertical Spawns Light", author: "CMSTORMTROOPER", esp: "VerticalSpawnsLight.esp", role: "Enemies spawn on rooftops/vertically" },
        { name: "More Human Enemies", author: "Deleted7558487User", esp: "MoreHumanEnemies.esp", role: "More human-type enemies" },
        { name: "Dynamic Spawn Framework", author: "leaftongue", esp: "DynamicSpawnFramework.esp", role: "Dynamic spawn management" },
        { name: "Random Encounter Framework", author: "Glitchfinder", esp: "REF.esp", role: "Random encounter system" },
        { name: "Encounter Zone Recalculation", author: "Ea6t", esp: "EZRecalculation.esp", role: "Level scaling for zones" },
        { name: "Mutant Menagerie - Life Finds A Way", author: "StamperDoesMods", esp: "MutantMenagerie.esp", role: "Creature overhaul/new creatures" },
        { name: "FORTITUDE - Add Ons", author: "AAAARTEMISSSS", esp: "FORTITUDE_AddOns.esp", role: "More creature variants for FORTITUDE" },
        { name: "Improved Hostile Factions", author: "Warsaw2135", esp: "ImprovedHostileFactions.esp", role: "Faction AI/hostility changes" },
        { name: "TRUE - F76 Enemy Scaling RobCo", author: "AAAARTEMISSSS", esp: "TRUE_EnemyScaling.esp", role: "Enemy stat scaling" },
        { name: "Starts Dead Alive", author: "Qrsr", esp: "StartsDead.esp", role: "NPC corpse/alive state" },
        { name: "Respawnable Legendary Bosses - Rebalanced", author: "Laptoprocker", esp: "RespawnableLegendaryBosses_Rebalanced.esp", role: "Legendary boss respawns" },
        { name: "Respawnable Legendary Bosses and Hard Legendary Giant Creatures", author: "Charrisx", esp: "RespawnableLegendaryBosses.esp", role: "More legendary variants" },
      ],
      existingPatches: [
        { name: "Less Loot for Mutant Menagerie", author: "Nartaga", status: "IN COLLECTION" },
      ],
      neededPatches: [
        "Lightweight More Spawns + Populated Interiors + Vertical Spawns — stacking risk: combined spawn count may be severe",
        "Respawnable Legendary Bosses (×2 mods) — overlap check needed, may double-apply boss records",
        "TRUE Enemy Scaling ↔ Encounter Zone Recalculation — double scaling confirmed risk",
      ],
    },
    {
      id: "thematic",
      label: "Thematic Incompatibilities",
      color: "#880000",
      priority: "REVIEW",
      description: "Mods that may technically work together but undermine each other's design intent. v0.93 removed TRUE/FiftyTifty and We Cook With Fire, resolving two thematic issues.",
      mods: [],
      existingPatches: [],
      neededPatches: [
        "✅ v0.93 RESOLVED: TRUE F76 Damage + FiftyTifty — both removed",
        "✅ v0.93 RESOLVED: We Cook With Fire + Workbenches to BOS — cooking mod removed",
        "BARREN (remove modular armor) + Tumbajamba/EAC armor packs — BARREN's intent contradicts heavy modular armor additions",
        "No Legendary NPCs (hardcoded only) + Respawnable Legendary Bosses (×2) — contradictory legendary philosophy",
        "Less Dungeon Loot + Lootable World suite — philosophically opposite; stacking partially cancels each other",
        "⚠ OPEN Q: Hunkered Down ↔ Commonwealth Wilderness Overhaul — two world/landscape overhauls, likely sharing cell records",
        "Home Unimprovement + Compact Crafting + Handmade Turrets — overlapping settlement complexity philosophies",
      ],
    },
    {
      id: "weapons",
      label: "Weapons & Scope Coverage",
      color: "#4a7a9b",
      priority: "MEDIUM",
      description: "v0.93 added 5 new DegenerateDak weapons. See Through Scopes and Tactical Reload both need per-weapon patches. The custom weapon collection is large enough to be its own concern.",
      mods: [
        { name: "See Through Scopes", author: "henkspamadres", esp: "SeeThruScopes.esp", role: "NEW v0.93: needs patches for every scoped custom weapon" },
        { name: "Tactical Reload", author: "Bwones", esp: "TacticalReload.esp", role: "Needs patches for each custom weapon with reload anims" },
        { name: ".32 Machine Pistol (Cz.61)", author: "DegenerateDak", esp: "32MachinePistol.esp", role: "Custom weapon" },
        { name: ".45 Machine Pistol (MP-45)", author: "DegenerateDak", esp: "45MachinePistol.esp", role: "NEW v0.93" },
        { name: "10mm SMG", author: "DegenerateDak", esp: "10mmSMG.esp", role: "Custom weapon" },
        { name: "12.7mm SMG", author: "DegenerateDak", esp: "127mmSMG.esp", role: "NEW v0.93" },
        { name: "Marine AMR - Barrett M82", author: "DegenerateDak", esp: "MarineAMR.esp", role: "NEW v0.93 — scoped sniper, high STS priority" },
        { name: "Dak's Explosive Pack", author: "DegenerateDak", esp: "DaksExplosivePack.esp", role: "NEW v0.93 — explosive records, check vs Explosive Improvements" },
        { name: "The Shotgun Revolver", author: "DegenerateDak", esp: "ShotgunRevolver.esp", role: "NEW v0.93" },
        { name: "Light Machine Gun", author: "DegenerateDak", esp: "LightMachineGun.esp", role: "Custom weapon" },
        { name: "Plasma Defender", author: "DegenerateDak", esp: "PlasmaDefender.esp", role: "Custom weapon" },
        { name: "ARs of the Wasteland", author: "Geckoinacan77", esp: "ARsOfTheWasteland.esp", role: "Multi-weapon pack — STS/TR check" },
        { name: "Bolt Actions of the Wasteland", author: "Geckoinacan77", esp: "BoltActionsOTW.esp", role: "Scoped rifles — high STS priority" },
        { name: "Pump Actions of the Wasteland", author: "Geckoinacan77", esp: "PumpActionsOTW.esp", role: "Multi-weapon pack" },
        { name: "Sidearms of the Wasteland", author: "Geckoinacan77", esp: "SidearmsOTW.esp", role: "Multi-weapon pack" },
        { name: "ITO - Institute Technology Overhaul Weapons", author: "micalov", esp: "ITO.esp", role: "Custom weapon set — STS/TR check" },
        { name: "Chinese Assault Rifle REBORN", author: "EyteenOneEight", esp: "ChineseARREBORN.esp", role: "Weapon — STS/TR check" },
        { name: "Wasteland Ballistics", author: "Hedieded", esp: "WastelandBallistics.esp", role: "Ballistics — penetration values for custom weapons?" },
      ],
      existingPatches: [],
      neededPatches: [
        "⚠ OPEN Q: Does See Through Scopes auto-detect these weapon packs or do patches need to be made/found?",
        "⚠ OPEN Q: Does Tactical Reload have coverage for DegenerateDak and Geckoinacan77 packs?",
        "Marine AMR ↔ See Through Scopes — long-range scoped rifle is the highest-priority STS candidate",
        "Bolt Actions of the Wasteland ↔ See Through Scopes — full pack of scoped rifles",
        "Dak's Explosive Pack ↔ Explosive Improvements — shared vanilla explosive records",
        "Wasteland Ballistics auto-patching for custom weapons — verify Hedieded's patcher covers all Dak/Gecko packs",
      ],
    },
  ],
  patchPriority: [
    { patch: "Immersive Partial Chems ↔ Better Chems ↔ Deep Addiction (3-way)", effort: "LOW", impact: "HIGH", note: "Screenshot subject. First patch. Records visible in xEdit." },
    { patch: "See Through Scopes — audit custom weapon coverage", effort: "MEDIUM", impact: "HIGH", note: "15+ custom weapon packs. Patching or finding existing patches needed per pack." },
    { patch: "Remaining FR158 ↔ S7 Skill System perk overlap", effort: "MEDIUM", impact: "MEDIUM", note: "Reduced from v0.91 — only Salvage Yield/FallMisc remain." },
    { patch: "MoBSS ↔ Sleep or Save — bed saving systems", effort: "LOW", impact: "MEDIUM", note: "Both edit bed activation records." },
    { patch: "Dak's Explosive Pack ↔ Explosive Improvements", effort: "LOW", impact: "MEDIUM", note: "Check in xEdit for shared Fat Man/grenade records." },
    { patch: "Hunkered Down ↔ Commonwealth Wilderness Overhaul", effort: "UNKNOWN", impact: "HIGH", note: "⚠ Need user input — are these both running? Cell conflicts likely." },
    { patch: "BARREN ↔ Eli's Armour Compendium modular slot edits", effort: "MEDIUM", impact: "MEDIUM", note: "BARREN removes mod slots; EAC depends on them." },
    { patch: "Spawn stack audit", effort: "MEDIUM", impact: "MEDIUM", note: "3+ spawn mods — check combined multipliers." },
    { patch: "Respawnable Legendary Bosses ×2 dedup", effort: "LOW", impact: "LOW", note: "Likely same records applied twice." },
    { patch: "Fallsouls ↔ timed mods (Crafting Takes Time, Vulture, SoS)", effort: "LOW", impact: "MEDIUM", note: "Verify timed actions work when menus don't pause." },
  ],
};

const PRIORITY_COLOR = {
  HIGH: "#e05c00",
  MEDIUM: "#b5a200",
  LOW: "#2a7a3b",
  REVIEW: "#880000",
};

const EFFORT_COLOR = {
  LOW: "#2a7a3b",
  MEDIUM: "#b5a200",
  HIGH: "#e05c00",
};

export default function App() {
  const [activeCluster, setActiveCluster] = useState(null);
  const [tab, setTab] = useState("clusters");
  const [sidePanel, setSidePanel] = useState(null);

  const cluster = data.clusters.find((c) => c.id === activeCluster);

  return (
    <div style={{
      fontFamily: "'Share Tech Mono', 'Courier New', monospace",
      background: "#0d0d0d",
      color: "#c8b97a",
      minHeight: "100vh",
      padding: "0",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Rajdhani:wght@500;700&display=swap');
        ::-webkit-scrollbar { width: 6px; background: #111; }
        ::-webkit-scrollbar-thumb { background: #3a3020; border-radius: 3px; }
        .cluster-btn { transition: all 0.15s; cursor: pointer; }
        .cluster-btn:hover { filter: brightness(1.2); }
        .tab-btn { transition: background 0.15s; cursor: pointer; }
        .mod-row:hover { background: #1a1800; }
        .patch-row:hover { background: #1a1800; }
      `}</style>

      {/* Header */}
      <div style={{
        background: "linear-gradient(90deg, #1a0a00, #0d0d0d 60%)",
        borderBottom: "2px solid #3a2800",
        padding: "18px 24px 14px",
        display: "flex",
        alignItems: "center",
        gap: "16px",
      }}>
        <div style={{ fontSize: "28px", letterSpacing: "1px", fontFamily: "'Rajdhani', sans-serif", color: "#e8c94a", fontWeight: 700 }}>
          F.I.T.E* — CONFLICT INDEX
        </div>
        <div style={{ marginLeft: "auto", fontSize: "11px", color: "#5a4a20", letterSpacing: "2px" }}>
          v0.93 · 382 MODS · {v093Changes.openQuestions.length} OPEN QUESTIONS
        </div>
      </div>

      <div style={{ display: "flex", height: "calc(100vh - 60px)" }}>

        {/* Sidebar */}
        <div style={{
          width: "240px",
          flexShrink: 0,
          background: "#0a0a0a",
          borderRight: "1px solid #2a1e00",
          overflowY: "auto",
          padding: "12px 8px",
        }}>
          <div style={{ fontSize: "10px", color: "#4a3a10", letterSpacing: "3px", marginBottom: "10px", paddingLeft: "8px" }}>
            CONFLICT CLUSTERS
          </div>
          {data.clusters.map((c) => (
            <div
              key={c.id}
              className="cluster-btn"
              onClick={() => { setActiveCluster(c.id); setTab("needed"); setSidePanel(null); }}
              style={{
                padding: "10px 12px",
                marginBottom: "4px",
                background: activeCluster === c.id && !sidePanel ? "#1a1200" : "transparent",
                border: `1px solid ${activeCluster === c.id && !sidePanel ? c.color : "#1a1200"}`,
                borderRadius: "3px",
              }}
            >
              <div style={{ fontSize: "12px", color: c.color, fontWeight: "bold", marginBottom: "2px" }}>
                {c.label}
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <span style={{
                  fontSize: "9px", padding: "1px 5px", borderRadius: "2px",
                  background: PRIORITY_COLOR[c.priority] + "22",
                  color: PRIORITY_COLOR[c.priority],
                  border: `1px solid ${PRIORITY_COLOR[c.priority]}44`,
                  letterSpacing: "1px",
                }}>
                  {c.priority}
                </span>
                <span style={{ fontSize: "10px", color: "#5a4a20" }}>{c.mods.length} mods</span>
              </div>
            </div>
          ))}

          <div style={{ borderTop: "1px solid #2a1e00", marginTop: "12px", paddingTop: "12px" }}>
            {[
              { id: "priority", label: "📋 Patch Priority Queue", sub: `${data.patchPriority.length} patches queued` },
              { id: "changelog", label: "✅ v0.93 Changelog", sub: `${v093Changes.resolved.length} resolved` },
              { id: "questions", label: "❓ Open Questions", sub: `${v093Changes.openQuestions.length} need answers`, urgent: true },
            ].map(item => (
              <div key={item.id}
                className="cluster-btn"
                onClick={() => { setActiveCluster(null); setSidePanel(item.id); }}
                style={{
                  padding: "10px 12px", marginBottom: "4px",
                  background: sidePanel === item.id ? "#1a1200" : "transparent",
                  border: `1px solid ${sidePanel === item.id ? (item.urgent ? "#cc2222" : "#e8c94a") : "#1a1200"}`,
                  borderRadius: "3px",
                }}>
                <div style={{ fontSize: "12px", color: item.urgent ? "#cc2222" : "#e8c94a" }}>{item.label}</div>
                <div style={{ fontSize: "10px", color: "#5a4a20" }}>{item.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

          {/* Priority Queue */}
          {sidePanel === "priority" && (
            <div>
              <div style={{ fontSize: "18px", fontFamily: "'Rajdhani',sans-serif", color: "#e8c94a", marginBottom: "6px", fontWeight: 700 }}>PATCH PRIORITY QUEUE</div>
              <div style={{ fontSize: "11px", color: "#5a4a20", marginBottom: "20px" }}>Ordered by impact vs effort — start at top</div>
              {data.patchPriority.map((p, i) => (
                <div key={i} className="patch-row" style={{ background: "#0f0f0a", border: "1px solid #2a1e00", borderRadius: "4px", padding: "14px 16px", marginBottom: "8px", display: "flex", alignItems: "flex-start", gap: "14px" }}>
                  <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#1a1200", border: "1px solid #3a2800", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", color: "#c8b97a", flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "13px", color: "#e8c94a", marginBottom: "5px" }}>{p.patch}</div>
                    <div style={{ fontSize: "11px", color: "#7a6a40", marginBottom: "6px" }}>{p.note}</div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "2px", background: EFFORT_COLOR[p.effort] + "22", color: EFFORT_COLOR[p.effort], border: `1px solid ${EFFORT_COLOR[p.effort]}44` }}>EFFORT: {p.effort}</span>
                      <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "2px", background: PRIORITY_COLOR[p.impact] + "22", color: PRIORITY_COLOR[p.impact], border: `1px solid ${PRIORITY_COLOR[p.impact]}44` }}>IMPACT: {p.impact}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* v0.93 Changelog */}
          {sidePanel === "changelog" && (
            <div>
              <div style={{ fontSize: "18px", fontFamily: "'Rajdhani',sans-serif", color: "#e8c94a", marginBottom: "6px", fontWeight: 700 }}>v0.91 → v0.93 CHANGELOG</div>
              <div style={{ fontSize: "11px", color: "#5a4a20", marginBottom: "20px" }}>382 mods in v0.93 — several major conflicts resolved by removals</div>
              <div style={{ fontSize: "12px", color: "#4aa84a", letterSpacing: "2px", marginBottom: "8px" }}>RESOLVED BY REMOVAL</div>
              {v093Changes.resolved.map((r, i) => (
                <div key={i} style={{ padding: "10px 14px", background: "#0a1a0a", border: "1px solid #1a3a1a", borderRadius: "4px", marginBottom: "6px" }}>
                  <div style={{ fontSize: "12px", color: "#4aa84a", marginBottom: "2px" }}>✓ {r.item}</div>
                  <div style={{ fontSize: "11px", color: "#3a5a3a" }}>{r.impact}</div>
                </div>
              ))}
              <div style={{ fontSize: "12px", color: "#4a7a9b", letterSpacing: "2px", marginTop: "20px", marginBottom: "8px" }}>NEW ADDITIONS</div>
              {v093Changes.added.map((a, i) => (
                <div key={i} style={{ padding: "10px 14px", background: "#0a0f1a", border: "1px solid #1a2a3a", borderRadius: "4px", marginBottom: "6px" }}>
                  <div style={{ fontSize: "12px", color: "#4a9abf", marginBottom: "2px" }}>+ {a.item}</div>
                  <div style={{ fontSize: "11px", color: "#3a5a6a" }}>{a.note}</div>
                </div>
              ))}
            </div>
          )}

          {/* Open Questions */}
          {sidePanel === "questions" && (
            <div>
              <div style={{ fontSize: "18px", fontFamily: "'Rajdhani',sans-serif", color: "#cc2222", marginBottom: "6px", fontWeight: 700 }}>❓ OPEN QUESTIONS</div>
              <div style={{ fontSize: "11px", color: "#5a4a20", marginBottom: "20px" }}>{v093Changes.openQuestions.length} remaining — others answered below in Strategy Notes.</div>
              {v093Changes.openQuestions.map((q, i) => (
                <div key={i} style={{ padding: "14px 16px", background: q.status === "DECISION" ? "#1a1200" : "#1a0a0a", border: `1px solid ${q.status === "DECISION" ? "#c8b97a44" : "#3a1a1a"}`, borderRadius: "4px", marginBottom: "10px" }}>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "6px" }}>
                    <span style={{ fontSize: "9px", padding: "1px 6px", borderRadius: "2px", background: q.status === "DECISION" ? "#c8b97a22" : "#e05c0022", color: q.status === "DECISION" ? "#c8b97a" : "#e05c00", border: `1px solid ${q.status === "DECISION" ? "#c8b97a44" : "#e05c0044"}`, letterSpacing: "1px" }}>{q.status}</span>
                    <div style={{ fontSize: "13px", color: q.status === "DECISION" ? "#e8c94a" : "#e05c00" }}>{q.q}</div>
                  </div>
                  <div style={{ fontSize: "11px", color: "#7a6a40", lineHeight: "1.6", marginBottom: q.answer ? "6px" : "0" }}>{q.detail}</div>
                  {q.answer && <div style={{ fontSize: "11px", color: "#9a8a50", fontStyle: "italic" }}>→ {q.answer}</div>}
                </div>
              ))}
            </div>
          )}

          {/* Strategy Notes */}
          {sidePanel === "strategy" && (
            <div>
              <div style={{ fontSize: "18px", fontFamily: "'Rajdhani',sans-serif", color: "#4a9abf", marginBottom: "6px", fontWeight: 700 }}>🧭 STRATEGIC DIRECTION</div>
              <div style={{ fontSize: "11px", color: "#5a4a20", marginBottom: "20px" }}>Collection design intent and resolved question outcomes</div>
              {v093Changes.strategyNotes.map((n, i) => (
                <div key={i} style={{ padding: "14px 16px", background: "#0a0f1a", border: "1px solid #1a2a3a", borderRadius: "4px", marginBottom: "10px" }}>
                  <div style={{ fontSize: "13px", color: "#4a9abf", marginBottom: "8px", fontFamily: "'Rajdhani',sans-serif", fontWeight: 700 }}>{n.title}</div>
                  <div style={{ fontSize: "11px", color: "#5a7a8a", lineHeight: "1.7" }}>{n.body}</div>
                </div>
              ))}
            </div>
          )}

          {/* Cluster Detail View */}
          {activeCluster && cluster && !sidePanel && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                <div style={{ fontSize: "20px", fontFamily: "'Rajdhani',sans-serif", color: cluster.color, fontWeight: 700 }}>
                  {cluster.label.toUpperCase()}
                </div>
                <span style={{
                  fontSize: "10px", padding: "2px 8px", borderRadius: "2px",
                  background: PRIORITY_COLOR[cluster.priority] + "22",
                  color: PRIORITY_COLOR[cluster.priority],
                  border: `1px solid ${PRIORITY_COLOR[cluster.priority]}44`,
                  letterSpacing: "2px",
                }}>
                  {cluster.priority} PRIORITY
                </span>
              </div>
              <div style={{ fontSize: "12px", color: "#7a6a40", marginBottom: "20px", maxWidth: "600px", lineHeight: "1.5" }}>
                {cluster.description}
              </div>

              {/* Tabs */}
              <div style={{ display: "flex", gap: "4px", marginBottom: "16px" }}>
                {["mods", "existing", "needed"].map((t) => (
                  <button key={t} className="tab-btn" onClick={() => setTab(t)} style={{
                    padding: "6px 14px", fontSize: "11px", letterSpacing: "1px",
                    background: tab === t ? "#2a1e00" : "transparent",
                    color: tab === t ? "#e8c94a" : "#5a4a20",
                    border: `1px solid ${tab === t ? "#c8b97a44" : "#2a1e00"}`,
                    borderRadius: "3px", cursor: "pointer",
                  }}>
                    {t === "mods" ? `MODS (${cluster.mods.length})` :
                      t === "existing" ? `EXISTING PATCHES (${cluster.existingPatches.length})` :
                        `PATCHES NEEDED (${cluster.neededPatches.length})`}
                  </button>
                ))}
              </div>

              {tab === "mods" && (
                <div>
                  {cluster.mods.map((m, i) => (
                    <div key={i} className="mod-row" style={{
                      display: "grid", gridTemplateColumns: "200px 180px 1fr",
                      padding: "8px 12px", borderBottom: "1px solid #1a1200",
                      gap: "12px", alignItems: "center",
                    }}>
                      <div style={{ fontSize: "12px", color: "#c8b97a" }}>{m.name}</div>
                      <div style={{ fontSize: "11px", color: "#5a4a30", fontStyle: "italic" }}>{m.esp}</div>
                      <div style={{ fontSize: "11px", color: "#7a6a40" }}>{m.role}</div>
                    </div>
                  ))}
                </div>
              )}

              {tab === "existing" && (
                <div>
                  {cluster.existingPatches.length === 0 ? (
                    <div style={{ color: "#5a4a20", fontSize: "12px", fontStyle: "italic" }}>No existing patches found for this cluster.</div>
                  ) : cluster.existingPatches.map((p, i) => (
                    <div key={i} style={{
                      padding: "10px 14px", borderRadius: "4px",
                      background: "#0a1a0a", border: "1px solid #1a3a1a",
                      marginBottom: "6px",
                    }}>
                      <div style={{ fontSize: "12px", color: "#4aa84a", marginBottom: "2px" }}>✓ {p.name}</div>
                      <div style={{ fontSize: "11px", color: "#3a5a3a" }}>by {p.author} · {p.status}</div>
                      {p.note && <div style={{ fontSize: "10px", color: "#3a5a3a", marginTop: "3px" }}>{p.note}</div>}
                    </div>
                  ))}
                </div>
              )}

              {tab === "needed" && (
                <div>
                  {cluster.neededPatches.map((p, i) => (
                    <div key={i} style={{
                      padding: "10px 14px", borderRadius: "4px",
                      background: "#1a0a00", border: "1px solid #3a1a00",
                      marginBottom: "6px",
                    }}>
                      <div style={{ fontSize: "12px", color: "#e05c00" }}>⚠ {p}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Default view */}
          {!activeCluster && !sidePanel && (
            <div>
              <div style={{ fontSize: "18px", fontFamily: "'Rajdhani',sans-serif", color: "#e8c94a", marginBottom: "6px", fontWeight: 700 }}>
                F.I.T.E* v0.93 — CONFLICT INDEX
              </div>
              <div style={{ fontSize: "12px", color: "#5a4a20", marginBottom: "20px" }}>382 mods · {v093Changes.openQuestions.length} open questions · start with ❓ Open Questions or 📋 Priority Queue</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "10px" }}>
                {data.clusters.map((c) => (
                  <div key={c.id} className="cluster-btn" onClick={() => { setActiveCluster(c.id); setTab("needed"); setSidePanel(null); }}
                    style={{ padding: "14px", background: "#0f0f0a", border: `1px solid ${c.color}44`, borderRadius: "4px" }}>
                    <div style={{ fontSize: "13px", color: c.color, marginBottom: "4px" }}>{c.label}</div>
                    <div style={{ fontSize: "10px", color: "#5a4a20" }}>{c.neededPatches.length} patches needed · {c.mods.length} mods</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useReducer, useState } from 'react';
import { getInitialState, gameReducer } from './engine/reducer';
import { calculateDerivedStats, WASTELAND_TRAITS, DerivedStats, RADIATION_TABLE, SKILL_BASE_FORMULAS } from './engine/stats';
import { SkillName, SPECIAL, HexCoord, AgentType, AGENT_COLORS } from './engine/types';
import { WORLD_LANDMARKS } from './engine/content';
import { StageView } from './views/StageView';
import TerminalView from './views/TerminalView';
import { SimulationControlPanel } from './components/debug/SimulationControlPanel';
import { PERKS_LIST } from './utils/skillsEvaluator';
import { axialDistance, getTerrainAt, getScenicLocationName } from './engine/worldgen';
import { 
  Heart, Shield, Zap, Flame, User, Backpack, BarChart2, Radio, Map, Key, RefreshCw, AlertCircle, Compass, Award, Database, Trash2, Sliders, Hammer, Download
} from 'lucide-react';
import { CharacterCreationView } from './components/setup/CharacterCreationView';

const AGENT_EMOJIS: Record<AgentType, string> = {
  [AgentType.VaultDweller]: '🚶‍♂️',
  [AgentType.Raider]: '🥷',
  [AgentType.Wastelander]: '🧍‍♂️',
  [AgentType.Scavenger]: '🕵️‍♂️',
  [AgentType.Caravan]: '🐫',
  [AgentType.TownGuard]: '👮‍♂️',
  [AgentType.Critter]: '🦂',
  [AgentType.Enemy]: '💀',
  [AgentType.SuperMutant]: '👹',
  [AgentType.Nightkin]: '😈'
};

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, undefined, getInitialState);
  
  const exportHistory = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.graves, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `fallout_cemetery_chronicles_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (e) {
      console.error("Export of Run Records failed:", e);
    }
  };

  const [activeTab, setActiveTab] = useState<'STATUS' | 'SPECIAL' | 'SKILLS' | 'TRAITS' | 'INV' | 'MAP' | 'DECODE' | 'DEV' | 'DISPLAY'>('STATUS');
  const [inventorySubTab, setInventorySubTab] = useState<'WEAPONS' | 'ARMOR' | 'AID' | 'MISC'>('WEAPONS');
  const [traitsPage, setTraitsPage] = useState<number>(1);

  // --- LIFTED/SYNCHRONIZED VIEW STATES ---
  const [selectedHex, setSelectedHex] = useState<HexCoord | null>(null);
  const [activeComboEmoji, setActiveComboEmoji] = useState('🧍‍♂️');
  const [activeComboLabel, setActiveComboLabel] = useState('Idle (Ready for action cycle)');
  const [showAgentEmojis, setShowAgentEmojis] = useState(() => {
    const saved = localStorage.getItem('fite_config_showAgentEmojis');
    return saved !== null ? saved === 'true' : true;
  });
  const [resolution, setResolution] = useState<'1280x720' | '1024x768' | 'responsive'>(() => {
    return (localStorage.getItem('fite_config_resolution') as any) || '1280x720';
  });

  // --- CUSTOMIZABLE SCALES, SHADOWS, AND TEXTURES EDITOR STATES ---
  const [buildingScale, setBuildingScale] = useState<number>(() => {
    const saved = localStorage.getItem('fite_config_buildingScale');
    return saved !== null ? parseFloat(saved) : 3.0;
  });
  const [npcScale, setNpcScale] = useState<number>(() => {
    const saved = localStorage.getItem('fite_config_npcScale');
    return saved !== null ? parseFloat(saved) : 1.3;
  });
  const [playerScale, setPlayerScale] = useState<number>(() => {
    const saved = localStorage.getItem('fite_config_playerScale');
    return saved !== null ? parseFloat(saved) : 1.5;
  });
  const [shadowEnabled, setShadowEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('fite_config_shadowEnabled');
    return saved !== null ? saved === 'true' : true;
  });
  const [terrainStyles, setTerrainStyles] = useState<Record<string, { fill: string; stroke: string; label: string; emoji: string }>>(() => {
    const saved = localStorage.getItem('fite_config_terrainStyles');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback to default
      }
    }
    return {
      Desert: { fill: '#1f160e', stroke: '#8c642d', label: 'Desert', emoji: '' },
      Swamp: { fill: '#0a0d0a', stroke: '#2d3f2a', label: 'Swamp', emoji: '' },
      Mountain: { fill: '#14151a', stroke: '#353a45', label: 'Mountain', emoji: '' },
      Ruins: { fill: '#161616', stroke: '#3d3a36', label: 'Ruins', emoji: '' },
      Canyon: { fill: '#221310', stroke: '#502a24', label: 'Canyon', emoji: '' },
      Wasteland: { fill: '#141414', stroke: '#33312e', label: 'Wasteland', emoji: '☠️' }
    };
  });

  // Persist configurations dynamically
  React.useEffect(() => {
    localStorage.setItem('fite_config_showAgentEmojis', String(showAgentEmojis));
  }, [showAgentEmojis]);

  React.useEffect(() => {
    localStorage.setItem('fite_config_resolution', resolution);
  }, [resolution]);

  React.useEffect(() => {
    localStorage.setItem('fite_config_buildingScale', String(buildingScale));
  }, [buildingScale]);

  React.useEffect(() => {
    localStorage.setItem('fite_config_npcScale', String(npcScale));
  }, [npcScale]);

  React.useEffect(() => {
    localStorage.setItem('fite_config_playerScale', String(playerScale));
  }, [playerScale]);

  React.useEffect(() => {
    localStorage.setItem('fite_config_shadowEnabled', String(shadowEnabled));
  }, [shadowEnabled]);

  React.useEffect(() => {
    localStorage.setItem('fite_config_terrainStyles', JSON.stringify(terrainStyles));
  }, [terrainStyles]);

  const handleActiveComboChange = (emoji: string, label: string) => {
    setActiveComboEmoji(emoji);
    setActiveComboLabel(label);
  };

  // Character creation setup states and handlers have been successfully decoupled and moved 
  // into the /src/components/setup/CharacterCreationView.tsx component!

  // Real-time calculated statistics
  const currentDerived = calculateDerivedStats(
    state.player.special,
    state.player.level,
    state.player.traits
  );

  return (
    <div className="min-h-screen bg-black text-[#e2b05c] flex flex-col justify-between font-mono" id="app_root">
      {/* HUD HEADER TITLE BAR */}
      <header className="border-b border-[#3c2a11] bg-[#0c0d10] px-6 py-3 flex justify-between items-center z-10 select-none shadow">
        <div className="flex items-center gap-2">
          <span className="text-xl animate-pulse">☢️</span>
          <span className="text-[17px] font-bold tracking-wider text-amber-500 uppercase">FITE</span>
        </div>
        <div className="flex items-center gap-4 text-[10.5px] text-zinc-500">
          <span>RUN: <strong className="text-amber-500 font-bold">#{state.run.number}</strong></span>
          <span>SEED: <strong className="text-[#e2b05c] font-normal">{state.run.seed}</strong></span>
          <span>CHRONICLE: <strong className="text-green-500">PnP 4.0 STABLE</strong></span>
          <span>YEAR: <strong className="text-amber-500 font-bold">{state.world?.year || 2161}</strong></span>
        </div>
      </header>

      {/* ========================================================
          PHASE A: CHARACTER SETUP LAYOUT (Day Zero Setup)
          ======================================================== */}
      {state.phase === 'setup' && (
        <CharacterCreationView 
          onLaunchCharacter={(charData) => {
            dispatch({
              type: 'CREATE_CHARACTER',
              payload: {
                name: charData.name,
                originId: charData.originId,
                special: charData.special,
                traits: charData.traits,
                tagged: charData.tagged
              }
            });
          }}
        />
      )}

      {/* ========================================================
          PHASE B: ACTIVE SURVIVOR VIEW (80% world renderers)
          ======================================================== */}
      {state.phase === 'playing' && (
        <main 
          className="flex-1 p-4 md:p-6 z-10 overflow-y-auto flex flex-col gap-4 border border-zinc-900/40 rounded-lg shadow-2xl bg-[#030406]"
          style={
            resolution === '1280x720' ? { width: '1280px', height: '720px', maxWidth: '100%', maxHeight: '100%', margin: 'auto' } :
            resolution === '1024x768' ? { width: '1024px', height: '768px', maxWidth: '100%', maxHeight: '100%', margin: 'auto' } :
            { width: '100%', maxWidth: '72rem', marginLeft: 'auto', marginRight: 'auto' }
          }
          id="playing_view_stage_wrapper"
        >
          {/* ENLARGED FULL-WIDTH RENDER WINDOW VIEWPORT */}
          <section className="grid grid-cols-1 gap-4">
            <div className="w-full">
              <StageView 
                player={state.player}
                inventory={state.inventory}
                world={state.world}
                encounter={state.encounter}
                travel={state.travel}
                simulation={state.simulation}
                flags={state.flags}
                graves={state.graves}
                log={state.log}
                phase={state.phase}
                dispatch={dispatch} 
                selectedHex={selectedHex}
                setSelectedHex={setSelectedHex}
                showAgentEmojis={showAgentEmojis}
                onActiveComboChange={handleActiveComboChange}
                buildingScale={buildingScale}
                npcScale={npcScale}
                playerScale={playerScale}
                shadowEnabled={shadowEnabled}
                terrainStyles={terrainStyles}
              />
            </div>
          </section>

          {/* ========================================================
              ACTION BAR TABS (17% screen block)
              ======================================================== */}
          <section className="bg-[#050608] border border-amber-950/35 rounded flex flex-col p-3 shadow-lg min-h-[160px]" id="pipboy_bottom_panel">
            {/* Nav button strip */}
            <div className="flex flex-wrap gap-1 border-b border-amber-950/20 pb-2 mb-2 shrink-0" id="action_tab_strip">
              {(['STATUS', 'SPECIAL', 'SKILLS', 'TRAITS', 'INV', 'MAP', 'DECODE', 'DEV', 'DISPLAY'] as const).map(tab => {
                const active = activeTab === tab;
                const tabIcons: Record<string, React.ReactNode> = {
                  STATUS: <Heart size={11} />,
                  SPECIAL: <BarChart2 size={11} />,
                  SKILLS: <Sliders size={11} />,
                  TRAITS: <Award size={11} />,
                  INV: <Backpack size={11} />,
                  MAP: <Map size={11} />,
                  DECODE: <Compass size={11} />,
                  DEV: <Database size={11} />,
                  DISPLAY: <Sliders size={11} />
                };

                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex items-center gap-1.5 px-3 py-1 border text-[10px] font-bold tracking-wider uppercase rounded transition-all ${
                      active
                        ? 'border-amber-600 text-amber-500 bg-[#12151e]'
                        : 'border-neutral-900 text-zinc-500 bg-black hover:text-zinc-300'
                    }`}
                  >
                    {tabIcons[tab] || <Sliders size={11} />}
                    {tab}
                  </button>
                );
              })}
            </div>

            {/* TAB CONTENTS PANELS CONTAINER */}
            <div className="flex-1 overflow-y-auto text-[11px] leading-relaxed text-zinc-300" id="tab_contents_container">
              
              {/* STATUS TAB */}
              {activeTab === 'STATUS' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="tab_status_panel">
                  <div>
                    <h3 className="text-[11px] font-bold text-amber-500 uppercase border-b border-amber-950/20 pb-1 mb-2">Biological Status</h3>
                    <div className="space-y-2.5">
                      <div className="flex justify-between border-b border-zinc-900 pb-1">
                        <span className="text-zinc-450 font-bold">Health points (HP):</span>
                        <span className="font-black text-white text-[12px] font-mono">{state.player.hp.current} / {state.player.hp.max}</span>
                      </div>
                      <div className="flex justify-between border-b border-zinc-900 pb-1">
                        <span className="text-zinc-450 font-bold">Radiation burden (Rads):</span>
                        <span className="font-black text-yellow-400 text-[12px] font-mono">{state.player.rad} / 1000</span>
                      </div>
                      <div className="flex justify-between border-b border-zinc-900 pb-1">
                        <span className="text-zinc-450 font-bold">Nourishment (Hunger):</span>
                        <span className="font-black text-emerald-400 text-[12px] font-mono">{state.player.hunger} / 10</span>
                      </div>
                      <div className="flex justify-between border-b border-zinc-900 pb-1">
                        <span className="text-zinc-450 font-bold">Hydration (Thirst):</span>
                        <span className="font-black text-sky-400 text-[12px] font-mono">{state.player.thirst} / 10</span>
                      </div>
                      <div className="flex justify-between border-b border-zinc-900 pb-1">
                        <span className="text-zinc-450 font-bold">Sleepiness (Fatigue):</span>
                        <span className="font-black text-fuchsia-400 text-[12px] font-mono">{state.player.fatigue} / 10</span>
                      </div>
                    </div>

                    {/* Integrated physical loop / idle tracker as requested */}
                    <div className="mt-4 p-2 bg-amber-950/10 border border-amber-900/15 rounded flex items-center gap-3">
                      <span className="text-2xl animate-bounce" id="phys_idle_icon">{activeComboEmoji}</span>
                      <div className="flex flex-col">
                        <span className="text-[9px] uppercase tracking-wider text-amber-500/80 font-bold">Physical Loop Output</span>
                        <span className="text-[10.5px] text-zinc-400 italic leading-tight" id="phys_idle_label">{activeComboLabel}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-[12px] font-bold text-amber-500 uppercase border-b border-amber-900/10 pb-1 mb-2">Internal Sickness / Rad Threshold</h3>
                    <div className="space-y-1.5 text-[10.5px]">
                      {(() => {
                        const rState = state.player.rad;
                        if (rState < 50) return <p className="text-green-500">✓ No radiation mutagens active.</p>;
                        if (rState < 100) return <p className="text-yellow-400">⚠️ Abnormally Tired [Endurance (EN) -1].</p>;
                        if (rState < 400) return <p className="text-orange-400">⚠️ Weak, Achy, Rash [EN -2].</p>;
                        if (rState < 600) return <p className="text-red-400/80">⚠️ Muscle/Joint pain, Hair loss [ST -1, EN -2, AG -1]. maxHP -10%.</p>;
                        return <p className="text-red-500 font-bold uppercase animate-pulse">☢️ Extreme glowing rot [ST -5, EN -5, CH -3, AG -4]. maxHP -30%!</p>;
                      })()}
                      
                      <div className="mt-3 text-[10px] text-zinc-500 leading-normal">
                        Rad exposures are progressive, reducing raw S.P.E.C.I.A.L scores linearly. Purify your body using Rad-Away.
                      </div>
                    </div>
                  </div>

                  {/* Operational Camp Button */}
                  <div className="flex flex-col justify-between border-l border-neutral-800 md:pl-5">
                    <div>
                      <h3 className="text-[12px] font-bold text-amber-500 uppercase border-b border-amber-900/10 pb-1 mb-1.5">Camp Ground Actions</h3>
                      <p className="text-[10px] text-[#e2b05c]/70 leading-relaxed mb-3">
                        Setting camp cooks calories but recovers Action Points fully and heals +12 HP. Costs 2 Hunger and 3 Thirst.
                      </p>
                    </div>
                    <button
                      onClick={() => dispatch({ type: 'REST_CAMP' })}
                      className="w-full py-2 bg-amber-950/20 hover:bg-amber-900/30 border border-amber-600/60 text-amber-400 rounded text-[11px] font-bold uppercase tracking-wider"
                    >
                      Establish Camp Ground & Sleep (6 hrs) ⛺
                    </button>
                  </div>
                </div>
              )}

              {/* SPECIAL SYSTEM DETAILS TAB (Includes Level Up customization) */}
              {activeTab === 'SPECIAL' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="tab_special_panel">
                  {/* Left: SPECIAL Stats */}
                  <div>
                    <h3 className="text-[12px] font-bold text-amber-500 uppercase border-b border-amber-900/10 pb-1 mb-2">S.P.E.C.I.A.L Matrix</h3>
                    <div className="grid grid-cols-2 gap-3 text-[11px]">
                      <div className="space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Strength (ST):</span>
                          <span className="font-bold text-white">{state.player.special.ST}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Perception (PE):</span>
                          <span className="font-bold text-white">{state.player.special.PE}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Endurance (EN):</span>
                          <span className="font-bold text-white">{state.player.special.EN}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Charisma (CH):</span>
                          <span className="font-bold text-white">{state.player.special.CH}</span>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Intelligence (IN):</span>
                          <span className="font-bold text-white">{state.player.special.IN}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Agility (AG):</span>
                          <span className="font-bold text-white">{state.player.special.AG}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Luck (LK):</span>
                          <span className="font-bold text-white">{state.player.special.LK}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Derived Math readout with direct equations */}
                  <div className="border-l border-neutral-800 md:pl-5 text-[10.5px]">
                    <h3 className="text-[12px] font-bold text-amber-500 uppercase border-b border-amber-900/10 pb-1 mb-1.5">Derived secondary stats</h3>
                    <div className="grid grid-cols-2 gap-y-1 gap-x-3 text-zinc-400 py-1">
                      <div>Carry Limit: <strong className="text-zinc-200">{currentDerived.carryWeight} lbs</strong></div>
                      <div>Base AC Class: <strong className="text-zinc-200">+{currentDerived.armorClass}</strong></div>
                      <div>Poison Resist: <strong className="text-zinc-200">{currentDerived.poisonResistance}%</strong></div>
                      <div>Rad Resist: <strong className="text-zinc-200">{currentDerived.radiationResistance}%</strong></div>
                      <div>Melee Damage Bonus: <strong className="text-zinc-200">+{currentDerived.meleeDamage} AP</strong></div>
                      <div>Sequence Speed: <strong className="text-zinc-200">{currentDerived.sequence} Index</strong></div>
                    </div>

                    {/* Spend level-up points */}
                    {state.player.skillPoints > 0 ? (
                      <div className="mt-2.5 bg-green-950/15 border border-green-500/30 p-2.5 rounded">
                        <p className="text-green-400 font-bold text-[11px] uppercase mb-1">🎁 LEVEL UP: CUSTOMIZE COURIER SKILLS</p>
                        <p className="text-[9.5px] text-zinc-400 mb-2 leading-tight">
                          You have <span className="font-bold text-white">{state.player.skillPoints} SP</span> to customize. Tapping SP allocation raises skill baseline % (Untagged: 1SP = +1%, Tagged: 1SP = +2%). No logic leaks.
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {Object.keys(state.player.skills).slice(0, 7).map(skillName => (
                            <button
                              id={`sp_add_${skillName}`}
                              key={skillName}
                              onClick={() => {
                                // Direct inline mutate dispatch simulation
                                state.player.skills[skillName as SkillName] += state.player.taggedSkills.includes(skillName as SkillName) ? 2 : 1;
                                state.player.skillPoints -= 1;
                                dispatch({ type: 'SKILLDEX_TOGGLE', payload: false }); // tick state machine rerender
                              }}
                              className="px-2 py-0.5 text-[9px] border border-green-500/40 text-green-300 rounded bg-green-950/20 hover:bg-green-900/40"
                            >
                              + {skillName} (%{state.player.skills[skillName as SkillName]})
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 text-[10px] text-neutral-500 uppercase">
                        ✓ Courier level points fully allotted. Next level at {state.player.level === 1 ? '1,000 XP' : state.player.level === 2 ? '3,000 XP' : '6,000 XP'}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SKILLS & ACTION BOARD COMPANION PANEL (CONSTITUTION MANDATE) */}
              {activeTab === 'SKILLS' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="tab_skills_panel">
                  {/* Left Column: Action Bar controls */}
                  <div className="border-r border-amber-900/10 pr-4 flex flex-col gap-3">
                    <div>
                      <h3 className="text-[12px] font-bold text-amber-500 uppercase border-b border-amber-900/15 pb-1 mb-1.5 flex items-center gap-1.5">
                        🕹️ COURIER ACTION BOARD
                      </h3>
                      <p className="text-[10px] text-zinc-400 leading-normal">
                        Select one of your primitive physical abilities or active actions below.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {/* ATTACK ACTION */}
                      {(() => {
                        const hostileNpc = state.world.nearbyEntities.find(e => e.behavior === 'hostile' && !e.isDead);
                        return (
                          <button
                            id="act_attack_btn"
                            disabled={!hostileNpc}
                            onClick={() => hostileNpc && dispatch({ type: 'ATTACK_ENTITY', payload: { targetId: hostileNpc.id } })}
                            className={`p-2.5 border rounded flex flex-col items-center justify-center text-center transition-all ${
                              hostileNpc 
                                ? 'border-red-500/50 hover:bg-red-950/20 text-red-400 bg-red-950/10 cursor-pointer shadow-md'
                                : 'border-neutral-900 text-neutral-700 bg-black cursor-not-allowed select-none opacity-45'
                            }`}
                          >
                            <span className="text-[12px] font-bold">🎯 ATTACK</span>
                            <span className="text-[8.5px] font-mono mt-0.5">
                              {hostileNpc ? `AP: 3 [Hostile Present]` : 'No Active Enemy'}
                            </span>
                          </button>
                        );
                      })()}

                      {/* TRAVEL / MOVE ACTION */}
                      <button
                        id="act_move_btn"
                        onClick={() => setActiveTab('MAP')}
                        className="p-2.5 border border-amber-700/40 bg-amber-950/20 hover:bg-amber-900/30 text-amber-400 hover:text-amber-200 transition-all rounded flex flex-col items-center justify-center text-center cursor-pointer shadow-md"
                      >
                        <span className="text-[12px] font-bold">🚶 TRAVEL / MAP</span>
                        <span className="text-[8.5px] font-mono mt-0.5">Plot Expedition</span>
                      </button>

                      {/* LOOT ACTION */}
                      {(() => {
                        const interactableCargo = state.world.focusedObject && !state.world.focusedObject.interacted;
                        const mainSkill = (interactableCargo && state.world.focusedObject) ? (state.world.focusedObject.skillsApplicable?.[0] || 'Survival') : 'Survival';
                        return (
                          <button
                            id="act_loot_btn"
                            disabled={!interactableCargo}
                            onClick={() => {
                              if (interactableCargo && state.world.focusedObject) {
                                dispatch({
                                  type: 'TRIGGER_SKILL_CHECK',
                                  payload: { skill: mainSkill, objectId: state.world.focusedObject.id }
                                });
                              }
                            }}
                            className={`p-2.5 border rounded flex flex-col items-center justify-center text-center transition-all ${
                              interactableCargo 
                                ? 'border-green-500/50 hover:bg-green-950/20 text-green-400 bg-green-950/10 cursor-pointer shadow-md'
                                : 'border-neutral-900 text-neutral-700 bg-black cursor-not-allowed select-none opacity-40'
                            }`}
                          >
                            <span className="text-[12px] font-bold">📦 LOOT CARGO</span>
                            <span className="text-[8.5px] font-mono mt-0.5">
                              {interactableCargo ? `Use ${mainSkill}` : 'No Cargo Focused'}
                            </span>
                          </button>
                        );
                      })()}

                      {/* TALK / COMMUNICATE ACTION */}
                      {(() => {
                        const encounterActive = state.encounter.active;
                        return (
                          <button
                            id="act_talk_btn"
                            disabled={!encounterActive}
                            onClick={() => {
                              setActiveTab('STATUS');
                            }}
                            className={`p-2.5 border rounded flex flex-col items-center justify-center text-center transition-all ${
                              encounterActive 
                                ? 'border-indigo-500/50 hover:bg-indigo-950/20 text-indigo-400 bg-indigo-950/10 cursor-pointer shadow-md'
                                : 'border-neutral-900 text-neutral-700 bg-black cursor-not-allowed select-none opacity-40'
                            }`}
                          >
                            <span className="text-[12px] font-bold">🗣️ ENGAGE DIALOGUE</span>
                            <span className="text-[8.5px] font-mono mt-0.5">
                              {encounterActive ? 'Speak with Entity' : 'No Entity Near'}
                            </span>
                          </button>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Right Column: Skills values & Spend points */}
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center border-b border-amber-900/15 pb-1 mb-1">
                      <h4 className="text-[12px] font-bold text-amber-400 uppercase tracking-wide">
                        🎓 SKILLS BASES
                      </h4>
                      {state.player.skillPoints > 0 && (
                        <span className="bg-green-500/20 text-green-400 px-1.5 py-0.2 rounded text-[9px] font-bold animate-pulse font-mono">
                          {state.player.skillPoints} POINTS REMAINING
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                      {Object.entries(state.player.skills).map(([skName, skVal]) => {
                        const isTagged = state.player.taggedSkills.includes(skName as SkillName);
                        return (
                          <div 
                            key={skName} 
                            className="bg-[#0b0e14] border border-neutral-850/60 p-2 rounded flex justify-between items-center text-[10px]"
                          >
                            <div className="flex flex-col">
                              <span className="font-bold text-zinc-100 flex items-center gap-1">
                                {skName} {isTagged && <span className="text-[8px] text-amber-500 uppercase font-mono">[TAG]</span>}
                              </span>
                              <span className="text-[9px] text-zinc-500 font-mono">Value: {skVal}%</span>
                            </div>

                            {state.player.skillPoints > 0 && (
                              <button
                                onClick={() => {
                                  state.player.skills[skName as SkillName] += isTagged ? 2 : 1;
                                  state.player.skillPoints -= 1;
                                  dispatch({ type: 'SKILLDEX_TOGGLE', payload: false });
                                }}
                                className="px-1.5 py-0.5 text-[8.5px] border border-green-500/50 bg-green-950/10 hover:bg-green-900/40 text-green-400 rounded font-bold font-mono"
                              >
                                + Raise
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    <p className="text-[8.5px] text-zinc-500 leading-normal mt-1 uppercase">
                      * Tagged skills grow at double output relative to raw allocations.
                    </p>
                  </div>
                </div>
              )}

              {/* TRAITS PANEL */}
              {activeTab === 'TRAITS' && (
                <div className="space-y-4" id="tab_perks_panel">
                  {/* Title and arrow-based page cycler */}
                  <div className="flex items-center justify-between border-b border-amber-900/30 pb-2 mb-3">
                    <button 
                      type="button"
                      onClick={() => setTraitsPage(prev => prev === 1 ? 4 : prev - 1)}
                      className="px-2.5 py-1 border border-amber-800/40 bg-black/60 hover:bg-amber-900/20 text-amber-500 font-extrabold text-[12px] rounded cursor-pointer transition font-mono active:scale-95"
                    >
                      ◀ PREV
                    </button>
                    <span className="text-[13px] font-black text-amber-400 uppercase tracking-widest font-mono">
                      Traits & Special Perks (Page {traitsPage} / 4)
                    </span>
                    <button 
                      type="button"
                      onClick={() => setTraitsPage(prev => prev === 4 ? 1 : prev + 1)}
                      className="px-2.5 py-1 border border-amber-800/40 bg-black/60 hover:bg-amber-900/20 text-amber-500 font-extrabold text-[12px] rounded cursor-pointer transition font-mono active:scale-95"
                    >
                      NEXT ▶
                    </button>
                  </div>

                  {traitsPage === 1 && (
                    <div className="space-y-3">
                      <div className="text-[10px] text-zinc-500 uppercase font-black tracking-wider mb-1">
                        Active Survivor Attributes & Lifeline:
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                        <div className="bg-[#0b0e14] border border-[#ffb13b]/20 p-3 rounded">
                          <span className="text-amber-500 font-black text-[12px] block mb-1 uppercase tracking-wide">
                            Background origin: {state.player.origin}
                          </span>
                          <p className="text-[10.5px] text-zinc-300 font-bold leading-normal">
                            Spawned coordinates adjusted based on initial survival region bounds. Standard starting item sets equipped.
                          </p>
                        </div>

                        {state.player.traits.map(tId => {
                          const details = WASTELAND_TRAITS.find(w => w.id === tId);
                          return (
                            <div key={tId} className="bg-[#0b0e14] border border-green-500/20 p-3 rounded">
                              <span className="text-green-400 font-black text-[12px] block mb-1 uppercase tracking-wide">
                                Active Trait: {details ? details.name : tId}
                              </span>
                              <p className="text-[10.5px] text-zinc-200 font-bold leading-normal">
                                {details ? details.description : 'A peculiar characteristic.'}
                              </p>
                            </div>
                          );
                        })}

                        {state.player.traits.length === 0 && (
                          <div className="sm:col-span-2 bg-[#0b0e14] border border-neutral-900/40 p-4 rounded text-center">
                            <p className="text-neutral-400 font-extrabold text-[11px] italic">
                              No Specialized Wasteland Traits Equipped. Pure baseline survivor.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {traitsPage === 2 && (
                    <div className="space-y-3">
                      <div className="text-[10px] text-zinc-500 uppercase font-black tracking-wider mb-1">
                        SYSTEM WASTELAND CODEX (TRAITS 1 - 4):
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                        {WASTELAND_TRAITS.slice(0, 4).map(trait => {
                          const active = state.player.traits.includes(trait.id);
                          return (
                            <div key={trait.id} className={`p-3 rounded border ${active ? 'border-green-500/30 bg-[#08120a]' : 'border-neutral-850/60 bg-[#0b0e14]'}`}>
                              <span className={`block font-black text-[11.5px] mb-1 uppercase ${active ? 'text-green-400' : 'text-amber-500/90'}`}>
                                {trait.name} {active && '★ (EQUIPPED)'}
                              </span>
                              <p className="text-[10.5px] text-zinc-300 font-bold leading-relaxed">
                                {trait.description}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {traitsPage === 3 && (
                    <div className="space-y-3">
                      <div className="text-[10px] text-zinc-500 uppercase font-black tracking-wider mb-1">
                        SYSTEM WASTELAND CODEX (TRAITS 5 - 8):
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                        {WASTELAND_TRAITS.slice(4).map(trait => {
                          const active = state.player.traits.includes(trait.id);
                          return (
                            <div key={trait.id} className={`p-3 rounded border ${active ? 'border-green-500/30 bg-[#08120a]' : 'border-neutral-850/60 bg-[#0b0e14]'}`}>
                              <span className={`block font-black text-[11.5px] mb-1 uppercase ${active ? 'text-green-400' : 'text-amber-500/90'}`}>
                                {trait.name} {active && '★ (EQUIPPED)'}
                              </span>
                              <p className="text-[10.5px] text-zinc-300 font-bold leading-relaxed">
                                {trait.description}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {traitsPage === 4 && (
                    <div className="space-y-3">
                      <div className="text-[10px] text-zinc-500 uppercase font-black tracking-wider mb-1">
                        🏆 WASTELAND SPECIALIST PERKS DECK:
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                        {PERKS_LIST.map(perk => {
                          const active = state.player.perks.includes(perk.id);
                          return (
                            <div key={perk.id} className={`p-3 rounded border flex flex-col justify-between ${active ? 'border-amber-600 bg-amber-950/20' : 'border-neutral-850/60 bg-[#0b0e14]/50'}`}>
                              <div>
                                <span className={`block font-black text-[11px] uppercase ${active ? 'text-amber-500' : 'text-zinc-400'}`}>
                                  {perk.name} {active && '★ (ACTIVE)'}
                                </span>
                                <p className="text-[10px] text-zinc-400 font-medium leading-relaxed mt-1">
                                  {perk.description}
                                </p>
                              </div>
                              <div className="mt-3">
                                {active ? (
                                  <span className="text-emerald-500 text-[10px] font-bold block">✓ Perk Unlocked & Active</span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => dispatch({ type: 'UNLOCK_PERK', payload: perk.id })}
                                    className="w-full py-1 bg-amber-950/60 border border-amber-800 text-amber-400 font-extrabold text-[10px] uppercase rounded hover:bg-amber-900 cursor-pointer text-center"
                                  >
                                    ⭐ Purchase Perk
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* INVENTORY PRESSURES TAB */}
              {activeTab === 'INV' && (
                <div className="flex flex-col gap-3" id="tab_inventory_panel">
                  {/* Caps and Carrying Weights */}
                  <div className="flex justify-between items-center bg-[#0e1219] border border-amber-950/30 px-3 py-1.5 rounded select-none text-[10.5px]">
                    <div className="flex items-center gap-1.5">
                      <span className="text-amber-500 font-bold">CARAVAN COINS:</span>
                      <span className="text-yellow-400 font-bold">{state.inventory.caps} CAPS 🪙</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-neutral-400">INVENTORY WEIGHT:</span>
                      <span className="text-zinc-200">
                        {state.inventory.items.reduce((acc, it) => acc + it.weight, 0).toFixed(1)} / {currentDerived.carryWeight} lbs
                      </span>
                    </div>
                  </div>

                  {/* Filter tabs */}
                  <div className="flex gap-2">
                    {(['WEAPONS', 'ARMOR', 'AID', 'MISC'] as const).map(sub => {
                      const active = inventorySubTab === sub;
                      return (
                        <button
                          key={sub}
                          onClick={() => setInventorySubTab(sub)}
                          className={`px-3 py-1 text-[10px] font-bold rounded transition-colors ${
                            active
                              ? 'bg-amber-950/20 text-amber-500 border border-amber-800/40'
                              : 'bg-black text-neutral-500 hover:text-neutral-400'
                          }`}
                        >
                          {sub}
                        </button>
                      );
                    })}
                  </div>

                  {/* Items list viewport */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    {state.inventory.items
                      .filter(item => {
                        if (inventorySubTab === 'WEAPONS') return item.type === 'Weapon';
                        if (inventorySubTab === 'ARMOR') return item.type === 'Armor';
                        if (inventorySubTab === 'AID') return item.type === 'Aid';
                        return item.type === 'Misc';
                      })
                      .map((item) => {
                        const isEquipped = state.inventory.equippedWeapon === item.id || state.inventory.equippedArmor === item.id;
                        const isRangedWeapon = item.type === 'Weapon' && (item as any).maxAmmo !== undefined;
                        const condition = item.conditionMarks !== undefined ? item.conditionMarks : 0;
                        const conditionColor = condition === 0 ? 'text-green-500' : condition < 5 ? 'text-[#f5a623]' : 'text-red-500';
                        const conditionLabel = condition === 0 ? 'Pristine' : condition === 10 ? 'Broken' : `${10 - condition}/10 CND`;

                        return (
                          <div
                            key={item.id}
                            className={`p-2.5 rounded border flex justify-between items-center ${
                              isEquipped 
                                ? 'border-green-500/40 bg-green-950/10' 
                                : 'border-neutral-900 bg-[#06080b]'
                            }`}
                          >
                            <div className="flex items-start gap-2.5">
                              <span className="text-2xl pt-1 select-none">{item.emoji}</span>
                              <div>
                                <h4 className={`font-bold ${isEquipped ? 'text-green-300' : 'text-amber-500'}`}>
                                  {item.name} {isEquipped && '[EQUIPPED]'}
                                </h4>
                                <p className="text-[10px] text-zinc-400 leading-normal">{item.description}</p>
                                <p className="text-[9px] text-[#e2b05c]/60 mt-0.5">
                                  Weight: {item.weight} lbs · Value: {item.cost} caps
                                  {isRangedWeapon && ` · Mag: ${(item as any).currentAmmo}/${(item as any).maxAmmo}`}
                                  {(item.type === 'Weapon' || item.type === 'Armor') && (
                                    <> · Condition: <span className={conditionColor}>{conditionLabel}</span></>
                                  )}
                                </p>
                              </div>
                            </div>

                            {/* Equippers / Consumables */}
                            <div className="shrink-0 flex flex-col gap-1">
                              {item.type === 'Aid' ? (
                                <button
                                  id={`use_aid_${item.id}`}
                                  onClick={() => dispatch({ type: 'USE_ITEM', payload: item.id })}
                                  className="px-2.5 py-1 text-[9px] font-bold border border-emerald-500/50 hover:bg-emerald-950/20 text-emerald-400 rounded"
                                >
                                  USE
                                </button>
                              ) : (item.type === 'Weapon' || item.type === 'Armor') ? (
                                <div className="flex flex-col gap-1 items-stretch">
                                  <button
                                    id={`equip_tag_${item.id}`}
                                    onClick={() => dispatch({ type: 'EQUIP_ITEM', payload: item.id })}
                                    className={`px-2.5 py-1 text-[9px] font-bold border rounded ${
                                      isEquipped
                                        ? 'border-red-500/40 text-red-400 hover:bg-red-950/20'
                                        : 'border-green-500/40 text-green-400 hover:bg-green-950/20'
                                    }`}
                                  >
                                    {isEquipped ? 'UNEQUIP' : 'EQUIP'}
                                  </button>
                                  {condition > 0 && (
                                    <button
                                      id={`repair_tag_${item.id}`}
                                      onClick={() => dispatch({ type: 'REPAIR_ITEM', payload: { itemId: item.id } })}
                                      className="px-2 py-0.5 text-[8px] font-bold border border-[#f5a623]/65 hover:bg-orange-950/20 text-[#f5a623] rounded flex items-center justify-center gap-0.5 mt-0.5"
                                      title="Consume scrap to repair condition"
                                    >
                                      <span>REPAIR</span> 🔧
                                    </button>
                                  )}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}

                    {state.inventory.items.filter(item => {
                      if (inventorySubTab === 'WEAPONS') return item.type === 'Weapon';
                      if (inventorySubTab === 'ARMOR') return item.type === 'Armor';
                      if (inventorySubTab === 'AID') return item.type === 'Aid';
                      return item.type === 'Misc';
                    }).length === 0 && (
                      <p className="text-neutral-600 text-[10px] italic py-2 px-1 col-span-2">This inventory section is empty.</p>
                    )}
                  </div>
                </div>
              )}

              {/* DATA LOGS AND FACTIONS STANDINGS */}
              {activeTab === 'DATA' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="tab_data_panel">
                  {/* Left: Reputations */}
                  <div>
                    <h3 className="text-[12px] font-bold text-amber-500 uppercase border-b border-amber-900/10 pb-1 mb-2">Faction Reputation Metrics</h3>
                    <div className="space-y-2 text-[10.5px]">
                      <div className="flex justify-between">
                        <span className="text-zinc-400">New California Republic (NCR):</span>
                        <span className="text-green-400 font-bold">UNLIKELY ENEMY (Neutral)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Steel-Spiked Raiders:</span>
                        <span className="text-red-400 font-bold">KILLED ON SIGHT (Schism)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Brotherhood of Steel:</span>
                        <span className="text-yellow-500">APPREHENSIVE (Neutral)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Glowing Ghoul Sewers:</span>
                        <span className="text-orange-500">HOSTILE SHADOWS</span>
                      </div>
                    </div>
                  </div>

                  {/* World achievements logs */}
                  <div className="border-l border-neutral-800 md:pl-5">
                    <h3 className="text-[12px] font-bold text-amber-500 uppercase border-b border-amber-900/10 pb-1 mb-1.5 flex justify-between items-center flex-wrap gap-1.5">
                      <span>Cemetery Chronicle Graveyard ({state.graves.length})</span>
                      <div className="flex items-center gap-1.5">
                        {state.graves.length > 0 && (
                          <>
                            <button
                              onClick={exportHistory}
                              className="flex items-center gap-1 text-[8.5px] border border-amber-500/50 text-amber-400 hover:bg-neutral-900 px-1.5 py-0.5 rounded leading-none"
                            >
                              <Download size={9} /> EXPORT LEGACIES
                            </button>
                            <button
                              onClick={() => dispatch({ type: 'CLEAR_WORLD_HISTORY' })}
                              className="flex items-center gap-1 text-[8.5px] border border-red-500/50 text-red-400 hover:bg-neutral-900 px-1.5 py-0.5 rounded leading-none"
                            >
                              <Trash2 size={9} /> CLEAR LEGACIES
                            </button>
                          </>
                        )}
                      </div>
                    </h3>
                    <div className="space-y-1.5 max-h-[110px] overflow-y-auto pr-1 text-[10.5px]">
                      {state.graves.map((grave, i) => (
                        <div key={i} className="border-b border-neutral-900 pb-1">
                          <p className="font-bold text-red-400 leading-normal">
                            🪦 Run #{grave.runNumber}: {grave.playerName}
                          </p>
                          <p className="text-[9.5px] text-zinc-400">
                            " {grave.causeOfDeath} "
                          </p>
                          <p className="text-[9px] text-zinc-500">
                             Fell sector [q: {grave.coords.q}, r: {grave.coords.r}] on Day {grave.day}
                          </p>
                        </div>
                      ))}

                      {state.graves.length === 0 && (
                        <p className="text-[#e2b05c]/50 text-[10px] italic">
                          No historical gravestones found in the wasteland cemetery yet. Your future direct failures will generate grave monuments at your coordinates!
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* MAP TAB (REGIONAL EXPEDITIONS) */}
              {activeTab === 'MAP' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="tab_map_panel">
                  <div className="flex flex-col gap-2 p-2 border border-amber-950/25 bg-[#040508] rounded">
                    <p className="text-[10.5px] text-zinc-400 leading-normal">
                      Select landmark destinations below for instant, free fast-travel, or select any sector grid cell coordinates directly in the Tactical Map HUD.
                    </p>

                    {/* Sector selection Travel Trigger */}
                    {selectedHex ? (
                      <div className="border border-blue-900 bg-blue-950/10 p-1.5 rounded flex items-center justify-between gap-1 mt-0.5">
                        <div className="text-[10px] font-mono text-zinc-300">
                          <span className="text-[7.5px] text-blue-400 uppercase tracking-wider block font-bold leading-none">Target Coordinate Focus</span>
                          <span>Sector Position: <strong className="text-white">[{selectedHex.q}, {selectedHex.r}]</strong></span>
                        </div>
                        <button
                          type="button"
                          onClick={() => dispatch({ type: 'FAST_TRAVEL_TO', payload: selectedHex })}
                          className="px-2.5 py-1 text-[8.5px] font-mono border border-blue-500 bg-blue-900/60 hover:bg-blue-800 text-blue-100 rounded uppercase font-bold tracking-wide cursor-pointer transition animate-pulse"
                        >
                          🚀 Fast Travel
                        </button>
                      </div>
                    ) : (
                      <p className="text-[9px] text-[#e2b05c]/55 italic bg-amber-950/5 p-1.5 border border-dashed border-amber-950/20 rounded">
                        💡 Select any hex on the above render map to instantly fast travel there.
                      </p>
                    )}

                    {/* Landmark Hub Destination Matrix (Fast-travel list) */}
                    <div className="mt-1">
                      <span className="block text-[8px] text-[#e2b05c]/60 uppercase tracking-widest font-bold mb-1 font-mono">Topography Landmarks (Instant Free Fast-travel):</span>
                      <div className="grid grid-cols-2 gap-1 max-h-[140px] overflow-y-auto pr-1">
                        {WORLD_LANDMARKS.map(landmark => {
                          const isCurrent = state.player.coords.q === landmark.coords.q && state.player.coords.r === landmark.coords.r;
                          return (
                            <div 
                              key={landmark.id}
                              className={`p-1.5 border rounded flex flex-col justify-between gap-1 bg-black/40 ${isCurrent ? 'border-amber-600/75' : 'border-zinc-900/70'}`}
                            >
                              <div className="flex items-center gap-1">
                                <span className="text-[11px] truncate">{landmark.emoji} {landmark.name.split(' (')[0]}</span>
                              </div>
                              <button
                                type="button"
                                disabled={isCurrent}
                                onClick={() => dispatch({ type: 'FAST_TRAVEL_TO', payload: landmark.coords })}
                                className={`w-full py-0.5 text-[8.5px] font-mono rounded text-center transition cursor-pointer font-semibold ${
                                  isCurrent 
                                    ? 'bg-zinc-900 text-zinc-600 border border-zinc-950 cursor-not-allowed'
                                    : 'bg-amber-950/20 text-amber-400 hover:bg-amber-900/30 border border-amber-700/30'
                                }`}
                              >
                                {isCurrent ? '📍 Current' : '🚀 Travel'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="p-2 border border-amber-950/25 bg-[#040508] rounded flex flex-col justify-between">
                    <div>
                      <span className="block text-[10px] font-bold text-[#e2b05c] uppercase tracking-wider mb-1.5 font-mono">
                        EXPEDITION COMPASS NODES (ENERGY COST: 1 AP)
                      </span>
                      <div className="grid grid-cols-3 gap-1 grid-rows-2">
                        {[
                          { q: 0, r: -1, label: 'North' },
                          { q: 1, r: -1, label: 'North-East' },
                          { q: 1, r: 0, label: 'South-East' },
                          { q: 0, r: 1, label: 'South' },
                          { q: -1, r: 1, label: 'South-West' },
                          { q: -1, r: 0, label: 'North-West' }
                        ].map((dir, i) => {
                          const q = state.player.coords.q;
                          const r = state.player.coords.r;
                          const dest = { q: q + dir.q, r: r + dir.r };
                          const maxWorldRadius = parseInt(localStorage.getItem('fite_lab_world_radius') || '10');
                          const dist = axialDistance({ q: 0, r: 0 }, dest);
                          const oob = dist > maxWorldRadius;
                          const targetTerrain = getTerrainAt(dest);
                          const targetName = getScenicLocationName(dest.q, dest.r, targetTerrain);

                          return (
                            <button
                              id={`nav_btn_${i}`}
                              key={i}
                              disabled={oob || state.player.ap.current < 1}
                              onClick={() => dispatch({ type: 'TRAVEL_TO', payload: dest })}
                              className={`px-1 py-1 text-[9px] font-mono border rounded flex flex-col items-center justify-center min-h-[44px] transition ${
                                oob
                                  ? 'border-neutral-900 text-neutral-800 bg-neutral-950 opacity-30 cursor-not-allowed select-none'
                                  : 'border-amber-700/40 text-amber-500 bg-amber-950/10 hover:bg-amber-900/30 hover:text-amber-200 cursor-pointer'
                              }`}
                            >
                              <span className="font-bold text-[9px] text-[#e2b05c] leading-none">{dir.label}</span>
                              <span className="text-[7.5px] text-zinc-500 truncate w-full px-0.5 mt-0.5 text-center leading-none" title={targetName}>
                                {oob ? 'Rad Peak' : targetName}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* DECODE TAB (RADAR & INTERACTIONS DECODER) */}
              {activeTab === 'DECODE' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="tab_decode_panel">
                  <div className="flex flex-col gap-1.5 p-2 border border-amber-950/25 bg-[#040508] rounded">
                    <span className="text-[11px] text-amber-500 font-bold uppercase tracking-wider block">Diagnostic Radar Inspector</span>
                    
                    {selectedHex ? (
                      (() => {
                        const terrainAtSel = getTerrainAt(selectedHex);
                        const landmarkAtSel = WORLD_LANDMARKS.find(l => l.coords.q === selectedHex.q && l.coords.r === selectedHex.r);
                        const agentsAtSel = state.simulation.agents.filter(a => a.hex.q === selectedHex.q && a.hex.r === selectedHex.r && a.behaviorState !== 'dead');
                        return (
                          <div className="space-y-1.5 text-[10px] font-mono">
                            <p className="text-[#e2b05c] border-b border-zinc-900 pb-0.5 flex justify-between font-bold">
                              <span>Focus Sector:</span>
                              <span className="text-white">[{selectedHex.q}, {selectedHex.r}]</span>
                            </p>
                            <p className="flex justify-between leading-none text-[#e2b05c]/85">
                              <span>TERRAIN TYPE:</span>
                              <span className="text-zinc-300 font-bold">{terrainAtSel}</span>
                            </p>
                            <p className="flex justify-between leading-none text-[#e2b05c]/85">
                              <span>LANDMARK:</span>
                              <span className="text-amber-400 font-semibold">{landmarkAtSel ? `📍 ${landmarkAtSel.name}` : 'None'}</span>
                            </p>
                            <div className="mt-1 pt-1 border-t border-zinc-900">
                              <span className="text-[8px] text-zinc-500 uppercase tracking-wider block font-bold mb-1">Entity Signals Detected ({agentsAtSel.length})</span>
                              <div className="space-y-1 max-h-[75px] overflow-y-auto">
                                {agentsAtSel.map(agent => {
                                  const color = AGENT_COLORS[agent.type] || '#b45309';
                                  return (
                                    <div key={agent.id} className="flex justify-between items-center text-[9px] border-b border-zinc-950 pb-0.5">
                                      <div className="flex items-center gap-1">
                                        <span style={{ color }}>●</span>
                                        <span className="text-zinc-300 capitalize">{agent.type}</span>
                                      </div>
                                      <div className="flex gap-2 text-zinc-500">
                                        <span>HP: {agent.hp}/{agent.maxHp}</span>
                                        <span className="capitalize text-amber-600/80">Stance: {agent.behaviorState}</span>
                                      </div>
                                    </div>
                                  );
                                })}
                                {agentsAtSel.length === 0 && (
                                  <p className="text-zinc-650 italic text-[9px]">No biometric signals detected inside target sector.</p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="flex flex-col items-center justify-center p-3 text-center h-full min-h-[110px]">
                        <span className="text-xl mb-1 filter grayscale opacity-45">📡</span>
                        <p className="text-[9.5px] text-zinc-500 max-w-xs italic leading-tight">
                          No active sector focused. Click any tactical cell on the hex map viewport to inspect lifeforms.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="p-2 border border-amber-950/25 bg-[#040508] rounded flex flex-col gap-1.5">
                    <span className="text-[11px] text-amber-500 font-bold uppercase tracking-wider block">Interactions Decoder</span>
                    
                    {(() => {
                      const hasCargo = state.world.focusedObject && !state.world.focusedObject.interacted;
                      if (!hasCargo) {
                        return (
                          <div className="flex flex-col items-center justify-center p-3 text-center h-full min-h-[110px]">
                            <span className="text-lg filter grayscale opacity-35 mb-1">📦</span>
                            <p className="text-[9.5px] text-zinc-500 italic max-w-xs leading-tight">
                              Standard expeditions trigger pre-war caches. Move on map cells to focus interactable nodes.
                            </p>
                          </div>
                        );
                      }

                      const cargoObj = state.world.focusedObject!;
                      const mainSkill = cargoObj.skillsApplicable?.[0] || 'Survival';
                      const skillScore = state.player.skills[mainSkill] || 15;

                      return (
                        <div className="space-y-1.5 text-[9.5px] font-mono">
                          <div className="flex justify-between items-center bg-amber-950/10 p-1 border border-amber-900/20 rounded">
                            <span className="font-bold text-amber-400 uppercase truncate">
                              📍 {cargoObj.name}
                            </span>
                            <span className="text-[7.5px] px-1 py-0.2 bg-[#0d160d] border border-green-800 text-green-400 font-bold uppercase rounded leading-none">
                              Interactable
                            </span>
                          </div>

                          <p className="text-zinc-400 leading-tight">
                            Pre-war debris cache found. Attempt to bypass using high-frequency PIP-Boy calibration sequences.
                          </p>

                          <div className="flex flex-col gap-1 mt-1">
                            <div className="flex justify-between text-zinc-500 text-[8.5px]">
                              <span>CALIBRATION: {mainSkill}</span>
                              <span className="text-amber-500 font-bold">PROFICIENCY: {skillScore}%</span>
                            </div>
                            
                            <button
                              onClick={() => {
                                dispatch({
                                  type: 'TRIGGER_SKILL_CHECK',
                                  payload: { skill: mainSkill, objectId: cargoObj.id }
                                });
                              }}
                              className="w-full py-1 bg-green-950/25 hover:bg-green-900/40 border border-green-600/70 text-green-400 hover:text-green-200 font-bold uppercase rounded text-[9px] cursor-pointer transition flex items-center justify-center gap-1"
                            >
                              <span> Calibration Check</span>
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* DEV TAB (SANDBOX TOOLS) */}
              {activeTab === 'DEV' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="tab_dev_panel">
                  <div className="p-2 border border-neutral-850 bg-neutral-950/20 rounded flex flex-col gap-1">
                    <span className="text-[11px] text-red-400 font-bold uppercase tracking-wider block">Sandbox Spawner Deck</span>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[9.5px] font-mono">
                        <span className="text-zinc-500">NPC Rendering Style:</span>
                        <button
                          onClick={() => setShowAgentEmojis(prev => !prev)}
                          className={`px-1.5 py-0.5 border text-[8px] rounded font-bold uppercase ${
                            showAgentEmojis ? 'border-amber-500 text-amber-500' : 'border-neutral-800 text-zinc-650'
                          }`}
                        >
                          {showAgentEmojis ? 'Emojis 🤠' : 'Colored Dots 🔵'}
                        </button>
                      </div>

                      <div className="border-t border-neutral-900/40 pt-1 flex flex-col gap-0.5 font-mono">
                        <span className="text-zinc-650 uppercase block font-bold text-[8px]">Incept entity at coordinates:</span>
                        <div className="grid grid-cols-4 gap-1">
                          {[
                            AgentType.Raider,
                            AgentType.Wastelander,
                            AgentType.Scavenger,
                            AgentType.Caravan,
                            AgentType.SuperMutant,
                            AgentType.Critter,
                            AgentType.Nightkin,
                            AgentType.TownGuard
                          ].map(t => (
                            <button
                              key={t}
                              onClick={() => {
                                dispatch({
                                  type: 'DEV_SPAWN_AGENT',
                                  payload: { type: t, hex: state.player.coords }
                                });
                              }}
                              className="px-1 py-0.5 bg-black border border-neutral-900 hover:border-amber-700/50 rounded hover:text-white transition flex flex-col items-center justify-center gap-0.5 cursor-pointer text-[8.5px] leading-none"
                            >
                              <span className="text-xs">{AGENT_EMOJIS[t] || '👾'}</span>
                              <span className="capitalize text-[7px] truncate w-full text-center">{t.substring(0, 7)}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-2 border border-neutral-850 bg-neutral-950/20 rounded flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] text-red-400 font-bold uppercase tracking-wider block mb-1.5">Wasteland Commands Console</span>
                      <div className="grid grid-cols-2 gap-1 font-mono">
                        <button
                          onClick={() => dispatch({ type: 'DEV_ADD_CAPS', payload: 1000 })}
                          className="px-1.5 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:text-white rounded text-[9px] uppercase font-bold text-amber-400 text-center cursor-pointer transition"
                        >
                          💰 +1000 CAPS
                        </button>
                        <button
                          onClick={() => dispatch({ type: 'DEV_ADD_XP', payload: 1500 })}
                          className="px-1.5 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:text-white rounded text-[9px] uppercase font-bold text-amber-400 text-center cursor-pointer transition"
                        >
                          🧪 +1500 XP
                        </button>
                        <button
                          onClick={() => dispatch({ type: 'DEV_ADD_ITEM', payload: 'ItemStimpak' })}
                          className="px-1.5 py-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:text-white rounded text-[9px] uppercase font-bold text-amber-400 text-center cursor-pointer transition"
                        >
                          💉 STIMPAK
                        </button>
                        <button
                          onClick={() => dispatch({ type: 'DEV_SIM_TICK' })}
                          className="px-1.5 py-1 bg-red-950/15 border border-red-900/40 hover:border-red-600/70 text-red-400 hover:text-red-300 rounded text-[9px] uppercase font-bold text-center cursor-pointer transition"
                          title="Force immediate simulation tick"
                        >
                          ⚙️ FORCE TICK
                        </button>
                      </div>
                    </div>

                    <div className="mt-2 pt-1 border-t border-neutral-900 flex justify-between items-center text-[9px] font-mono">
                      <span className="text-zinc-600 uppercase">Grave chronicles:</span>
                      {state.graves.length > 0 && (
                        <button
                          onClick={() => dispatch({ type: 'CLEAR_WORLD_HISTORY' })}
                          className="flex items-center gap-0.5 text-[8px] border border-red-900/40 text-red-400 hover:bg-red-950/20 px-1 py-0.2 rounded transition"
                        >
                          Clear ({state.graves.length})
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Real-time background simulation thread debugger and telemetry tuner */}
                  <div className="md:col-span-2 mt-4">
                    <SimulationControlPanel state={state} dispatch={dispatch} />
                  </div>
                </div>
              )}

              {/* DISPLAY TAB (RESOLUTION CONFIGS, SCALES, AND FLOOR TEXTURE EDITORS) */}
              {activeTab === 'DISPLAY' && (
                <div className="flex flex-col gap-3 p-3.5 border border-amber-950/25 bg-[#040508] rounded" id="tab_display_panel">
                  {/* Row 1: Calibration */}
                  <div>
                    <span className="text-[11px] text-amber-500 font-bold uppercase tracking-wider block mb-1">Monitor Aspect Calibrations</span>
                    <p className="text-[10px] text-zinc-400 max-w-lg leading-relaxed mb-2">
                      Set your preferred monitor signal output aspect-ratio. Classic 1280 x 720 delivers perfect retro-scaled density.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {[
                        { key: '1280x720', label: '1280 x 720 (Standard)', scale: 'Fallout 16:9 aspect density' },
                        { key: '1024x768', label: '1024 x 768 CRT', scale: 'Classic 4:3 dense display' },
                        { key: 'responsive', label: 'Capped Fluid Scale', scale: 'Responsive bounds alignment' }
                      ].map(resOption => {
                        const active = resolution === resOption.key;
                        return (
                          <button
                            type="button"
                            key={resOption.key}
                            onClick={() => setResolution(resOption.key as any)}
                            className={`p-2 border rounded flex flex-col text-left transition font-mono cursor-pointer ${
                              active
                                ? 'border-amber-600 bg-[#12151e]'
                                : 'border-zinc-900 bg-black/40 hover:bg-black/85'
                            }`}
                          >
                            <span className={`text-[10px] font-bold ${active ? 'text-amber-400' : 'text-zinc-400'}`}>{resOption.label}</span>
                            <span className="text-[8px] text-zinc-500 mt-0.5 font-normal">{resOption.scale}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <hr className="border-amber-950/20" />

                  {/* Row 2: Emoji Scale Configs & Drop Shadow */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <span className="text-[11px] text-amber-500 font-bold uppercase tracking-wider block font-mono">Vector Emoji Sizing Scales</span>
                      <div className="space-y-2 text-[10px] text-zinc-300 font-mono">
                        <div className="flex items-center justify-between gap-2">
                          <span className="w-1/3">🏠 Buildings Scale:</span>
                          <input 
                            type="range" 
                            min="1" 
                            max="5" 
                            step="0.2" 
                            value={buildingScale} 
                            onChange={(e) => setBuildingScale(parseFloat(e.target.value))}
                            className="w-1/2 h-1 bg-zinc-900 roundedappearance-none accent-amber-500 cursor-pointer"
                          />
                          <span className="text-amber-400 font-bold text-right w-10">{buildingScale.toFixed(1)}x</span>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <span className="w-1/3">🚶 Player Scale:</span>
                          <input 
                            type="range" 
                            min="1" 
                            max="4" 
                            step="0.1" 
                            value={playerScale} 
                            onChange={(e) => setPlayerScale(parseFloat(e.target.value))}
                            className="w-1/2 h-1 bg-zinc-900 roundedappearance-none accent-amber-500 cursor-pointer"
                          />
                          <span className="text-amber-400 font-bold text-right w-10">{playerScale.toFixed(1)}x</span>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <span className="w-1/3">👾 NPCs Patrol Scale:</span>
                          <input 
                            type="range" 
                            min="0.8" 
                            max="3" 
                            step="0.1" 
                            value={npcScale} 
                            onChange={(e) => setNpcScale(parseFloat(e.target.value))}
                            className="w-1/2 h-1 bg-zinc-900 roundedappearance-none accent-amber-500 cursor-pointer"
                          />
                          <span className="text-amber-400 font-bold text-right w-10">{npcScale.toFixed(1)}x</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col justify-between p-2 rounded bg-amber-950/5 border border-amber-950/15">
                      <div className="text-[10px] text-zinc-400 font-mono">
                        <span className="block text-[#e2b05c] font-bold uppercase text-[9.5px] tracking-wider mb-1">Aesthetic Pairings Options</span>
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="checkbox"
                            id="shadowEnabledCheckbox"
                            checked={shadowEnabled}
                            onChange={(e) => setShadowEnabled(e.target.checked)}
                            className="rounded border-zinc-900 bg-black text-amber-500 focus:ring-0 cursor-pointer"
                          />
                          <label htmlFor="shadowEnabledCheckbox" className="text-zinc-200 cursor-pointer font-semibold">
                            Enable high-contrast dropshadow style filters
                          </label>
                        </div>
                        <p className="text-[8.5px] text-zinc-500 mt-2.5 leading-relaxed">
                          Dropshadow styling places bold shadows beneath scaled vector markers, allowing landmarks and patrols to visually stand out against dark canyon faces.
                        </p>
                      </div>
                    </div>
                  </div>

                  <hr className="border-amber-950/20" />

                  {/* Row 3: Floor Terrain Textures Color Editor */}
                  <div>
                    <span className="text-[11px] text-amber-500 font-bold uppercase tracking-wider block font-mono mb-1.5">Floor Terrain Textures & Colors Palette Editor</span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                      {Object.entries(terrainStyles).map(([type, anyStyle]) => {
                        const style = anyStyle as { fill: string; stroke: string; label: string; emoji: string };
                        return (
                          <div key={type} className="p-1.5 border border-zinc-900 bg-black/50 rounded flex flex-col gap-1 font-mono text-[9px]">
                            <span className="font-bold text-amber-500/90 text-center uppercase tracking-wide border-b border-zinc-900 pb-0.5">{type}</span>
                            
                            <div className="flex flex-col gap-0.5 mt-1">
                              <span className="text-[7.5px] text-zinc-500">Fill Hex Color:</span>
                              <div className="flex items-center gap-1">
                                <input 
                                  type="color" 
                                  value={style.fill} 
                                  onChange={(e) => setTerrainStyles(prev => ({
                                    ...prev,
                                    [type]: { ...prev[type], fill: e.target.value }
                                  }))}
                                  className="w-4 h-4 bg-transparent border-0 rounded cursor-pointer"
                                />
                                <input 
                                  type="text"
                                  value={style.fill}
                                  onChange={(e) => setTerrainStyles(prev => ({
                                    ...prev,
                                    [type]: { ...prev[type], fill: e.target.value }
                                  }))}
                                  className="bg-neutral-950 text-white border border-neutral-900 rounded px-1 py-0.2 text-[8px] w-full"
                                />
                              </div>
                            </div>

                            <div className="flex flex-col gap-0.5">
                              <span className="text-[7.5px] text-zinc-500">Stroke Hex Border:</span>
                              <div className="flex items-center gap-1">
                                <input 
                                  type="color" 
                                  value={style.stroke} 
                                  onChange={(e) => setTerrainStyles(prev => ({
                                    ...prev,
                                    [type]: { ...prev[type], stroke: e.target.value }
                                  }))}
                                  className="w-4 h-4 bg-transparent border-0 rounded cursor-pointer"
                                />
                                <input 
                                  type="text"
                                  value={style.stroke}
                                  onChange={(e) => setTerrainStyles(prev => ({
                                    ...prev,
                                    [type]: { ...prev[type], stroke: e.target.value }
                                  }))}
                                  className="bg-neutral-950 text-white border border-neutral-900 rounded px-1 py-0.2 text-[8px] w-full"
                                />
                              </div>
                            </div>

                            <div className="flex flex-col gap-0.5">
                              <span className="text-[7.5px] text-zinc-500">Acoustic Emoji:</span>
                              <input 
                                type="text"
                                value={style.emoji}
                                onChange={(e) => setTerrainStyles(prev => ({
                                  ...prev,
                                    [type]: { ...prev[type], emoji: e.target.value }
                                }))}
                                className="bg-neutral-950 text-white border border-neutral-900 rounded px-1 py-0.2 text-[8.5px] text-center"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              )}

            </div>
          </section>
        </main>
      )}

      {/* ========================================================
          PHASE C: CEMETERY / GAME OVER LEGACY SCREEN
          ======================================================== */}
      {state.phase === 'dead' && (
        <main className="flex-1 max-w-3xl w-full mx-auto p-6 flex flex-col justify-center items-center z-10" id="death_graveyard_screen">
          <div className="bg-[#0b0c10] border-2 border-red-500/40 p-8 rounded-lg shadow-2xl text-center w-full max-w-xl flex flex-col gap-5">
            <span className="text-7xl animate-pulse filter drop-shadow-[0_4px_12px_rgba(239,68,68,0.4)] select-none">💀</span>
            
            <div>
              <h2 className="text-2xl font-extrabold text-red-500 uppercase tracking-widest leading-none mb-1"> ELIMINATED</h2>
              <p className="text-[11px] text-zinc-500 uppercase tracking-wide">PIP-Boy Biosignal flatlined</p>
            </div>

            <div className="text-[12px] bg-red-950/10 border border-red-500/20 rounded p-4 text-[#e2b05c]/90 leading-relaxed text-left space-y-1">
              <div><strong className="text-red-400">Nomad:</strong> {state.player.name} ({state.player.origin})</div>
              <div><strong className="text-red-400">Position coordinates:</strong> Sector [{state.player.coords.q}, {state.player.coords.r}]</div>
              <div><strong className="text-red-400"> Length:</strong> Day {state.world.day} of the Wastelands</div>
              <div><strong className="text-red-400">S.P.E.C.I.A.L properties:</strong> ST {state.player.special.ST} | PE {state.player.special.PE} | EN {state.player.special.EN} | CH {state.player.special.CH} | IN {state.player.special.IN} | AG {state.player.special.AG} | LK {state.player.special.LK}</div>
              <div className="pt-2 border-t border-red-500/20 text-red-400 font-bold uppercase text-[10px]">Loot dropped inside tile. Next run, your physical tombstone and loot is here.</div>
            </div>

            <p className="text-[10.5px] italic text-zinc-400 max-w-md mx-auto">
              "The desert does not recognize courage, nor does the irradiated earth hear prayers. Only the bones remain to narrate the chronicle."
            </p>

            <button
              onClick={() => dispatch({ type: 'RESTART_RUN' })}
              className="mt-2 py-3 bg-red-950/20 hover:bg-red-900/30 border border-red-500 text-red-400 hover:text-red-200 font-bold uppercase text-[12px] rounded tracking-wider transition-all shadow-[0_4px_15px_rgba(239,68,68,0.15)] select-none"
            >
              New Character (next Run) 
            </button>
          </div>
        </main>
      )}

      {/* FOOTER */}
      <footer className="border-t border-[#3c2a11]/40 bg-[#07080a] py-2.5 text-center text-[9.5px] text-zinc-600 select-none">
        FITE RPG Series · 
      </footer>
    </div>
  );
}

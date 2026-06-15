import React, { useState } from 'react';
import { calculateDerivedStats, WASTELAND_TRAITS, STARTING_ORIGINS, SKILL_BASE_FORMULAS } from '../../engine/stats';
import { SkillName, SPECIAL } from '../../engine/types';

export interface CharacterCreationData {
  name: string;
  originId: string;
  special: SPECIAL;
  traits: string[];
  tagged: SkillName[];
}

export function useCharacterCreation() {
  const [setupName, setSetupName] = useState('Chosen ');
  const [setupOrigin, setSetupOrigin] = useState('VaultDweller');
  const [setupSPECIAL, setSetupSPECIAL] = useState<SPECIAL>({ ST: 5, PE: 5, EN: 5, CH: 5, IN: 5, AG: 5, LK: 5 });
  const [setupPoints, setSetupPoints] = useState(5); // start with 5 customization pool points (all at 5)
  const [setupTraits, setSetupTraits] = useState<string[]>([]);
  const [setupTagged, setSetupTagged] = useState<SkillName[]>([]);

  const setupDerived = calculateDerivedStats(setupSPECIAL, 1, setupTraits);

  const handleSPECIALChange = (stat: keyof SPECIAL, amount: number) => {
    const currentVal = setupSPECIAL[stat];
    if (amount > 0 && setupPoints <= 0) return;
    if (amount < 0 && currentVal <= 1) return;
    if (amount > 0 && currentVal >= 10) return;

    setSetupSPECIAL({
      ...setupSPECIAL,
      [stat]: currentVal + amount
    });
    setSetupPoints(setupPoints - amount);
  };

  const toggleTrait = (traitId: string) => {
    if (setupTraits.includes(traitId)) {
      setSetupTraits(setupTraits.filter(id => id !== traitId));
    } else {
      if (setupTraits.length >= 2) return; // Max 2 traits
      setSetupTraits([...setupTraits, traitId]);
    }
  };

  const toggleTagSkill = (skill: SkillName) => {
    if (setupTagged.includes(skill)) {
      setSetupTagged(setupTagged.filter(s => s !== skill));
    } else {
      if (setupTagged.length >= 4) return; // Max 4 tags
      setSetupTagged([...setupTagged, skill]);
    }
  };

  return {
    setupName,
    setSetupName,
    setupOrigin,
    setSetupOrigin,
    setupSPECIAL,
    setupPoints,
    setupTraits,
    setupTagged,
    setupDerived,
    handleSPECIALChange,
    toggleTrait,
    toggleTagSkill
  };
}

interface CharacterCreationViewProps {
  onLaunchCharacter: (data: CharacterCreationData) => void;
}

export const CharacterCreationView: React.FC<CharacterCreationViewProps> = ({ onLaunchCharacter }) => {
  const {
    setupName,
    setSetupName,
    setupOrigin,
    setSetupOrigin,
    setupSPECIAL,
    setupPoints,
    setupTraits,
    setupTagged,
    setupDerived,
    handleSPECIALChange,
    toggleTrait,
    toggleTagSkill
  } = useCharacterCreation();

  const handleLaunch = () => {
    onLaunchCharacter({
      name: setupName,
      originId: setupOrigin,
      special: setupSPECIAL,
      traits: setupTraits,
      tagged: setupTagged
    });
  };

  return (
    <main className="flex-1 max-w-6xl w-full mx-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-6 z-10 overflow-y-auto" id="setup_main_creator">
      {/* S.P.E.C.I.A.L */}
      <section className="bg-[#07090c] border border-amber-900/30 p-5 rounded md:col-span-4 flex flex-col justify-between">
        <div>
          <h2 className="text-[14px] font-bold tracking-wider text-amber-500 border-b border-amber-900/30 pb-2 mb-4 uppercase">
            ① ALLOCATE S.P.E.C.I.A.L ATTRIBUTES
          </h2>
          <p className="text-[11px] text-zinc-400 mb-4 leading-relaxed">
            Choose parameters for your post-war survivor. S.P.E.C.I.A.L score averages are 5. High values yield substantial secondary benefits.
          </p>

          <div className="text-center bg-[#0d121b] border border-amber-900/20 rounded py-2 mb-4">
            <span className="text-[10px] text-zinc-500 block uppercase">Customization Points left</span>
            <span className="text-2xl font-bold text-amber-400 font-sans">{setupPoints}</span>
          </div>

          <div className="space-y-3">
            {(Object.keys(setupSPECIAL) as Array<keyof SPECIAL>).map(stat => {
              const statLabels: Record<string, string> = {
                ST: 'Strength (ST)',
                PE: 'Perception (PE)',
                EN: 'Endurance (EN)',
                CH: 'Charisma (CH)',
                IN: 'Intelligence (IN)',
                AG: 'Agility (AG)',
                LK: 'Luck (LK)'
              };

              return (
                <div key={stat} className="flex justify-between items-center text-[11px]">
                  <span className="text-zinc-300 font-medium">{statLabels[stat]}</span>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleSPECIALChange(stat, -1)}
                      disabled={setupSPECIAL[stat] <= 1}
                      className="w-5 h-5 rounded border border-red-500/50 bg-red-950/10 text-red-400 hover:bg-red-900/30 font-bold transition flex items-center justify-center text-[11px] cursor-pointer"
                    >
                      -
                    </button>
                    <span className="text-amber-400 font-bold text-[12px] w-4 text-center font-sans">
                      {setupSPECIAL[stat]}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSPECIALChange(stat, 1)}
                      disabled={setupPoints <= 0 || setupSPECIAL[stat] >= 10}
                      className="w-5 h-5 rounded border border-green-500/50 bg-green-950/10 text-green-400 hover:bg-green-900/30 font-bold transition flex items-center justify-center text-[11px] cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Derived Previews */}
        <div className="mt-5 border-t border-amber-900/20 pt-4 text-[10.5px] text-zinc-400 space-y-1">
          <div className="flex justify-between">
            <span>Base Hit Points:</span>
            <span className="text-zinc-200">{setupDerived.maxHP} HP</span>
          </div>
          <div className="flex justify-between">
            <span>Action Points pool:</span>
            <span className="text-zinc-200">{setupDerived.maxAP} AP</span>
          </div>
          <div className="flex justify-between">
            <span>Poison Resist:</span>
            <span className="text-zinc-200">{setupDerived.poisonResistance}%</span>
          </div>
          <div className="flex justify-between">
            <span>Radiation Resist:</span>
            <span className="text-zinc-200">{setupDerived.radiationResistance}%</span>
          </div>
        </div>
      </section>

      {/* TRAITS & ORIGINS SELECTOR */}
      <section className="bg-[#07090c] border border-amber-900/30 p-5 rounded md:col-span-8 flex flex-col justify-between">
        <div className="space-y-5">
          {/* Profile setup: Name and Background Origin */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-amber-500 block mb-1 uppercase"> Identity Name</label>
              <input
                type="text"
                maxLength={20}
                value={setupName}
                onChange={(e) => setSetupName(e.target.value)}
                className="w-full bg-[#0d121c] border border-amber-900/30 rounded px-3 py-2 text-[12px] text-amber-400 focus:outline-none focus:border-amber-500"
                placeholder="Enter traveler moniker"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-amber-500 block mb-1 uppercase">Background origin</label>
              <select
                value={setupOrigin}
                onChange={(e) => setSetupOrigin(e.target.value)}
                className="w-full bg-[#0d121c] border border-amber-900/30 rounded px-2.5 py-2 text-[12px] text-amber-400 focus:outline-none focus:border-amber-500"
              >
                {STARTING_ORIGINS.map(orig => (
                  <option key={orig.id} value={orig.id}>
                    {orig.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Origin Explainer */}
          <div className="bg-[#0a0d15] border border-amber-955/40 p-3 rounded text-[11px] leading-relaxed">
            <span className="text-amber-500 font-bold uppercase mr-1">Origin Perk:</span>
            <span className="text-zinc-300">
              {STARTING_ORIGINS.find(o => o.id === setupOrigin)?.description}
            </span>
          </div>

          {/* Tag Skills select (Max 4 tags) */}
          <div>
            <h3 className="text-[12px] font-bold text-amber-500 border-b border-amber-900/20 pb-1 mb-2 uppercase">
              ② TAG SPECIFIC  SKILLS (TAG MAX 4 · GIVES +20% START)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.keys(SKILL_BASE_FORMULAS) as SkillName[]).slice(0, 12).map(skillName => {
                const isTagged = setupTagged.includes(skillName);

                return (
                  <button
                    key={skillName}
                    type="button"
                    onClick={() => toggleTagSkill(skillName)}
                    className={`text-[10px] py-1 border rounded text-center transition cursor-pointer ${
                      isTagged
                        ? 'border-green-400 text-green-300 bg-green-950/20 font-bold'
                        : 'border-amber-900/20 text-neutral-400 bg-black hover:text-amber-300'
                    }`}
                  >
                    {skillName}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Select Traits (Max 2) */}
          <div>
            <h3 className="text-[12px] font-bold text-amber-500 border-b border-amber-900/20 pb-1 mb-2 uppercase flex justify-between items-center">
              <span>③ CHOOSE ANCIENT WASTELAND TRAITS (MAX 2)</span>
              <span className="text-[10px] font-normal text-zinc-500">{setupTraits.length} / 2 Selected</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {WASTELAND_TRAITS.map(trait => {
                const active = setupTraits.includes(trait.id);

                return (
                  <div
                    key={trait.id}
                    onClick={() => toggleTrait(trait.id)}
                    className={`p-2.5 rounded border cursor-pointer transition ${
                      active
                        ? 'border-green-500/40 bg-green-950/10'
                        : 'border-neutral-905 bg-[#040609] hover:border-amber-800/40'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className={`${active ? 'text-green-300 font-bold' : 'text-amber-500'} text-[11px] font-medium`}>
                        {trait.name}
                      </span>
                      {active && <span className="text-[9px] text-green-400 font-bold">[ACTIVE]</span>}
                    </div>
                    <p className="text-[10px] text-zinc-400 leading-relaxed mt-1">
                      {trait.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Launch Action */}
        <div className="mt-6 border-t border-amber-900/20 pt-4 flex justify-between items-center">
          <span className="text-[11px] text-zinc-500 font-mono">
            Setup validates: zero 'any', pristine d100 PnP state mechanisms active.
          </span>
          <button
            type="button"
            onClick={handleLaunch}
            className="px-6 py-2.5 border border-amber-500 text-amber-400 hover:text-amber-200 hover:bg-amber-95-5/20 hover:border-amber-400 rounded text-[12px] font-bold uppercase tracking-wider animate-pulse transition cursor-pointer"
          >
            Engage Wasteland 
          </button>
        </div>
      </section>
    </main>
  );
};

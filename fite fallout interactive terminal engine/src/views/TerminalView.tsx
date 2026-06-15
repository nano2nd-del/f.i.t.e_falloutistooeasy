/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { WorldState, DialogueOption } from '../engine/types';
import { GameAction } from '../engine/reducer';
import { AlertTriangle, Terminal, BookOpen, Compass } from 'lucide-react';
import { evaluateSkillCheck } from '../utils/skillsEvaluator';

interface TerminalViewProps {
  state: WorldState;
  dispatch: React.Dispatch<GameAction>;
}

export default function TerminalView({ state, dispatch }: TerminalViewProps) {
  const activeEv = state.encounter.active;

  // Resolve Dialogue Option selection
  const handleDialogueChoice = (opt: DialogueOption, idx: number) => {
    let nextStepId = opt.nextStepId;
    let skillCheckPassed: boolean | undefined = undefined;

    // Evaluate skill check success or failure if attached to the choice
    if (opt.skillCheck) {
      const skillName = opt.skillCheck.skill;
      const difficulty = opt.skillCheck.difficulty;
      
      const checkResult = evaluateSkillCheck(state.player.skills, skillName, difficulty, state.player.perks);
      skillCheckPassed = checkResult.success;

      // Map to next path
      nextStepId = skillCheckPassed ? 'intim_check' : 'fight_check'; // standard fallback
      
      // Specifically route to correct step in encounter content
      if (activeEv) {
        if (activeEv.id === 'EventMerchant') {
          nextStepId = 'steal_check'; // routes to choice branch
        } else if (activeEv.id === 'EventRaiders') {
          nextStepId = opt.skillCheck.skill === 'Intimidation' ? 'intim_check' : 'fight_check';
        } else if (activeEv.id === 'EventMutants') {
          nextStepId = opt.skillCheck.skill === 'Sneak' ? 'sneak_check' : 'combat_check';
        } else if (activeEv.id === 'EventTheGlowCore') {
          nextStepId = opt.skillCheck.skill === 'ComputerScience' ? 'hack_check' : 'science_check';
        }
      }
    }

    dispatch({
      type: 'RESOLVE_DIAL_OPTION',
      payload: { nextStepId, optionIdx: idx, skillCheckPassed }
    });
  };

  // Check if dialogue options are barred by requirements
  const isOptionDisabled = (opt: DialogueOption): boolean => {
    if (opt.statRequirement) {
      const statVal = state.player.special[opt.statRequirement.stat];
      if (statVal < opt.statRequirement.val) return true;
    }
    if (opt.costs) {
      if (opt.costs.caps && state.inventory.caps < opt.costs.caps) return true;
    }
    return false;
  };

  return (
    <div className="relative w-full h-[220px] rounded border border-amber-900/30 bg-[#07090d] overflow-hidden flex flex-col font-mono shadow-inner" id="pipboy_terminal_hud">
      {/* SCANNING GRID GLASS SHADOW */}
      <div className="absolute inset-0 bg-scanlines pointer-events-none opacity-25 z-10" />

      {/* HEADER BAR */}
      <div className="flex justify-between items-center bg-[#0d121c] border-b border-amber-950/40 px-3 py-1 text-[10px] text-amber-500/70 select-none">
        <span className="flex items-center gap-1">
          <Terminal size={11} className="animate-pulse text-[#e2b05c]" />
          ACTIVE DIALOGUE MATRIX
        </span>
        <span className="text-[#e2b05c]/60 select-none uppercase">
          {state.world.weather} · Sector [{state.player.coords.q}, {state.player.coords.r}]
        </span>
      </div>

      {/* RENDER ACTIVE STORY DIALOGUE ENCOUNTER CONTAINER */}
      {activeEv ? (
        <div className="flex-1 p-3 flex flex-col justify-between overflow-y-auto text-[#e2b05c]" id="active_encounter_dialogue">
          <div className="mb-2">
            <h4 className="text-[12px] font-bold uppercase tracking-wide text-amber-400 border-b border-amber-800/20 pb-1 mb-1.5 flex items-center gap-1">
              <span>⚠️ FIELD ENCOUNTER:</span>
              <span className="text-white">{activeEv.title}</span>
            </h4>
            <p className="text-[10.5px] leading-relaxed text-zinc-300 italic mb-2">
              "{activeEv.description}"
            </p>
            <p className="text-[11px] leading-relaxed font-semibold text-amber-300">
              {activeEv.steps[activeEv.currentStepId]?.text}
            </p>
          </div>

          {/* Interactive Choices Grid */}
          <div className="grid grid-cols-1 gap-1.5 mt-2">
            {activeEv.steps[activeEv.currentStepId]?.options.map((opt, idx) => {
              const disabled = isOptionDisabled(opt);
              let reqText = '';
              if (opt.statRequirement) reqText = `[Requires ${opt.statRequirement.stat} >= ${opt.statRequirement.val}]`;
              if (opt.skillCheck) reqText = `[${opt.skillCheck.skill} Check - difficulty ${opt.skillCheck.difficulty}]`;
              if (opt.costs?.caps) reqText = `[Costs ${opt.costs.caps} Caps]`;

              return (
                <button
                  id={`dialogue_option_${idx}`}
                  key={idx}
                  disabled={disabled}
                  onClick={() => handleDialogueChoice(opt, idx)}
                  className={`w-full text-left px-3 py-1.5 rounded text-[10.5px] border transition-all ${
                    disabled
                      ? 'border-neutral-900 bg-[#090a0d] text-neutral-600 cursor-not-allowed'
                      : 'border-amber-700/40 bg-amber-950/10 text-amber-400 hover:bg-amber-900/20 hover:text-amber-200'
                  }`}
                >
                  <span className="font-bold text-amber-500 mr-1 select-none">{idx + 1}.</span> 
                  {opt.text} <span className="text-[9px] text-[#e2b05c]/60 ml-2 font-normal italic">{reqText}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* RENDER LIVE STANDARD WASTELAND SCROLL HISTORICAL LOGS */
        <div className="flex-1 p-3 overflow-y-auto flex flex-col-reverse gap-1.5 text-zinc-300 text-[10.5px] line-height" id="historical_logs_panel">
          {state.log.map((entry) => {
            let colorCls = 'text-zinc-300';
            let prefix = '·';

            if (entry.type === 'combat') {
              colorCls = 'text-orange-400 font-semibold';
              prefix = '⚔️';
            } else if (entry.type === 'survival') {
              colorCls = 'text-[#eb5c5c]';
              prefix = '⚠️';
            } else if (entry.type === 'skill') {
              colorCls = 'text-green-400 font-semibold';
              prefix = '🛠️';
            } else if (entry.type === 'death') {
              colorCls = 'text-red-500 font-extrabold uppercase animate-[pulse_1s_infinite]';
              prefix = '💀';
            } else if (entry.type === 'quest') {
              colorCls = 'text-cyan-400 font-bold';
              prefix = '🌠';
            }

            return (
              <div
                key={entry.id}
                className={`flex gap-2 items-start shrink-0 border-b border-neutral-950/50 pb-1 ${colorCls}`}
              >
                <span className="text-[9px] text-zinc-600 select-none font-normal shrink-0 mt-0.5">
                  [{entry.timestamp}]
                </span>
                <span className="shrink-0 select-none">{prefix}</span>
                <span className="leading-relaxed">{entry.text}</span>
              </div>
            );
          })}

          {state.log.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-neutral-600 text-[10px] select-none gap-1 py-10">
              <Compass size={18} className="animate-spin text-neutral-700" />
              BEGIN ADVENTURE.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

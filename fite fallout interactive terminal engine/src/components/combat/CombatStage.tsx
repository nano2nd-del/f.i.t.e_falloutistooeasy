import React, { useState, useEffect, useRef } from 'react';
import { WorldState, WorldEntity, WeaponItem } from '../../engine/types';
import { evaluateSkillCheck, getVatsHitModifier } from '../../utils/skillsEvaluator';

interface CombatStageProps {
  state: WorldState;
  dispatch: React.Dispatch<any>;
  hostileNpc: WorldEntity;
  onClose: () => void;
}

type VatsPart = 'Head' | 'Torso' | 'Eyes' | 'LeftArm' | 'RightArm' | 'LeftLeg' | 'RightLeg';

interface VatsConfig {
  part: VatsPart;
  penalty: number;
  critBonus: number;
  critMultiplier: number;
  label: string;
}

const VATS_PARTS: VatsConfig[] = [
  { part: 'Head', penalty: 30, critBonus: 25, critMultiplier: 2.0, label: 'Head (-30% Acc, +25% Crit, 2x Dmg)' },
  { part: 'Eyes', penalty: 50, critBonus: 50, critMultiplier: 2.5, label: 'Eyes (-50% Acc, +50% Crit, 2.5x Dmg)' },
  { part: 'Torso', penalty: 0, critBonus: 0, critMultiplier: 1.0, label: 'Torso (0% Acc, Normal Dmg)' },
  { part: 'LeftArm', penalty: 15, critBonus: 5, critMultiplier: 1.2, label: 'Left Arm (-15% Acc, Cripple chance)' },
  { part: 'RightArm', penalty: 15, critBonus: 5, critMultiplier: 1.2, label: 'Right Arm (-15% Acc, Drop Weapon chance)' },
  { part: 'LeftLeg', penalty: 20, critBonus: 10, critMultiplier: 1.3, label: 'Left Leg (-20% Acc, Slows target)' },
  { part: 'RightLeg', penalty: 20, critBonus: 10, critMultiplier: 1.3, label: 'Right Leg (-20% Acc, Slows target)' },
];

export const CombatStage: React.FC<CombatStageProps> = ({ state, dispatch, hostileNpc, onClose }) => {
  // Local positions on our tactical grid (8x8)
  const [playerGrid, setPlayerGrid] = useState({ x: 1, y: 3 });
  const [enemyGrid, setEnemyGrid] = useState({ x: 6, y: 3 });
  const [chosenPart, setChosenPart] = useState<VatsPart>('Torso');
  
  // Real-time grid messages and visual feedback
  const [combatAlerts, setCombatAlerts] = useState<string[]>([
    '🔴 TACTICAL ARENA ENABLED: Press WASD to move in 8 directions. Press SPACE to execute weapon fire!',
  ]);
  const [enemyHp, setEnemyHp] = useState(hostileNpc.hp.current);

  const containerRef = useRef<HTMLDivElement>(null);

  // Focus for keyboard listening
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.focus();
    }
  }, []);

  // Track combined keys for 8-way responsive updates
  useEffect(() => {
    const keysPressed: Record<string, boolean> = {};

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', ' '].includes(key)) {
        if (key === ' ') {
          e.preventDefault();
        }
        keysPressed[key] = true;
        updateMovement();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', ' '].includes(key)) {
        keysPressed[key] = false;
      }
    };

    const updateMovement = () => {
      let dx = 0;
      let dy = 0;

      if (keysPressed['w']) dy = -1;
      if (keysPressed['s']) dy = 1;
      if (keysPressed['a']) dx = -1;
      if (keysPressed['d']) dx = 1;

      if (keysPressed[' ']) {
        keysPressed[' '] = false; // prevents rapid spamming on continuous holds
        handleWeaponFire();
        return;
      }

      if (dx !== 0 || dy !== 0) {
        setPlayerGrid((prev) => {
          const nextX = Math.max(0, Math.min(7, prev.x + dx));
          const nextY = Math.max(0, Math.min(7, prev.y + dy));
          return { x: nextX, y: nextY };
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [playerGrid, enemyGrid, chosenPart, enemyHp]);

  const enemyGridRef = useRef(enemyGrid);
  useEffect(() => {
    enemyGridRef.current = enemyGrid;
  }, [enemyGrid]);

  // Let simulated enemy reposition towards player with basic tracking AI
  useEffect(() => {
    // Enemy ticks every 1.5 seconds to close the distance
    const timer = setInterval(() => {
      if (enemyHp <= 0) return;

      const prev = enemyGridRef.current;
      const dx = Math.sign(playerGrid.x - prev.x);
      const dy = Math.sign(playerGrid.y - prev.y);
      
      const nextX = Math.max(0, Math.min(7, prev.x + dx));
      const nextY = Math.max(0, Math.min(7, prev.y + dy));

      setEnemyGrid({ x: nextX, y: nextY });

      // Clenched adjacent distance triggers automatic enemy strike!
      const dist = Math.max(Math.abs(playerGrid.x - nextX), Math.abs(playerGrid.y - nextY));
      if (dist <= 1 && Math.random() < 0.6) {
        triggerEnemyAttack();
      }
    }, 1500);

    return () => clearInterval(timer);
  }, [playerGrid, enemyHp]);

  const addLocalAlert = (msg: string) => {
    setCombatAlerts((prev) => [msg, ...prev.slice(0, 8)]);
  };

  const triggerEnemyAttack = () => {
    const rawDmg = Math.floor(Math.random() * 8) + 4;
    addLocalAlert(`💥 ${hostileNpc.name} strikes you for -${rawDmg} HP!`);
    dispatch({
      type: 'COMBAT_DAMAGE_PLAYER',
      payload: { damage: rawDmg, message: `${hostileNpc.name} struck you.` }
    });
  };

  const handleWeaponFire = () => {
    if (enemyHp <= 0) {
      addLocalAlert('💀 Enemy is already dead.');
      return;
    }

    const equippedWeaponId = state.inventory.equippedWeapon;
    const weapon = equippedWeaponId
      ? (state.inventory.items.find((i) => i.id === equippedWeaponId) as WeaponItem)
      : null;

    const apCost = weapon ? weapon.apCostRanged : 1;

    if (state.player.ap.current < apCost) {
      addLocalAlert(`⚠️ Exhausted AP! Demands ${apCost} AP to shoot. Wait to rest!`);
      return;
    }

    const activeSkillName = weapon ? weapon.combatSkillRequired : 'Unarmed';
    const originalSkillPct = state.player.skills[activeSkillName] || 25;

    // 1. HIDDEN ACTION LAYER: Roll and draw weapon / take aim malfunctions
    const drawRoll = Math.floor(Math.random() * 100) + 1;
    const aimRoll = Math.floor(Math.random() * 100) + 1;
    
    // Malfunction triggers automatically if we roll extreme high numbers (critical failures)
    const jamChance = Math.max(1, 12 - (state.player.special.LK || 5));
    if (drawRoll > 100 - jamChance || aimRoll > 100 - jamChance) {
      addLocalAlert('⚠️ WEAPON MALFUNCTION: Your gun jammed! Clearance took -3 AP.');
      dispatch({ type: 'DEDUCT_AP', payload: 3 });
      return;
    }

    // 2. VATS hit modifier
    const vatsConfig = VATS_PARTS.find((p) => p.part === chosenPart) || VATS_PARTS[2];
    const envMod = state.world.weather === 'DustStorm' ? -15 : state.world.weather === 'NightTime' ? -25 : 0;
    const perkBonus = getVatsHitModifier(state.player.perks);
    
    const targetAC = 10;
    const finalToHit = Math.max(5, originalSkillPct - targetAC - vatsConfig.penalty + envMod + perkBonus);

    // Roll physical hit
    const roll = Math.floor(Math.random() * 100) + 1;
    const didHit = roll <= finalToHit;

    dispatch({ type: 'DEDUCT_AP', payload: apCost });

    if (didHit) {
      // Base Damage
      let baseDmg = 5;
      if (weapon) {
        if (weapon.damageBase === '1d6+2') baseDmg = 1 + Math.floor(Math.random() * 6) + 2;
        else if (weapon.damageBase === '2d6') baseDmg = (1 + Math.floor(Math.random() * 6)) + (1 + Math.floor(Math.random() * 6));
        else if (weapon.damageBase === '1d8') baseDmg = 1 + Math.floor(Math.random() * 8);
        else if (weapon.damageBase === '1d8+1') baseDmg = 1 + Math.floor(Math.random() * 8) + 1;
      }

      // Roll critical limits
      const isCritical = roll <= Math.max(1, (state.player.special.LK || 5) + vatsConfig.critBonus);
      const finalDmg = Math.floor(baseDmg * (isCritical ? vatsConfig.critMultiplier : 1));

      const nextHp = Math.max(0, enemyHp - finalDmg);
      setEnemyHp(nextHp);

      addLocalAlert(
        `✅ HIT [${chosenPart.toUpperCase()}]! Dealt ${finalDmg} damage! ${isCritical ? ' CRITICAL SHOT!' : ''}`
      );

      // Sink actual HP back to global state
      dispatch({
        type: 'COMBAT_STRIKE_NPCS',
        payload: {
          targetId: hostileNpc.id,
          damage: finalDmg,
          isDead: nextHp <= 0,
        }
      });

      if (nextHp <= 0) {
        addLocalAlert('💀 TARGET DEFEATED! The tactical arena concludes.');
      }
    } else {
      addLocalAlert(`💨 MISS! Shot went wide of ${chosenPart} (Roll: ${roll} / Need <= ${finalToHit}%).`);
    }
  };

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className="flex flex-col md:flex-row gap-4 bg-[#090d12]/95 border-2 border-red-950/80 p-4 rounded-lg shadow-2xl outline-none"
      id="combat_stage_panel"
    >
      {/* Target Status Header */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-center pb-2 border-b border-red-900/30">
            <div>
              <span className="text-red-500 font-extrabold tracking-widest text-[11px] uppercase p-0.5">
                ⚡ TACTICAL ARENA (VATS ACTIVE)
              </span>
              <h2 className="text-sm font-bold text-zinc-100">{hostileNpc.name}</h2>
            </div>
            <button
              onClick={onClose}
              className="text-[10px] border border-zinc-700 hover:bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded cursor-pointer transition"
            >
              Close
            </button>
          </div>

          {/* Vats Targeted buttons */}
          <div className="mt-3">
            <label className="text-[10px] text-red-400 block mb-1 uppercase font-bold tracking-wider">
              VATS Parts Selection
            </label>
            <div className="grid grid-cols-2 gap-1">
              {VATS_PARTS.map((v) => (
                <button
                  key={v.part}
                  type="button"
                  onClick={() => setChosenPart(v.part)}
                  className={`text-[10px] px-2 py-1 rounded text-left border cursor-pointer transition ${
                    chosenPart === v.part
                      ? 'bg-red-950/90 text-red-400 border-red-700 font-bold'
                      : 'bg-zinc-950/80 text-zinc-400 border-zinc-800/40 hover:bg-zinc-900'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Fire Weapon button */}
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={handleWeaponFire}
              disabled={enemyHp <= 0}
              className="flex-1 bg-red-900 hover:bg-red-800 text-white font-black text-xs py-2 rounded shadow transition uppercase tracing-wider cursor-pointer"
            >
              💥 Fire (SPACE)
            </button>
          </div>
        </div>

        {/* Local Mini Logs */}
        <div className="mt-4 bg-[#03060a]/90 p-2.5 rounded border border-zinc-900 overflow-y-auto max-h-[140px] font-mono text-[9.5px]">
          <div className="text-zinc-500 uppercase tracking-wider font-extrabold pb-1 border-b border-zinc-900">
            Viewport Telemetry Logs
          </div>
          <div className="mt-1 space-y-1">
            {combatAlerts.map((log, index) => (
              <p
                key={index}
                className={
                  log.includes('✅')
                    ? 'text-green-500'
                    : log.includes('⚠️')
                    ? 'text-amber-500'
                    : log.includes('💥')
                    ? 'text-red-400 font-bold'
                    : 'text-zinc-300'
                }
              >
                {log}
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* Grid Canvas section */}
      <div className="flex-1 flex flex-col items-center">
        <div className="w-full mb-1 flex justify-between text-[11px] font-bold text-zinc-300">
          <span>AP Cost: {state.inventory.equippedWeapon ? 5 : 4} AP / Strike</span>
          <span className="text-red-400 uppercase font-black">
            Enemy: {enemyHp}/{hostileNpc.hp.max} HP
          </span>
        </div>

        <div className="grid grid-cols-8 gap-0.5 border border-red-950 p-1.5 bg-[#030508] rounded shadow-inner">
          {Array.from({ length: 8 }).map((_, rIdx) => (
            <div key={rIdx} className="contents">
              {Array.from({ length: 8 }).map((_, cIdx) => {
                const isPlayer = playerGrid.x === cIdx && playerGrid.y === rIdx;
                const isEnemy = enemyGrid.x === cIdx && enemyGrid.y === rIdx;
                const distToEnemy = Math.abs(playerGrid.x - enemyGrid.x) + Math.abs(playerGrid.y - enemyGrid.y);
                const showAttackRange = distToEnemy <= 1 && isPlayer;

                return (
                  <div
                    key={cIdx}
                    className={`w-8 h-8 flex items-center justify-center transition-all rounded-[3px] text-xs font-mono relative ${
                      isPlayer
                        ? 'bg-emerald-950/50 border border-emerald-500/50 animate-pulse'
                        : isEnemy
                        ? 'bg-red-950/50 border border-red-500/50'
                        : (cIdx + rIdx) % 2 === 0
                        ? 'bg-[#060a0f]'
                        : 'bg-[#090e14]'
                    }`}
                  >
                    {isPlayer && <span className="text-base select-none">🔫🙍‍♂️</span>}
                    {isEnemy && <span className="text-base select-none">{hostileNpc.emoji}</span>}
                    {showAttackRange && (
                      <div className="absolute -inset-0.5 border border-red-500/60 rounded animate-ping pointer-events-none" />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <p className="text-[9.5px] text-zinc-300 mt-2 italic text-center leading-snug">
          Use W, A, S, D on keyboard to reposition 🔫🙍‍♂️.<br />Target 👹 and pull trigger when ready.
        </p>
      </div>
    </div>
  );
};

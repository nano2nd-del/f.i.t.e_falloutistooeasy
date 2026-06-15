import React from 'react';
import { Agent, AgentType, AGENT_COLORS } from '../../engine/types';

const AGENT_EMOJIS: Record<AgentType, string> = {
  [AgentType.VaultDweller]: '🧍‍♂️',
  [AgentType.Raider]: '🏃‍➡️',
  [AgentType.Wastelander]: '🕴',
  [AgentType.Scavenger]: '🕵️‍♂️',
  [AgentType.Caravan]: '🐂👨‍🦽',
  [AgentType.TownGuard]: '🧝',
  [AgentType.Critter]: '🦂',
  [AgentType.Enemy]: '🧟',
  [AgentType.SuperMutant]: '🧌',
  [AgentType.Nightkin]: '😈'
};

interface AgentLayerProps {
  localAgents: Agent[];
  cx: number;
  cy: number;
  landmarkPresent: boolean;
  npcScale: number;
  showAgentEmojis: boolean;
  shadowEnabled: boolean;
}

export const AgentLayer: React.FC<AgentLayerProps> = ({
  localAgents,
  cx,
  cy,
  landmarkPresent,
  npcScale,
  showAgentEmojis,
  shadowEnabled,
}) => {
  if (localAgents.length === 0) return null;

  return (
    <g className="pointer-events-none" id="agent_layer_group">
      {localAgents.slice(0, 4).map((agent, index) => {
        const count = Math.min(localAgents.length, 4);
        const dispersion = count > 1 ? (4.0 * npcScale) : 0;
        const angle = (2 * Math.PI * index) / count;
        const dotX = cx + dispersion * Math.cos(angle);
        const dotY = cy + (landmarkPresent ? 8 : 0) + dispersion * Math.sin(angle);

        const color = AGENT_COLORS[agent.type] || '#b45309';

        if (showAgentEmojis) {
          return (
            <g key={agent.id} transform={`translate(${dotX}, ${dotY})`} id={`agent_marker_${agent.id}`}>
              <circle r={(4.5 * npcScale).toFixed(1)} fill="black" stroke={color} strokeWidth="0.5" />
              <text 
                fontSize={(6.5 * npcScale).toFixed(1)} 
                textAnchor="middle" 
                dominantBaseline="central" 
                y="0.3"
                style={{
                  textShadow: shadowEnabled ? '1px 1px 2px rgba(0,0,0,0.9)' : 'none'
                }}
              >
                {AGENT_EMOJIS[agent.type] || '❓'}
              </text>
            </g>
          );
        } else {
          return (
            <circle
              key={agent.id}
              cx={dotX}
              cy={dotY}
              r="2.5"
              fill={color}
              stroke="black"
              strokeWidth="0.4"
              className="animate-pulse"
              id={`agent_dot_${agent.id}`}
            />
          );
        }
      })}
    </g>
  );
};

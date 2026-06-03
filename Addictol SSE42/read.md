Addictol Configuration Patch (Fallout 4 – Next‑Gen)

IMPORTANT:
requires Addictol: https://www.nexusmods.com/fallout4/mods/84214?tab=files

MASSIVE RESPECT TO perchik71, who gave me permission to recompile. 

If you use HighFPSPhysicsFix, set:

Code
PipBoyFPS = 60
to avoid animation and camera issues.


This repository contains a custom Addictol configuration and patched DLL designed to stabilize Fallout 4 (1.11.221) on modern setups. The goal was to eliminate the UI and Scaleform crashes that I only seemed to have.

This config is specifically for:

Pip‑Boy camera issues
Terminal white screens
Scaleform/BSScaleformTextureManager crashes
BA2 decompression instability
General UI timing problems


What This Includes
Addictol.toml

Addictol.dll 

Drop both into your Data/F4SE/Plugins folder.

Pip‑Boy & UI Stability
Several Addictol modules that touch the Pip‑Boy or UI were left enabled, but the ones that modify memory allocation or timing were disabled. This combination prevents the “Pip‑Boy in your face” bug and the terminal white‑screen issue.

General Stability Fixes
All of Addictol’s core crash fixes remain enabled:
ActorIsHostileToActor
BGSAIWorldLocationRefRadius
CellInit
MovementPlanner
MagicEffectApplyEvent
EncounterZoneReset
UtilityShader
ManyItems
SafeExit

These are safe and recommended for any load order.

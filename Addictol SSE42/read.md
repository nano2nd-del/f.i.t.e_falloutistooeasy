Addictol Configuration Patch (Fallout 4 – Next‑Gen)

IMPORTANT:
requires Addictol: https://www.nexusmods.com/fallout4/mods/84214?tab=files

MASSIVE RESPECT TO perchik71, who gave me permission to recompile. 

If you use HighFPSPhysicsFix, set:

Code
PipBoyFPS = 60
to avoid animation and camera issues.


This repository contains a custom Addictol configuration and patched DLL designed to stabilize Fallout 4 (1.11.221) on modern setups. The goal was to eliminate the UI and Scaleform crashes that I only seemed to have.

This config is tuned specifically for:

Pip‑Boy camera issues

Terminal white screens

Scaleform/BSScaleformTextureManager crashes

BA2 decompression instability

General UI timing problems

If you’ve been dealing with any of those, this setup should save you a headache.

What This Includes
Addictol.toml

Addictol.dll 

Drop both into your Data/F4SE/Plugins folder.
Changes Made
Below is a quick breakdown of the settings that were adjusted and the reasoning behind each one.

Disabled: LibDeflate
Code
bLibDeflate = false
Addictol’s libdeflate replacement is fast, but it caused instability when paired with the Next‑Gen BA2 changes and certain UI mods. Disabling it removes a major source of random CTDs.

Disabled: Scaleform Allocator
Code
bScaleformAllocator = false
The custom allocator can improve performance, but it also interacts with Pip‑Boy, terminals, and menus. With the new engine update, it became a frequent crash point. Keeping it off avoids BSScaleformTextureManager failures.

Disabled: BA2 Timing Hooks
Code
bBA2Timing = false
These hooks are useful for profiling but unnecessary for gameplay. Turning them off removes another potential conflict with the updated archive system.

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

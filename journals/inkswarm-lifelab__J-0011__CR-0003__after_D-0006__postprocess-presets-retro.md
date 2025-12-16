# CR-0003 — Code Review (after D-0006)

## Scope of this CR
We reviewed the new postprocess stack (trails + glow + present), plus the new preset/UI wiring, focusing on:
- correctness (resource hazards, bind groups, resizing)
- performance (avoid unnecessary per-frame allocations)
- maintainability (clear separation of sim vs postprocess)
- “fail-closed” constraints (WebGPU-only)

## Findings → actions applied
### 1) Bind group index correctness (high impact)
**Finding:** WGSL uses distinct groups for sim/render/post; the TS side must set bind groups at the matching indices.  
**Fix applied:** Unified pipeline layout with 3 groups and consistent `setBindGroup` usage:
- group(0): compute sim bind group
- group(1): particle render bind group
- group(2): postprocess bind group

### 2) Postprocess texture sampling hazards (correctness)
**Finding:** If a shader samples from a texture that is simultaneously the render target, it’s invalid.  
**Fix applied:**
- Post bind group includes an “aux” texture binding kept **different from the render target** of each pass.
- `fs_decay` / `fs_glow` intentionally touch the aux binding so the bind group layout stays stable across post passes.

### 3) Resize safety
**Finding:** Trail/glow targets must be recreated when the canvas pixel size changes.  
**Fix applied:** `ensureTargets()` recreates trail A/B + glow textures and clears them.

### 4) UI interaction
**Finding:** HUD was `pointer-events: none`, preventing interaction.  
**Fix applied:** `.hud-card { pointer-events: auto; }` and added pill button styles.

### 5) Type clarity
**Finding:** A couple implicit-any parameters in App were avoidable.  
**Fix applied:** Added explicit WebGPU event/lost types.

## Net result
- Visual stack is more reliable and better structured.
- Preset switching is stable and low-friction.
- WebGPU-only constraint remains intact (no fallback sim).

## Recommended next (not implemented here)
- Add keyboard shortcuts for presets (1–5)
- Add a lightweight perf readout in the HUD (dt, fps, GPU timestamps if available)

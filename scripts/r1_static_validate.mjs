/*
  R1 static validator (no npm install required)
  ------------------------------------------------
  This script performs lightweight, dependency-free checks to catch
  obvious release blockers without executing the app.

  Usage:
    node scripts/r1_static_validate.mjs
    npm run validate:r1
*/

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function readText(rel) {
  const p = path.join(ROOT, rel);
  return fs.readFileSync(p, "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function must(cond, msg) {
  if (!cond) throw new Error(msg);
}

function hasAll(text, needles) {
  return needles.every((n) => text.includes(n));
}

const results = [];
function check(name, fn) {
  try {
    fn();
    results.push({ name, ok: true });
  } catch (e) {
    results.push({ name, ok: false, err: String(e?.message ?? e) });
  }
}

check("repo structure", () => {
  must(exists("src/app/App.tsx"), "missing src/app/App.tsx");
  must(exists("src/ui/OverlayHud.tsx"), "missing src/ui/OverlayHud.tsx");
  must(exists("src/gpu/webgpu.ts"), "missing src/gpu/webgpu.ts");
  must(exists("README.md"), "missing README.md");
  must(exists("VERSIONING.md"), "missing VERSIONING.md");
  must(exists("CHANGELOG.md"), "missing CHANGELOG.md");
});

check("WebGPU hard-fail screen mentioned", () => {
  const readme = readText("README.md");
  must(
    readme.toLowerCase().includes("hard-fail") || readme.toLowerCase().includes("hard fail"),
    "README should mention hard-fail (no fallback sim)"
  );
});

check("WebGPU swapchain supports screenshot readback", () => {
  const webgpu = readText("src/gpu/webgpu.ts");
  must(webgpu.includes("GPUTextureUsage.COPY_SRC"), "webgpu.ts should include COPY_SRC usage");
  must(
    /usage\s*:\s*GPUTextureUsage\.RENDER_ATTACHMENT\s*\|\s*GPUTextureUsage\.COPY_SRC/.test(webgpu),
    "context.configure usage should include RENDER_ATTACHMENT | COPY_SRC"
  );
});

check("Screenshot UX is present", () => {
  const app = readText("src/app/App.tsx");
  const hud = readText("src/ui/OverlayHud.tsx");
  must(hasAll(hud, ["Screenshot", "(P)"]), "HUD should expose Screenshot (P)");
  must(
    app.includes("KeyP") ||
      app.includes("key === \"p\"") ||
      app.includes("k === \"p\"") ||
      app.includes("k===\"p\""),
    "App should bind hotkey P"
  );
});

check("Diagnostics UX is present", () => {
  const app = readText("src/app/App.tsx");
  const hud = readText("src/ui/OverlayHud.tsx");
  must(hasAll(hud, ["Diagnostics", "(D)"]), "HUD should expose Diagnostics (D)");
  must(
    app.includes("KeyD") ||
      app.includes("key === \"d\"") ||
      app.includes("k === \"d\"") ||
      app.includes("k===\"d\""),
    "App should bind hotkey D"
  );
});

check("Hero/Stress UX is present", () => {
  const app = readText("src/app/App.tsx");
  const hud = readText("src/ui/OverlayHud.tsx");
  must(hud.includes("Hero") && hud.includes("Stress"), "HUD should include Hero/Stress buttons");
  must(
    app.includes("Digit1") || app.includes("key === \"1\"") || app.includes("k === \"1\""),
    "App should bind hotkey 1"
  );
  must(
    app.includes("Digit2") || app.includes("key === \"2\"") || app.includes("k === \"2\""),
    "App should bind hotkey 2"
  );
});

check("No license policy is documented", () => {
  const readme = readText("README.md");
  must(readme.toLowerCase().includes("no license"), "README should state 'no license for now'");
  must(!exists("LICENSE") && !exists("LICENSE.md"), "Repo should not include LICENSE files (intentional)"
  );
});

check("R1 delivery doc exists", () => {
  must(exists("docs/R1_DELIVERY.md"), "missing docs/R1_DELIVERY.md");
});

// Output
const ok = results.every((r) => r.ok);
console.log("\nInkswarm LifeLab — R1 Static Validation\n----------------------------------");
for (const r of results) {
  if (r.ok) console.log(`✅ ${r.name}`);
  else console.log(`❌ ${r.name}: ${r.err}`);
}
console.log("----------------------------------");
console.log(ok ? "PASS" : "FAIL");

process.exitCode = ok ? 0 : 1;

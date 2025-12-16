type HudInfo = {
  title: string;
  status: string;
  mode: string;
};

export type PresetInfo = { id: number; name: string };

export function OverlayHud({
  info,
  presets,
  presetId,
  onPreset,
  profile,
  diagnosticsOn,
  diagnosticsLines,
  onProfile,
  onToggleDiagnostics,
  onScreenshot,
}: {
  info: HudInfo;
  presets: PresetInfo[];
  presetId: number;
  onPreset: (id: number) => void;

  profile: "hero" | "stress";
  diagnosticsOn: boolean;
  diagnosticsLines: string[];
  onProfile: (p: "hero" | "stress") => void;
  onToggleDiagnostics: () => void;
  onScreenshot: () => void;
}) {
  return (
    <div className="hud-root" role="presentation">
      <div className="hud-card">
        <div className="hud-title">{info.title}</div>

        <div className="hud-row">
          <span className="hud-label">Status</span>
          <span className="hud-value">{info.status}</span>
        </div>
        <div className="hud-row">
          <span className="hud-label">Mode</span>
          <span className="hud-value">{info.mode}</span>
        </div>

        <div className="hud-divider" />

        <div className="hud-row hud-row--stack">
          <span className="hud-label">Controls</span>
          <div className="hud-actions" role="group" aria-label="Controls">
            <button className="hud-btn" type="button" onClick={onScreenshot}>
              Screenshot (P)
            </button>
            <button
              className={"hud-btn " + (diagnosticsOn ? "hud-btn--active" : "")}
              type="button"
              onClick={onToggleDiagnostics}
            >
              Diagnostics (D)
            </button>
            <button
              className={"hud-btn " + (profile === "hero" ? "hud-btn--active" : "")}
              type="button"
              onClick={() => onProfile("hero")}
            >
              Hero (1)
            </button>
            <button
              className={"hud-btn " + (profile === "stress" ? "hud-btn--active" : "")}
              type="button"
              onClick={() => onProfile("stress")}
            >
              Stress (2)
            </button>
          </div>
        </div>

        <div className="hud-row hud-row--stack">
          <span className="hud-label">Preset</span>
          <div className="hud-presets" role="group" aria-label="Visual presets">
            {presets.map((p) => (
              <button
                key={p.id}
                className={"hud-pill " + (p.id === presetId ? "hud-pill--active" : "")}
                onClick={() => onPreset(p.id)}
                type="button"
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {diagnosticsOn ? (
          <>
            <div className="hud-divider" />
            <div className="hud-diag" aria-label="Diagnostics overlay">
              {diagnosticsLines.map((l, i) => (
                <div key={i} className="hud-diag-line">
                  {l}
                </div>
              ))}
            </div>
          </>
        ) : null}

        <div className="hud-divider" />

        <div className="hud-hint">
          WebGPU-only. Hotkeys: P screenshot · D diagnostics · 1/2 hero/stress · click presets.
        </div>
      </div>
    </div>
  );
}

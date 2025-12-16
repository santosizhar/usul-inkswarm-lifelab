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
}: {
  info: HudInfo;
  presets: PresetInfo[];
  presetId: number;
  onPreset: (id: number) => void;
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

        <div className="hud-divider" />

        <div className="hud-hint">
          D-0006 is live: ink trails + soft glow. Next: screenshot export (D-0007) and diagnostics overlay (D-0008).
        </div>
      </div>
    </div>
  );
}

type HudInfo = {
  title: string;
  status: string;
  mode: string;
};

export function OverlayHud({ info }: { info: HudInfo }) {
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

        <div className="hud-hint">
          D-0002 will initialize WebGPU. If unsupported, we will hard-fail with a polished explanation screen (no fallback sim).
        </div>
      </div>
    </div>
  );
}

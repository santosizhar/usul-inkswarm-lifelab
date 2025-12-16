type FailInfo = {
  title: string;
  message: string;
  detail?: string;
};

const SUPPORT_CHECKLIST = [
  { label: "Use a Chromium-based browser (Chrome / Edge) updated to the latest stable.", key: "browser" },
  { label: "Update GPU drivers (especially on Windows laptops).", key: "drivers" },
  { label: "Avoid remote desktops / virtualized GPUs if possible.", key: "vm" },
  { label: "If your org disables WebGPU, ask for policy/flag enablement.", key: "policy" },
];

export function FailScreen({ info }: { info: FailInfo }) {
  return (
    <div className="fail-root" role="alert">
      <div className="fail-card">
        <div className="fail-title">{info.title}</div>
        <div className="fail-subtitle">WebGPU is required for Inkswarm LifeLab.</div>

        <div className="fail-block">
          <div className="fail-label">What happened</div>
          <div className="fail-message">{info.message}</div>
          {info.detail ? <pre className="fail-detail">{info.detail}</pre> : null}
        </div>

        <div className="fail-block">
          <div className="fail-label">Try this</div>
          <ul className="fail-list">
            {SUPPORT_CHECKLIST.map((x) => (
              <li key={x.key}>{x.label}</li>
            ))}
          </ul>
        </div>

        <div className="fail-footer">
          <span className="fail-pill">No fallback simulation</span>
          <span className="fail-pill">Fail-closed by design</span>
        </div>
      </div>
    </div>
  );
}

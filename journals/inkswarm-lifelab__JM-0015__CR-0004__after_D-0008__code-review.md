# inkswarm-lifelab — JM-0015 — CR-0004 (after D-0008)

Use this prompt to re-run the CR-0004 review on another machine/chat.

---

You are reviewing Inkswarm LifeLab **after D-0008**.

1) Verify screenshot export:
- Press P → PNG downloads.
- Overlay block contains preset/profile and (if enabled) diagnostics.
- Export works with WebGPU readback (no canvas.toDataURL shortcut assumptions).

2) Verify diagnostics toggle:
- Toggle D repeatedly.
- Confirm no WebGPU re-init and no progressive slowdown.

3) Verify profiles:
- Press 1 (Hero), 2 (Stress), multiple times.
- Confirm deterministic reseed per profile and trails clear cleanly.

4) Verify stability:
- Run in Stress for 30–60s.
- Watch for NaNs/black frames/device lost.

Report:
- 15 improvements
- 10 still excellent
- 5 elegance/polish
Then state whether CR passes and list any must-fix items.

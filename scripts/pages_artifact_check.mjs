import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const indexPath = path.join(root, "docs", "index.html");

if (!fs.existsSync(indexPath)) {
  console.error("[pages] Missing docs/index.html. Did you run `npm run build`?");
  process.exit(1);
}

console.log("[pages] OK: docs/index.html exists");

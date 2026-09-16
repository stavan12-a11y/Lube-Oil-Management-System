import { readFileSync, writeFileSync } from "node:fs";

const path = new URL("../package.json", import.meta.url);
const pkg = JSON.parse(readFileSync(path, "utf8"));
delete pkg.type;
writeFileSync(path, `${JSON.stringify(pkg, null, 2)}\n`);

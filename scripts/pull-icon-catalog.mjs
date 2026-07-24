/**
 * Pulls communityIconCatalog.json from the guardian SSOT.
 *
 * Resolution order (no machine-specific paths in repo):
 *   1) GUARDIAN_ICON_CATALOG — full path to community_icon_catalog.json
 *   2) GUARDIAN_ROOT — guardian repo root
 *   3) ../guardian — conventional sibling clone
 *
 * Usage: npm run sync:icons
 */
import { copyFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dest = resolve(repoRoot, 'src/shared/config/communityIconCatalog.json');
const relativeFromGuardian =
    'lib/shared/catalog/community_icon_catalog.json';

const candidates = [];

if (process.env.GUARDIAN_ICON_CATALOG) {
    candidates.push(resolve(process.env.GUARDIAN_ICON_CATALOG));
}
if (process.env.GUARDIAN_ROOT) {
    candidates.push(resolve(process.env.GUARDIAN_ROOT, relativeFromGuardian));
}
candidates.push(resolve(repoRoot, '../guardian', relativeFromGuardian));

const src = candidates.find((p) => existsSync(p));
if (!src) {
    console.error(`Could not find guardian icon catalog SSOT.
Tried:
${candidates.map((p) => `  - ${p}`).join('\n')}

Set GUARDIAN_ROOT to your guardian clone, or GUARDIAN_ICON_CATALOG to the JSON file,
or clone guardian as a sibling folder named "guardian" (../guardian).`);
    process.exit(1);
}

copyFileSync(src, dest);
console.log(`Synced icon catalog:\n  ${src}\n→ ${dest}`);

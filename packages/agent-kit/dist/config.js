import * as fs from 'fs';
import * as path from 'path';
const DEFAULT_CONFIG = {
    version: '1.0',
    activePlans: [],
    archivedPlans: [],
    worktrees: [],
};
export function getConfigPath(registry) {
    return registry ?? path.join('.codevoyant', 'codevoyant.json');
}
export function readConfig(configPath) {
    if (!fs.existsSync(configPath))
        return { ...DEFAULT_CONFIG };
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
}
export function writeConfig(configPath, config) {
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    const tmp = `${configPath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(config, null, 2) + '\n');
    fs.renameSync(tmp, configPath);
}
export function readSettings(dir = '.codevoyant') {
    const p = path.join(dir, 'settings.json');
    if (!fs.existsSync(p))
        return {};
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
}
export function writeSettings(settings, dir = '.codevoyant') {
    fs.mkdirSync(dir, { recursive: true });
    const p = path.join(dir, 'settings.json');
    const tmp = `${p}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(settings, null, 2) + '\n');
    fs.renameSync(tmp, p);
}
//# sourceMappingURL=config.js.map
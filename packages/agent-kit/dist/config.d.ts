import type { CodevoyantConfig, CodevoyantSettings } from './types.js';
export declare function getConfigPath(registry?: string): string;
export declare function readConfig(configPath: string): CodevoyantConfig;
export declare function writeConfig(configPath: string, config: CodevoyantConfig): void;
export declare function readSettings(dir?: string): CodevoyantSettings;
export declare function writeSettings(settings: CodevoyantSettings, dir?: string): void;
//# sourceMappingURL=config.d.ts.map
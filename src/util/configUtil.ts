import Ripple from '../objects/ripple';
import configJson from '../config.json'; // Ensure your tsconfig supports JSON import
import { deepMerge } from './util';
import { getMenuConfig } from '../menu';
// TypeScript
import { objectManager } from '..';
import { setupCanvas } from './canvasUtil';

// Interfaces for the configuration structure
interface Config {
    objectDensities: ObjectDensities;
    environment: EnvironmentConfig;
    fish: FishConfig;
    wave: WaveConfig;
    ripple: RippleConfig;
    petal: PetalConfig;
    lantern: LanternConfig;
    selectedTheme: string;
    themes: { [themeName: string]: PartialConfig };
}

export type PartialConfig = {
    [P in keyof Config]?: Partial<Config[P]>;
};

interface ObjectDensities {
    fishPerSquareInch: number;
    petalsPerSquareInch: number;
    minWaveCount: number;
    wavesPerSquareInch: number;
}

interface EnvironmentConfig {
    backgroundImageUrl: string;
    surfaceColor: string;
}

interface FishConfig {
    proportions: FishProportions;
    bodyColors: string[];
    finColors: string[];
    decorationColors: string[];
    followDistance: number;
    drawSimplified: boolean;
    drawLeaderFollowerLinks: boolean;
}

interface FishProportions {
    headCurveAnchorLength: number;
    trunkWidth: number;
    trunkLength: number;
    tailLength: number;
    finLength: number;
    tailFinLength: number;
}

interface WaveConfig {
    speeds: number[];
    riverMode: boolean;
    colors: string[];
    colorVariation: number;
}

interface RippleConfig {
    color: string;
    maxOpacity: number;
}

interface PetalConfig {
    speeds: number[];
    oscillationPeriods: number[];
    colors: string[];
    colorVariation: number;
    sizes: number[];
    maxOscillation: number;
}

interface LanternConfig {
    include: boolean;
    minShadowOpacity: number;
    maxShadowOpacity: number;
    glowColor: string;
}

// The base config specified by config.json, this would have all default values
const baseConfig: Config = configJson as Config;

// The manual theme specified by the user (via the menu dropdown)
let manualTheme: string = baseConfig.selectedTheme; // initialize as the manual theme

// The activeConfig is what is actually being used
let activeConfig = deepMerge(baseConfig, baseConfig.themes[manualTheme]);

export function getConfig(): Config {
    return activeConfig;
}

export function getManualTheme(): string {
    return manualTheme;
}

export const setActiveConfig = () => {
    const themeConfig: PartialConfig = baseConfig.themes[manualTheme];
    const menuConfig: PartialConfig = getMenuConfig();

    // precedence: baseConfig < themeConfig < menuConfig
    const merge1 = deepMerge(baseConfig, themeConfig);
    const merge2 = deepMerge(merge1, menuConfig);
    activeConfig = merge2;
};

export const setManualTheme = (theme: string) => {
    if (theme === manualTheme) {
        // do nothing
        return;
    }
    manualTheme = theme;

    setActiveConfig();
    setupCanvas();

    if (objectManager) {
        objectManager.resetEnvironment();
    }
};

setManualTheme(manualTheme);

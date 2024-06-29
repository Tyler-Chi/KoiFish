type Callback = () => void;

// Top to bottom
export enum DrawLayer {
    DEV,
    LANTERN,
    FOOD,
    PETAL,
    WAVE,
    WATER_SURFACE,
    RIPPLE,
    LANTERN_SHADOW,
    FISH,
}

const layerDrawOrder = Object.keys(DrawLayer)
    .filter((key) => isNaN(Number(key))) // Filter out numeric keys
    .map((key) => DrawLayer[key as keyof typeof DrawLayer]) // Map to enum values
    .reverse(); // Reverse, because "bottom" layers need to be drawn FIRST

export default class DrawManager {
    // Map of layer to lists of draw callbacks to invoke
    private scheduledDraws: Map<DrawLayer, Callback[]>;

    constructor() {
        this.scheduledDraws = new Map<DrawLayer, Callback[]>();
    }

    scheduleDraw = (layer: DrawLayer, drawCallback: Callback): void => {
        const scheduledDrawsAtLayer = this.scheduledDraws.get(layer) || [];
        scheduledDrawsAtLayer.push(drawCallback);
        this.scheduledDraws.set(layer, scheduledDrawsAtLayer);
    };

    executeScheduledDraws = (): void => {
        for (const drawLayer of layerDrawOrder) {
            const scheduledDrawsAtLayer =
                this.scheduledDraws.get(drawLayer) || [];
            for (const scheduledDraw of scheduledDrawsAtLayer) {
                scheduledDraw();
            }
        }

        this.scheduledDraws.clear();
    };
}

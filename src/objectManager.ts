import {
    canvas,
    getAdjacentIndices,
    getCellIndex,
    getTotalSquareInches,
} from './util/canvasUtil';

import { DrawLayer } from './drawManager';
import Food from './objects/food';
import KoiFish from './objects/koifish';
import Lantern from './objects/lantern';
import Petal from './objects/petal';
import Point from './geometry/Point';
import Ripple from './objects/ripple';
import Wave from './objects/wave';
import { drawManager } from '.';
import { fillEntireCanvas } from './util/drawUtil';
import { getConfig } from './util/configUtil';

export interface EnvironmentObject {
    position: Point;
    id: string;
}

type EnvironmentObjectConstructor<T> = new (...args: any[]) => T;

interface ObjectCounts {
    koiFishCount: number;
    petalCount: number;
    waveCount: number;
    lanternCount: number;
}

// manages the number of objects in the environment
// also manages the relationship between objects in the environment
export default class ObjectManager {
    koiFishMap: Map<string, KoiFish>;
    petalMap: Map<string, Petal>;
    waveMap: Map<string, Wave>;
    foodMap: Map<string, Food>;
    rippleMap: Map<string, Ripple>;
    lanternMap: Map<string, Lantern>;

    // Map of cell indices to lists of EnvironmentObjects in that cell index
    private locationMap: Map<number, EnvironmentObject[]>;

    constructor() {
        this.koiFishMap = new Map<string, KoiFish>();
        this.petalMap = new Map<string, Petal>();
        this.waveMap = new Map<string, Wave>();
        this.foodMap = new Map<string, Food>();
        this.rippleMap = new Map<string, Ripple>();
        this.lanternMap = new Map<string, Lantern>();

        this.locationMap = new Map<number, EnvironmentObject[]>();
    }

    getDesiredObjectCounts = (): ObjectCounts => {
        const squareInches = getTotalSquareInches();

        const {
            fishPerSquareInch,
            petalsPerSquareInch,
            minWaveCount,
            wavesPerSquareInch,
        } = getConfig().objectDensities;

        const lanternCount = getConfig().lantern.include ? 1 : 0;

        return {
            koiFishCount: Math.ceil(squareInches * fishPerSquareInch),
            petalCount: Math.ceil(squareInches * petalsPerSquareInch),
            waveCount:
                Math.ceil(squareInches * wavesPerSquareInch) + minWaveCount,
            lanternCount,
        };
    };

    // To be used when a fresh initialization is needed
    initializeObjects = (): void => {
        // Calculate how many of each item to add to the environment.
        const { koiFishCount, petalCount, waveCount, lanternCount } =
            this.getDesiredObjectCounts();

        Array.from({ length: koiFishCount }, () => {
            const koiFish = new KoiFish();
            this.koiFishMap.set(koiFish.id, koiFish);
        });

        // Waves are a bit more finicky, some need to start off screen to replace the ones leaving the screen
        const offScreenWaveCount = Math.floor(waveCount * 0.2);
        const onScreenWaveCount = waveCount - offScreenWaveCount;

        Array.from({ length: offScreenWaveCount }, () => {
            const offScreenWave = new Wave();
            offScreenWave.prepareReentry();
            this.waveMap.set(offScreenWave.id, offScreenWave);
        });
        Array.from({ length: onScreenWaveCount }, () => {
            const wave = new Wave();
            this.waveMap.set(wave.id, wave);
        });

        Array.from({ length: petalCount }, () => {
            const petal = new Petal();
            this.petalMap.set(petal.id, petal);
        });

        Array.from({ length: lanternCount }, () => {
            const lantern = new Lantern();
            this.lanternMap.set(lantern.id, lantern);
        });
    };

    initializeLanterns = (): void => {
        const { lanternCount } = this.getDesiredObjectCounts();

        Array.from({ length: lanternCount }, () => {
            const lantern = new Lantern();
            this.lanternMap.set(lantern.id, lantern);
        });
    };

    resetEnvironment = (): void => {
        this.koiFishMap.clear();
        this.waveMap.clear();
        this.petalMap.clear();
        this.foodMap.clear();
        this.rippleMap.clear();
        this.lanternMap.clear();
        this.initializeObjects();
    };

    addObjectToLocationMap = (object: EnvironmentObject): void => {
        const cellIndex = getCellIndex(object.position);
        const objectList = this.locationMap.get(cellIndex);
        if (objectList) {
            objectList.push(object);
        } else {
            this.locationMap.set(cellIndex, [object]);
        }
    };

    getNearbyObjects = <T extends EnvironmentObject>(
        sourceObject: EnvironmentObject,
        targetClass: EnvironmentObjectConstructor<T>,
        range: number = 1,
    ): T[] => {
        const cellIndex = getCellIndex(sourceObject.position);
        const adjacentIndices = getAdjacentIndices(cellIndex, range);

        let nearbyObjects: T[] = [];
        adjacentIndices.forEach((adjacentIndex: number) => {
            const objectsAtCell = this.locationMap.get(adjacentIndex) || [];
            nearbyObjects.push(
                ...objectsAtCell.filter(
                    (obj): obj is T =>
                        obj instanceof targetClass &&
                        obj.id !== sourceObject.id,
                ),
            );
        });

        return nearbyObjects;
    };

    setupEventListeners = () => {
        canvas.addEventListener('click', (event) => {
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = canvas.height - (event.clientY - rect.top);
            this.addFood(new Point(x, y));
        });
    };

    addFood = (point: Point): void => {
        const newFood = new Food(point);
        this.foodMap.set(newFood.id, newFood);
    };

    removeFood = (food: Food): void => {
        this.foodMap.delete(food.id);
    };

    addRipple = (ripple: Ripple): void => {
        this.rippleMap.set(ripple.id, ripple);
    };

    removeRipple = (ripple: Ripple): void => {
        this.rippleMap.delete(ripple.id);
    };

    updateAllObjects = (): void => {
        // clear the old locations
        this.locationMap.clear();

        // Objects for which we have to track the location of (because they interact)
        for (const environmentObject of [
            ...this.koiFishMap.values(),
            ...this.foodMap.values(),
            ...this.lanternMap.values(),
        ]) {
            this.addObjectToLocationMap(environmentObject);
        }

        // All objects that need updates
        for (const environmentObject of [
            ...this.koiFishMap.values(),
            ...this.foodMap.values(),
            ...this.lanternMap.values(),
            ...this.rippleMap.values(),
            ...this.waveMap.values(),
            ...this.petalMap.values(),
        ]) {
            environmentObject.update();
        }

        // All objects that generate ripples
        for (const rippleObject of [
            ...this.koiFishMap.values(),
            ...this.lanternMap.values(),
        ]) {
            rippleObject.generateRipples();
        }
    };

    drawAllObjects = (): void => {
        const allObjects = [
            ...this.koiFishMap.values(),
            ...this.waveMap.values(),
            ...this.rippleMap.values(),
            ...this.petalMap.values(),
            ...this.foodMap.values(),
            ...this.lanternMap.values(),
        ];

        // blue hue to mimic the water
        const waterColor = getConfig().environment.surfaceColor;
        drawManager.scheduleDraw(DrawLayer.WATER_SURFACE, () => {
            fillEntireCanvas(waterColor);
        });

        for (const object of allObjects) {
            object.draw();
        }
    };
}

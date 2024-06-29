import {
    BRIGHT_FIRE_COLOR,
    DARK_FIRE_COLOR,
    LANTERN_WALL_COLOR,
    ORANGE,
    WOOD_COLOR,
    WOOD_EDGE_COLOR,
    applyOpacity,
    incrementRGB,
} from '../util/colorUtil';
import Point, { Corners, SquarePoints } from '../geometry/Point';
import {
    brightenCircle,
    drawLantern,
    drawLanternShadow,
    drawPoint,
    getSquarePoints,
} from '../util/drawUtil';
import {
    ctx,
    getCanvasDiagonalLength,
    getDistanceToCanvasBorder,
} from '../util/canvasUtil';
import { drawManager, objectManager } from '..';
import { getRandomItem, getRandomNumber } from '../util/randomUtil';

import { DrawLayer } from '../drawManager';
import { EnvironmentObject } from '../objectManager';
import Ripple from './ripple';
import Vector from '../geometry/Vector';
import { generateUuid } from '../util/randomUtil';
import { getConfig } from '../util/configUtil';
import { getElapsedSeconds } from '../util/timeUtil';
import { scaleToRange } from '../util/numberUtil';

export interface LanternDrawInfo {
    center: Point;
    // wooden base
    woodenBaseSquare: SquarePoints;
    woodenBaseColor: string;
    // lines on the wooden base, to imitate planks
    woodJoinColor: string;
    leftWoodJoinPoints: Point[];
    rightWoodJoinPoints: Point[];
    // lamp sitting on top of the wooden base
    lightColor: string;
    lampBaseCorners: Corners;
    lampTopCorners: Corners;
    lampBackWallOpacity: number;
    lampFrontWallOpacity: number;
    lampWallColor: string;
}

export interface ShadowDrawInfo {
    shadowVector: Vector;
    shadowOpacity: number;
}

export const defaultShadowDrawInfo: ShadowDrawInfo = {
    shadowVector: new Vector(17, -17),
    shadowOpacity: 0.2,
};

// The Lantern is composed of a wooden base, with a paper lamp on top of it
class Lantern implements EnvironmentObject {
    public id: string;
    public position: Point;
    private rotationAngle: number;
    private rotationSpeed: number;
    private lastUpdateTime: number;

    private lastLightColorChangeTime: number;
    private lightColor: string;
    private destinationLightColor: string;
    private direction: Vector;
    private lastRippleTime: number;

    constructor() {
        this.id = generateUuid();
        this.position = this.getInitialPosition();

        this.rotationAngle = getRandomNumber(0, 360);
        this.rotationSpeed = getRandomItem([1, -1]) * getRandomNumber(4, 6); // random rotational speed and direction
        this.direction = Vector.getRandomDirection();

        this.lightColor = Lantern.darkestLightColor;
        this.destinationLightColor = Lantern.brightestLightColor;

        this.lastLightColorChangeTime = Date.now();

        this.lastUpdateTime = Date.now();
        this.lastRippleTime = Date.now();
    }

    static sideLength = 55;
    static lightColorChangeGap = 1 / 60; // 60 times a second
    static lanternHeight = 15;
    static wallOpacity = 0.6;
    static lanternSpeed = 8;
    static lanternShadowVector = new Vector(10, -40);

    // The light should bounce between these values
    static darkestLightColor = DARK_FIRE_COLOR;
    static brightestLightColor = BRIGHT_FIRE_COLOR;

    // Ripple behavior
    static rippleGenerationGap = 4;

    static minInitialProximity = 300;

    // Ensure that the lanterns are not initialized too close to each other
    getInitialPosition(): Point {
        let newPoint = Point.getRandomPoint(0.7);
        const otherLanterns = Array.from(
            objectManager.lanternMap.values(),
        ).filter((lantern) => lantern.id !== this.id);
        if (otherLanterns.length) {
            let tries = 0;
            while (tries < 10) {
                newPoint = Point.getRandomPoint(0.7);
                const isValidPoint = otherLanterns.every((otherLantern) => {
                    return (
                        newPoint.getDistanceTo(otherLantern) >
                        Lantern.minInitialProximity
                    );
                });

                if (isValidPoint) {
                    break;
                } else {
                    tries += 1;
                }
            }
        }

        return newPoint;
    }

    updateLightColor(): void {
        this.lightColor = incrementRGB(
            this.lightColor,
            this.destinationLightColor,
            Math.round(getRandomNumber(0, 2)),
        );

        // Once the light reaches the destination light coor, then flip it back to the opposite side
        if (this.lightColor === this.destinationLightColor) {
            this.destinationLightColor =
                this.destinationLightColor === Lantern.darkestLightColor
                    ? Lantern.brightestLightColor
                    : Lantern.darkestLightColor;
        }
        this.lastLightColorChangeTime = Date.now();
    }

    update(): void {
        const elapsedSeconds = getElapsedSeconds(this.lastUpdateTime);

        this.rotationAngle =
            (this.rotationAngle + elapsedSeconds * this.rotationSpeed) % 360;

        // Prevent perfect right angles, because it messes up some other maths
        if (this.rotationAngle % 90 === 0) {
            this.rotationAngle += this.rotationSpeed * 0.1;
        }

        if (
            getElapsedSeconds(this.lastLightColorChangeTime) >
            Lantern.lightColorChangeGap
        ) {
            this.updateLightColor();
        }

        // Bounce away from the border if too close
        const distanceToCanvasBorder = getDistanceToCanvasBorder(this.position);
        if (distanceToCanvasBorder < 50) {
            this.direction = this.position.getDirectionTo(
                Point.getRandomPoint(0.7),
            );
        }
        const nearbyLanterns = objectManager.getNearbyObjects(this, Lantern, 7);
        if (nearbyLanterns.length) {
            // bounce away from the first nearbyLantern. maybe do some fancier bouncing later
            let closestLantern = nearbyLanterns[0];
            let closestLanternDistance = this.position.getDistanceTo(
                closestLantern.position,
            );

            for (const nearbyLantern of nearbyLanterns) {
                if (nearbyLantern === closestLantern) {
                    continue;
                }
                const distance = this.position.getDistanceTo(
                    nearbyLantern.position,
                );
                if (distance < closestLanternDistance) {
                    closestLantern = nearbyLantern;
                }
            }

            const closestLanternDirection =
                this.position.getDirectionTo(closestLantern);

            this.direction = closestLanternDirection.rotateVector(180);
        }

        // Update the lantern's position
        this.position.applyVector(
            this.direction.scale(Lantern.lanternSpeed * elapsedSeconds),
            true,
        );

        this.lastUpdateTime = Date.now();
    }

    draw(): void {
        const lanternConfig = getConfig().lantern;

        const woodenBaseSquare = getSquarePoints(
            this.position,
            this.rotationAngle,
            Lantern.sideLength,
        );

        drawManager.scheduleDraw(DrawLayer.LANTERN_SHADOW, () => {
            drawLanternShadow(
                Point.translateAllPoints(
                    Lantern.lanternShadowVector,
                    woodenBaseSquare,
                ),
                lanternConfig.maxShadowOpacity * 0.8,
            );
        });

        const innerGlowColor = lanternConfig.glowColor;
        const outerGlowColor = applyOpacity(innerGlowColor, 0);

        drawManager.scheduleDraw(DrawLayer.WAVE, () => {
            brightenCircle(
                this.position,
                0,
                300,
                innerGlowColor,
                outerGlowColor,
            );
        });

        const lampBase = getSquarePoints(this.position, this.rotationAngle, 33);
        const lampBaseCorners = Point.findCorners(lampBase);
        const lampTopCorners = Point.translateAllPoints(
            Vector.UP.scale(27),
            lampBaseCorners,
        );

        const leftWoodJoinPoints = Point.getEvenlySpacedPoints(
            woodenBaseSquare.corner1,
            woodenBaseSquare.corner2,
            5,
        );

        const rightWoodJoinPoints = Point.getEvenlySpacedPoints(
            woodenBaseSquare.corner4,
            woodenBaseSquare.corner3,
            5,
        );

        const lanternDrawInfo: LanternDrawInfo = {
            center: this.position,
            woodenBaseSquare: woodenBaseSquare,
            woodenBaseColor: WOOD_COLOR,
            woodJoinColor: WOOD_EDGE_COLOR,
            leftWoodJoinPoints: leftWoodJoinPoints,
            rightWoodJoinPoints: rightWoodJoinPoints,
            lightColor: this.lightColor,
            lampBaseCorners: lampBaseCorners,
            lampTopCorners: lampTopCorners,
            lampWallColor: LANTERN_WALL_COLOR, // base color of the walls, opacity will be applied to it
            lampBackWallOpacity: 0.85,
            lampFrontWallOpacity: 0.9,
        };

        drawManager.scheduleDraw(DrawLayer.LANTERN, () => {
            drawLantern(lanternDrawInfo);
        });
    }

    // Dynamic shadow generation.
    // Shadows are generated relative to how far the object is from the lantern
    // The farther away the object is:
    // - the shadow will be more faint (more opaque)
    // - the shadow will be further away from the object
    getShadowDrawInfo(environmentObject: EnvironmentObject): ShadowDrawInfo {
        const lanternConfig = getConfig().lantern;

        const maxDistance = getCanvasDiagonalLength();

        // get the vector from this lantern to the environment object
        const vectorToObject = this.position.getVectorTo(
            environmentObject.position,
        );

        const actualDistance = vectorToObject.getMagnitude();

        const shadowVectorMagnitude = scaleToRange(
            10,
            50,
            actualDistance / maxDistance,
        );

        let shadowOpacity = lanternConfig.minShadowOpacity;
        if (actualDistance < 300) {
            shadowOpacity = scaleToRange(
                lanternConfig.maxShadowOpacity,
                lanternConfig.minShadowOpacity,
                actualDistance / 300,
            );
        }

        return {
            shadowVector: vectorToObject
                .normalize()
                .scale(shadowVectorMagnitude),
            shadowOpacity: shadowOpacity,
        };
    }

    generateRipples(): void {
        if (
            getElapsedSeconds(this.lastRippleTime) > Lantern.rippleGenerationGap
        ) {
            this.lastRippleTime = Date.now();
            const newRipple = new Ripple({
                position: this.position.applyVector(
                    this.direction.scale(Lantern.sideLength),
                ),
                direction: this.direction.clone(),
                speed: Lantern.lanternSpeed * 0.7,
                length: 50,
                initialRippleDispersion: 50,
            });
            objectManager.addRipple(newRipple);
        }
    }
}

export default Lantern;

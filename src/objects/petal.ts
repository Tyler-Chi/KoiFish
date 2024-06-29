import Point, { PointMap } from '../geometry/Point';
import {
    ctx,
    getAdjacentIndices,
    getRiverEntryExitPoints,
    isPointOutOfBounds,
} from '../util/canvasUtil';
import { drawPetal, drawPoint } from '../util/drawUtil';
import {
    generateUuid,
    getRandomItem,
    getRandomNumber,
} from '../util/randomUtil';
import {
    incrementRGB,
    parseConfigColor,
    randomizeRGB,
} from '../util/colorUtil';

import { DrawLayer } from '../drawManager';
import { EnvironmentObject } from '../objectManager';
import Oscillator from '../geometry/Oscillator';
import Vector from '../geometry/Vector';
import { canvas } from '../util/canvasUtil';
import { drawManager } from '..';
import { getConfig } from '../util/configUtil';
import { getElapsedSeconds } from '../util/timeUtil';

// distance from canvas to re-enter at, to make it look smooth
const reentryMargin = 30;

export interface PetalDrawPoints extends PointMap {
    base: Point;
    leftCurveAnchor: Point;
    rightCurveAnchor: Point;
    curveAnchorBase: Point;
    tip: Point;
}

export interface PetalColors {
    baseColor: string;
    tipColor: string;
}

class Petal implements EnvironmentObject {
    public id!: string;
    position!: Point;
    direction!: Vector;
    speed: number;
    lastUpdateTime: number;
    positionalOffsetOscillator: Oscillator;
    petalRotationalPeriod: number; // how many seconds per full rotation
    petalRotationalDirection: number; // direction of rotation

    // purely internal
    drawAngle: number;
    petalLength: number;
    petalCurveAnchorRatio: number;
    petalCurveDistanceRatio: number;
    petalColors: PetalColors;

    constructor(options?: { position?: Point }) {
        this.id = generateUuid();
        this.initializeState(true);

        const petalConfig = getConfig().petal;

        const distanceFromStart = Math.random() * canvas.height * 0.5;

        this.position.applyVector(
            this.direction.scale(distanceFromStart),
            true,
        );

        const petalSpeeds = petalConfig.speeds;
        this.speed = getRandomNumber(petalSpeeds[0], petalSpeeds[1]);
        this.lastUpdateTime = Date.now();

        // purely internal
        this.drawAngle = getRandomNumber(0, 90);

        this.petalLength = getRandomNumber(
            petalConfig.sizes[0],
            petalConfig.sizes[1],
        );
        this.petalCurveAnchorRatio = getRandomNumber(0.6, 0.8);
        this.petalCurveDistanceRatio = getRandomNumber(0.6, 0.7);

        const selectedColor = parseConfigColor(
            getRandomItem(petalConfig.colors),
        );

        const baseColor = randomizeRGB(
            selectedColor,
            petalConfig.colorVariation,
        );
        const tipColor = incrementRGB(baseColor, 'rgb(255,255,255)', 50);

        this.petalColors = {
            baseColor,
            tipColor,
        };

        const positionalOffset = Math.random() * petalConfig.maxOscillation;
        const oscillationPeriod = getRandomNumber(
            petalConfig.oscillationPeriods[0],
            petalConfig.oscillationPeriods[1],
        );

        this.positionalOffsetOscillator = new Oscillator(
            -positionalOffset,
            positionalOffset,
            oscillationPeriod,
        );

        // How many milliseconds per full rotation (360 degrees)
        this.petalRotationalPeriod = getRandomNumber(10, 15);
        this.petalRotationalDirection = getRandomItem([1, -1]);
    }

    update(): void {
        if (isPointOutOfBounds(this.position, 2 * reentryMargin)) {
            this.initializeState();
        }

        const elapsedSeconds = getElapsedSeconds(this.lastUpdateTime);

        this.position.applyVector(
            this.direction.scale(this.speed * elapsedSeconds),
            true,
        );

        const rotationAngle =
            (this.petalRotationalDirection *
                ((elapsedSeconds / this.petalRotationalPeriod) * 360)) %
            360;

        this.drawAngle += rotationAngle;

        this.lastUpdateTime = Date.now(); // Update the last update time after moving
    }

    initializeState(initialTravel: boolean = false): void {
        const { entryPoint, exitPoint } =
            getRiverEntryExitPoints(reentryMargin);
        // travel some distance along
        const directionVector = entryPoint.getVectorTo(exitPoint);

        this.position = entryPoint;
        this.direction = directionVector.normalize();

        if (initialTravel) {
            this.position = Point.getRandomPoint();
            this.direction = Vector.getDownRightDirection();
        }
    }

    draw(): void {
        const tip = this.position.applyVector(
            Vector.UP.scale(this.petalLength),
        );

        const curveAnchorBase = this.position.applyVector(
            Vector.UP.scale(this.petalCurveAnchorRatio * this.petalLength),
        );

        const curveAnchorDistance =
            this.petalCurveDistanceRatio * this.petalLength;

        const leftCurveAnchor = curveAnchorBase.applyVector(
            Vector.LEFT.scale(curveAnchorDistance),
        );
        const rightCurveAnchor = curveAnchorBase.applyVector(
            Vector.RIGHT.scale(curveAnchorDistance),
        );

        const petalDrawPoints: PetalDrawPoints = {
            base: this.position,
            leftCurveAnchor,
            curveAnchorBase,
            tip,
            rightCurveAnchor,
        };

        const rotatedDrawPoints = Point.rotateAllPoints(
            this.position,
            this.drawAngle,
            petalDrawPoints,
        );

        const perpindicularDirection = this.direction.rotateVector(90);
        const positionalOffsetVector = perpindicularDirection.scale(
            this.positionalOffsetOscillator.getValue(),
        );

        const translatedDrawPoints = Point.translateAllPoints(
            positionalOffsetVector,
            rotatedDrawPoints,
        );

        drawManager.scheduleDraw(DrawLayer.PETAL, () => {
            drawPetal(
                translatedDrawPoints,
                this.petalColors.baseColor,
                this.petalColors.tipColor,
            );
        });
    }
}

export default Petal;

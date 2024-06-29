import {
    canvas,
    getRandomEdgePoint,
    getTopLeftCornerPoint,
    isPointOutOfBounds,
} from '../util/canvasUtil';
import { drawPoint, drawWave } from '../util/drawUtil';
import {
    generateUuid,
    getRandomItem,
    getRandomNumber,
} from '../util/randomUtil';
import { parseConfigColor, randomizeRGB } from '../util/colorUtil';

import { DrawLayer } from '../drawManager';
import { EnvironmentObject } from '../objectManager';
import Point from '../geometry/Point';
import Vector from '../geometry/Vector';
import { drawManager } from '..';
import { getConfig } from '../util/configUtil';
import { getElapsedSeconds } from '../util/timeUtil';

const config = getConfig();

export interface WavePoints {
    frontMidPoint: Point;
    frontLeftAnchor: Point;
    frontRightAnchor: Point;
    backMidPoint: Point;
    backLeftCorner: Point;
    backRightCorner: Point;
}

class Wave implements EnvironmentObject {
    public id!: string;
    position: Point;
    direction: Vector;
    lastUpdateTime: number;
    speed: number;
    size: number; // distance from front to back of wave
    color: string;

    constructor(options?: { position: Point; direction: Vector }) {
        this.id = generateUuid();
        // Random position on initialization
        this.position = options?.position || Point.getRandomPoint();
        const waveConfig = getConfig().wave;

        // Direction based on river mode
        this.direction =
            options?.direction ||
            (getConfig().wave.riverMode
                ? Vector.getDownRightDirection()
                : Vector.getRandomDirection());

        this.lastUpdateTime = Date.now();
        this.speed = getRandomNumber(
            waveConfig.speeds[0],
            waveConfig.speeds[1],
        );

        const selectedColor = parseConfigColor(
            getRandomItem(waveConfig.colors),
        );

        this.size = getRandomNumber(canvas.width / 15, canvas.width / 20);
        this.color = randomizeRGB(
            selectedColor,
            getConfig().wave.colorVariation,
        );
    }

    update(): void {
        this.position.applyVector(
            this.direction.scale(
                this.speed * getElapsedSeconds(this.lastUpdateTime),
            ),
            true,
        );

        if (isPointOutOfBounds(this.position, 500)) {
            this.prepareReentry();
        }

        this.lastUpdateTime = Date.now();
    }

    prepareReentry(): void {
        let newPosition;
        let newDirection;

        if (getConfig().wave.riverMode) {
            newPosition = getTopLeftCornerPoint(300);
            newDirection = Vector.getDownRightDirection();
        } else {
            newPosition = getRandomEdgePoint(300);
            newDirection = newPosition.getDirectionTo(Point.getRandomPoint());
        }

        // Some distance away from the viewable screen
        this.position = newPosition;
        this.direction = newDirection;
    }

    draw(): void {
        // Edge is perpindicular to the direction
        const edgeDirection = this.direction.rotateVector(90);
        const canvasWidth = canvas.width;

        const frontAnchorWidth = canvasWidth / 12;
        const backWidth = canvasWidth / 2.5;

        const frontRightAnchor = this.position.applyVector(
            edgeDirection.scale(2 * frontAnchorWidth),
        );
        const frontLeftAnchor = this.position.applyVector(
            edgeDirection.scale(-2 * frontAnchorWidth),
        );

        const backMidPoint = this.position.applyVector(
            this.direction.rotateVector(180).scale(this.size),
        );

        const backRightCorner = backMidPoint.applyVector(
            this.direction.rotateVector(90).scale(backWidth),
        );

        const backLeftCorner = backMidPoint.applyVector(
            this.direction.rotateVector(90).scale(-backWidth),
        );

        drawManager.scheduleDraw(DrawLayer.WAVE, () => {
            drawWave(
                {
                    frontMidPoint: this.position,
                    frontRightAnchor,
                    frontLeftAnchor,
                    backMidPoint,
                    backRightCorner,
                    backLeftCorner,
                },
                this.color,
            );
        });
    }
}

export default Wave;

import { ctx, isPointOutOfBounds } from '../util/canvasUtil';
import { drawManager, objectManager } from '..';
import { generateUuid, getRandomNumber } from '../util/randomUtil';

import { DrawLayer } from '../drawManager';
import { EnvironmentObject } from '../objectManager';
import KoiFish from './koifish';
import Point from '../geometry/Point';
import Vector from '../geometry/Vector';
import { drawFoodParticle } from '../util/drawUtil';
import { getElapsedSeconds } from '../util/timeUtil';

export interface FoodParticle {
    tipAngle: number;
    tipDistance: number;
    curveAngle: number;
    curveDistance: number;
    direction: Vector; // direction from the core food position
}

// The entire food particle can essentially be described as a line
export interface FoodParticleDrawPoints {
    base: Point;
    tip: Point;
    curveAnchor: Point;
}

export default class Food implements EnvironmentObject {
    public id!: string;
    position: Point;
    direction: Vector;
    speed: number;
    foodParticles: FoodParticle[];
    lastUpdateTime: number;
    particleDispersion: number;
    isEaten: boolean;

    constructor(position: Point) {
        this.id = generateUuid();
        this.position = position;
        this.direction = Vector.getDownRightDirection();
        this.speed = 15;
        this.foodParticles = this.generateFoodParticles();
        this.lastUpdateTime = Date.now();
        this.particleDispersion = 1;

        // this is false when the food is gradually dissappearing
        this.isEaten = false;
    }

    static particleLength = 5;

    generateFoodParticles = (): FoodParticle[] => {
        const foodParticles: FoodParticle[] = [];

        const foodParticleCount = getRandomNumber(8, 10);
        for (let i = 0; i < foodParticleCount; i++) {
            const tipAngle = getRandomNumber(0, 360);
            const tipDistance = getRandomNumber(7, 12);
            const curveAngle =
                tipAngle + getRandomNumber(-1, 1) * getRandomNumber(40, 60);
            const curveDistance = 0.5 * tipDistance;

            const direction = Vector.getRandomDirection();
            foodParticles.push({
                tipAngle,
                tipDistance,
                curveAngle,
                curveDistance,
                direction,
            });
        }

        return foodParticles;
    };

    update() {
        if (isPointOutOfBounds(this.position)) {
            objectManager.removeFood(this);
        }

        const timeSinceLastUpdate = getElapsedSeconds(this.lastUpdateTime);
        if (this.particleDispersion < 5) {
            this.particleDispersion += timeSinceLastUpdate * 1.2;
        }

        this.position.applyVector(
            this.direction.scale(this.speed * timeSinceLastUpdate),
            true,
        );
        this.lastUpdateTime = Date.now();
        return;
    }

    onEaten(): void {
        this.isEaten = true;
        const intervalId = setInterval(() => {
            if (this.foodParticles.length > 0) {
                this.foodParticles.pop();
            } else {
                clearInterval(intervalId);
                // completely remove the food object when there are no more particles
                objectManager.removeFood(this);
            }
        }, 30); // remove a food particle every 30 milliseconds
    }

    draw(): void {
        this.foodParticles.forEach((foodParticle) => {
            const {
                tipDistance,
                tipAngle,
                direction,
                curveAngle,
                curveDistance,
            } = foodParticle;

            const base = this.position.applyVector(
                direction.scale(this.particleDispersion),
            );
            const tip = base.applyVector(
                Vector.UP.rotateVector(tipAngle).scale(tipDistance),
            );
            const curveAnchor = base.applyVector(
                Vector.UP.rotateVector(curveAngle).scale(curveDistance),
            );

            drawManager.scheduleDraw(DrawLayer.FOOD, () => {
                drawFoodParticle({
                    base,
                    tip,
                    curveAnchor,
                });
            });
        });
    }
}

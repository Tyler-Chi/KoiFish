import { applyOpacity, parseConfigColor } from '../util/colorUtil';
import { drawManager, objectManager } from '..';
import { drawRipple, getArcPoints } from '../util/drawUtil';
import { generateUuid, getRandomItem } from '../util/randomUtil';

import { DrawLayer } from '../drawManager';
import { EnvironmentObject } from '../objectManager';
import Point from '../geometry/Point';
import Vector from '../geometry/Vector';
import { getConfig } from '../util/configUtil';
import { getElapsedSeconds } from '../util/timeUtil';
import { scaleToRange } from '../util/numberUtil';

export interface RippleDrawSettings {
    rippleStart: Point;
    rippleEnd: Point;
    rippleCurve: Point;
    midPoint: Point;
    color: string;
    lineWidth: number;
}

class Ripple implements EnvironmentObject {
    public id: string;
    public position: Point;
    private direction: Vector;
    public generationTime: number;
    private color: string;
    private speed: number; // speed of the fish that spawned it
    private lastUpdateTime: number;
    private length: number;
    private initialRippleDispersion;

    constructor(options: {
        position: Point;
        direction: Vector;
        speed: number;
        length: number;
        initialRippleDispersion?: number;
    }) {
        this.id = generateUuid();
        this.position = options.position;
        this.direction = options.direction;
        this.length = options.length;

        this.initialRippleDispersion = options.initialRippleDispersion || 0;

        this.generationTime = Date.now();
        this.speed = options.speed;
        this.lastUpdateTime = Date.now();

        // This is the base color, the opacity will be calculated and inserted
        this.color = parseConfigColor(getConfig().ripple.color);
    }

    // Maybe move these to a config eventually
    static rippleGenerationGap = 1.8;
    static rippleDispersionSpeed = 10;
    static lengthRatio = 40; // fish size of 1 would mean ripple size of 40

    static lifeTime = 5;

    static peakOpacityTime = 1.5;
    static minOpacity = 0;
    static lineWidth = 10;

    update(): void {
        if (getElapsedSeconds(this.generationTime) > Ripple.lifeTime) {
            objectManager.removeRipple(this);
            return;
        }
        this.position.applyVector(
            this.direction.scale(
                this.speed * getElapsedSeconds(this.lastUpdateTime),
            ),
            true,
        );
        this.lastUpdateTime = Date.now();
    }

    getOpacity(): number {
        const rippleConfig = getConfig().ripple;
        const existenceTime = getElapsedSeconds(this.generationTime);
        if (existenceTime < Ripple.peakOpacityTime) {
            // gradually fading in
            return scaleToRange(
                0,
                rippleConfig.maxOpacity,
                existenceTime / Ripple.peakOpacityTime,
            );
        } else {
            // gradually fading out
            const timeSincePeak = existenceTime - Ripple.peakOpacityTime;
            const fadeOutTime = Ripple.lifeTime - Ripple.peakOpacityTime;
            return scaleToRange(
                rippleConfig.maxOpacity,
                0,
                timeSincePeak / fadeOutTime,
            );
        }
    }

    draw(): void {
        const existenceTime = getElapsedSeconds(this.generationTime);
        const lifeProportion = existenceTime / Ripple.lifeTime;

        const opacity = this.getOpacity();

        const color = applyOpacity(this.color, opacity);

        const rippleAngle = scaleToRange(120, 170, lifeProportion);
        const rippleDispersion =
            this.initialRippleDispersion +
            scaleToRange(-20, 40, lifeProportion);
        const rippleCurve = scaleToRange(20, 5, lifeProportion);

        const leftRippleDirection = this.direction.rotateVector(-rippleAngle);
        const rightRippleDirection = this.direction.rotateVector(rippleAngle);

        const leftRippleStart = this.position.applyVector(
            leftRippleDirection.scale(rippleDispersion),
        );
        const leftRippleTip = leftRippleStart.applyVector(
            leftRippleDirection.scale(this.length),
        );
        const { arcPoint: leftRippleFrontEdge, midPoint: leftRippleMidPoint } =
            getArcPoints(
                leftRippleStart,
                leftRippleTip,
                leftRippleDirection.rotateVector(90).scale(rippleCurve), // direction/intensity of the curve
            );
        const leftRippleDrawSettings: RippleDrawSettings = {
            rippleStart: leftRippleStart,
            rippleEnd: leftRippleTip,
            rippleCurve: leftRippleFrontEdge,
            midPoint: leftRippleMidPoint,
            color: color,
            lineWidth: Ripple.lineWidth,
        };

        drawManager.scheduleDraw(DrawLayer.RIPPLE, () => {
            drawRipple(leftRippleDrawSettings);
        });

        const rightRippleStart = this.position.applyVector(
            rightRippleDirection.scale(rippleDispersion),
        );
        const rightRippleTip = rightRippleStart.applyVector(
            rightRippleDirection.scale(this.length),
        );
        const {
            arcPoint: rightRippleFrontEdge,
            midPoint: rightRippleMidPoint,
        } = getArcPoints(
            rightRippleStart,
            rightRippleTip,
            rightRippleDirection.rotateVector(-90).scale(rippleCurve), // direction/intensity of the curve
        );

        const rightRippleDrawSettings: RippleDrawSettings = {
            rippleStart: rightRippleStart,
            rippleEnd: rightRippleTip,
            rippleCurve: rightRippleFrontEdge,
            color: color,
            lineWidth: Ripple.lineWidth,
            midPoint: rightRippleMidPoint,
        };

        drawManager.scheduleDraw(DrawLayer.RIPPLE, () => {
            drawRipple(rightRippleDrawSettings);
        });
    }
}

export default Ripple;

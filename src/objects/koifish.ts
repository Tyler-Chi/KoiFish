import Point, { PointMap } from '../geometry/Point';
import { VIOLET, applyOpacity, parseConfigColor } from '../util/colorUtil';
import {
    drawFish,
    drawFishShadow,
    drawPoint,
    drawVector,
} from '../util/drawUtil';
import { drawManager, objectManager } from '..';
import {
    generateUuid,
    getRandomItem,
    getRandomNumber,
} from '../util/randomUtil';
import {
    getCanvasDiagonalLength,
    getDistanceToCanvasBorder,
    getRandomEdgePoint,
} from '../util/canvasUtil';

import { DrawLayer } from '../drawManager';
import { EnvironmentObject } from '../objectManager';
import Food from './food';
import Oscillator from '../geometry/Oscillator';
import Ripple from './ripple';
import Vector from '../geometry/Vector';
import { defaultShadowDrawInfo } from './lantern';
import { getConfig } from '../util/configUtil';
import { getElapsedSeconds } from '../util/timeUtil';
import { scaleToRange } from '../util/numberUtil';

// The necessary points to draw the KoiFish
export interface FishDrawPoints extends PointMap {
    // central point of the koi fish
    center: Point;
    // head/trunk
    headCurveAnchor: Point;
    trunkRightTop: Point;
    trunkLeftTop: Point;
    trunkRightBottom: Point;
    trunkLeftBottom: Point;
    trunkTailJoint: Point;
    // pectoral fins (frontmost pair of fins, attached to the trunk)
    leftPectoralFinFrontEdge: Point;
    leftPectoralFinTip: Point;
    leftPectoralFinBackEdge: Point;
    rightPectoralFinFrontEdge: Point;
    rightPectoralFinBackEdge: Point;
    rightPectoralFinTip: Point;
    // ventral fins (attached to the trunk, behind the pectoral fins)
    leftVentralFinTip: Point;
    leftVentralFinFrontEdge: Point;
    leftVentralFinBackEdge: Point;
    rightVentralFinTip: Point;
    rightVentralFinFrontEdge: Point;
    rightVentralFinBackEdge: Point;
    // tail
    tailLeftOuterAnchor: Point;
    tailRightOuterAnchor: Point;
    tailAnchor: Point;
    tailTip: Point;
    // dorsal fin
    dorsalFinEnd: Point;
    dorsalFinAnchor: Point;
    dorsalFinTip: Point;
    // tail fins
    tailFinAnchor: Point;
    extrapolatedTailFinTip: Point;
    rightTailFinTip: Point;
    leftTailFinTip: Point;
}

// Colors of the fish
export interface FishColors {
    mainBodyColor: string;
    finColor: string;
    tailFinColor: string;
}

// Information needed to calculate where a decoration should be
// The angle and distance are relative to the central position of the fish
export interface Decoration {
    angle: number;
    distance: number;
    radius: number;
    color: string;
}

// Information needed to actually draw the decoration, which is essentially
// just a circle
export interface DecorationDrawInfo {
    radius: number;
    position: Point;
    color: string;
}

interface FishLengths {
    headCurveAnchorLength: number;
    trunkWidth: number;
    trunkLength: number;
    tailLength: number;
    finLength: number;
    tailFinLength: number;
}

class KoiFish implements EnvironmentObject {
    public id: string;
    public size: number;
    public position: Point;
    public direction: Vector;
    private baseSpeed: number;
    public speed: number;
    private previousSpeed: number;
    private turnMultiplier: number;

    private targetPoint: Point;
    private lastUpdateTime: number;
    private lastRippleTime: number;
    private finAngleOscillator: Oscillator;
    private tailAngleOscillator: Oscillator;
    private swayOscillator: Oscillator;

    // Aesthetics
    private fishColors: FishColors;
    private decorations: Decoration[];
    private scaledFishLengths: FishLengths;

    // Food
    public desiredFood?: Food;

    // Leader stuff
    private leftFollowAngle: number;
    private rightFollowAngle: number;
    public readonly leftFollowPoint: Point;
    public readonly rightFollowPoint: Point;
    public leftFollower?: KoiFish;
    public rightFollower?: KoiFish;

    // Follower
    private followTime: number;
    public leaderKoiFish?: KoiFish;

    constructor(options?: {
        position?: Point;
        direction?: Vector;
        targetPoint?: Point;
        size?: number;
    }) {
        this.id = generateUuid();

        // Initial position and direction
        this.position = options?.position || Point.getRandomPoint(0.9);
        this.direction = options?.direction || Vector.getRandomDirection();

        // The size dictates some of the other fish traits
        this.size = options?.size || getRandomNumber(0.7, 1.0);

        // Calculate fish lengths using size
        this.scaledFishLengths = this.getScaledFishLengths();

        this.finAngleOscillator = new Oscillator(
            0,
            1,
            scaleToRange(2, 3, this.size), // Bigger fish moves their fin less, therefore higher oscillation period
        );

        // Oscillator to make the tail wave back and forth
        this.tailAngleOscillator = new Oscillator(
            -10,
            10,
            getRandomNumber(3, 4),
        );

        // Oscillator to make the fish sway (rotionally)
        this.swayOscillator = new Oscillator(-10, 10, getRandomNumber(7, 10));

        // Bigger fish moves more slowly
        this.baseSpeed = scaleToRange(15, 30, 1 - Math.min(this.size, 1));

        this.speed = this.baseSpeed;
        this.previousSpeed = this.baseSpeed;

        this.turnMultiplier = 1;

        this.lastUpdateTime = Date.now();
        this.lastRippleTime = Date.now();

        // Initial target point
        this.targetPoint = options?.targetPoint || Point.getRandomPoint(0.9);

        // Initialize aesthetics
        this.fishColors = this.getRandomColors();
        this.decorations = this.getRandomDecorations();

        // Follow variables
        this.leftFollowPoint = this.position.clone();
        this.rightFollowPoint = this.position.clone();
        this.leftFollowAngle = getRandomNumber(180 + 20, 180 + 45);
        this.rightFollowAngle = getRandomNumber(125, 170);
        this.followTime = 0;
    }

    static maxRotationAnglePerSecond = 18;
    static maxSpeedChangePerSecond = 1.5;
    static canvasExitDistance = -20;
    static LEFT_SIDE: string = 'left';
    static RIGHT_SIDE: string = 'right';

    handleOutOfBounds = (): void => {
        this.position = getRandomEdgePoint(
            0.8 * Math.abs(KoiFish.canvasExitDistance),
        );
        this.targetPoint = Point.getRandomPoint(0.8);
        this.direction = this.position.getDirectionTo(this.targetPoint);
    };

    getScaledFishLengths = (): FishLengths => {
        const fishProportions = getConfig().fish.proportions;
        return {
            headCurveAnchorLength:
                fishProportions.headCurveAnchorLength * this.size,
            trunkWidth: fishProportions.trunkWidth * this.size,
            trunkLength: fishProportions.trunkLength * this.size,
            tailLength: fishProportions.tailLength * this.size,
            finLength: fishProportions.finLength * this.size,
            tailFinLength: fishProportions.tailFinLength * this.size,
        };
    };

    /**
     * Get random decorations
     *
     * A decoration is expressed as a combination of angle and distance,
     * which is relative to the direction of the fish
     */
    getRandomDecorations = (): Decoration[] => {
        const randomDecorations: Decoration[] = [];
        const availableDecorationColors = getConfig().fish.decorationColors;

        const decorationCount = getRandomNumber(1, 2);

        // The field in which the decoration can be generated, relative to the position of the fish
        const decorationXdistance = this.scaledFishLengths.trunkWidth / 2;
        const decorationRadius =
            getRandomNumber(0.7 * decorationXdistance, decorationXdistance) *
            Math.pow(this.size, 0.5);

        // This goes negative because this is relative to the central point
        const maxY = 5;
        const minY = -20;

        for (let i = 0; i < decorationCount; i++) {
            const decorationX = getRandomItem([1, -1]) * decorationXdistance;
            const decorationVector = new Vector(
                decorationX,
                getRandomNumber(minY, maxY),
            );
            const decorationAngle = Vector.signedAngleBetween(
                new Vector(0, 1),
                decorationVector,
            );

            randomDecorations.push({
                angle: decorationAngle,
                distance: decorationVector.getMagnitude(),
                color: parseConfigColor(
                    getRandomItem(availableDecorationColors),
                ),
                radius: decorationRadius,
            });
        }

        return randomDecorations;
    };

    /**
     * Get random fish colors
     */
    getRandomColors = (): FishColors => {
        const fishConfig = getConfig().fish;

        // Convert config colors into standard rgba
        const availableBodyColors = fishConfig.bodyColors.map(parseConfigColor);
        const availableFinColors = fishConfig.finColors.map(parseConfigColor);
        const availableDecorationColors =
            fishConfig.decorationColors.map(parseConfigColor);

        // get random main body color. availableBodyColors will have some dupes
        const mainBodyColor = getRandomItem(availableBodyColors);

        // Prevent fins from being same color as body
        const filteredFinColors = availableFinColors.filter(
            (color) => color !== mainBodyColor,
        );

        const finColor = applyOpacity(
            getRandomItem([...filteredFinColors]),
            0.7,
        );
        const tailFinColor = applyOpacity(
            getRandomItem(availableDecorationColors),
            0.7,
        );

        return {
            mainBodyColor,
            finColor,
            tailFinColor,
        };
    };

    /**
     * Logic for selecting a new target point
     * - Avoid points that are too close, to prevent the fish from turning too sharply
     */
    setNewRandomTargetPoint = () => {
        let newTargetPoint = this.position;
        let distanceToNewTargetPoint = 0;
        while (distanceToNewTargetPoint < 300) {
            newTargetPoint = Point.getRandomPoint(0.9);
            distanceToNewTargetPoint =
                this.position.getDistanceTo(newTargetPoint);
        }
        this.targetPoint = newTargetPoint;
    };

    /**
     * Smoothen the direction change
     *
     * The fish will always have a target point. Depending on the time since the last update,
     * and the turnMultiplier (which can be higher, for example if the fish is chasing food),
     * there will be a max rotational angle that the fish can change in any given update
     */
    smoothenDirectionChange = () => {
        const secondsSinceLastUpdate = getElapsedSeconds(this.lastUpdateTime);
        const maxRotationAngle =
            KoiFish.maxRotationAnglePerSecond * secondsSinceLastUpdate;

        // Vector towards target
        const targetVector = this.position.getVectorTo(this.targetPoint);

        const desiredAngleChange = Vector.signedAngleBetween(
            this.direction,
            targetVector,
        );

        const finalAngleChange =
            Math.min(maxRotationAngle, Math.abs(desiredAngleChange)) *
            Math.sign(desiredAngleChange) *
            this.turnMultiplier;

        // Prevent small micro-adjustments
        if (Math.abs(desiredAngleChange) > 2) {
            this.direction.rotateVector(finalAngleChange, true);
        }
    };

    smoothenSpeedChange = (): void => {
        // this.speed will be the newly desired speed
        // this.previousSpeed will be the previous speed
        const secondsSinceLastUpdate = getElapsedSeconds(this.lastUpdateTime);
        const maxSpeedChange =
            KoiFish.maxSpeedChangePerSecond * secondsSinceLastUpdate;
        const speedDifference = this.speed - this.previousSpeed;

        if (Math.abs(speedDifference) > maxSpeedChange) {
            this.speed =
                this.previousSpeed +
                Math.sign(speedDifference) * maxSpeedChange;
        }
    };

    updateFollowPoints(): void {
        const followDistance = getConfig().fish.followDistance;

        const newLeftFollowPoint = this.position
            .applyVector(
                Vector.UP.rotateVector(this.leftFollowAngle).scale(
                    followDistance,
                ),
            )
            .rotateAround(this.position, this.direction.getAngle());

        const newRightFollowPoint = this.position
            .applyVector(
                Vector.UP.rotateVector(this.rightFollowAngle).scale(
                    followDistance,
                ),
            )
            .rotateAround(this.position, this.direction.getAngle());

        // These are mutations because other fish might have references to these points
        this.leftFollowPoint.mutate(newLeftFollowPoint);
        this.rightFollowPoint.mutate(newRightFollowPoint);
    }

    checkAndSetFoodBehavior(): void {
        if (this.desiredFood) {
            // check to see if food still exists
            const foodStillExists = objectManager.foodMap.has(
                this.desiredFood.id,
            );

            const distanceToFood = this.position.getDistanceTo(
                this.desiredFood,
            );

            // eat the food
            if (distanceToFood < 20 || !foodStillExists) {
                this.desiredFood.onEaten();
                this.desiredFood = undefined;
            }
        }

        let closestFood: Food | undefined = undefined;
        let closestDistance = Infinity;

        const nearbyFoodList = objectManager.getNearbyObjects(this, Food, 5);

        nearbyFoodList.forEach((nearbyFood) => {
            if (nearbyFood.isEaten) {
                return;
            }
            const distanceToFood = this.position.getDistanceTo(nearbyFood);

            if (distanceToFood < closestDistance) {
                closestFood = nearbyFood;
                closestDistance = distanceToFood;
            }
        });

        if (closestFood) {
            // Start chasing food, ignore leader
            if (this.leaderKoiFish) {
                KoiFish.unsetLeaderFollower(this.leaderKoiFish, this);
            }

            this.desiredFood = closestFood;
            this.targetPoint = (closestFood as Food).position;

            const targetVector = this.position.getVectorTo(this.targetPoint);
            const targetDirection = targetVector.normalize();
            const targetDistance = targetVector.getMagnitude();

            const desiredAngleChange = Vector.signedAngleBetween(
                this.direction,
                targetDirection,
            );

            // close by, need to slow down and hard turn
            if (targetDistance < 50 && Math.abs(desiredAngleChange) > 30) {
                this.speed = this.baseSpeed * 0.5;
                this.turnMultiplier = 4;
            } else if (Math.abs(desiredAngleChange) < 30) {
                this.speed = this.baseSpeed * 5;
                this.turnMultiplier = 1;
            } else {
                this.speed = this.baseSpeed * 4;
                this.turnMultiplier = 2;
            }

            this.tailAngleOscillator.setSpeedFactor(2);
            this.finAngleOscillator.setSpeedFactor(2);
        } else {
            this.tailAngleOscillator.setSpeedFactor(1);
            this.finAngleOscillator.setSpeedFactor(1);
        }
    }

    // only to be run if the fish is not following another fish
    checkAndSetFollowBehavior(): void {
        if (this.desiredFood && this.leaderKoiFish) {
            KoiFish.unsetLeaderFollower(this.leaderKoiFish, this);
            return;
        }

        if (!this.leaderKoiFish) {
            // No currently follower - check to see if there is a nearby leader to follow
            const nearbyKoiFishList = objectManager.getNearbyObjects(
                this,
                KoiFish,
            );

            const potentialLeaders = nearbyKoiFishList
                .filter((potentialLeader) => {
                    // leader must be at least 10% bigger
                    return potentialLeader.size > this.size * 1.1;
                })
                .filter((potentialLeader) => {
                    // must have at least one available follow position
                    return potentialLeader.getAvailableFollowPositions().length;
                })
                .filter((potentialLeader) => {
                    // filter down to leaders that are going in the same general direction
                    const potentialLeaderDirection = potentialLeader.direction;
                    const angleDifference = Vector.signedAngleBetween(
                        this.direction,
                        potentialLeaderDirection,
                    );
                    return Math.abs(angleDifference) < 60;
                })
                .filter((potentialLeader) => {
                    // filter down to leaders that are somewhat in front of the fish
                    const angleToPotentialLeader = Vector.signedAngleBetween(
                        this.direction,
                        this.position.getVectorTo(potentialLeader),
                    );
                    return Math.abs(angleToPotentialLeader) < 60;
                });

            // There are potential leaders
            if (potentialLeaders.length) {
                const newLeader = getRandomItem(potentialLeaders);
                const availableFollowPositions =
                    newLeader.getAvailableFollowPositions();
                const followSide = getRandomItem(availableFollowPositions);
                KoiFish.setLeaderFollower(newLeader, this, followSide);
                this.followTime = Date.now();
            }
        } else {
            // Is following a leader

            // Break follow after some time
            if (getElapsedSeconds(this.followTime) > 180) {
                KoiFish.unsetLeaderFollower(this.leaderKoiFish, this);
                this.setNewRandomTargetPoint();
                return;
            }

            // Is tracking a leader's followpoint
            const distanceToLeader = this.position.getDistanceTo(
                this.targetPoint,
            );

            if (distanceToLeader > 100) {
                // unfollow current leader
                this.speed = this.baseSpeed;
                KoiFish.unsetLeaderFollower(this.leaderKoiFish, this);
                this.setNewRandomTargetPoint();
                return;
            }

            const leaderSpeed = this.leaderKoiFish.speed;
            const leaderDirection = this.leaderKoiFish.direction;

            const vectorToTargetPoint = this.position.getVectorTo(
                this.targetPoint,
            );
            const angleToTargetPoint = Vector.signedAngleBetween(
                this.direction,
                vectorToTargetPoint,
            );
            const distanceToTargetPoint = vectorToTargetPoint.getMagnitude();

            if (
                Math.abs(angleToTargetPoint) < 30 &&
                distanceToTargetPoint > 20
            ) {
                // generally pointed at the target point, and at some distance to it
                // slightly speed up towards it, relative to the leader
                this.speed = 1.2 * leaderSpeed;
            } else if (
                Math.abs(angleToTargetPoint) > 90 &&
                distanceToTargetPoint < 50
            ) {
                // if the fish is close, but is pointed in the wrong direction, then slow down
                this.speed = 0.4 * leaderSpeed;
            } else if (
                Math.abs(
                    Vector.signedAngleBetween(this.direction, leaderDirection),
                ) < 30 &&
                distanceToTargetPoint < 20
            ) {
                // Following nicely, match the speed of the leader
                this.speed = leaderSpeed;
                // prevent sudden movements
                this.turnMultiplier = 0.5;
            }
        }
    }

    getAvailableFollowPositions(): string[] {
        const output: string[] = [];
        if (!this.leftFollower) {
            output.push(KoiFish.LEFT_SIDE);
        }
        if (!this.rightFollower) {
            output.push(KoiFish.RIGHT_SIDE);
        }
        return output;
    }

    standardBehavior = (): void => {
        const targetVector = this.position.getVectorTo(this.targetPoint);
        if (targetVector.getMagnitude() < 50) {
            this.setNewRandomTargetPoint();
        }

        const targetDirection = targetVector.normalize();
        const targetDistance = targetVector.getMagnitude();

        const desiredAngleChange = Vector.signedAngleBetween(
            this.direction,
            targetDirection,
        );

        // distance to the target, relative to the size of the canvas
        const distanceProportion = targetDistance / getCanvasDiagonalLength();

        // closer allow sharper turn, farther allow more lazy turn
        this.turnMultiplier *= Math.max(1 - distanceProportion, 0.5);
        // if there is enough distance between the fish and the target, and the fish is already
        // pointed in the right general direction, then drastically slow the turn
        if (distanceProportion > 0.1 && Math.abs(desiredAngleChange) < 45) {
            this.turnMultiplier *= 0.3;
        }
    };

    /**
     * Update the fish's internal state variables
     */
    update(): void {
        // Keep track of the previous speed, to prevent sudden speed changes
        this.previousSpeed = this.speed;

        // Start with base values, allow behaviors to modify them
        this.speed = this.baseSpeed;
        this.turnMultiplier = 1;

        // If the fish somehow gets too far out of the bounds of the canvas, then hard reset its position, and
        // set its direction back inside
        if (
            getDistanceToCanvasBorder(this.position) <
            KoiFish.canvasExitDistance
        ) {
            this.handleOutOfBounds();
            return;
        }

        this.checkAndSetFoodBehavior();
        // Only evaluate leader/follower logic if there is no target food.
        if (!this.desiredFood) {
            this.checkAndSetFollowBehavior();
        }

        if (!this.desiredFood && !this.leaderKoiFish) {
            this.standardBehavior();
        }

        // only run if there is no desiredFood/leader
        if (!this.targetPoint) {
            this.setNewRandomTargetPoint();
        }

        // smoothen behavior-induced speed/direction changes
        this.smoothenDirectionChange();
        this.smoothenSpeedChange();

        // Update the fish's position, based on the updated & smoothened direction + speed
        this.position.applyVector(
            this.direction.scale(
                this.speed * getElapsedSeconds(this.lastUpdateTime),
            ),
            true,
        );
        // Update the fish's follow points
        this.updateFollowPoints();

        // Update the last update time after moving
        this.lastUpdateTime = Date.now();
    }

    draw(): void {
        const fishConfig = getConfig().fish;

        if (fishConfig.drawSimplified) {
            // Draw as a point and a direction vector
            drawPoint(this.position, {
                color: this.fishColors.mainBodyColor,
                radius: this.size * 2,
            });
            drawVector(this.position, this.direction.scale(30));
        } else {
            // The direction, accounting for the sway rotation
            const swayedDirectionVector = this.direction.rotateVector(
                this.swayOscillator.getValue(),
            );

            const drawPoints = this.getDrawPoints(swayedDirectionVector);

            const lanterns = Array.from(objectManager.lanternMap.values());
            if (lanterns.length) {
                for (const lantern of objectManager.lanternMap.values()) {
                    const { shadowVector, shadowOpacity } =
                        lantern.getShadowDrawInfo(this);
                    const shadowDrawPoints = Point.translateAllPoints(
                        shadowVector,
                        drawPoints,
                    );

                    drawManager.scheduleDraw(DrawLayer.FISH, () =>
                        drawFishShadow(shadowDrawPoints, shadowOpacity),
                    );
                }
            } else {
                const shadowDrawPoints = Point.translateAllPoints(
                    defaultShadowDrawInfo.shadowVector,
                    drawPoints,
                );
                drawManager.scheduleDraw(DrawLayer.FISH, () =>
                    drawFishShadow(
                        shadowDrawPoints,
                        defaultShadowDrawInfo.shadowOpacity,
                    ),
                );
            }

            drawManager.scheduleDraw(DrawLayer.FISH, () => {
                drawFish(
                    drawPoints,
                    this.fishColors,
                    this.getDecorationDrawInfos(swayedDirectionVector),
                );
            });
        }

        if (fishConfig.drawLeaderFollowerLinks && this.leaderKoiFish) {
            drawManager.scheduleDraw(DrawLayer.DEV, () => {
                drawVector(
                    this.position,
                    this.position
                        .getVectorTo(this.leaderKoiFish!.position)
                        .scale(0.9),
                    { color: VIOLET },
                );
            });
        }
    }

    /**
     * Calculate the draw points
     *
     * This is done by calculating the fish draw points as if the fish were pointed straight up
     * Once all the points have been calculated, determine the angle they must be rotated
     *
     * This final rotation angle is determined by:
     * - this.direction, which is the intentional direction of the fish (chasing some target point)
     * - sway angle: the fish naturally sways a bit
     */
    getDrawPoints = (swayedDirectionVector: Vector): FishDrawPoints => {
        const {
            headCurveAnchorLength,
            trunkWidth,
            trunkLength,
            tailLength,
            finLength,
            tailFinLength,
        } = this.scaledFishLengths;

        const headCurveAnchor = this.position.applyVector(
            Vector.UP.scale(headCurveAnchorLength),
        );
        const trunkRightTop = this.position.applyVector(
            Vector.RIGHT.scale(trunkWidth / 2),
        );
        const trunkLeftTop = this.position.applyVector(
            Vector.LEFT.scale(trunkWidth / 2),
        );
        const trunkTailJoint = this.position.applyVector(
            Vector.DOWN.scale(trunkLength),
        );

        const trunkRightBottom = trunkTailJoint.applyVector(
            Vector.RIGHT.scale(trunkWidth / 2),
        );

        const trunkLeftBottom = trunkTailJoint.applyVector(
            Vector.LEFT.scale(trunkWidth / 2),
        );

        // fins
        const finAngleProportion = this.finAngleOscillator.getValue();
        const finAngle = scaleToRange(140, 160, finAngleProportion);

        const ventralFinAngle = scaleToRange(150, 155, finAngleProportion);

        // Pectoral fins
        const leftPectoralFinFrontEdge = trunkLeftTop.applyVector(
            Vector.UP.rotateVector(-finAngle + 20).scale(finLength / 2),
        );
        const leftPectoralFinTip = trunkLeftTop.applyVector(
            Vector.UP.rotateVector(-finAngle).scale(finLength),
        );
        const leftPectoralFinBackEdge = trunkLeftTop.applyVector(
            Vector.DOWN.scale(finLength * 0.75),
        );

        const rightPectoralFinFrontEdge = trunkRightTop.applyVector(
            Vector.UP.rotateVector(finAngle - 20).scale(finLength / 2),
        );
        const rightPectoralFinTip = trunkRightTop.applyVector(
            Vector.UP.rotateVector(finAngle).scale(finLength),
        );
        const rightPectoralFinBackEdge = trunkRightTop.applyVector(
            Vector.DOWN.scale(finLength * 0.75),
        );

        // Ventral fins
        const leftVentralFinTip = trunkTailJoint.applyVector(
            Vector.UP.rotateVector(-ventralFinAngle).scale(finLength * 0.9),
        );
        const leftVentralFinFrontEdge = trunkTailJoint.applyVector(
            Vector.UP.rotateVector(-ventralFinAngle + 30).scale(finLength / 2),
        );
        const leftVentralFinBackEdge = trunkTailJoint.applyVector(
            Vector.UP.rotateVector(-ventralFinAngle - 60).scale(finLength / 2),
        );

        const rightVentralFinTip = trunkTailJoint.applyVector(
            Vector.UP.rotateVector(ventralFinAngle).scale(finLength * 0.9),
        );
        const rightVentralFinFrontEdge = trunkTailJoint.applyVector(
            Vector.UP.rotateVector(ventralFinAngle - 30).scale(finLength / 2),
        );
        const rightVentralFinBackEdge = trunkTailJoint.applyVector(
            Vector.UP.rotateVector(ventralFinAngle + 60).scale(finLength / 2),
        );

        // tail stuff
        const tailLeftOuterAnchor = trunkLeftBottom.applyVector(
            Vector.DOWN.scale(0.3 * tailLength),
        );

        const tailRightOuterAnchor = trunkRightBottom.applyVector(
            Vector.DOWN.scale(0.3 * tailLength),
        );

        const tailAnchor = trunkTailJoint.applyVector(
            Vector.DOWN.scale(0.7 * tailLength),
        );

        const tailAngle = this.tailAngleOscillator.getValue();
        const tailTip = trunkTailJoint.applyVector(
            Vector.DOWN.rotateVector(tailAngle).scale(tailLength),
        );
        const tailFinAnchor = trunkTailJoint.applyVector(
            Vector.DOWN.scale(0.6 * tailLength),
        );

        const tailFinAnchorDirection = tailTip.getDirectionTo(tailFinAnchor);

        const extrapolatedTailFinTip = tailTip.applyVector(
            tailFinAnchorDirection.rotateVector(180).scale(0.5 * tailFinLength),
        );

        // Dorsal fin points
        const {
            partialControlPoint: dorsalFinAnchor,
            partialEndPoint: dorsalFinEnd,
        } = Point.calculatePartialQuadraticCurve(
            trunkTailJoint,
            tailAnchor,
            tailTip,
            0.5,
        );
        const dorsalFinTip = trunkTailJoint.applyVector(
            Vector.DOWN.rotateVector(tailAngle * 2).scale(tailLength * 0.2),
        );

        const rightTailFinTip = tailTip.applyVector(
            tailFinAnchorDirection.rotateVector(110).scale(tailFinLength),
        );
        const leftTailFinTip = tailTip.applyVector(
            tailFinAnchorDirection.rotateVector(-110).scale(tailFinLength),
        );

        const originalDrawPoints: FishDrawPoints = {
            center: this.position,
            headCurveAnchor,
            trunkRightTop,
            trunkLeftTop,
            trunkRightBottom,
            trunkLeftBottom,
            trunkTailJoint,
            // pectoral fins
            leftPectoralFinFrontEdge,
            leftPectoralFinTip,
            leftPectoralFinBackEdge,
            rightPectoralFinFrontEdge,
            rightPectoralFinTip,
            rightPectoralFinBackEdge,
            // ventral fins
            leftVentralFinFrontEdge,
            leftVentralFinTip,
            leftVentralFinBackEdge,
            rightVentralFinTip,
            rightVentralFinFrontEdge,
            rightVentralFinBackEdge,
            // dorsal fin
            dorsalFinEnd,
            dorsalFinAnchor,
            dorsalFinTip,
            // tail
            tailLeftOuterAnchor,
            tailRightOuterAnchor,
            tailAnchor,
            tailTip,
            // tail fin
            tailFinAnchor,
            extrapolatedTailFinTip,
            rightTailFinTip,
            leftTailFinTip,
        };

        // Rotate the points around the current position
        const rotatedDrawPoints = Point.rotateAllPoints(
            this.position,
            swayedDirectionVector.getAngle(),
            originalDrawPoints,
        );

        return rotatedDrawPoints;
    };

    getDecorationDrawInfos = (
        swayedDirectionVector: Vector,
    ): DecorationDrawInfo[] => {
        return this.decorations.map((decoration) => {
            const decorationVector = swayedDirectionVector
                .rotateVector(decoration.angle)
                .scale(decoration.distance);

            const decorationPosition =
                this.position.applyVector(decorationVector);

            return {
                radius: decoration.radius,
                color: decoration.color,
                position: decorationPosition,
            };
        });
    };

    // Pair a leader together with a follower
    static setLeaderFollower(
        leader: KoiFish,
        follower: KoiFish,
        side: string,
    ): void {
        follower.leaderKoiFish = leader;
        if (side === KoiFish.LEFT_SIDE) {
            leader.leftFollower = follower;
            follower.targetPoint = leader.leftFollowPoint;
        } else {
            leader.rightFollower = follower;
            follower.targetPoint = leader.rightFollowPoint;
        }
    }

    // Unpair a leader and follower
    static unsetLeaderFollower(leader: KoiFish, follower: KoiFish): void {
        if (leader?.leftFollower === follower) {
            leader.leftFollower = undefined;
        } else {
            leader.rightFollower = undefined;
        }
        follower.leaderKoiFish = undefined;
    }

    generateRipples(): void {
        // Generate a ripple every 2 seconds
        if (
            getElapsedSeconds(this.lastRippleTime) > Ripple.rippleGenerationGap
        ) {
            this.lastRippleTime = Date.now();
            // Generate the ripple some distance ahead of the fish
            const newRipple = new Ripple({
                position: this.position
                    .applyVector(
                        this.direction.scale(
                            this.scaledFishLengths.headCurveAnchorLength * 0.7,
                        ),
                    )
                    .clone(),
                direction: this.direction.clone(),
                speed: this.baseSpeed * 0.7,
                length: this.size * Ripple.lengthRatio,
            });
            objectManager.addRipple(newRipple);
        }
    }
}

export default KoiFish;

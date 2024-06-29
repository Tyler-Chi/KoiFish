import { EnvironmentObject } from '../objectManager';
import Vector from './Vector';
import { canvas } from '../util/canvasUtil';

export interface PointMap {
    [key: string]: Point;
}

export interface Corners extends PointMap {
    bottomMost: Point;
    topMost: Point;
    leftMost: Point;
    rightMost: Point;
}

export interface SquarePoints extends PointMap {
    corner1: Point;
    corner2: Point;
    corner3: Point;
    corner4: Point;
}

// Base Point class, to be used whenever describing a position on the canvas.
export default class Point {
    public x: number;
    public y: number;
    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    // Apply a vector to this point.
    // Can either return the new resultant point, or modify the current point
    applyVector(vector: Vector, mutate: boolean = false): Point {
        const finalX = this.x + vector.dx;
        const finalY = this.y + vector.dy;

        if (mutate) {
            this.x = finalX;
            this.y = finalY;
            return this;
        } else {
            return new Point(finalX, finalY);
        }
    }

    // Get a vector from this to another Point or Environment Object
    getVectorTo(target: Point | EnvironmentObject): Vector {
        const targetPoint = target instanceof Point ? target : target.position;
        const dx = targetPoint.x - this.x;
        const dy = targetPoint.y - this.y;
        return new Vector(dx, dy);
    }
    // Get a unit vector from this to another Point or Environment Object
    // This will generally be referred to as a "direction".
    getDirectionTo(target: Point | EnvironmentObject): Vector {
        return this.getVectorTo(target).normalize();
    }

    // Get the distance from this to another Point or Environment Object
    getDistanceTo(target: Point | EnvironmentObject): number {
        const targetPoint = target instanceof Point ? target : target.position;
        return this.getVectorTo(targetPoint).getMagnitude();
    }

    // Rotate this point around another point. Useful for first determining how a figure
    // should be drawn, and then rotating it to draw it at a different angle
    rotateAround(
        pointB: Point,
        angleDeg: number,
        mutate: boolean = false,
    ): Point {
        // Convert angle from degrees to radians
        const angleRad = (angleDeg * Math.PI) / 180;

        // Translate this point by subtracting pointB
        let x = this.x - pointB.x;
        let y = this.y - pointB.y;

        // Apply rotation
        const cosAngle = Math.cos(angleRad);
        const sinAngle = Math.sin(angleRad);

        // Adjust the signs to rotate clockwise
        const rotatedX = x * cosAngle + y * sinAngle;
        const rotatedY = -x * sinAngle + y * cosAngle;

        const finalX = rotatedX + pointB.x;
        const finalY = rotatedY + pointB.y;

        if (mutate) {
            this.x = finalX;
            this.y = finalY;
            return this;
        } else {
            return new Point(finalX, finalY);
        }
    }

    translateBy(vector: Vector, mutate: boolean = false): Point {
        const translatedX = this.x + vector.dx;
        const translatedY = this.y + vector.dy;

        if (mutate) {
            this.x = translatedX;
            this.y = translatedY;
            return this;
        } else {
            return new Point(translatedX, translatedY);
        }
    }

    round(mutate: boolean = false): Point {
        const finalX = Math.round(this.x);
        const finalY = Math.round(this.y);

        if (mutate) {
            this.x = finalX;
            this.y = finalY;
            return this;
        } else {
            return new Point(finalX, finalY);
        }
    }

    // returns a copy of this one
    clone(): Point {
        return new Point(this.x, this.y);
    }

    mutate(newPoint: Point): Point {
        this.x = newPoint.x;
        this.y = newPoint.y;
        return this;
    }

    getCoordinates(): [number, number] {
        return [this.x, this.y];
    }

    static getRandomPoint(ratio: number = 1): Point {
        const marginX = ((1 - ratio) * canvas.width) / 2;
        const marginY = ((1 - ratio) * canvas.height) / 2;
        const x = marginX + Math.random() * (canvas.width * ratio);
        const y = marginY + Math.random() * (canvas.height * ratio);

        return new Point(x, y);
    }

    static rotateAllPoints<T extends Record<string, Point>>(
        rotationCenter: Point,
        rotationAngle: number,
        pointsMap: T,
        mutate: boolean = false,
    ): T {
        const result = {} as T;

        Object.keys(pointsMap).forEach((key) => {
            result[key as keyof T] = pointsMap[key].rotateAround(
                rotationCenter,
                rotationAngle,
                mutate,
            ) as T[keyof T];
        });

        return mutate ? pointsMap : result;
    }

    static translateAllPoints<T extends Record<string, Point>>(
        translationVector: Vector,
        pointsMap: T,
        mutate: boolean = false,
    ): T {
        const result = {} as T;

        Object.keys(pointsMap).forEach((key) => {
            result[key as keyof T] = pointsMap[key].translateBy(
                translationVector,
                mutate,
            ) as T[keyof T];
        });

        return mutate ? pointsMap : result;
    }

    static findCorners(pointMap: PointMap): Corners {
        const points = Object.values(pointMap);
        if (points.length === 0) {
            throw new Error('Point map cannot be empty.');
        }

        return points.reduce<Corners>(
            (acc, point) => {
                if (point.y < acc.bottomMost.y) {
                    acc.bottomMost = point;
                }
                if (point.y > acc.topMost.y) {
                    acc.topMost = point;
                }
                if (point.x < acc.leftMost.x) {
                    acc.leftMost = point;
                }
                if (point.x > acc.rightMost.x) {
                    acc.rightMost = point;
                }
                return acc;
            },
            {
                bottomMost: points[0],
                topMost: points[0],
                leftMost: points[0],
                rightMost: points[0],
            },
        );
    }

    static getEvenlySpacedPoints(
        point1: Point,
        point2: Point,
        number: number,
    ): Point[] {
        // Array to hold the generated points
        let points: Point[] = [];

        // Calculate the distance between each point
        const deltaX = (point2.x - point1.x) / (number - 1);
        const deltaY = (point2.y - point1.y) / (number - 1);

        // Generate the points
        for (let i = 0; i < number; i++) {
            const newX = point1.x + deltaX * i;
            const newY = point1.y + deltaY * i;
            points.push(new Point(newX, newY));
        }

        return points;
    }

    static calculateMidpoint(point1: Point, point2: Point): Point {
        const x = (point1.x + point2.x) / 2;
        const y = (point1.y + point2.y) / 2;
        return new Point(x, y);
    }

    static calculatePointOnLine(point1: Point, point2: Point, t: number) {
        const x = point1.x + t * (point2.x - point1.x);
        const y = point1.y + t * (point2.y - point1.y);
        return new Point(x, y);
    }

    static calculateSlope(point1: Point, point2: Point): number {
        return (point2.y - point1.y) / (point2.x - point1.x);
    }

    // Mainly useful for drawing gradients between lines, that are parallel
    // but not necessarily horizontal.
    // point1 and point2 define lineA
    // point3 and point4 define lineB
    // the midpoint is the midpoint of point1 and point2
    // perpindicular foot:
    // draw a line from the midpoint to lineB. the perpindicular foot is the
    // intersection, at which the angle created is 90 degrees (perpindicular)
    static calculatePerpendicularFoot(
        point1: Point,
        point2: Point,
        point3: Point,
        point4: Point,
    ): { midpoint: Point; perpendicularFoot: Point } {
        const midpoint = Point.calculateMidpoint(point1, point2);

        // Calculate the slope of the first line (AB)
        const slopeAB = Point.calculateSlope(point1, point2);

        // The slope of the perpendicular line
        const slopePerpendicular = -1 / slopeAB;

        // Calculate the slope and y-intercept of the second line (CD)
        const slopeCD = Point.calculateSlope(point3, point4);
        const interceptCD = point3.y - slopeCD * point3.x;

        // Equation of the perpendicular line through the midpoint
        const interceptPerpendicular =
            midpoint.y - slopePerpendicular * midpoint.x;

        // Calculate the intersection point (Y) of the perpendicular line with line CD
        const xIntersection =
            (interceptPerpendicular - interceptCD) /
            (slopeCD - slopePerpendicular);
        const yIntersection =
            slopePerpendicular * xIntersection + interceptPerpendicular;

        const perpendicularFoot = new Point(xIntersection, yIntersection);

        return { midpoint, perpendicularFoot };
    }

    static calculatePartialQuadraticCurve(
        originalStartPoint: Point,
        originalControlPoint: Point,
        originalEndPoint: Point,
        t: number,
    ): { partialControlPoint: Point; partialEndPoint: Point } {
        // Calculate the points for the parameter t
        const P0P1 = Point.calculatePointOnLine(
            originalStartPoint,
            originalControlPoint,
            t,
        );
        const P1P2 = Point.calculatePointOnLine(
            originalControlPoint,
            originalEndPoint,
            t,
        );
        const partialEndPoint = Point.calculatePointOnLine(P0P1, P1P2, t);

        return {
            partialControlPoint: P0P1,
            partialEndPoint: partialEndPoint,
        };
    }
}

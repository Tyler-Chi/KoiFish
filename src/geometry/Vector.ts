import { getRandomItem } from '../util/randomUtil';

// Base Vector class
// A Vector basically describes a direction+scale.
// IE the vector {dx: 5, dy: 5} means up 5 and to the right 5
// A Direction is a type of vector, that specifically has a magnitude of 1
// This essentially describes a direction, with no assumption of speed/magnitude.
export default class Vector {
    dx: number;
    dy: number;

    constructor(dx: number, dy: number) {
        this.dx = dx;
        this.dy = dy;
    }

    // Get the magnitude (length) of a vector. This is basically the pythagorean theorem,
    // finding the length of a hypotenuse given the two legs (dx & dy)
    getMagnitude(): number {
        const magnitude = Math.sqrt(this.dx * this.dx + this.dy * this.dy);
        return magnitude;
    }

    /**
     * Normalizes the vector. By default, it returns a new vector.
     * If the `mutate` parameter is true, it modifies the original vector.
     */
    normalize(mutate: boolean = false): Vector {
        const magnitude = Math.sqrt(this.dx * this.dx + this.dy * this.dy);
        if (magnitude === 0) {
            throw new Error('Cannot normalize a zero vector.');
        }

        const finalDx = this.dx / magnitude;
        const finalDy = this.dy / magnitude;
        if (mutate) {
            this.dx = finalDx;
            this.dy = finalDy;
            return this;
        } else {
            return new Vector(finalDx, finalDy);
        }
    }

    // Rotate a vector according to an angle
    // Positive angle is clockwise
    // Negative angle is counterclockwise
    // Rotating the up vector by +90 degrees would result in a vector pointing right
    rotateVector(angleDegrees: number, mutate: boolean = false): Vector {
        // Convert angle from degrees to radians and negate for clockwise rotation
        const angleRadians = (-angleDegrees * Math.PI) / 180;

        // Rotation matrix components
        const cosTheta = Math.cos(angleRadians);
        const sinTheta = Math.sin(angleRadians);

        const finalDx = this.dx * cosTheta - this.dy * sinTheta;
        const finalDy = this.dx * sinTheta + this.dy * cosTheta;

        if (mutate) {
            this.dx = finalDx;
            this.dy = finalDy;
            return this;
        } else {
            return new Vector(finalDx, finalDy);
        }
    }

    /**
     * Scales the vector by a given factor.
     * If the `mutate` parameter is true, it modifies the original vector.
     *
     * @param scaleFactor The factor by which to scale the vector's components.
     * @param mutate Whether to mutate the original vector (default is false).
     * @returns A new Vector scaled by the factor if mutate is false,
     *          otherwise returns this after mutation.
     */
    scale(scaleFactor: number, mutate: boolean = false): Vector {
        const finalDx = this.dx * scaleFactor;
        const finalDy = this.dy * scaleFactor;

        if (mutate) {
            this.dx = finalDx;
            this.dy = finalDy;
            return this;
        } else {
            return new Vector(finalDx, finalDy);
        }
    }

    // Gets the angle of a vector, relative to vertical.
    // Straight up would be 0, to the right would be 90, down 180, etc
    getAngle(): number {
        let angle = Math.atan2(this.dx, this.dy); // Angle in radians from the positive y-axis
        let degrees = angle * (180 / Math.PI); // Convert radians to degrees
        if (degrees < 0) {
            degrees += 360; // Normalize to 0-360 degrees
        }
        return degrees;
    }

    // Deep copy of this vector
    clone(): Vector {
        return new Vector(this.dx, this.dy);
    }

    // gets a random direction
    static getRandomDirection(): Vector {
        return new Vector(
            getRandomItem([1, -1]) * Math.random(),
            getRandomItem([1, -1]) * Math.random(),
        ).normalize();
    }

    // Static method to calculate the signed angle between two vectors in degrees
    static signedAngleBetween(a: Vector, b: Vector): number {
        // Calculate angle directly using atan2
        const angleA = Math.atan2(a.dy, a.dx); // Angle of vector a from the positive x-axis
        const angleB = Math.atan2(b.dy, b.dx); // Angle of vector b from the positive x-axis
        let angleDegrees = (angleA - angleB) * (180 / Math.PI); // Calculate angle difference in degrees

        // Normalize angle to be within the range -180 to 180
        if (angleDegrees > 180) angleDegrees -= 360;
        if (angleDegrees < -180) angleDegrees += 360;

        return angleDegrees;
    }

    static getDownRightDirection = (): Vector => {
        const dx = Math.random();
        const dy = -Math.random();
        return new Vector(dx, dy).normalize();
    };

    // pure vectors
    static UP = new Vector(0, 1);
    static RIGHT = new Vector(1, 0);
    static DOWN = new Vector(0, -1);
    static LEFT = new Vector(-1, 0);
    // mixed vectors
    static DOWN_RIGHT = new Vector(1, -1).normalize();
    static DOWN_LEFT = new Vector(-1, -1).normalize();
}

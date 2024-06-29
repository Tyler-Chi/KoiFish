// Define the types for the canvas and context
export let ctx: CanvasRenderingContext2D;
export let canvas: HTMLCanvasElement;

import { getRandomItem, getRandomNumber } from './randomUtil';

import Point from '../geometry/Point';
import { getConfig } from './configUtil';
import { memoize } from './util';

// this will determine how closely objects can detect things
const cellSize = 50;

// things that will change on canvas resizing
let canvasDiagonalLength = 0;
let numCellsX: number;
let numCellsY: number;

/**
 * Do the initial setup on the canvas
 * - Set the width/height based on initial window size
 * - Flip the grid system, such that the bottom-left is point (0,0). By default,
 *   the top-left is point (0,0), and increasing Y makes you go down the screen.
 */
export const setupCanvas = (): void => {
    const { backgroundImageUrl } = getConfig().environment;

    canvas = document.querySelector('canvas') as HTMLCanvasElement;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    canvas.style.backgroundImage = `url("${backgroundImageUrl}")`;
    canvas.style.backgroundSize = '100% 100%'; // This will stretch the background to fit the canvas dimensions

    canvasDiagonalLength = Math.sqrt(
        Math.pow(canvas.width, 2) + Math.pow(canvas.height, 2),
    );

    // Related to calculating cell index
    numCellsX = Math.ceil(canvas.width / cellSize);
    numCellsY = Math.ceil(canvas.height / cellSize);

    ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    ctx.translate(0, canvas.height);
    ctx.scale(1, -1);
};

export const getCanvasDiagonalLength = (): number => {
    return canvasDiagonalLength;
};

/**
 * Determine if a point is out of bounds of the canvas
 */
export const isPointOutOfBounds = (
    point: Point,
    tolerance: number = 0,
): boolean => {
    const minX = -tolerance;
    const maxX = canvas.width + tolerance;
    const minY = -tolerance;
    const maxY = canvas.height + tolerance;
    return point.x < minX || point.x > maxX || point.y < minY || point.y > maxY;
};

// Calculates distance to canvas border
// 50 would mean the point is in the canvas, 50 units from the border
// -50 would indicate that the point is outside the canvas, 50 units from the border
export const getDistanceToCanvasBorder = (point: Point): number => {
    const { x, y } = point;
    const { width, height } = canvas;

    // Calculate distances to each border
    const distanceToLeft = x;
    const distanceToRight = width - x;
    const distanceToTop = y;
    const distanceToBottom = height - y;

    // Find the minimum distance to a border
    const minDistanceToBorder = Math.abs(
        Math.min(
            distanceToLeft,
            distanceToRight,
            distanceToTop,
            distanceToBottom,
        ),
    );

    // Determine if the point is inside or outside the canvas
    const isOutsideCanvas = x < 0 || x > width || y < 0 || y > height;

    // Return positive distance if outside, negative distance if inside
    return isOutsideCanvas ? -minDistanceToBorder : minDistanceToBorder;
};

export const getTopEdgePoint = (outsideDistance: number = 0): Point => {
    return new Point(
        Math.random() * canvas.width,
        canvas.height + outsideDistance,
    );
};

export const getBottomEdgePoint = (outsideDistance: number = 0): Point => {
    return new Point(Math.random() * canvas.width, 0 - outsideDistance);
};

export const getLeftEdgePoint = (outsideDistance: number = 0): Point => {
    return new Point(0 - outsideDistance, Math.random() * canvas.height);
};

export const getRightEdgePoint = (outsideDistance: number = 0): Point => {
    return new Point(
        canvas.width + outsideDistance,
        Math.random() * canvas.height,
    );
};

export const getRandomEdgePoint = (outsideDistance: number = 0): Point => {
    const edgePointCallback = getRandomItem([
        getTopEdgePoint,
        getBottomEdgePoint,
        getLeftEdgePoint,
        getRightEdgePoint,
    ]);

    return edgePointCallback(outsideDistance);
};

export const getTotalSquareInches = (): number => {
    // There is a #dpi element in the html, which is made to be 1 inch wide and tall. It can be used
    // to extrapolate the size of the canvas, in square inches
    const dpiElement = document.getElementById('dpi') as HTMLElement;
    const dpiWidth = dpiElement.offsetWidth;
    const dpiHeight = dpiElement.offsetHeight;

    const width = canvas.width / dpiWidth;
    const height = canvas.height / dpiHeight;
    return width * height;
};

export const getTopLeftCornerPoint = (outsideDistance: number = 0): Point => {
    // top
    if (getRandomItem([true, false])) {
        const x = getRandomNumber(0, canvas.width / 2);
        const y = canvas.height + outsideDistance;
        return new Point(x, y);
    } else {
        // left
        const x = 0 - outsideDistance;
        const y = getRandomNumber(canvas.height / 2, canvas.height);
        return new Point(x, y);
    }
};

export const getBottomRightCornerPoint = (
    outsideDistance: number = 0,
): Point => {
    // bottom
    if (getRandomItem([true, false])) {
        const x =
            getRandomNumber(canvas.width / 2, canvas.width) + outsideDistance;
        const y = 0 - outsideDistance;
        return new Point(x, y);
    } else {
        // right
        const x = canvas.width + outsideDistance;
        const y = getRandomNumber(0, canvas.height / 2);
        return new Point(x, y);
    }
};

// outsideDistance is how far outside the canvas
// cornerRatio is essentially how far from the corner. so if its 0.5, then we can tolerate 0.5 of canvas height down, or 0.5 of canvas height across
export const getRiverEntryExitPoints = (
    outsideDistance: number = 0,
    cornerRatio: number = 0.7,
): { entryPoint: Point; exitPoint: Point } => {
    let entryPoint;
    let exitPoint;
    if (getRandomItem([true, false])) {
        // top entry
        const x = getRandomNumber(0, canvas.width * cornerRatio);
        const y = canvas.height + outsideDistance;
        entryPoint = new Point(x, y);
    } else {
        // left entry
        const x = 0 - outsideDistance;
        const y = getRandomNumber(
            (1 - cornerRatio) * canvas.height,
            canvas.height,
        );
        entryPoint = new Point(x, y);
    }

    if (getRandomItem([true, false])) {
        // bottom exit
        const minX = Math.max(1 - canvas.width * cornerRatio, entryPoint.x);
        const x = getRandomNumber(minX, canvas.width);
        const y = 0;
        exitPoint = new Point(x, y);
    } else {
        // right exit
        const x = canvas.width;
        const maxY = Math.min(entryPoint.y, canvas.height * cornerRatio);
        const y = getRandomNumber(0, maxY);
        exitPoint = new Point(x, y);
    }

    return {
        entryPoint,
        exitPoint,
    };
};

export function getCellIndex(point: Point): number {
    const cellX: number = Math.floor(point.x / cellSize);
    const cellY: number = Math.floor(point.y / cellSize);
    return cellY * numCellsX + cellX;
}

export const getAdjacentIndices = memoize(
    (cellIndex: number, range: number = 1): number[] => {
        const cellX: number = cellIndex % numCellsX;
        const cellY: number = Math.floor(cellIndex / numCellsX);
        const adjacentIndices: number[] = [];

        for (let dx = -range; dx <= range; dx++) {
            for (let dy = -range; dy <= range; dy++) {
                const adjCellX: number = cellX + dx;
                const adjCellY: number = cellY + dy;
                if (
                    adjCellX >= 0 &&
                    adjCellX < numCellsX &&
                    adjCellY >= 0 &&
                    adjCellY < numCellsY
                ) {
                    adjacentIndices.push(adjCellY * numCellsX + adjCellX);
                }
            }
        }
        return adjacentIndices;
    },
);

import { Corners, SquarePoints } from '../geometry/Point';
import {
    DecorationDrawInfo,
    FishColors,
    FishDrawPoints,
} from '../objects/koifish';
import { FOOD_COLOR, RED, TRANSPARENT, applyOpacity } from './colorUtil';
import { FoodParticle, FoodParticleDrawPoints } from '../objects/food';
import { PetalColors, PetalDrawPoints } from '../objects/petal';
import { canvas, ctx } from './canvasUtil';

import { LanternDrawInfo } from '../objects/lantern';
import Point from '../geometry/Point';
import { RippleDrawSettings } from '../objects/ripple';
import Vector from '../geometry/Vector';
import { WavePoints } from '../objects/wave';
import { drawManager } from '..';
import { DrawLayer } from '../drawManager';

export const clearCanvasDrawings = (): void => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
};

export const fillEntireCanvas = (color: string): void => {
    ctx.fillStyle = color; // Light blue color with opacity
    ctx.fillRect(0, 0, canvas.width, canvas.height); // Cover the entire canvas
};

export const drawPoint = (
    point: Point,
    { radius = 1, color = 'black' }: { radius?: number; color?: string } = {},
): void => {
    drawManager.scheduleDraw(DrawLayer.DEV, () => {
        const [x, y] = point.getCoordinates();
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.lineWidth = 5;
        ctx.strokeStyle = color;
        ctx.stroke();
    });
};

export const drawLine = (
    pointA: Point,
    pointB: Point,
    {
        color = 'white',
        lineWidth = 1,
    }: { color?: string; lineWidth?: number } = {},
): void => {
    const [xA, yA] = pointA.getCoordinates();
    const [xB, yB] = pointB.getCoordinates();
    ctx.beginPath();
    ctx.moveTo(xA, yA);
    ctx.lineTo(xB, yB);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
};

export const drawVector = (
    startPoint: Point,
    vector: Vector,
    { color = RED }: { color?: string } = {},
): void => {
    const [xStart, yStart] = startPoint.getCoordinates();
    const endPoint = startPoint.applyVector(vector);
    const [xEnd, yEnd] = endPoint.getCoordinates();

    // Drawing the line part of the vector
    ctx.beginPath();
    ctx.moveTo(xStart, yStart);
    ctx.lineTo(xEnd, yEnd);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Drawing the arrow head
    const arrowLength = 10; // Length of the sides of the arrow head
    const arrowAngle = Math.PI / 6; // Angle at the arrow head

    // Calculate the angle of the vector
    const angle = Math.atan2(vector.dy, vector.dx);

    // Calculate the points for the arrow head
    ctx.beginPath();
    ctx.moveTo(xEnd, yEnd);
    ctx.lineTo(
        xEnd - arrowLength * Math.cos(angle - arrowAngle),
        yEnd - arrowLength * Math.sin(angle - arrowAngle),
    );
    ctx.lineTo(
        xEnd - arrowLength * Math.cos(angle + arrowAngle),
        yEnd - arrowLength * Math.sin(angle + arrowAngle),
    );
    ctx.lineTo(xEnd, yEnd);
    ctx.fillStyle = color;
    ctx.fill();
};

export const drawFish = (
    drawPoints: FishDrawPoints,
    fishColors: FishColors,
    decorationDrawInfos: DecorationDrawInfo[],
): void => {
    const {
        trunkRightTop,
        trunkLeftTop,
        leftPectoralFinFrontEdge,
        leftPectoralFinTip,
        rightPectoralFinFrontEdge,
        rightPectoralFinBackEdge,
        rightPectoralFinTip,
        leftTailFinTip,
        rightTailFinTip,
        trunkTailJoint,
        ventralFinBase,
        leftVentralFinFrontEdge,
        leftVentralFinTip,
        leftVentralFinBackEdge,
        rightVentralFinTip,
        rightVentralFinFrontEdge,
        rightVentralFinBackEdge,
        leftPectoralFinBackEdge,
        dorsalFinEnd,
        dorsalFinAnchor,
        dorsalFinTip,
        upperTailAnchor,
        lowerTailAnchor,
        extrapolatedTailAnchor,
    } = drawPoints;

    // Draw tail fins first, so that they do not cover the main body

    // Left tail fin
    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.moveTo(...lowerTailAnchor.getCoordinates());
    ctx.lineTo(...leftTailFinTip.getCoordinates());

    ctx.quadraticCurveTo(
        ...extrapolatedTailAnchor.getCoordinates(),
        ...lowerTailAnchor.getCoordinates(),
    );

    ctx.fillStyle = fishColors.tailFinColor;
    ctx.fill();

    // Right tail fin
    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.moveTo(...lowerTailAnchor.getCoordinates());
    ctx.lineTo(...rightTailFinTip.getCoordinates());

    ctx.quadraticCurveTo(
        ...extrapolatedTailAnchor.getCoordinates(),
        ...lowerTailAnchor.getCoordinates(),
    );

    ctx.fillStyle = fishColors.tailFinColor;
    ctx.fill();

    // Left ventral fin
    traceFin(
        ventralFinBase,
        leftVentralFinFrontEdge,
        leftVentralFinBackEdge,
        leftVentralFinTip,
    );
    ctx.fillStyle = fishColors.finColor;
    ctx.fill();

    // RIght ventral fin
    traceFin(
        ventralFinBase,
        rightVentralFinFrontEdge,
        rightVentralFinBackEdge,
        rightVentralFinTip,
    );
    ctx.fillStyle = fishColors.finColor;
    ctx.fill();

    // Save current context, before doing main body
    ctx.save();

    traceFishBody(drawPoints);

    ctx.fillStyle = fishColors.mainBodyColor;
    ctx.fill();

    ctx.clip();

    decorationDrawInfos.forEach((decorationDrawInfo) => {
        const decorationPosition = decorationDrawInfo.position;

        const [x, y] = decorationPosition.getCoordinates();
        ctx.beginPath();
        ctx.arc(x, y, decorationDrawInfo.radius, 0, 2 * Math.PI, false);
        ctx.fillStyle = decorationDrawInfo.color;
        ctx.fill();
        ctx.lineWidth = 5;
        ctx.strokeStyle = decorationDrawInfo.color;
        ctx.stroke();
    });

    // Imagine the fish as a rectangle, draw a gradient
    // stretches from the (darker)leftside -> middle, and then
    // middle-> rightside(darker)
    const gradient = ctx.createLinearGradient(
        ...trunkLeftTop.getCoordinates(),
        ...trunkRightTop.getCoordinates(),
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.2)'); // Dark at the edge
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0)'); // Light at the center line
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.2)'); // Dark at the edge
    ctx.beginPath();

    traceFishBody(drawPoints);

    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.restore();

    // Subsequently draw the fish fins, so that it does not capture the decorations

    // left pectoral fin
    traceFin(
        trunkLeftTop,
        leftPectoralFinFrontEdge,
        leftPectoralFinBackEdge,
        leftPectoralFinTip,
    );

    ctx.fillStyle = fishColors.finColor;
    ctx.fill();

    // right pectoral fin
    traceFin(
        trunkRightTop,
        rightPectoralFinFrontEdge,
        rightPectoralFinBackEdge,
        rightPectoralFinTip,
    );

    ctx.fillStyle = fishColors.finColor;
    ctx.fill();

    // dorsal fin
    ctx.beginPath();
    ctx.moveTo(...trunkTailJoint.getCoordinates());
    ctx.quadraticCurveTo(
        ...dorsalFinAnchor.getCoordinates(),
        ...dorsalFinEnd.getCoordinates(),
    );

    ctx.strokeStyle = fishColors.finColor;
    ctx.lineWidth = 1;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.quadraticCurveTo(
        ...dorsalFinTip.getCoordinates(),
        ...trunkTailJoint.getCoordinates(),
    );

    ctx.fillStyle = fishColors.finColor;
    ctx.fill();
};

export const drawFishShadow = (
    drawPoints: FishDrawPoints,
    shadowOpacity: number,
): void => {
    const shadowColor = applyOpacity('rgb(0,0,0)', shadowOpacity);

    traceFishBody(drawPoints);
    ctx.fillStyle = shadowColor;
    ctx.fill();
    traceFin(
        drawPoints.trunkLeftTop,
        drawPoints.leftPectoralFinFrontEdge,
        drawPoints.leftPectoralFinBackEdge,
        drawPoints.leftPectoralFinTip,
    );

    ctx.fillStyle = shadowColor;
    ctx.fill();

    traceFin(
        drawPoints.trunkRightTop,
        drawPoints.rightPectoralFinFrontEdge,
        drawPoints.rightPectoralFinBackEdge,
        drawPoints.rightPectoralFinTip,
    );
    ctx.fillStyle = shadowColor;
    ctx.fill();
};

export const drawPetal = (
    petalDrawPoints: PetalDrawPoints,
    baseColor: string,
    tipColor: string,
): void => {
    const { base, leftCurveAnchor, tip, rightCurveAnchor, curveAnchorBase } =
        petalDrawPoints;

    ctx.beginPath();
    ctx.moveTo(...base.getCoordinates());
    ctx.quadraticCurveTo(
        ...leftCurveAnchor.getCoordinates(),
        ...tip.getCoordinates(),
    );
    ctx.quadraticCurveTo(
        ...rightCurveAnchor.getCoordinates(),
        ...base.getCoordinates(),
    );

    const gradient = ctx.createLinearGradient(
        ...base.getCoordinates(),
        ...tip.getCoordinates(),
    );
    gradient.addColorStop(0, baseColor);
    gradient.addColorStop(1, tipColor);

    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw petal stem
    ctx.lineCap = 'round'; // This makes the edges rounded
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(...base.getCoordinates()); // Starting point of the line
    ctx.lineTo(...curveAnchorBase.getCoordinates()); // Ending point of the line
    ctx.strokeStyle = baseColor;
    ctx.stroke();
};

// The wave is essentially a leading curved edge that has the blue hue,
// which fades to transparent at the back.
export const drawWave = (wavePoints: WavePoints, waveColor: string): void => {
    const {
        frontMidPoint,
        frontRightAnchor,
        frontLeftAnchor,
        backMidPoint,
        backRightCorner,
        backLeftCorner,
    } = wavePoints;

    const gradient = ctx.createLinearGradient(
        ...frontMidPoint.getCoordinates(),
        ...backMidPoint.getCoordinates(),
    );
    gradient.addColorStop(0, waveColor);
    gradient.addColorStop(1, TRANSPARENT);

    ctx.beginPath();

    ctx.moveTo(...frontMidPoint.getCoordinates());

    ctx.quadraticCurveTo(
        ...frontRightAnchor.getCoordinates(),
        ...backRightCorner.getCoordinates(),
    );

    ctx.lineTo(...backLeftCorner.getCoordinates());

    ctx.quadraticCurveTo(
        ...frontLeftAnchor.getCoordinates(),
        ...frontMidPoint.getCoordinates(),
    );

    ctx.fillStyle = gradient;
    ctx.fill();
};

export const traceFishBody = (drawPoints: FishDrawPoints): void => {
    const {
        headCurveAnchor,
        trunkRightTop,
        trunkRightBottom,
        trunkLeftBottom,
        trunkLeftTop,
        upperTailLeftAnchor,
        upperTailRightAnchor,
        lowerTailLeftAnchor,
        lowerTailRightAnchor,
        tailTip,
    } = drawPoints;
    ctx.beginPath();

    ctx.moveTo(...trunkLeftBottom.getCoordinates());
    ctx.lineTo(...trunkLeftTop.getCoordinates());

    // Complete curve of the head
    ctx.quadraticCurveTo(
        ...headCurveAnchor.getCoordinates(),
        ...trunkRightTop.getCoordinates(),
    );

    ctx.lineTo(...trunkRightBottom.getCoordinates());

    // Right side of the tail
    ctx.bezierCurveTo(
        ...upperTailRightAnchor.getCoordinates(),
        ...lowerTailRightAnchor.getCoordinates(),
        ...tailTip.getCoordinates(),
    );

    // Left side of the tail, back up towards the body
    ctx.bezierCurveTo(
        ...lowerTailLeftAnchor.getCoordinates(),
        ...upperTailLeftAnchor.getCoordinates(),
        ...trunkLeftBottom.getCoordinates(),
    );
};

// for pectoral/ventral fins
export const traceFin = (
    start: Point,
    frontEdge: Point,
    backEdge: Point,
    tip: Point,
): void => {
    ctx.beginPath();
    ctx.moveTo(...start.getCoordinates());
    ctx.quadraticCurveTo(
        ...frontEdge.getCoordinates(),
        ...tip.getCoordinates(),
    );
    ctx.quadraticCurveTo(
        ...backEdge.getCoordinates(),
        ...start.getCoordinates(),
    );
};

export const drawFoodParticle = (
    foodParticleDrawPoints: FoodParticleDrawPoints,
) => {
    const { base, tip, curveAnchor } = foodParticleDrawPoints;
    ctx.beginPath();
    ctx.moveTo(...base.getCoordinates());
    ctx.quadraticCurveTo(
        ...curveAnchor.getCoordinates(),
        ...tip.getCoordinates(),
    );

    ctx.strokeStyle = 'green';
    ctx.lineWidth = 1;
    ctx.lineCap = 'round';
    ctx.stroke();
};

export const drawRipple = (rippleDrawSettings: RippleDrawSettings): void => {
    const { rippleStart, rippleEnd, rippleCurve, midPoint, color, lineWidth } =
        rippleDrawSettings;
    ctx.beginPath();
    ctx.moveTo(...rippleStart.getCoordinates());
    ctx.quadraticCurveTo(
        ...rippleCurve.getCoordinates(),
        ...rippleEnd.getCoordinates(),
    );

    const gradient = ctx.createLinearGradient(
        ...rippleCurve.getCoordinates(),
        ...midPoint.getCoordinates(),
    );

    gradient.addColorStop(0, color);
    gradient.addColorStop(1, TRANSPARENT);

    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = gradient;
    ctx.stroke();
};

export const drawSquare = (
    squarePoints: SquarePoints,
    { color = 'black' }: { color?: string } = {},
): void => {
    traceSquare(squarePoints);
    ctx.fillStyle = color;
    ctx.fill();
};

export interface ArcPoints {
    arcPoint: Point;
    midPoint: Point;
}

export const getArcPoints = (
    pointA: Point,
    pointB: Point,
    vector: Vector,
): ArcPoints => {
    // Calculate the midpoint between pointA and pointB
    const midpoint = new Point(
        (pointA.x + pointB.x) / 2,
        (pointA.y + pointB.y) / 2,
    );

    const arcPoint = new Point(midpoint.x + vector.dx, midpoint.y + vector.dy);
    return { arcPoint, midPoint: new Point(midpoint.x, midpoint.y) };
};

export interface PerpindicularPoints {
    point1: Point;
    point2: Point;
}
export const getPerpindicularPoints = (
    pointA: Point,
    pointB: Point,
    distance: number,
): PerpindicularPoints => {
    // Calculate the midpoint
    const midX = (pointA.x + pointB.x) / 2;
    const midY = (pointA.y + pointB.y) / 2;

    // Calculate the direction of the line
    const dx = pointB.x - pointA.x;
    const dy = pointB.y - pointA.y;

    // Calculate the length of the original line
    const length = Math.sqrt(dx * dx + dy * dy);

    // Normalize the direction to get a unit vector
    const unitDx = dx / length;
    const unitDy = dy / length;

    // Calculate the perpendicular direction
    const perpDx = -unitDy;
    const perpDy = unitDx;

    // Calculate the two points perpendicular to the midpoint
    const perpPoint1 = new Point(
        midX + perpDx * distance,
        midY + perpDy * distance,
    );

    const perpPoint2 = new Point(
        midX - perpDx * distance,
        midY - perpDy * distance,
    );

    return {
        point1: perpPoint1,
        point2: perpPoint2,
    };
};

export const getSquarePoints = (
    center: Point,
    rotationAngle: number,
    sideLength: number,
): SquarePoints => {
    const [centerX, centerY] = center.getCoordinates();
    const halfSide = sideLength / 2;

    const squarePoints: SquarePoints = {
        corner1: new Point(centerX - halfSide, centerY - halfSide), // bottom left
        corner2: new Point(centerX + halfSide, centerY - halfSide), // bottom right
        corner3: new Point(centerX + halfSide, centerY + halfSide), // top right
        corner4: new Point(centerX - halfSide, centerY + halfSide), // top left
    };

    // Rotate according to the rotation angle
    return Point.rotateAllPoints(center, rotationAngle, squarePoints);
};

export const traceSquare = (squarePoints: SquarePoints): void => {
    const { corner1, corner2, corner3, corner4 } = squarePoints;
    ctx.beginPath();
    ctx.moveTo(...corner1.getCoordinates());
    ctx.lineTo(...corner2.getCoordinates());
    ctx.lineTo(...corner3.getCoordinates());
    ctx.lineTo(...corner4.getCoordinates());
    ctx.lineTo(...corner1.getCoordinates());
};

export const traceCorners = (corners: Corners): void => {
    const { bottomMost, topMost, leftMost, rightMost } = corners;
    ctx.beginPath();
    ctx.moveTo(...bottomMost.getCoordinates());
    ctx.lineTo(...leftMost.getCoordinates());
    ctx.lineTo(...topMost.getCoordinates());
    ctx.lineTo(...rightMost.getCoordinates());
    ctx.lineTo(...bottomMost.getCoordinates());
};

export const drawLanternShadow = (
    lanternShadowSquare: SquarePoints,
    shadowOpacity: number,
): void => {
    const shadowColor = applyOpacity('rgb(0,0,0)', shadowOpacity);
    drawSquare(lanternShadowSquare, { color: shadowColor });
};

export const drawLantern = (lanternDrawInfo: LanternDrawInfo): void => {
    const {
        woodenBaseSquare,
        woodenBaseColor,
        woodJoinColor,
        leftWoodJoinPoints,
        rightWoodJoinPoints,
        lightColor,
        lampBaseCorners,
        lampTopCorners,
        lampWallColor,
        lampBackWallOpacity,
        lampFrontWallOpacity,
    } = lanternDrawInfo;

    drawSquare(woodenBaseSquare, { color: woodenBaseColor });

    // Draw the edges
    drawLine(woodenBaseSquare.corner1, woodenBaseSquare.corner2, {
        color: woodJoinColor,
        lineWidth: 2,
    });

    drawLine(woodenBaseSquare.corner3, woodenBaseSquare.corner4, {
        color: woodJoinColor,
        lineWidth: 2,
    });

    // Draw the wood joins lines on top of the wooden base
    for (let i = 0; i < leftWoodJoinPoints.length; i++) {
        drawLine(leftWoodJoinPoints[i], rightWoodJoinPoints[i], {
            color: woodJoinColor,
            lineWidth: 2,
        });
    }

    // Base of the lamp
    traceCorners(lampBaseCorners);
    ctx.fillStyle = lightColor;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'red';
    ctx.stroke();

    // Draw the vertical supporting beams
    for (const cornerKey in lampBaseCorners) {
        drawLine(lampBaseCorners[cornerKey], lampTopCorners[cornerKey], {
            color: 'red',
            lineWidth: 3,
        });
    }

    const leftBackWall: SquarePoints = {
        corner1: lampBaseCorners.leftMost,
        corner2: lampBaseCorners.topMost,
        corner3: lampTopCorners.topMost,
        corner4: lampTopCorners.leftMost,
    };

    traceSquare(leftBackWall);
    const leftBackWallGradient = getLinearGradient(
        lampBaseCorners.leftMost,
        lampBaseCorners.topMost,
        applyOpacity(lightColor, lampBackWallOpacity),
        lampTopCorners.leftMost,
        lampTopCorners.topMost,
        applyOpacity(lampWallColor, lampBackWallOpacity),
    );
    ctx.fillStyle = leftBackWallGradient;
    ctx.fill();

    const rightBackWall: SquarePoints = {
        corner1: lampBaseCorners.rightMost,
        corner2: lampBaseCorners.topMost,
        corner3: lampTopCorners.topMost,
        corner4: lampTopCorners.rightMost,
    };

    traceSquare(rightBackWall);
    const rightBackWallGradient = getLinearGradient(
        lampBaseCorners.rightMost,
        lampBaseCorners.topMost,
        applyOpacity(lightColor, lampBackWallOpacity),
        lampTopCorners.rightMost,
        lampTopCorners.topMost,
        applyOpacity(lampWallColor, lampBackWallOpacity),
    );
    ctx.fillStyle = rightBackWallGradient;
    ctx.fill();

    const leftFrontWall: SquarePoints = {
        corner1: lampBaseCorners.leftMost,
        corner2: lampBaseCorners.bottomMost,
        corner3: lampTopCorners.bottomMost,
        corner4: lampTopCorners.leftMost,
    };
    traceSquare(leftFrontWall);
    const leftFrontWallGradient = getLinearGradient(
        lampBaseCorners.leftMost,
        lampBaseCorners.bottomMost,
        applyOpacity(lightColor, lampFrontWallOpacity),
        lampTopCorners.leftMost,
        lampTopCorners.bottomMost,
        applyOpacity(lampWallColor, lampFrontWallOpacity),
    );
    ctx.fillStyle = leftFrontWallGradient;
    ctx.fill();

    const rightFrontWall: SquarePoints = {
        corner1: lampBaseCorners.rightMost,
        corner2: lampBaseCorners.bottomMost,
        corner3: lampTopCorners.bottomMost,
        corner4: lampTopCorners.rightMost,
    };
    traceSquare(rightFrontWall);
    const rightFrontWallGradient = getLinearGradient(
        lampBaseCorners.rightMost,
        lampBaseCorners.bottomMost,
        applyOpacity(lightColor, lampFrontWallOpacity),
        lampTopCorners.rightMost,
        lampTopCorners.bottomMost,
        applyOpacity(lampWallColor, lampFrontWallOpacity),
    );
    ctx.fillStyle = rightFrontWallGradient;
    ctx.fill();
};

export const getLinearGradient = (
    line1start: Point,
    line1end: Point,
    line1color: string,
    line2start: Point,
    line2end: Point,
    line2color: string,
): CanvasGradient => {
    const { midpoint, perpendicularFoot } = Point.calculatePerpendicularFoot(
        line1start,
        line1end,
        line2start,
        line2end,
    );

    const gradient = ctx.createLinearGradient(
        ...midpoint.getCoordinates(),
        ...perpendicularFoot.getCoordinates(),
    );
    gradient.addColorStop(0, line1color);
    gradient.addColorStop(1, line2color);
    return gradient;
};

export const brightenCircle = (
    centerPoint: Point,
    innerRadius: number,
    outerRadius: number,
    innerColor: string,
    outerColor: string,
): void => {
    ctx.globalCompositeOperation = 'lighter';

    // Create a radial gradient
    var gradient = ctx.createRadialGradient(
        ...centerPoint.getCoordinates(),
        innerRadius,
        ...centerPoint.getCoordinates(),
        outerRadius,
    );
    gradient.addColorStop(0, innerColor);
    gradient.addColorStop(1, outerColor);

    ctx.beginPath();
    ctx.arc(
        ...centerPoint.getCoordinates(),
        outerRadius,
        0,
        2 * Math.PI,
        false,
    );
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.globalCompositeOperation = 'source-over';
};

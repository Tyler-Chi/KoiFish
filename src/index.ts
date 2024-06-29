import './styles.css';

import DrawManager from './drawManager';
import ObjectManager from './objectManager';
import { clearCanvasDrawings } from './util/drawUtil';
import { debounce } from './util/util';
import { initMenu } from './menu';
import { setupCanvas } from './util/canvasUtil';

document.addEventListener('DOMContentLoaded', () => {
    initMenu();
});

setupCanvas();

export const objectManager = new ObjectManager();
objectManager.initializeObjects();
objectManager.setupEventListeners();

export const drawManager = new DrawManager();

const targetFPS = 120; // Specify your desired frame rate here
const interval = 1000 / targetFPS; // Calculate the interval between frames

let lastTime = performance.now();
let accumulatedTime = 0;
let animationFrameId: number | null = null;

const animate = () => {
    const currentTime = performance.now();
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    accumulatedTime += deltaTime;

    while (accumulatedTime >= interval) {
        accumulatedTime -= interval;
        clearCanvasDrawings(); // clear all previous drawings

        objectManager.updateAllObjects(); // update all object positions etc
        objectManager.drawAllObjects(); // invoke draw() for each object, which schedules draws at layers

        drawManager.executeScheduledDraws(); // executes all the scheduled draws
    }

    animationFrameId = requestAnimationFrame(animate);
};

const startAnimation = () => {
    if (animationFrameId === null) {
        lastTime = performance.now();
        accumulatedTime = 0;
        animate();
    }
};

const stopAnimation = () => {
    if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
};

// Start the animation
startAnimation();

const handleResize = debounce(() => {
    setupCanvas();
    objectManager.resetEnvironment();
}, 250);

const handleVisibilityChange = () => {
    if (document.hidden) {
        stopAnimation();
    } else {
        objectManager.resetEnvironment();
        startAnimation();
    }
};

window.addEventListener('resize', handleResize);
document.addEventListener('visibilitychange', handleVisibilityChange);

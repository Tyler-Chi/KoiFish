import { getRandomNumber } from './randomUtil';

export const RED = `rgb(166,16,30)`;
export const BLACK = 'black';
export const ORANGE = 'rgb(255, 117, 24)';
export const WHITE = 'white';

export const FISH_COLORS = [RED, BLACK, ORANGE, WHITE];

export const TRANSPARENT = 'rgba(0, 0, 10, 0)';
export const BLUE_HUE = 'rgba(29, 88, 140, 0.1)';

export const SAKURA = 'rgb(220,136,177)';
export const GREEN = 'rgb(34, 139, 34)';

export const VIOLET = 'rgb(218, 66, 245)';
export const SCARLET = 'rgb(255, 36, 0)';

export const FOOD_COLOR = 'rgb(205, 133, 63)';

// Lantern colors
export const WOOD_COLOR = 'rgb(132,36,12)';
export const WOOD_EDGE_COLOR = 'rgb(54,34,4)';
export const LANTERN_WALL_COLOR = 'rgb(220,20,60)';
export const DARK_FIRE_COLOR = 'rgb(255,90,0)';
export const BRIGHT_FIRE_COLOR = 'rgb(255,145,0)';

interface ColorMap {
    [key: string]: string;
}
export const colorMap: ColorMap = {
    fishRed: `rgba(166,16,30,1)`,
    black: 'rgba(0,0,0,1)',
    fishOrange: 'rgba(255, 117, 24,1)',
    white: 'rgba(255, 255, 255, 1)',
    sakura: 'rgba(255, 192, 203,1.0)',
    deepRed: 'rgba(200,0, 0,1)',
    deepOrange: 'rgba(213,54,0,1)',
    pastelPink: 'rgba(255, 120, 180, 1)',
    pastelGreen: 'rgba(180, 238, 180, 1.0)',
    darkPink: 'rgb(231, 84, 128)',
    waveBlue: 'rgba(29, 88, 140, 0.3)',
    forestGreen: 'rgba(4,161,43,1)',
    violet: 'rgb(218, 66, 245)',
};

// config can have either rgb, rgba, or just a string representing a saved color here
export const parseConfigColor = (colorString: string): string => {
    if (colorString.startsWith('rgb') || colorString.startsWith('rgba')) {
        // return for rgb and rgba
        return colorString;
    } else if (colorMap[colorString]) {
        // return saved color from colorMap if exists
        return colorMap[colorString];
    } else {
        // return the string as is
        return colorString;
    }
};

export const parseOpacity = (rgba: string): number => {
    // Use a regular expression to extract the rgba components
    const rgbaRegex = /^rgba\(\s*(\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\s*\)$/;
    const match = rgba.match(rgbaRegex);

    if (match) {
        // The opacity is the fourth component in the match array
        const opacity = parseFloat(match[4]);
        return opacity;
    } else {
        // If the input string is not in the correct format, return a default opacity of 1
        console.error('Invalid rgba string');
        return 1;
    }
};

export const parseRGB = (rgb: string): [number, number, number] => {
    const result = rgb.match(/\d+/g);
    if (result) {
        return [parseInt(result[0]), parseInt(result[1]), parseInt(result[2])];
    }
    throw new Error('Invalid RGB string');
};

export const randomizeRGB = (
    colorString: string,
    deviation: number = 50,
): string => {
    let matches;
    let alpha = 1; // Default opacity

    colorString = parseConfigColor(colorString);

    // Extract RGB and alpha values from the string
    if (colorString.startsWith('rgba')) {
        matches = colorString.match(/(\d+(\.\d+)?)/g);
        if (!matches || matches.length < 4) {
            throw new Error('Invalid RGBA string format');
        }
        alpha = parseFloat(matches[3]);
    } else if (colorString.startsWith('rgb')) {
        matches = colorString.match(/(\d+(\.\d+)?)/g);
        if (!matches || matches.length < 3) {
            throw new Error('Invalid RGB string format');
        }
    } else {
        throw new Error('Invalid color string format');
    }

    const [red, green, blue] = matches.map(Number);

    // Calculate slightly randomized color
    const randomizedRed =
        red + Math.round(getRandomNumber(-deviation, deviation));
    const randomizedGreen =
        green + Math.round(getRandomNumber(-deviation, deviation));
    const randomizedBlue =
        blue + Math.round(getRandomNumber(-deviation, deviation));

    const finalRed = clampToRGBRange(randomizedRed);
    const finalGreen = clampToRGBRange(randomizedGreen);
    const finalBlue = clampToRGBRange(randomizedBlue);

    // Return the RGBA color string with the extracted or default opacity
    return `rgba(${finalRed}, ${finalGreen}, ${finalBlue}, ${alpha})`;
};

function clampToRGBRange(value: number): number {
    if (value > 255) {
        return 255;
    }
    if (value < 0) {
        return 0;
    }
    return value;
}

export const applyOpacity = (colorString: string, opacity: number): string => {
    // Ensure opacity is between 0 and 1
    opacity = Math.max(0, Math.min(opacity, 1));

    // Extract numbers from the parentheses
    const numberPattern = /\d*\.?\d+/g;
    const matches = colorString.match(numberPattern);

    if (matches && (matches.length === 3 || matches.length === 4)) {
        // Extract RGB values
        const [r, g, b] = matches;
        // Return RGBA string with the specified opacity
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    } else {
        console.log('colorString: ', colorString);
        // If the input does not contain the correct number of values, throw an error
        throw new Error(
            'Invalid color format. Please provide a valid rgb or rgba color string.',
        );
    }
};

export const incrementRGB = (
    currentRGB: string,
    destinationRGB: string,
    maxChange: number,
): string => {
    // Parse the RGB values
    const [r1, g1, b1] = parseRGB(currentRGB);
    const [r2, g2, b2] = parseRGB(destinationRGB);

    const dr = r2 - r1;
    const dg = g2 - g1;
    const db = b2 - b1;

    const finalDr = Math.abs(dr) > maxChange ? Math.sign(dr) * maxChange : dr;
    const finalDg = Math.abs(dg) > maxChange ? Math.sign(dg) * maxChange : dg;
    const finalDb = Math.abs(db) > maxChange ? Math.sign(db) * maxChange : db;

    const finalR = r1 + finalDr;
    const finalG = g1 + finalDg;
    const finalB = b1 + finalDb;

    // Return the new RGB string
    return `rgb(${finalR},${finalG},${finalB})`;
};

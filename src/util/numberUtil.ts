export const scaleToRange = (
    min: number,
    max: number,
    scale: number,
): number => {
    return min + (max - min) * scale;
};

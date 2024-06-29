export const getElapsedSeconds = (pastTimestamp: number) => {
    const currentTimestamp = Date.now();
    const millisecondsElapsed = currentTimestamp - pastTimestamp;
    return millisecondsElapsed / 1000;
};

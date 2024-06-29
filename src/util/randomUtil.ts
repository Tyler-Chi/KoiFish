export const getRandomNumber = (min: number, max: number): number => {
    return Math.random() * (max - min) + min;
};

export function getRandomItem<T>(items: T[]): T {
    if (items.length === 0) {
        throw new Error('Array is empty and cannot provide a random item.');
    }
    const randomIndex = Math.floor(Math.random() * items.length);
    return items[randomIndex];
}

export function generateUuid(): string {
    return crypto.randomUUID();
}

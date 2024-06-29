export function debounce<T extends Function>(callback: T, delay: number): T {
    let timerId: ReturnType<typeof setTimeout>;

    return function (this: any, ...args: any[]) {
        clearTimeout(timerId);
        timerId = setTimeout(() => callback.apply(this, args), delay);
    } as any;
}

type FunctionType = (...args: any[]) => any;

export const memoize = (fn: FunctionType): FunctionType => {
    const cache = new Map<string, any>();
    return (...args: any[]) => {
        const key = JSON.stringify(args);
        if (cache.has(key)) {
            return cache.get(key);
        }
        const result = fn(...args);
        cache.set(key, result);
        return result;
    };
};

export const deepMerge = (target: any, source: any): any => {
    const result = Array.isArray(target) ? [...target] : { ...target };

    for (const key in source) {
        if (source.hasOwnProperty(key)) {
            if (
                source[key] &&
                typeof source[key] === 'object' &&
                !Array.isArray(source[key])
            ) {
                result[key] = deepMerge(result[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
    }

    return result;
};

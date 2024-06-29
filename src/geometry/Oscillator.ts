export default class Oscillator {
    amplitude: number;
    period: number;
    phase: number;
    lastUpdateTime: number;
    min: number;
    max: number;
    neutralValue: number;
    value: number;
    speedFactor: number;

    constructor(min: number, max: number, period: number) {
        this.min = min;
        this.max = max;
        this.period = period;
        this.phase = 0;
        this.amplitude = (max - min) / 2; // Amplitude is half the range between max and min
        this.lastUpdateTime = Date.now();
        this.neutralValue = min + this.amplitude;
        this.value = this.neutralValue;
        this.speedFactor = 1;
    }

    private update(): void {
        const currentTime = Date.now();
        const deltaTime = (currentTime - this.lastUpdateTime) / 1000.0; // Convert ms to seconds
        this.lastUpdateTime = currentTime;

        // Adjust the phase based on the elapsed time and the period
        const currentPhase =
            2 * Math.PI * (deltaTime / (this.period / this.speedFactor)) +
            this.phase;

        // Oscillate between min and max
        this.value =
            this.min + this.amplitude + this.amplitude * Math.sin(currentPhase);
        this.phase = currentPhase % (2 * Math.PI); // Normalize the phase to keep it between 0 and 2π
    }

    public setSpeedFactor(factor: number): void {
        this.speedFactor = factor;
    }

    public getValue(): number {
        this.update();
        return this.value;
    }
}

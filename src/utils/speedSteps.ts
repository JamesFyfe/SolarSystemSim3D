const MINUTE = 60;
const HOUR = 3600;
const DAY = 86400;
const YEAR = 31557600; // 365.25 days

export interface SpeedStep {
  /** Simulated seconds per real second */
  seconds: number;
  label: string;
}

const FORWARD_SPEEDS: SpeedStep[] = [
  { seconds: 1, label: '1 second' },
  { seconds: 10, label: '10 seconds' },
  { seconds: MINUTE, label: '1 minute' },
  { seconds: 10 * MINUTE, label: '10 minutes' },
  { seconds: 30 * MINUTE, label: '30 minutes' },
  { seconds: HOUR, label: '1 hour' },
  { seconds: 3 * HOUR, label: '3 hours' },
  { seconds: 9 * HOUR, label: '9 hours' },
  { seconds: DAY, label: '1 day' },
  { seconds: 5 * DAY, label: '5 days' },
  { seconds: 30 * DAY, label: '30 days' },
  { seconds: YEAR, label: '1 year' },
  { seconds: 5 * YEAR, label: '5 years' },
];

/** Reverse speeds, then stopped, then forward speeds. */
export const SPEED_STEPS: SpeedStep[] = [
  ...FORWARD_SPEEDS.map((step) => ({ seconds: -step.seconds, label: step.label })).reverse(),
  { seconds: 0, label: 'Stopped' },
  ...FORWARD_SPEEDS,
];

export const ZERO_INDEX = SPEED_STEPS.findIndex((step) => step.seconds === 0);
export const REALTIME_INDEX = SPEED_STEPS.findIndex((step) => step.seconds === 1);

export function clampSpeedIndex(index: number) {
  return Math.max(0, Math.min(SPEED_STEPS.length - 1, index));
}

/** The time multiplier the simulation should run at for a given UI state. */
export function timeMultipleFor(speedIndex: number, paused: boolean) {
  return paused ? 0 : SPEED_STEPS[speedIndex].seconds;
}

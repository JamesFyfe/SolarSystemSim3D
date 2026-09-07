import { useSyncExternalStore } from 'react';
import Constants from '../Constants';
import { clampSpeedIndex, REALTIME_INDEX, SPEED_STEPS, timeMultipleFor } from '../utils/speedSteps';

/** How often React subscribers sample the clock. The sim itself advances every frame. */
const DISPLAY_INTERVAL_MS = 17;

export interface SimulationPlayback {
  readonly speedIndex: number;
  readonly paused: boolean;
}

let timeMs = Constants.startDate.getTime();
/** Reused so the animation loop doesn't allocate a Date every frame. */
const date = new Date(timeMs);
let playback: SimulationPlayback = {
  speedIndex: Constants.timeMultipleIndex,
  paused: false,
};

const timeListeners = new Set<() => void>();
const playbackListeners = new Set<() => void>();
let displayIntervalId: ReturnType<typeof setInterval> | undefined;

function emit(listeners: Set<() => void>) {
  listeners.forEach((listener) => listener());
}

function setTimeMs(next: number) {
  timeMs = next;
  date.setTime(next);
}

function setPlayback(partial: Partial<SimulationPlayback>) {
  const next: SimulationPlayback = {
    speedIndex: partial.speedIndex ?? playback.speedIndex,
    paused: partial.paused ?? playback.paused,
  };
  if (next.speedIndex === playback.speedIndex && next.paused === playback.paused) {
    return;
  }
  playback = next;
  emit(playbackListeners);
}

function startDisplayInterval() {
  if (displayIntervalId !== undefined) {
    return;
  }
  displayIntervalId = setInterval(() => emit(timeListeners), DISPLAY_INTERVAL_MS);
}

function stopDisplayInterval() {
  if (timeListeners.size > 0 || displayIntervalId === undefined) {
    return;
  }
  clearInterval(displayIntervalId);
  displayIntervalId = undefined;
}

function subscribeTime(onStoreChange: () => void) {
  timeListeners.add(onStoreChange);
  startDisplayInterval();
  return () => {
    timeListeners.delete(onStoreChange);
    stopDisplayInterval();
  };
}

function subscribePlayback(onStoreChange: () => void) {
  playbackListeners.add(onStoreChange);
  return () => {
    playbackListeners.delete(onStoreChange);
  };
}

export function getTimeMs() {
  return timeMs;
}

/** Current simulation instant. Mutated in place; don't store this object. */
export function getDate() {
  return date;
}

export function getPlayback(): SimulationPlayback {
  return playback;
}

function getTimeMultiple() {
  return timeMultipleFor(playback.speedIndex, playback.paused);
}

/** Advance the clock by a real-time frame. Does not notify React; UI samples on an interval. */
export function advance(deltaSeconds: number) {
  const multiple = getTimeMultiple();
  if (multiple === 0 || deltaSeconds === 0) {
    return date;
  }
  setTimeMs(timeMs + deltaSeconds * 1000 * multiple);
  return date;
}

export function setTime(next: Date | number) {
  setTimeMs(typeof next === 'number' ? next : next.getTime());
  emit(timeListeners);
}

export function setSpeedIndex(index: number) {
  setPlayback({ speedIndex: clampSpeedIndex(index) });
}

export function nudgeSpeed(steps: number) {
  setSpeedIndex(playback.speedIndex + steps);
}

export function togglePause() {
  if (playback.paused && SPEED_STEPS[playback.speedIndex].seconds === 0) {
    setPlayback({ paused: false, speedIndex: REALTIME_INDEX });
    return;
  }
  setPlayback({ paused: !playback.paused });
}

export function resetToNow() {
  setTimeMs(Date.now());
  setPlayback({ speedIndex: REALTIME_INDEX, paused: false });
  emit(timeListeners);
}

export function jumpToRealtime() {
  setSpeedIndex(REALTIME_INDEX);
}

function subscribeNoop() {
  return () => {};
}

/** Simulation date for UI, sampled ~10 Hz so the overlay doesn't re-render every frame. */
export function useSimulationDate(active = true) {
  const ms = useSyncExternalStore(active ? subscribeTime : subscribeNoop, getTimeMs, getTimeMs);
  return new Date(ms);
}

export function useSimulationPlayback() {
  return useSyncExternalStore(subscribePlayback, getPlayback, getPlayback);
}

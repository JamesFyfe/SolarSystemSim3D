import { useCallback, useEffect, useState } from 'react';
import Constants from '../Constants';

const MINUTE = 60;
const HOUR = 3600;
const DAY = 86400;
const YEAR = 31557600; // 365.25 days

const FORWARD_SPEEDS: { seconds: number; label: string }[] = [
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

const SPEED_STEPS = [
  ...FORWARD_SPEEDS.map((step) => ({ seconds: -step.seconds, label: step.label })).reverse(),
  { seconds: 0, label: 'Stopped' },
  ...FORWARD_SPEEDS,
];

const ZERO_INDEX = SPEED_STEPS.findIndex((step) => step.seconds === 0);
const REALTIME_INDEX = SPEED_STEPS.findIndex((step) => step.seconds === 1);

function pad(value: number) {
  return value.toString().padStart(2, '0');
}

function toDatetimeUtcValue(date: Date) {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
}

function parseDatetimeUtc(value: string) {
  const [datePart, timePart = '00:00:00'] = value.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes, seconds = 0] = timePart.split(':').map(Number);
  return new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
}

function formatUtcDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    timeZone: 'UTC',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatUtcTime(date: Date) {
  return date.toLocaleTimeString(undefined, {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  });
}

function formatSpeed(seconds: number) {
  const step = SPEED_STEPS.find((option) => option.seconds === seconds);
  const label = step?.label ?? `${Math.abs(seconds)} seconds`;
  if (seconds === 0) {
    return 'Stopped';
  }
  if (seconds === 1) {
    return 'Realtime';
  }
  if (seconds < 0) {
    return `−${label}/sec`;
  }
  return `${label}/sec`;
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

function IconButton({
  label,
  onClick,
  disabled,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full border text-sm transition
        ${active
          ? 'border-sky-400/60 bg-sky-400/20 text-sky-200'
          : 'border-white/10 bg-white/5 text-white/85 hover:border-white/25 hover:bg-white/10'}
        disabled:cursor-not-allowed disabled:opacity-35`}
    >
      {children}
    </button>
  );
}

const TimeControls = ({ dateRef, timeMultRef }: { dateRef: React.MutableRefObject<Date>, timeMultRef: React.MutableRefObject<number> }) => {
  const [isPaused, setIsPaused] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(Constants.timeMultipleIndex);
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [, setClockTick] = useState(0);

  const refreshClock = useCallback(() => {
    setClockTick((tick) => tick + 1);
  }, []);

  const applySpeed = useCallback((index: number, paused: boolean) => {
    timeMultRef.current = paused ? 0 : SPEED_STEPS[index].seconds;
  }, [timeMultRef]);

  useEffect(() => {
    applySpeed(Constants.timeMultipleIndex, false);
  }, [applySpeed]);

  useEffect(() => {
    if (isPaused || isEditingDate) {
      return;
    }
    const intervalId = window.setInterval(refreshClock, 100);
    return () => window.clearInterval(intervalId);
  }, [isPaused, isEditingDate, refreshClock]);

  const setSpeed = useCallback((index: number) => {
    const nextIndex = Math.max(0, Math.min(SPEED_STEPS.length - 1, index));
    setSpeedIndex(nextIndex);
    applySpeed(nextIndex, isPaused);
  }, [applySpeed, isPaused]);

  const togglePause = useCallback(() => {
    if (isPaused) {
      const nextIndex = SPEED_STEPS[speedIndex].seconds === 0 ? REALTIME_INDEX : speedIndex;
      setSpeedIndex(nextIndex);
      applySpeed(nextIndex, false);
      setIsPaused(false);
    } else {
      applySpeed(speedIndex, true);
      setIsPaused(true);
    }
  }, [applySpeed, isPaused, speedIndex]);

  const resetToNow = useCallback(() => {
    dateRef.current = new Date();
    setSpeedIndex(REALTIME_INDEX);
    applySpeed(REALTIME_INDEX, false);
    setIsPaused(false);
    refreshClock();
  }, [applySpeed, dateRef, refreshClock]);

  const jumpToRealtime = useCallback(() => {
    setSpeedIndex(REALTIME_INDEX);
    applySpeed(REALTIME_INDEX, isPaused);
  }, [applySpeed, isPaused]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) {
        return;
      }

      switch (event.key) {
        case ' ':
          event.preventDefault();
          togglePause();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          setSpeed(speedIndex - 1);
          break;
        case 'ArrowRight':
          event.preventDefault();
          setSpeed(speedIndex + 1);
          break;
        case 'n':
        case 'N':
        case 'Home':
          event.preventDefault();
          resetToNow();
          break;
        case '1':
          event.preventDefault();
          jumpToRealtime();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [jumpToRealtime, resetToNow, setSpeed, speedIndex, togglePause]);

  const date = dateRef.current;
  const speed = SPEED_STEPS[speedIndex].seconds;
  const isReverse = speed < 0;
  const isRealtime = speed === 1;
  const sliderAccent = isPaused ? '#94a3b8' : isReverse ? '#fb923c' : '#38bdf8';
  const centerPercent = (ZERO_INDEX / (SPEED_STEPS.length - 1)) * 100;

  const commitDate = (value: string) => {
    if (!value) {
      return;
    }
    dateRef.current = parseDatetimeUtc(value);
    refreshClock();
  };

  return (
    <div className="pointer-events-none absolute left-0 top-0 z-10 p-2">
      <div
        role="region"
        aria-label="Simulation time controls"
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
        className="pointer-events-auto w-fit select-none rounded-xl border border-white/10 bg-zinc-950/70 px-3.5 py-3 text-white shadow-xl backdrop-blur-md"
      >
        {isEditingDate ? (
          <input
            type="datetime-local"
            step="1"
            autoFocus
            defaultValue={toDatetimeUtcValue(date)}
            min="0001-01-01T00:00:00"
            max="9999-12-31T23:59:59"
            aria-label="Jump to UTC date"
            onChange={(event) => commitDate(event.target.value)}
            onBlur={() => setIsEditingDate(false)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === 'Escape') {
                event.currentTarget.blur();
              }
            }}
            className="mb-2 w-full rounded-md border border-white/20 bg-black/70 px-1.5 py-0.5 font-mono text-xs text-white outline-none [color-scheme:dark] focus:border-sky-400"
          />
        ) : (
          <button
            type="button"
            onClick={() => setIsEditingDate(true)}
            title="Jump to a UTC date"
            className="mb-2.5 block text-left leading-snug text-white/90"
          >
            <div className="text-lg font-medium tracking-wide text-white">{formatUtcDate(date)}</div>
            <div className="font-mono text-xl tabular-nums text-white">{formatUtcTime(date)}</div>
          </button>
        )}

        <div className="mb-2.5 flex items-center justify-center gap-1.5">
          <IconButton label="Reset to now in realtime (N)" onClick={resetToNow}>
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
              <path d="M17.65 6.35A7.96 7.96 0 0 0 12 4V1L7 6l5 5V8a5 5 0 1 1-5 5H5c0 4.42 3.58 8 8 8s8-3.58 8-8c0-2.21-.9-4.2-2.35-5.65z" />
            </svg>
          </IconButton>
          <IconButton label="Slower (←)" onClick={() => setSpeed(speedIndex - 1)} disabled={speedIndex === 0}>
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
              <path d="M11 18V6l-8.5 6L11 18zm.5-6 8.5 6V6l-8.5 6z" />
            </svg>
          </IconButton>
          <button
            type="button"
            title={isPaused ? 'Play (Space)' : 'Pause (Space)'}
            aria-label={isPaused ? 'Play' : 'Pause'}
            onClick={togglePause}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
          >
            {isPaused ? (
              <svg viewBox="0 0 24 24" className={`h-4 w-4 fill-current ${isReverse ? '-scale-x-100' : ''}`} aria-hidden="true">
                <path d="M8 5v14l11-7L8 5z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                <path d="M7 5h3v14H7V5zm7 0h3v14h-3V5z" />
              </svg>
            )}
          </button>
          <IconButton label="Faster (→)" onClick={() => setSpeed(speedIndex + 1)} disabled={speedIndex === SPEED_STEPS.length - 1}>
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
              <path d="M13 6v12l8.5-6L13 6zM3.5 18l8.5-6-8.5-6v12z" />
            </svg>
          </IconButton>
          <IconButton label="Realtime 1× (1)" onClick={jumpToRealtime} active={!isPaused && isRealtime}>
            <span className="text-[11px] font-semibold tracking-wide">1×</span>
          </IconButton>
        </div>

        <div>
          <input
            type="range"
            min={0}
            max={SPEED_STEPS.length - 1}
            step={1}
            value={speedIndex}
            aria-label="Simulation speed"
            onChange={(event) => setSpeed(parseInt(event.target.value, 10))}
            className="time-controls-slider w-full cursor-pointer"
            style={{
              accentColor: sliderAccent,
              background: `linear-gradient(to right, rgba(251, 146, 60, 0.55) 0%, rgba(251, 146, 60, 0.18) ${centerPercent}%, rgba(56, 189, 248, 0.18) ${centerPercent}%, rgba(56, 189, 248, 0.55) 100%)`,
            }}
          />
        </div>
        <div className={`mt-1.5 text-sm ${
          isPaused || speed === 0 ? 'text-slate-400' : isReverse ? 'text-orange-300' : 'text-sky-300'
        }`}>
          {formatSpeed(speed)}
        </div>
      </div>
    </div>
  );
};

export default TimeControls;

import { useEffect, useRef, useState } from 'react';
import useForceUpdate from '../hooks/useForceUpdate';
import Constants from '../Constants';

const TimeControls = ({ dateRef, timeMultRef }: { dateRef: React.MutableRefObject<Date>, timeMultRef: React.MutableRefObject<number> }) => {
  const [isPaused, setIsPaused] = useState(false);
  const timeMultIndexRef = useRef(Constants.timeMultipleIndex);
  const forceUpdate = useForceUpdate();

  const minutes = 60;
  const hours = 3600;
  const days = 86400;
  const years = 31557600; // 365.25 days
  const positiveOptions = [1, 10, 1 * minutes, 10 * minutes, 30 * minutes, 1 * hours, 3 * hours, 9 * hours, 1 * days, 5 * days, 30 * days, 1 * years, 5 * years];
  const positiveOptionsText = ["1 second", "10 seconds", "1 minute", "10 minutes", "30 minutes", "1 hour", "3 hours", "9 hours", "1 day", "5 days", "30 days", "1 year", "5 years"];

  const timeMultOptions = [
    ...positiveOptions.map((option) => option * -1).reverse(),
    0,
    ...positiveOptions
  ];

  const timeMultOptionsText = [
    ...positiveOptionsText.map((option) => "-" + option).reverse(),
    "0 seconds",
    ...positiveOptionsText
  ]

  // initially set timeMult to selected level from Constants
  useEffect(() => {
    timeMultRef.current = timeMultOptions[Constants.timeMultipleIndex];
  }, []);

  // was having issues getting this to update using date state without causing SolarSystem.tsx to update
  // so just force update 60 times per second
  const updateRate = 1/60;
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (!isPaused) {
        forceUpdate();
      }
    }, updateRate);

    return () => {
      clearInterval(intervalId);
    };
  }, [forceUpdate, isPaused]);

  const twoDigitFormat = (num: number) => {
    return num.toString().padStart(2, '0');
  };

  const togglePause = () => {
    if (!isPaused) {
      timeMultRef.current = 0;
    } else {
      timeMultRef.current = timeMultOptions[timeMultIndexRef.current];
    }
    setIsPaused(!isPaused);

  };

  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if(isPaused) {
      togglePause();
    }
    timeMultIndexRef.current = parseInt(event.target.value);
    timeMultRef.current = timeMultOptions[timeMultIndexRef.current];
  };

  const rewind = () => {
    if(isPaused) {
      togglePause();
    }
    if(timeMultIndexRef.current > 0) {
      timeMultIndexRef.current -= 1;
      timeMultRef.current = timeMultOptions[timeMultIndexRef.current];
    }
  };

  const fastForward = () => {
    if(isPaused) {
      togglePause();
    }
    if(timeMultIndexRef.current < timeMultOptions.length - 1) {
      timeMultIndexRef.current += 1;
      timeMultRef.current = timeMultOptions[timeMultIndexRef.current];
    }
  };

  const date = dateRef.current;
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = twoDigitFormat(date.getHours());
  const minute = twoDigitFormat(date.getMinutes());
  const second = twoDigitFormat(date.getSeconds());

  return (
    <div className="absolute top-0 left-0 mt-2 ml-2 text-white text-xl">
      <div className="clock-ui">
        <div className="clock-face">
          <div className="date-time">{`${month}/${day}/${year} ${hour}:${minute}:${second}`}</div>
        </div>
        <input
          type="range"
          min="0"
          max={timeMultOptions.length - 1}
          step="1"
          value={timeMultIndexRef.current}
          onChange={handleSliderChange}
          className={`linear-slider ${isPaused ? "accent-slate-400" : "accent-blue-500"}`}
        />
        <div className={`${isPaused ? "text-gray-400" : "text-white"}`}>{`${timeMultOptionsText[timeMultIndexRef.current]}/sec`}</div>
        <div className="space-x-2">
          <button onClick={rewind} className={"p-1 border rounded-md"}>Rewind</button>
          <button onClick={togglePause} className={"p-1 border rounded-md"}>{isPaused ? 'Play' : 'Pause'}</button>
          <button onClick={fastForward} className={"p-1 border rounded-md"}>Fast Forward</button>
        </div>
      </div>
    </div>
  );
};

export default TimeControls;
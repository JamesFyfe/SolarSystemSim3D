import React from 'react';

interface ClockProps {
  dateRef: React.MutableRefObject<Date>;
}

const Clock: React.FC<ClockProps> = ({ dateRef }) => {
  const date = dateRef.current;
  const seconds = date.getSeconds();
  const minutes = date.getMinutes();
  const hours = date.getHours() % 12;

  const secondHandRotation = (seconds / 60) * 360;
  const minuteHandRotation = (minutes / 60) * 360 + (seconds / 60) * 6;
  const hourHandRotation = (hours / 12) * 360 + (minutes / 60) * 30;

	const secondHandHeight = 20;

  return (
    <div className="relative w-64 h-64 rounded-full border-2 border-white">
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full">
				<div
          className="absolute top-12 left-1/2 w-0.5 h-20 bg-white origin-bottom"
          style={{ transform: `rotate(${secondHandRotation}deg)` }}
        />
        <div
          className="absolute top-16 left-1/2 w-1 h-16 transform bg-white origin-bottom"
          style={{ transform: `rotate(${minuteHandRotation}deg)` }}
        />
        <div
          className="absolute top-20 left-1/2 w-1.5 h-12 transform bg-white origin-bottom"
          style={{ transform: `rotate(${hourHandRotation}deg)` }}
        />
        <div className="absolute top-[20%] left-1/2 transform -translate-x-1/2 text-lg font-bold">
          {`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`}
        </div>
      </div>
      <div className="absolute top-[98%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full">
        {[...Array(12)].map((_, index) => (
          <div
            key={index}
            className="absolute top-0 left-1/2 w-0.5 h-3 transform -translate-x-1/2 bg-white"
            style={{ transform: `rotate(${index * 30}deg) translateY(-850%)` }}
          />
        ))}
      </div>
    </div>
  );
};

export default Clock;
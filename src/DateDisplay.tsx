import { useEffect } from 'react';
import useForceUpdate from './useForceUpdate';

const DateDisplay = ({ dateRef }: { dateRef: React.MutableRefObject<Date> }) => {
  const forceUpdate = useForceUpdate();

  useEffect(() => {
    const intervalId = setInterval(() => {
      forceUpdate();
    }, 16);

    return () => {
      clearInterval(intervalId);
    };
  }, [forceUpdate]);

  const twoDigitFormat = (num: number) => {
    let str = num.toString();
    if(num < 10) {
      str = '0' + str;
    }
    return str;
  }

  // const date = new Date(props.date);
  const date = dateRef.current;
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // Months are 0-indexed
  const day = date.getDate();
  const hour = twoDigitFormat(date.getHours());
  const minute = twoDigitFormat(date.getMinutes());
  // const second = twoDigitFormat(date.getSeconds());

  return (
    <div className="absolute top-0 left-0 mt-2 ml-2 text-white text-xl">
      {`${month}/${day}/${year} ${hour}:${minute}`}
    </div>
  );
};

export default DateDisplay;

import { useEffect, useState } from 'react';

const DateDisplay = ({ timestamp }) => {
  const [date, setDate] = useState(new Date(timestamp)); // Initial date

  useEffect(() => {
    // Update date when timestamp prop changes
    setDate(new Date(timestamp));
  }, [timestamp]);

  const year = date.getFullYear();
  const month = date.getMonth() + 1; // Months are 0-indexed
  const day = date.getDate();

  const dateStyle = {
    position: 'absolute',
    top: '0',
    left: '0',
    margin: '10px',
    color: 'white',
    fontSize: '20px',
  };

  return (
    <div style={dateStyle}>
      {month}/{day}/{year}
    </div>
  );
};

export default DateDisplay;

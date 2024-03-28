const DateDisplay = (props) => {
  const twoDigitFormat = (num) => {
    if(num < 10) {
      num = '0' + num;
    }
    return num;
  }

  const dateStyle = {
    position: 'absolute',
    top: '0',
    left: '0',
    margin: '10px',
    color: 'white',
    fontSize: '20px',
  };

  const date = new Date(props.date);
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // Months are 0-indexed
  const day = date.getDate();
  const hour = twoDigitFormat(date.getHours());
  const minute = twoDigitFormat(date.getMinutes());
  const second = twoDigitFormat(date.getSeconds());

  return (
    <div style={dateStyle}>
      {month}/{day}/{year} {hour}:{minute}:{second}
    </div>
  );
};

export default DateDisplay;

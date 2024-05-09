import { useRef } from 'react';
import SolarSystem from './SolarSystem';
import DateDisplay from './DateDisplay';
import Constants from './Constants';

export default function App() {
  // const [date, setDate] = useState(Constants.startDate);

  // const handleDateChange = () => {
  //   const newDate = new Date();
  //   setDate(newDate);
  // };

  // const date = useRef(Constants.startDate)
  console.log("APP");

  return (
    <div className='h-full overflow-hidden'>
      <SolarSystem />
      {/* <DateDisplay date={date} /> */}
    </div>
  );
}
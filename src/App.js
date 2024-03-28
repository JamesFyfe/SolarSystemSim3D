import React from 'react';
import CosmicExplorer from './CosmicExplorer';
import DateDisplay from './DateDisplay';
import Constants from './Constants.js';

function App() {
  const [date, setDate] = React.useState(Constants.startDate);
  return (
    <div className="App">
        <CosmicExplorer date = {date} setDate = {setDate}/>
        <DateDisplay date = {date}/>
    </div>
  );
}

export default App;

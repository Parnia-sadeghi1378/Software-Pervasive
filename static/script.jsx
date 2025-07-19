import React, { useState, useEffect } from 'react';
const CitySearch = () => {
 const[query, setQuery]= useState('');
 const[suggestions, setSuggestions]= useState([]);
 const[time, setTime]=useState('morning');
 useEffect(() => {
    if(query===([])){
        setSuggestions([]);
    return;
    }
    fetch(`http://127.0.0.1:5000/suggest?q=${query}`)
    .then(res => res.json())
    .then(data => {
      console.log("Fetched cities:", data);
      setSuggestions(data);
    })
    .catch(err => console.error("Error fetching suggestions:", err));
}, [query]);
 const handleSuggestionClick= (city) =>{
    setQuery(city);
    setSuggestions([]);
 };
 const handleSearch=()=>{
    if(!query){
        alert('please enter the city')
    }
    else{
        alert(`searching events in ${query} during the ${time}`)
    }
 };
 return(
    <div className='container'>
        <h2>Find Events Based on Your Location</h2>
        <label htmlFor='city'>Enter your city:</label>
        <input type='text' id='city' value={query} onChange={(e) => setQuery(e.target.value) }/>
        {suggestions.length>0 && (
            <ul className='suggestions'>
                {suggestions.map((city,index)=>(
                    <li key={index} onClick={() => handleSuggestionClick(city)}>
                        {city}
                    </li>
                
            ))}
            </ul>
        )}
      <label htmlFor="time">Select Your Time:</label>
      <select id="time" value={time} onChange={(e) => setTime(e.target.value)}>
        <option value="morning">Morning (6AM–11AM)</option>
        <option value="afternoon">Afternoon (12PM–5PM)</option>
        <option value="evening">Evening (6PM–10PM)</option>
      </select>

      <button onClick={handleSearch}>Search</button>
    </div>
  );
}
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<CitySearch />);

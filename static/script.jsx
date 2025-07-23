const { useState, useEffect } = React;

function App() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [events, setEvents] = useState([]);
  const [coords, setCoords] = useState(null); // {lat, lon}
  const [statusMsg, setStatusMsg] = useState("");
  const [time, setTime] = useState("all");
  const [simulatedProximityZone, setSimulatedProximityZone] = useState("None"); // NEW State for proximity
  const [preferredCategory, setPreferredCategory] = useState("All");
  const [simulatedRole, setSimulatedRole] = useState("standard");
  const [selectedDate, setSelectedDate] = useState("");
  const eventCategories = ["All", "Music", "Arts", "Sports", "Business", "Food & Drink", "Tech", "Other"];


  // city suggestions
  useEffect(() => {
    if (!query.trim()) { setSuggestions([]); return; }
    fetch(`/suggest?q=${encodeURIComponent(query)}`)
      .then(r => r.json())
      .then(setSuggestions)
      .catch(err => console.error("Suggest error:", err));
  }, [query]);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setStatusMsg("Geolocation not supported.");
      return;
    }
    setStatusMsg("Locating...");
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lon: longitude });
        setStatusMsg(`Got location (${latitude.toFixed(3)}, ${longitude.toFixed(3)})`);
      },
      err => {
        console.error(err);
        setStatusMsg("Failed to get location.");
      }
    );
  };

  const handleSuggestionClick = (city) => {
    setQuery(city);
    setSuggestions([]);
  };

  const fetchEvents = () => {
    setStatusMsg("Searching events...");
    const params = new URLSearchParams();
    if (coords) {
      params.set("lat", coords.lat);
      params.set("lon", coords.lon);
    }
    if (query.trim()) {
      params.set("city", query.trim());
    }
    if (time && time !== "all") {
      params.set("time", time);
    if (selectedDate) {
      params.set("date", selectedDate);
    }
    }
    // Optional: for testing user role based CAC
    // params.set("simulated_role", "premium"); // Uncomment to simulate premium user

    // NEW: Add simulated proximity zone to parameters
    if (simulatedProximityZone !== "None") {
      params.set("proximity_zone", simulatedProximityZone);
    }
    if (preferredCategory !== "All") {
      params.set("preferred_category", preferredCategory);
    }
    // NEW: Add simulated role to parameters
    if (simulatedRole !== "standard") { // Only add if it's 'premium'
      params.set("simulated_role", simulatedRole);
    }

    fetch(`/events?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          console.error("Event error:", data.error);
          setEvents([]);
          setStatusMsg("Error fetching events. See console.");
        } else {
          setEvents(data);
          setStatusMsg(data.length ? "" : "No events found.");
        }
      })
      .catch(err => {
        console.error("Fetch events failed:", err);
        setStatusMsg("Fetch failed.");
      });
  };

  return (
    <div>
      <h2>Find Events Near You</h2>
      <div className="city-search-container">
      
      <button onClick={useMyLocation}>Use My Location (GPS)</button>
      {statusMsg && <p>{statusMsg}</p>}

      <label>Or enter/select a city:</label>
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="e.g., Munich"
        autoComplete="off"
      />
      {suggestions.length > 0 && (
        <ul id="suggestions">
          {suggestions.map((c, i) => (
            <li key={i} onClick={() => handleSuggestionClick(c)}>{c}</li>
          ))}
        </ul>
      )}
       <label>Select Time Slot:</label>
        <select value={time} onChange={(e) => setTime(e.target.value)}>
          <option value="all">All Times</option>
          <option value="morning">Morning (6AM–11AM)</option>
          <option value="afternoon">Afternoon (12PM–5PM)</option>
          <option value="evening">Evening (6PM–10PM)</option>
        </select>
       <label>Select Date:</label>
        <input 
            type="date" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)} 
        />

        <label>Simulate Proximity Zone:</label> {/* NEW UI for simulation */}
        <select value={simulatedProximityZone} onChange={(e) => setSimulatedProximityZone(e.target.value)}>
          <option value="None">Not in a specific zone</option>
          <option value="Zone A">Exhibit Hall A (Simulated Beacon)</option>
          <option value="Zone B">Conference Room 3 (Simulated Wi-Fi)</option>
        </select>

        <br />
        <label>Preferred Event Category:</label>
        <select value={preferredCategory} onChange={(e) => setPreferredCategory(e.target.value)}>
          {eventCategories.map((cat, i) => (
            <option key={i} value={cat}>{cat}</option>
          ))}
        </select>
        <label>Simulate User Role:</label>
        <select value={simulatedRole} onChange={(e) => setSimulatedRole(e.target.value)}>
          <option value="standard">Standard User</option>
          <option value="premium">Premium User</option>
        </select>

         <br />
      <button onClick={fetchEvents}>Search Events</button>

      <h3>Events:</h3>
      <ul>
        {events.map((ev, i) => (
          <li key={i}>
            <strong>{ev.title}</strong><br/>
            {ev.datetime}{ev.venue ? ` @ ${ev.venue}` : ""}<br/>
            {ev.url ? (
                <a href={ev.url} target="_blank" rel="noopener noreferrer">View</a>
            ) : (
                <span style={{color: 'red', fontWeight: 'bold'}}>(Premium content - Upgrade to view link!)</span>
            )}
          </li>
        ))}
      </ul>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
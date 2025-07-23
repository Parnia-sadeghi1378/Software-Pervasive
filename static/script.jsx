const { useState, useEffect } = React;

function App() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [events, setEvents] = useState([]);
  const [coords, setCoords] = useState(null); // {lat, lon}
  const [statusMsg, setStatusMsg] = useState("");

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
    // Build URL: include coords if we have them; always include city if user typed
    const params = new URLSearchParams();
    if (coords) {
      params.set("lat", coords.lat);
      params.set("lon", coords.lon);
      // optional radius override: params.set("within","25km");
    }
    if (query.trim()) {
      params.set("city", query.trim());
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
        <ul>
          {suggestions.map((c, i) => (
            <li key={i} onClick={() => handleSuggestionClick(c)}>{c}</li>
          ))}
        </ul>
      )}

      <button onClick={fetchEvents}>Search Events</button>

      <h3>Events:</h3>
      <ul>
        {events.map((ev, i) => (
          <li key={i}>
            <strong>{ev.title}</strong><br/>
            {ev.datetime}{ev.venue ? ` @ ${ev.venue}` : ""}<br/>
            <a href={ev.url} target="_blank" rel="noopener noreferrer">View</a>
          </li>
        ))}
      </ul>
      </div>
    </div>
  
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);

from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import pandas as pd
import requests
from datetime import datetime, timedelta

app = Flask(__name__)
CORS(app)

SEATGEEK_CLIENT_ID = "NTE0MTc0MzF8MTc1MzI5MTg5NC44OTg5MTA4"
SEARCH_RADIUS = "25km"
CITY_FALLBACK_RADIUS = "50km"

# Load city suggestions
df = pd.read_csv('worldcities.csv')
CITIES = df['city'].dropna().unique().tolist()
EVENT_CATEGORIES = ["Music", "Arts", "Sports", "Business", "Food & Drink", "Tech", "Other"]


@app.route("/")
def index():
    return render_template("index.html")

@app.route("/suggest")
def suggest():
    q = request.args.get("q", "").lower()
    matches = [c for c in CITIES if c.lower().startswith(q)]
    return jsonify(matches)

def get_user_context():
    if request.headers.get("X-User-Role") == "premium":
        return {"role": "premium"}
    if request.args.get("simulated_role") == "premium":
        return {"role": "premium"}
    return {"role": "standard"}

@app.route("/events")
def get_events():
    """""
    Accepts:
      ?lat=<float>&lon=<float> (preferred if provided)
      ?city=<name> (fallback)
      ?time=<slot> → morning / afternoon / evening
      ?simulated_role=<role> (for testing CAC, e.g., 'premium')
      ?proximity_zone=<name> (for simulating micro-location)
      ?preferred_category=<name> (NEW: for user's preferred event categories)
    """
    lat = request.args.get("lat")
    lon = request.args.get("lon")
    city = request.args.get("city")
    time_slot = request.args.get("time")
    selected_date = request.args.get("date")
    proximity_zone = request.args.get("proximity_zone")
    preferred_category = request.args.get("preferred_category") # Get preferred category
    user_context = get_user_context()

    if not SEATGEEK_CLIENT_ID:
        return jsonify({"error": "Missing SeatGeek client_id"}), 500

    # Build query
    params = {"client_id": SEATGEEK_CLIENT_ID}
    if lat and lon:
        params["lat"] = lat
        params["lon"] = lon
    elif city:
        params["venue.city"] = city
    else:
        return jsonify({"error": "Please provide GPS coordinates or city name."}), 400
    if selected_date:
        try:
            start_of_day = datetime.strptime(selected_date, "%Y-%m-%d")
            end_of_day = start_of_day + timedelta(days=1) - timedelta(seconds=1)
            params["datetime_local.gte"] = start_of_day.strftime("%Y-%m-%dT%H:%M:%S")
            params["datetime_local.lte"] = end_of_day.strftime("%Y-%m-%dT%H:%M:%S")
        except ValueError:
            return jsonify({"error": "Invalid date format. Use YYYY-MM-DD."}), 400
    print(f"\n--- DEBUGGING SEATGEEK API CALL ---")
    print(f"Request URL: https://api.seatgeek.com/2/events")
    print(f"Request Parameters: {params}")
    print(f"-------------------------------------\n")

    # Request SeatGeek
    try:
        resp = requests.get("https://api.seatgeek.com/2/events", params=params, timeout=10)
    except requests.RequestException as e:
        return jsonify({"error": f"Network error: {e}"}), 502

    if resp.status_code != 200:
        return jsonify({"error": resp.text}), resp.status_code

    def matches_time_slot(local_time: str) -> bool:
        try:
            dt = datetime.strptime(local_time, "%Y-%m-%dT%H:%M:%S")
        except Exception:
            return True
        hour = dt.hour
        if time_slot == "morning":
            return 6 <= hour <= 11
        elif time_slot == "afternoon":
            return 12 <= hour <= 17
        elif time_slot == "evening":
            return 18 <= hour <= 22
        return True
    def matches_preferred_category(event_name: str, category: str) -> bool:
        if not category or category == "All":
            return True # No category filter applied
        
        # Simple keyword matching for demonstration against event title.
        # SeatGeek has 'performers.genres' or 'taxonomies' that could be used for more accurate filtering
        # if you wanted to map your categories to theirs.
        return category.lower() in event_name.lower()

    data = resp.json()
    events = []
    for ev in data.get("events", []):
        name = ev.get("title")
        start_local = ev.get("datetime_local")
        link = ev.get("url")
        venue = ev.get("venue", {}).get("name")

        # Premium restriction
        is_exclusive = "VIP" in name.upper() if name else False
        if is_exclusive and user_context["role"] != "premium":
            events.append({
                "title": f"{name} (Premium Access Required for Link)",
                "datetime": start_local,
                "url": None,
                "venue": venue
            })
            continue

        # Proximity filtering (simulated)
        if "EXHIBIT HALL A" in (venue or "").upper() and proximity_zone != "Zone A":
            continue

        if name and start_local and matches_time_slot(start_local):
            events.append({
                "title": name,
                "datetime": start_local,
                "url": link,
                "venue": venue
            })

    return jsonify(events)

if __name__ == "__main__":
    app.run(debug=True)

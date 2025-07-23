from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import pandas as pd
import requests
import os

app = Flask(__name__)
CORS(app)

# ---- CONFIG ----
EVENTBRITE_TOKEN = "GKPNOM7G2JDZJBOGSKTO"  # put your token here or load from env
SEARCH_RADIUS = "25km"  # when using GPS
CITY_FALLBACK_RADIUS = "50km"  # optional radius when only city -> we geocode

# ---- CITIES for suggestions ----
df = pd.read_csv('worldcities.csv')
CITIES = df['city'].dropna().unique().tolist()

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/suggest")
def suggest():
    q = request.args.get("q", "").lower()
    matches = [c for c in CITIES if c.lower().startswith(q)]
    return jsonify(matches)

@app.route("/events")
def get_events():
    """
    Accepts:
      ?lat=<float>&lon=<float>   (preferred if provided)
      ?city=<name>               (fallback)
      ?within=<distance>         optional override radius like '10km'
    """
    if not EVENTBRITE_TOKEN:
        return jsonify({"error": "API token missing"}), 500

    lat = request.args.get("lat")
    lon = request.args.get("lon")
    city = request.args.get("city")
    within = request.args.get("within")  # user override
    params = {"expand": "venue"}

    if lat and lon:
        # GPS mode
        params["location.latitude"] = lat
        params["location.longitude"] = lon
        params["location.within"] = within or SEARCH_RADIUS
    elif city:
        # City mode (Eventbrite will geocode internally)
        params["location.address"] = city
        # (Optional) you can add within; Eventbrite will center on address
        if within or CITY_FALLBACK_RADIUS:
            params["location.within"] = within or CITY_FALLBACK_RADIUS
    else:
        return jsonify({"error": "Provide lat/lon or city."}), 400

    url = "https://www.eventbriteapi.com/v3/events/search"
    headers = {"Authorization": f"Bearer {EVENTBRITE_TOKEN}"}

    try:
        resp = requests.get(url, headers=headers, params=params, timeout=15)
    except requests.RequestException as e:
        return jsonify({"error": f"Network error: {e}"}), 502

    if resp.status_code != 200:
        # Pass along Eventbrite error body for debugging
        return jsonify({"error": resp.text}), resp.status_code

    data = resp.json()
    events = []
    for ev in data.get("events", []):
        name = (ev.get("name") or {}).get("text")
        start_local = (ev.get("start") or {}).get("local")
        link = ev.get("url")
        venue_name = ((ev.get("venue") or {}).get("name")) if ev.get("venue") else None
        if name and start_local:
            events.append({
                "title": name,
                "datetime": start_local,
                "url": link,
                "venue": venue_name
            })

    return jsonify(events)

if __name__ == "__main__":
    app.run(debug=True)

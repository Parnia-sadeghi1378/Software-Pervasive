from flask import Flask, render_template, request, jsonify
import pandas as pd
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

df = pd.read_csv('worldcities.csv')  
print(df.head()) 
CITIES = df['city'].dropna().unique().tolist()
print(CITIES[:10]) 


@app.route('/')
def index():
    return render_template('index.html')

@app.route('/suggest')
def suggest():
    query = request.args.get('q', '').lower()
    suggestions = [city for city in CITIES if city.lower().startswith(query)]
    return jsonify(suggestions)

if __name__ == '__main__':
    app.run(debug=True)

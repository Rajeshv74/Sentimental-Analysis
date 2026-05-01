from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import os
from dotenv import load_dotenv
import nltk
from nltk.sentiment import SentimentIntensityAnalyzer
from textblob import TextBlob
import sqlite3

# ==============================
# 🔹 Setup
# ==============================

load_dotenv()

app = Flask(__name__)
CORS(app)

# ==============================
# 📦 Database Setup
# ==============================

import sqlite3

def init_db():
    conn = sqlite3.connect("users.db")
    c = conn.cursor()

    c.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            username TEXT UNIQUE,
            email TEXT,
            password TEXT
        )
    """)

    conn.commit()
    conn.close()

init_db()
# ==============================
# 📚 NLTK Setup
# ==============================

try:
    nltk.data.find('vader_lexicon')
except:
    nltk.download('vader_lexicon')

sia = SentimentIntensityAnalyzer()

# ==============================
# 🔑 Gemini Setup
# ==============================

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if GEMINI_API_KEY:
    print("✅ Gemini API Key Loaded")
    genai.configure(api_key=GEMINI_API_KEY)
else:
    print("❌ Gemini API Key NOT found")

# ==============================
# 🏠 Home
# ==============================

@app.route('/')
def home():
    return "✅ Backend running"

# ==============================
# 📝 SIGNUP
# ==============================

@app.route('/signup', methods=['POST'])
def signup():
    data = request.json

    conn = sqlite3.connect("users.db")
    c = conn.cursor()

    try:
        c.execute("INSERT INTO users (name, username, email, password) VALUES (?, ?, ?, ?)",
                  (data['name'], data['username'], data['email'], data['password']))
        conn.commit()
        return jsonify({"status": "success"})
    except:
        return jsonify({"status": "error", "message": "User exists"})
# ==============================
# 🔐 LOGIN
# ==============================
@app.route('/login', methods=['POST'])
def login():
    data = request.json

    conn = sqlite3.connect("users.db")
    c = conn.cursor()

    c.execute("SELECT name FROM users WHERE username=? AND password=?",
              (data['username'], data['password']))

    user = c.fetchone()
    conn.close()

    if user:
        return jsonify({"status": "success", "name": user[0]})
    else:
        return jsonify({"status": "error"})

# ==============================
# 👥 GET ALL USERS (for admin page)
# ==============================

@app.route('/users', methods=['GET'])
def get_users():
    conn = sqlite3.connect("users.db")
    c = conn.cursor()

    c.execute("SELECT name, username, email FROM users")
    users = c.fetchall()

    conn.close()

    return jsonify({
        "users": [
            {"name": u[0], "username": u[1], "email": u[2]}
            for u in users
        ]
    })

# ==============================
# 🧠 TEXT ANALYSIS
# ==============================

@app.route('/analyze-text', methods=['POST'])
def analyze_text():
    try:
        data = request.json
        text = data.get('text', '').strip()

        if not text:
            return jsonify({'status': 'error', 'message': 'No text provided'})

        print("📝 Input:", text)

        if GEMINI_API_KEY:
            try:
                result = analyze_with_gemini(text)
            except Exception as e:
                print("⚠ Gemini failed:", e)
                result = fallback_analysis(text)
        else:
            result = fallback_analysis(text)

        return jsonify({
            "status": "success",
            "analysis": result
        })

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

# ==============================
# 🤖 Gemini
# ==============================

def analyze_with_gemini(text):
    model = genai.GenerativeModel("gemini-pro")

    prompt = f"""
    Analyze the sentiment of this text:
    "{text}"

    Return ONLY JSON:
    {{
        "primary_emotion": "",
        "sentiment": "",
        "confidence": 0.9,
        "emotional_analysis": "",
        "ai_response": ""
    }}
    """

    response = model.generate_content(prompt)
    output = response.text.strip()

    output = output.replace("```json", "").replace("```", "").strip()

    import json
    return json.loads(output)

# ==============================
# 🔁 Fallback
# ==============================

def fallback_analysis(text):
    vader = sia.polarity_scores(text)

    sentiment = "neutral"
    if vader['compound'] > 0.2:
        sentiment = "positive"
    elif vader['compound'] < -0.2:
        sentiment = "negative"

    return {
        "primary_emotion": sentiment,
        "sentiment": sentiment,
        "confidence": abs(vader['compound']),
        "emotional_analysis": f"Detected {sentiment} sentiment using NLP.",
        "ai_response": f"You seem {sentiment}. I'm here for you 🙂"
    }

# ==============================
# ▶ RUN
# ==============================

if __name__ == "__main__":
    print("🚀 Server running on http://127.0.0.1:5000")
    app.run(debug=True)
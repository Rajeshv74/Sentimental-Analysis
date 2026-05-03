from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import os
from dotenv import load_dotenv
import nltk
from nltk.sentiment import SentimentIntensityAnalyzer
from textblob import TextBlob
import sqlite3
import base64
import io
import json
import wave
import numpy as np
import cv2
from deepface import DeepFace

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
# 🎙 Voice / Audio Helpers
# ==============================

def decode_wav_base64(audio_base64):
    if not audio_base64:
        raise ValueError("Audio payload is empty")

    if audio_base64.startswith("data:"):
        audio_base64 = audio_base64.split(",", 1)[1]

    raw_audio = base64.b64decode(audio_base64)
    with wave.open(io.BytesIO(raw_audio), "rb") as wf:
        frames = wf.readframes(wf.getnframes())
        sample_width = wf.getsampwidth()
        channels = wf.getnchannels()

    dtype = {1: np.int8, 2: np.int16, 4: np.int32}.get(sample_width, np.int16)
    samples = np.frombuffer(frames, dtype=dtype).astype(np.float64)

    if channels > 1 and samples.size > 0:
        samples = samples.reshape(-1, channels).mean(axis=1)

    return samples


def analyze_voice_audio(audio_data, recognized_text=""):
    if recognized_text:
        if GEMINI_API_KEY:
            try:
                return analyze_with_gemini_voice(recognized_text)
            except Exception as e:
                print("⚠ Gemini voice assistance failed:", e)
                return fallback_analysis(recognized_text)

        return fallback_analysis(recognized_text)

    if not audio_data:
        raise ValueError("No audio data provided")

    samples = decode_wav_base64(audio_data)
    if samples.size == 0:
        raise ValueError("Audio decoding returned no samples")

    rms = np.sqrt(np.mean(samples ** 2))
    normalized = min(1.0, rms / 3000.0)

    if normalized < 0.18:
        dominant_emotion = "calm"
    elif normalized < 0.35:
        dominant_emotion = "neutral"
    elif normalized < 0.55:
        dominant_emotion = "happy"
    else:
        dominant_emotion = "excited"

    confidence = min(1.0, normalized + 0.25)
    emotions_breakdown = {
        "calm": round(max(0, 100 - normalized * 130), 1),
        "neutral": round(max(0, 100 - abs(normalized - 0.33) * 150), 1),
        "happy": round(min(100, normalized * 180), 1),
        "excited": round(min(100, normalized * 210), 1)
    }

    return {
        "dominant_emotion": dominant_emotion,
        "confidence": round(confidence, 3),
        "emotional_analysis": f"Audio energy suggests a {dominant_emotion} speaking style.",
        "ai_response": f"Your voice sounds {dominant_emotion}. I'm here to listen.",
        "emotions_breakdown": emotions_breakdown
    }


def analyze_with_gemini_voice(transcript):
    model = genai.GenerativeModel("gemini-pro")
    prompt = f"""
Analyze emotion and sentiment in this spoken transcript.

Transcript:
"{transcript}"

Return ONLY valid JSON:

{{
"dominant_emotion":"happy",
"confidence":0.92,
"emotional_analysis":"Detailed emotional explanation",
"ai_response":"Empathetic AI response",
"emotions_breakdown": {{
   "happy":40,
   "neutral":35,
   "sad":15,
   "angry":10
}}
}}
"""

    response = model.generate_content(prompt)
    output = response.text.strip()
    output = output.replace("```json", "").replace("```", "").strip()
    return json.loads(output)


# ==============================
# 🎥 Face / Video Analysis
# ==============================

def decode_base64_image(base64_string):
    if not base64_string:
        raise ValueError("Image payload is empty")

    if base64_string.startswith("data:"):
        base64_string = base64_string.split(",", 1)[1]

    image_bytes = base64.b64decode(base64_string)
    np_arr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Unable to decode image data")

    return image


def analyze_face_image(image_data):
    if isinstance(image_data, str):
        image = decode_base64_image(image_data)
    else:
        image = image_data

    analysis = DeepFace.analyze(img_path=image, actions=["emotion"], enforce_detection=True)
    if isinstance(analysis, list):
        analysis = analysis[0] if analysis else {}

    if not isinstance(analysis, dict):
        raise ValueError("Unexpected face analysis response format")

    emotions = analysis.get("emotion") or {}
    dominant_emotion = analysis.get("dominant_emotion") or None

    if not dominant_emotion and emotions:
        dominant_emotion = max(emotions, key=emotions.get)

    dominant_emotion = (dominant_emotion or "neutral").lower()

    normalized = {k.lower(): float(v) for k, v in emotions.items()} if isinstance(emotions, dict) else {}
    max_value = max(normalized.values()) if normalized else 0.0
    confidence = max_value / 100.0 if max_value > 1 else max_value
    confidence = min(confidence, 1.0)

    return {
        "dominant_emotion": dominant_emotion,
        "confidence": round(confidence, 3),
        "emotional_analysis": f"Detected facial emotion as {dominant_emotion} from the camera snapshot.",
        "ai_response": f"You appear {dominant_emotion}. I'm here to help interpret that emotion.",
        "emotions_breakdown": {k: round(v, 1) for k, v in normalized.items()}
    }


@app.route('/analyze-voice', methods=['POST','OPTIONS'])
def analyze_voice():
    try:
        if request.method == 'OPTIONS':
            return '', 200

        data = request.json or {}
        audio_data = data.get('audio_data', '').strip()
        recognized_text = data.get('recognized_text', '').strip()

        if not recognized_text and not audio_data:
            return jsonify({
                "status": "error",
                "message": "No audio data or transcript provided"
            })

        if recognized_text and GEMINI_API_KEY:
            print("🎤 Transcript:", recognized_text)
            try:
                result = analyze_with_gemini_voice(recognized_text)
            except Exception as e:
                print("⚠ Gemini voice analysis failed:", e)
                result = analyze_voice_audio(audio_data, recognized_text)
        else:
            result = analyze_voice_audio(audio_data, recognized_text)

        return jsonify({
            "status": "success",
            "voice_analysis": result
        })
    except Exception as e:
        print("Voice analysis error:", e)

        try:
            result = analyze_voice_audio(data.get('audio_data', ''), data.get('recognized_text', ''))
            return jsonify({
                "status": "success",
                "voice_analysis": result
            })
        except Exception as fallback_error:
            return jsonify({"status": "error", "message": str(fallback_error)})

@app.route('/analyze-face', methods=['POST','OPTIONS'])
def analyze_face():
    try:
        if request.method == 'OPTIONS':
            return '', 200

        data = request.json or {}
        image_data = data.get('image', '').strip()

        if not image_data:
            return jsonify({"status": "error", "message": "No image provided"})

        result = analyze_face_image(image_data)

        return jsonify({
            "status": "success",
            "face_analysis": result
        })

    except Exception as e:
        print("Face analysis error:", e)
        return jsonify({"status": "error", "message": str(e)})

@app.route('/analyze-video', methods=['POST','OPTIONS'])
def analyze_video():
    return analyze_face()

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


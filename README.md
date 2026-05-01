# Sentiment-Analysis
Sentiment Pro – Multi-Modal Sentiment Analysis Platform

Sentiment Pro is a web-based multi-modal sentiment analysis system that analyzes text, voice, and facial expressions to detect emotions, sentiment polarity, sarcasm, and emotional intensity. It combines a modern animated frontend with a powerful AI-driven backend using Flask, NLTK, TextBlob, and Google Gemini AI.

🚀 Features

🔐 User Login System (LocalStorage-based)

📝 Text Sentiment Analysis

Emotion detection

Sarcasm & irony detection

Confidence scoring

🎤 Voice Sentiment Analysis

Audio recording

Emotion detection from speech text

📷 Facial Emotion Detection

Webcam capture

Emotion prediction from facial image

🧠 AI-generated empathetic responses

📜 User-wise analysis history

🎨 Premium UI

Glassmorphism design

Animated background

Responsive dashboard

🛠️ Technologies Used Frontend

HTML5

CSS3 (Glassmorphism + Animations)

JavaScript (Vanilla JS)

Backend

Python (Flask)

Flask-CORS

Google Gemini AI

NLTK (VADER)

TextBlob

Pillow (Image Processing)

dotenv (Environment variables) Project Structure Sentiment-Pro/ │ ├── index.html # Frontend UI & Dashboard ├── style.css # Styling & animations ├── script.js # Client-side logic & API calls ├── server.py # Flask backend & AI logic └── README.md # Project documentation Setup & Installation 1️⃣ Clone or Download the Project git clone https://github.com/your-username/sentiment-pro.git cd sentiment-pro 2️⃣ Create Virtual Environment (Recommended) python -m venv venv venv\Scripts\activate # Windows source venv/bin/activate # Linux/Mac 3️⃣ Install Required Packages pip install flask flask-cors google-generativeai pillow python-dotenv nltk textblob 🔑 Environment Configuration

Create a .env file in the project folder: GEMINI_API_KEY=your_google_gemini_api_key ⚠️ If the API key is not provided, the system automatically switches to fallback sentiment analysis. ▶️ How to Run the Project Start Backend Server python server.py Server runs on: http://localhost:5000 Open Frontend

Open index.html directly in your browser OR

Use Live Server in VS Code 🔄 API Endpoints

Endpoint	Method	Description
/analyze-text	POST	Text sentiment analysis
/analyze-voice	POST	Voice emotion analysis
/analyze-face	POST	Facial emotion detection
📊 Sample Output		
Primary Emotion: Happy / Sad / Angry / Neutral

Confidence Score: 60% – 95%

Sarcasm Detection: True / False

AI Response: Empathetic feedback with emojis 😊

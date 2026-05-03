console.log("JS Loaded");
//Global variables
let mediaRecorder;
let audioChunks = [];
let stream;
let videoStream;
let isCameraOn = false;
let currentUser = null;
let recordingTimer;
let recordingSeconds = 0;
let history = [];
let currentFilter = 'all';
let currentSearch = '';
let audioContext;
let analyser;
let dataArray;
let bufferLength;
let isRecording = false;

// DOM Elements
const loginPage = document.getElementById('loginPage');
const dashboard = document.getElementById('dashboard');
const logoutBtn = document.getElementById('logoutBtn');
const userName = document.getElementById('userName');
const displayName = document.getElementById('displayName');
const featureCards = document.querySelectorAll('.feature-card');
const analysisSections = document.getElementById('analysisSections');
const textSection = document.getElementById('textSection');
const voiceSection = document.getElementById('voiceSection');
const faceSection = document.getElementById('faceSection');
const historySection = document.getElementById('historySection');
const aiResponseSection = document.getElementById('aiResponseSection');
const backBtns = document.querySelectorAll('.back-btn');
const navItems = document.querySelectorAll('.nav-item');
const clearHistoryBtn = document.getElementById('clearHistory');
const filterBtns = document.querySelectorAll('.filter-btn');
const historySearch = document.getElementById('historySearch');
const historyList = document.getElementById('historyList');
const emptyHistory = document.getElementById('emptyHistory');
const textCount = document.getElementById('textCount');
const voiceCount = document.getElementById('voiceCount');
const faceCount = document.getElementById('faceCount');
const totalCount = document.getElementById('totalCount');

// Analysis elements
const startRecordingBtn = document.getElementById('startRecording');
const stopRecordingBtn = document.getElementById('stopRecording');
const voiceStatus = document.getElementById('voiceStatus');
const voiceResult = document.getElementById('voiceResult');
const startCameraBtn = document.getElementById('startCamera');
const stopCameraBtn = document.getElementById('stopCamera');
const captureFaceBtn = document.getElementById('captureFace');
const faceStatus = document.getElementById('faceStatus');
const faceResult = document.getElementById('faceResult');
const aiResponse = document.getElementById('aiResponse');
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const analyzeTextBtn = document.getElementById('analyzeText');
const textInput = document.getElementById('textInput');
const textStatus = document.getElementById('textStatus');
const textResult = document.getElementById('textResult');
const charCount = document.getElementById('charCount');
const recordingTime = document.getElementById('recordingTime');
const recordingStatus = document.getElementById('recordingStatus');
const recordedAudio = document.getElementById('recordedAudio');
const audioPlayback = document.getElementById('audioPlayback');

// Loading spinner
const loadingSpinner = document.querySelector('.loading-spinner');

// API Base URL
const API_BASE_URL = 'http://127.0.0.1:5000';

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Check if user is already logged in
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        loginPage.style.display = 'none';
        dashboard.style.display = 'block';
        userName.textContent = currentUser.name;
        displayName.textContent = currentUser.name;
        loadHistory();
        updateHistoryStats();
    } else {
        // Initialize button states
        stopRecordingBtn.disabled = true;
        stopCameraBtn.disabled = true;
        captureFaceBtn.disabled = true;
        
        // Set initial status messages
        faceStatus.innerHTML = '<div class="status-message"><i class="fas fa-camera"></i> Click "Start Camera" to begin facial sentiment analysis</div>';
        voiceStatus.innerHTML = '<div class="status-message"><i class="fas fa-microphone"></i> Click "Start Recording" to begin voice sentiment analysis</div>';
        textStatus.innerHTML = '<div class="status-message"><i class="fas fa-keyboard"></i> Enter text and click "Analyze Sentiment" for text analysis</div>';
        
        // Character counter for text input
        if (textInput && charCount) {
            textInput.addEventListener('input', function() {
                charCount.textContent = this.value.length;
                
                // Add typing animation effect
                if (this.value.length > 0) {
                    this.style.borderColor = '#6366f1';
                } else {
                    this.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                }
            });
        }
        
        // Add enter key support for text analysis
        textInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                analyzeText();
            }
        });
        
        // Initialize visualizer animation
        initializeVisualizer();
    }
}

// User-specific History Management Functions
function loadHistory() {
    if (!currentUser) return;
    
    const userHistoryKey = `sentimentAnalysisHistory_${currentUser.username}`;
    const savedHistory = localStorage.getItem(userHistoryKey);
    if (savedHistory) {
        history = JSON.parse(savedHistory);
    } else {
        history = [];
    }
    updateHistoryStats();
}

function saveHistory() {
    if (!currentUser) return;
    
    const userHistoryKey = `sentimentAnalysisHistory_${currentUser.username}`;
    localStorage.setItem(userHistoryKey, JSON.stringify(history));
}

function addToHistory(type, data, input, result) {
    if (!currentUser) return;
    
    const historyItem = {
        id: Date.now().toString(),
        type: type,
        timestamp: new Date().toISOString(),
        input: input,
        result: result,
        data: data,
        username: currentUser.username
    };
    
    history.unshift(historyItem);
    if (history.length > 100) {
        history = history.slice(0, 100);
    }
    
    saveHistory();
    updateHistoryStats();
    
    if (historySection.style.display !== 'none') {
        displayHistory();
    }
}

function clearHistory() {
    if (history.length === 0) return;
    
    if (confirm('Are you sure you want to clear all analysis history? This action cannot be undone.')) {
        history = [];
        saveHistory();
        updateHistoryStats();
        displayHistory();
        showNotification('History cleared successfully', 'success');
    }
}

function deleteHistoryItem(id) {
    history = history.filter(item => item.id !== id);
    saveHistory();
    updateHistoryStats();
    displayHistory();
    showNotification('Analysis deleted from history', 'info');
}

function updateHistoryStats() {
    const textAnalyses = history.filter(item => item.type === 'text').length;
    const voiceAnalyses = history.filter(item => item.type === 'voice').length;
    const faceAnalyses = history.filter(item => item.type === 'face').length;
    
    if (textCount) textCount.textContent = textAnalyses;
    if (voiceCount) voiceCount.textContent = voiceAnalyses;
    if (faceCount) faceCount.textContent = faceAnalyses;
    if (totalCount) totalCount.textContent = history.length;
}

function displayHistory(filter = 'all', searchTerm = '') {
    if (!historyList) return;
    
    let filteredHistory = history;
    
    if (filter !== 'all') {
        filteredHistory = history.filter(item => item.type === filter);
    }
    
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredHistory = filteredHistory.filter(item => {
            if (item.type === 'text') {
                return item.input.toLowerCase().includes(term) || 
                       item.result.primary_emotion.toLowerCase().includes(term);
            } else if (item.type === 'voice') {
                return item.result.dominant_emotion.toLowerCase().includes(term);
            } else if (item.type === 'face') {
                return item.result.dominant_emotion.toLowerCase().includes(term);
            }
            return false;
        });
    }
    
    if (emptyHistory) {
        if (filteredHistory.length === 0) {
            emptyHistory.style.display = 'block';
            historyList.style.display = 'none';
        } else {
            emptyHistory.style.display = 'none';
            historyList.style.display = 'block';
        }
    }
    
    historyList.innerHTML = '';
    
    filteredHistory.forEach(item => {
        const historyItem = createHistoryItem(item);
        historyList.appendChild(historyItem);
    });
}

function createHistoryItem(item) {
    const div = document.createElement('div');
    div.className = 'history-item glassmorphism';
    
    const timeAgo = getTimeAgo(new Date(item.timestamp));
    const emotion = item.type === 'text' ? item.result.primary_emotion : item.result.dominant_emotion;
    
    let previewContent = '';
    if (item.type === 'text') {
        previewContent = `
            <div class="history-preview">
                <div class="history-preview-text">"${item.input.length > 150 ? item.input.substring(0, 150) + '...' : item.input}"</div>
            </div>
        `;
    } else if (item.type === 'face') {
        previewContent = `
            <div class="history-preview">
                <div class="history-preview-image">
                    <img src="${item.data.imageData}" alt="Captured face" onerror="this.style.display='none'">
                </div>
            </div>
        `;
    } else if (item.type === 'voice') {
        previewContent = `
            <div class="history-preview">
                <div class="history-preview-text">Voice recording (${item.data.duration}s)</div>
            </div>
        `;
    }
    
    div.innerHTML = `
        <div class="history-item-header">
            <div class="history-item-type">
                <div class="type-icon ${item.type}">
                    <i class="fas fa-${getTypeIcon(item.type)}"></i>
                </div>
                <div class="history-item-info">
                    <h4>${getTypeName(item.type)} Analysis</h4>
                    <div class="timestamp">${timeAgo}</div>
                </div>
            </div>
            <div class="history-item-actions">
                <button class="action-btn-small" onclick="viewHistoryItem('${item.id}')" title="View Details">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="action-btn-small" onclick="deleteHistoryItem('${item.id}')" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
        ${previewContent}
        <div class="history-sentiment-tags">
            <div class="sentiment-tag-small ${emotion}">${emotion.charAt(0).toUpperCase() + emotion.slice(1)}</div>
            ${item.type === 'text' && item.result.is_sarcastic ? '<div class="sentiment-tag-small sarcastic">Sarcastic</div>' : ''}
            ${item.type === 'text' && item.result.is_ironic ? '<div class="sentiment-tag-small ironic">Ironic</div>' : ''}
            <div class="sentiment-tag-small confidence">${Math.round((item.type === 'text' ? item.result.confidence : item.result.confidence) * 100)}% Confident</div>
        </div>
    `;
    
    return div;
}

function viewHistoryItem(id) {
    const item = history.find(i => i.id === id);
    if (!item) return;
    
    if (item.type === 'text') {
        showAnalysisSection('text');
        setTimeout(() => {
            textInput.value = item.input;
            charCount.textContent = item.input.length;
            displayTextResults(item.result);
            showAIResponse(item.result.ai_response);
            textStatus.innerHTML = '<div class="success-message"><i class="fas fa-history"></i> Loaded from history</div>';
        }, 300);
    } else if (item.type === 'voice') {
        showAnalysisSection('voice');
        setTimeout(() => {
            displayVoiceResults(item.result, '', item.data.duration);
            showAIResponse(item.result.ai_response);
            voiceStatus.innerHTML = '<div class="success-message"><i class="fas fa-history"></i> Loaded from history</div>';
        }, 300);
    } else if (item.type === 'face') {
        showAnalysisSection('face');
        setTimeout(() => {
            const tempImg = new Image();
            tempImg.src = item.data.imageData;
            tempImg.onload = function() {
                const context = canvas.getContext('2d');
                canvas.width = tempImg.width;
                canvas.height = tempImg.height;
                context.drawImage(tempImg, 0, 0);
                displayFaceResults(item.result);
                showAIResponse(item.result.ai_response);
                faceStatus.innerHTML = '<div class="success-message"><i class="fas fa-history"></i> Loaded from history</div>';
            };
        }, 300);
    }
}
function testAPI() {
    console.log("🔥 Button clicked directly");

    fetch("http://127.0.0.1:5000/analyze-text", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ text: "I am happy" })
    })
    .then(res => res.json())
    .then(data => {
        console.log("✅ Response:", data);
        alert("Working ✅");
    })
    .catch(err => {
        console.error(err);
        alert("Error ❌");
    });
}

function getTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
        return 'Just now';
    } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 2592000) {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days} day${days > 1 ? 's' : ''} ago`;
    } else {
        return date.toLocaleDateString();
    }
}

function getTypeIcon(type) {
    const icons = {
        'text': 'keyboard',
        'voice': 'microphone',
        'face': 'eye'
    };
    return icons[type] || 'question';
}

function getTypeName(type) {
    const names = {
        'text': 'Text',
        'voice': 'Voice',
        'face': 'Face'
    };
    return names[type] || 'Unknown';
}

// Login functionality
async function doLogin() {

    const username =
      document.getElementById("li-identifier").value.trim();

    const password =
      document.getElementById("li-pw").value;

    try{

        const res = await fetch(
          "http://127.0.0.1:5000/login",
        {
            method:"POST",
            headers:{
               "Content-Type":"application/json"
            },
            body: JSON.stringify({
                username,
                password
            })
        });

        const data=await res.json();

        if(data.status==="success"){

            currentUser={
               username:username,
               name:data.name
            };

            localStorage.setItem(
               "currentUser",
               JSON.stringify(currentUser)
            );

            userName.textContent=data.name;
            displayName.textContent=data.name;

            showPage('dashboard');

            alert("Login Successful ✅");
        }

        else{
            alert("Invalid username/password ❌");
        }

    }catch(error){
       console.error(error);
       alert("Server error");
    }

}
// Logout functionality
logoutBtn.addEventListener('click', function() {
    showLoading();
    
    setTimeout(() => {
        // Clear current user from localStorage
        localStorage.removeItem('currentUser');
        currentUser = null;
        
        dashboard.style.display = 'none';
        loginPage.style.display = 'flex';
        
        loginForm.reset();
        resetAllSections();
        
        hideLoading();
        showNotification('Logged out successfully', 'info');
    }, 1000);
});

// Feature card navigation
featureCards.forEach(card => {
    card.addEventListener('click', function() {
        const feature = this.getAttribute('data-feature');
        showAnalysisSection(feature);
        
        this.style.transform = 'scale(0.95)';
        setTimeout(() => {
            this.style.transform = 'scale(1)';
        }, 150);
    });
});

// Navigation menu
navItems.forEach(item => {
    item.addEventListener('click', function(e) {
        e.preventDefault();
        const section = this.getAttribute('data-section');
        
        navItems.forEach(nav => nav.classList.remove('active'));
        this.classList.add('active');
        
        if (section === 'dashboard-main') {
            hideAnalysisSection('all');
        } else if (section === 'history') {
            showHistorySection();
        }
    });
});

// Back button functionality
backBtns.forEach(btn => {
    btn.addEventListener('click', function() {
        const feature = this.getAttribute('data-back');
        hideAnalysisSection(feature);
    });
});

// History section navigation
function showHistorySection() {
    document.querySelector('.features-grid').style.display = 'none';
    document.querySelector('.welcome-section').style.display = 'none';
    document.querySelector('.activity-section').style.display = 'none';
    analysisSections.style.display = 'none';
    aiResponseSection.style.display = 'none';
    
    historySection.style.display = 'block';
    historySection.style.animation = 'slideInRight 0.5s ease-out';
    
    displayHistory(currentFilter, currentSearch);
}

// Filter buttons
filterBtns.forEach(btn => {
    btn.addEventListener('click', function() {
        const filter = this.getAttribute('data-filter');
        
        filterBtns.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        
        currentFilter = filter;
        displayHistory(currentFilter, currentSearch);
    });
});

// Search functionality
if (historySearch) {
    historySearch.addEventListener('input', function() {
        currentSearch = this.value;
        displayHistory(currentFilter, currentSearch);
    });
}

// Clear history button
if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', clearHistory);
}

function showAnalysisSection(feature) {
    document.querySelector('.features-grid').style.display = 'none';
    document.querySelector('.welcome-section').style.display = 'none';
    document.querySelector('.activity-section').style.display = 'none';
    historySection.style.display = 'none';
    
    analysisSections.style.display = 'block';
    aiResponseSection.style.display = 'none';
    
    switch(feature) {
        case 'text':
            textSection.style.display = 'block';
            textSection.style.animation = 'slideInRight 0.5s ease-out';
            break;
        case 'voice':
            voiceSection.style.display = 'block';
            voiceSection.style.animation = 'slideInRight 0.5s ease-out';
            break;
        case 'face':
            faceSection.style.display = 'block';
            faceSection.style.animation = 'slideInRight 0.5s ease-out';
            break;
    }
    
    resetAllSections();
}

function hideAnalysisSection(feature) {
    textSection.style.display = 'none';
    voiceSection.style.display = 'none';
    faceSection.style.display = 'none';
    historySection.style.display = 'none';
    aiResponseSection.style.display = 'none';
    
    analysisSections.style.display = 'none';
    document.querySelector('.features-grid').style.display = 'grid';
    document.querySelector('.welcome-section').style.display = 'block';
    document.querySelector('.activity-section').style.display = 'block';
    
    document.querySelector('.features-grid').style.animation = 'fadeIn 0.5s ease-out';
    
    navItems.forEach(nav => {
        if (nav.getAttribute('data-section') === 'dashboard-main') {
            nav.classList.add('active');
        } else {
            nav.classList.remove('active');
        }
    });
    
    resetAllSections();
}

function resetAllSections() {
    if (videoStream) {
        stopCamera();
    }
    
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        stopRecording();
    }
    
    textStatus.innerHTML = '<div class="status-message"><i class="fas fa-keyboard"></i> Enter text and click "Analyze Sentiment" for text analysis</div>';
    textResult.innerHTML = '';
    voiceStatus.innerHTML = '<div class="status-message"><i class="fas fa-microphone"></i> Click "Start Recording" to begin voice sentiment analysis</div>';
    voiceResult.innerHTML = '';
    faceStatus.innerHTML = '<div class="status-message"><i class="fas fa-camera"></i> Click "Start Camera" to begin facial sentiment analysis</div>';
    faceResult.innerHTML = '';
    aiResponse.innerHTML = '';
    
    textInput.value = '';
    if (charCount) charCount.textContent = '0';
    
    stopRecordingTimer();
    if (audioPlayback) audioPlayback.style.display = 'none';
}

/// Text Analysis Functions

document.addEventListener("DOMContentLoaded", function () {

    const analyzeTextBtn = document.getElementById("analyzeText");

    if (!analyzeTextBtn) {
        console.log("❌ Button not found");
        return;
    }

    console.log("✅ Button connected");

    analyzeTextBtn.addEventListener('click', analyzeText);

});

async function analyzeText() {
    console.log("🔥 Button clicked");

    const text = textInput.value.trim();
    
    if (!text) {
        textStatus.innerHTML = '<div class="error-message"><i class="fas fa-exclamation-circle"></i> Please enter some text to analyze</div>';
        return;
    }

    try {
        showLoading();
        textStatus.innerHTML = '<div class="status-message"><i class="fas fa-spinner fa-spin"></i> Analyzing text sentiment with AI...</div>';
        textResult.innerHTML = '';
        
        const response = await fetch(`${API_BASE_URL}/analyze-text`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: text })
        });
        
        const data = await response.json();

        console.log("✅ Response:", data);

        if (data.status === 'success') {
            displayTextResults(data.analysis);
            showAIResponse(data.analysis.ai_response);
            textStatus.innerHTML = '<div class="success-message"><i class="fas fa-check-circle"></i> Text sentiment analysis complete!</div>';
            
            addToHistory('text', { text: text }, text, data.analysis);
        } else {
            throw new Error(data.message);
        }

        hideLoading();
        
    } catch (error) {
        console.error('❌ Error:', error);
        textStatus.innerHTML = `<div class="error-message">Error: ${error.message}</div>`;
        hideLoading();
    }
}
async function signupUser() {
    const name = document.getElementById('su-name').value;
    const email = document.getElementById('su-email').value;
    const username = document.getElementById('su-username').value;
    const password = document.getElementById('su-pw').value;

    const res = await fetch("http://127.0.0.1:5000/signup", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name,
            email,
            username,
            password
        })
    });

    const data = await res.json();

    if (data.status === "success") {
        alert("Account created ✅");
    } else {
        alert(data.message);
    }
}
function displayTextResults(analysis) {
    let emotionsHTML = '';
    
    if (analysis.emotions_breakdown) {
        const sortedEmotions = Object.entries(analysis.emotions_breakdown)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5); // Show top 5 emotions
        
        sortedEmotions.forEach(([emotion, score]) => {
            emotionsHTML += `
                <div class="emotion-bar">
                    <div class="emotion-label">
                        <span>${emotion.charAt(0).toUpperCase() + emotion.slice(1)}</span>
                        <span>${score}%</span>
                    </div>
                    <div class="emotion-progress">
                        <div class="emotion-fill" style="width: ${score}%; background: ${getEmotionColor(emotion)}"></div>
                    </div>
                </div>
            `;
        });
    }
    
    // Add emotion complexity badge
    const complexityBadge = analysis.emotion_complexity ? `
        <div class="sentiment-tag complexity-${analysis.emotion_complexity}">
            <i class="fas fa-layer-group"></i>
            ${analysis.emotion_complexity.charAt(0).toUpperCase() + analysis.emotion_complexity.slice(1)} Emotions
        </div>
    ` : '';
    
    // Add sarcasm/irony badges
    const sarcasmBadges = `
        ${analysis.is_sarcastic ? '<div class="sentiment-tag sarcastic"><i class="fas fa-grin-tongue-wink"></i> Sarcastic</div>' : ''}
        ${analysis.is_ironic ? '<div class="sentiment-tag ironic"><i class="fas fa-exchange-alt"></i> Ironic</div>' : ''}
        ${analysis.is_satirical ? '<div class="sentiment-tag satirical"><i class="fas fa-theater-masks"></i> Satirical</div>' : ''}
    `;
    
    // Add intensity indicator
    const intensityBadge = analysis.emotional_intensity ? `
        <div class="sentiment-tag intensity-${analysis.emotional_intensity}">
            <i class="fas fa-${analysis.emotional_intensity === 'high' ? 'fire' : analysis.emotional_intensity === 'medium' ? 'wave-square' : 'leaf'}"></i>
            ${analysis.emotional_intensity.charAt(0).toUpperCase() + analysis.emotional_intensity.slice(1)} Intensity
        </div>
    ` : '';
    
    textResult.innerHTML = `
        <div class="analysis-result">
            <div class="result-header">
                <h3><i class="fas fa-chart-pie"></i> Enhanced Sentiment Analysis Results</h3>
                <div class="confidence-badge" style="background: ${getConfidenceColor(analysis.confidence)}">
                    <i class="fas fa-brain"></i>
                    ${(analysis.confidence * 100).toFixed(1)}% Confidence
                </div>
            </div>
            
            <div class="sentiment-tags">
                <div class="sentiment-badge" style="background: ${getEmotionColor(analysis.primary_emotion)}">
                    <i class="fas fa-star"></i>
                    ${analysis.primary_emotion.toUpperCase()}
                </div>
                <div class="sentiment-badge" style="background: ${getSentimentColor(analysis.sentiment)}">
                    <i class="fas fa-chart-line"></i>
                    ${analysis.sentiment.toUpperCase()} SENTIMENT
                </div>
                ${complexityBadge}
                ${intensityBadge}
                ${sarcasmBadges}
            </div>
            
            <div class="analysis-details">
                <div class="detail-item">
                    <h4><i class="fas fa-analytics"></i> Detailed Analysis</h4>
                    <p>${analysis.emotional_analysis}</p>
                </div>
                
                ${analysis.detailed_insights && analysis.detailed_insights.length > 0 ? `
                <div class="detail-item">
                    <h4><i class="fas fa-lightbulb"></i> Key Insights</h4>
                    <div class="insights-grid">
                        ${analysis.detailed_insights.map(insight => `
                            <div class="insight-tag">${insight}</div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
                
                ${analysis.linguistic_insights && analysis.linguistic_insights.length > 0 ? `
                <div class="detail-item">
                    <h4><i class="fas fa-language"></i> Linguistic Patterns</h4>
                    <div class="insights-grid">
                        ${analysis.linguistic_insights.map(insight => `
                            <div class="insight-tag linguistic">${insight}</div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
            </div>
            
            ${emotionsHTML ? `
            <div class="emotions-breakdown">
                <h4><i class="fas fa-chart-bar"></i> Emotion Breakdown</h4>
                ${emotionsHTML}
            </div>
            ` : ''}
        </div>
    `;
}

// Voice Recording Functions with Audio Capture
startRecordingBtn.addEventListener('click', startRecording);
stopRecordingBtn.addEventListener('click', stopRecording);

async function startRecording() {
    try {
        voiceStatus.innerHTML = '<div class="status-message"><i class="fas fa-microphone"></i> Getting microphone access...</div>';
        voiceResult.innerHTML = '';
        
        // Hide audio playback from previous recording
        if (audioPlayback) audioPlayback.style.display = 'none';
        
        // Get microphone access
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Initialize MediaRecorder
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        
        mediaRecorder.ondataavailable = event => {
            audioChunks.push(event.data);
        };
        
        mediaRecorder.onstop = async () => {
            const blobType = audioChunks[0]?.type || 'audio/webm';
            const audioBlob = new Blob(audioChunks, { type: blobType });
            const audioUrl = URL.createObjectURL(audioBlob);
            recordedAudio.src = audioUrl;

            // Convert audio to WAV base64 for API call
            const base64Audio = await convertAudioBlobToWavBase64(audioBlob);

            // Show audio playback
            audioPlayback.style.display = 'block';

            // Process audio with backend
            await processAudio(base64Audio, recordingSeconds);
        };
        
        mediaRecorder.start();
        isRecording = true;
        
        startRecordingBtn.disabled = true;
        stopRecordingBtn.disabled = false;
        
        // Update UI for recording state
        startRecordingBtn.classList.add('recording');
        document.querySelector('.voice-visualizer').classList.add('recording-active');
        
        // Start timer and update UI
        startRecordingTimer();
        voiceStatus.innerHTML = '<div class="recording-status"><i class="fas fa-circle"></i> Recording... Speak now!</div>';
        showNotification('Voice recording started', 'info');
        
    } catch (error) {
        console.error('Recording error:', error);
        voiceStatus.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-triangle"></i> Error: ${error.message}</div>`;
        voiceResult.innerHTML = '<p>⚠️ Microphone access denied or not available.</p>';
        showNotification('Microphone access denied', 'error');
        resetRecordingState();
    }
}

function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        stream.getTracks().forEach(track => track.stop());
        
        resetRecordingState();
        
        // Stop timer and update UI
        stopRecordingTimer();
        voiceStatus.innerHTML = '<div class="status-message"><i class="fas fa-spinner fa-spin"></i> Processing audio with AI...</div>';
        showNotification('Processing voice recording...', 'info');
    }
}

function resetRecordingState() {
    startRecordingBtn.disabled = false;
    stopRecordingBtn.disabled = true;
    startRecordingBtn.classList.remove('recording');
    if (document.querySelector('.voice-visualizer')) {
        document.querySelector('.voice-visualizer').classList.remove('recording-active');
    }
    isRecording = false;
}

async function convertAudioBlobToWavBase64(blob) {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const wavBuffer = encodeWAV(audioBuffer);
    return bufferToBase64(wavBuffer);
}

function encodeWAV(audioBuffer) {
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const samples = interleave(audioBuffer);
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true);
    view.setUint16(32, numChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, samples.length * 2, true);

    floatTo16BitPCM(view, 44, samples);
    return view;
}

function interleave(audioBuffer) {
    const channels = [];
    for (let i = 0; i < audioBuffer.numberOfChannels; i += 1) {
        channels.push(audioBuffer.getChannelData(i));
    }

    if (channels.length === 1) {
        return channels[0];
    }

    const length = channels[0].length + channels[1].length;
    const result = new Float32Array(length);
    let offset = 0;

    for (let i = 0; i < channels[0].length; i += 1) {
        result[offset++] = channels[0][i];
        result[offset++] = channels[1][i];
    }

    return result;
}

function floatTo16BitPCM(output, offset, input) {
    for (let i = 0; i < input.length; i += 1, offset += 2) {
        let s = Math.max(-1, Math.min(1, input[i]));
        output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
}

function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i += 1) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

function bufferToBase64(view) {
    const bytes = new Uint8Array(view.buffer);
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
}

function startRecordingTimer() {
    recordingSeconds = 0;
    
    recordingTimer = setInterval(() => {
        recordingSeconds++;
        if (recordingTime) recordingTime.textContent = `${recordingSeconds}s`;
    }, 1000);
    
    if (recordingStatus) {
        recordingStatus.textContent = 'Recording...';
    }
}

function stopRecordingTimer() {
    clearInterval(recordingTimer);
    if (recordingStatus) {
        recordingStatus.textContent = 'Stopped';
    }
}

async function processAudio(audioBase64, duration) {
    try {
        showLoading();
        
        // Call backend API for voice analysis
        const response = await fetch(`${API_BASE_URL}/analyze-voice`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                audio_data: audioBase64,
                duration: duration,
                recognized_text: '' // You can add speech-to-text here if needed
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.status === 'success') {
            displayVoiceResults(data.voice_analysis, '', duration);
            showAIResponse(data.voice_analysis.ai_response);
            voiceStatus.innerHTML = '<div class="success-message"><i class="fas fa-check-circle"></i> Voice sentiment analysis complete!</div>';
            
            // Add to history
            addToHistory('voice', { 
                duration: duration,
                audioUrl: '#' 
            }, 'Voice recording', data.voice_analysis);
            
            showNotification('Voice sentiment analysis completed!', 'success');
        } else {
            throw new Error(data.message);
        }
        
        hideLoading();
        
    } catch (error) {
        console.error('Voice processing error:', error);
        voiceStatus.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-circle"></i> Processing error: ${error.message}</div>`;
        voiceResult.innerHTML = `
            <div class="error-message">
                <p>Voice recorded but analysis failed. Make sure backend is running.</p>
            </div>
        `;
        showNotification('Voice processing error', 'error');
        hideLoading();
    }
}

function displayVoiceResults(analysis, audioUrl, duration) {
    let emotionsHTML = '';
    
    if (analysis.emotions_breakdown) {
        for (const [emotion, score] of Object.entries(analysis.emotions_breakdown)) {
            emotionsHTML += `
                <div class="emotion-bar">
                    <div class="emotion-label">
                        <span>${emotion.charAt(0).toUpperCase() + emotion.slice(1)}</span>
                        <span>${score}%</span>
                    </div>
                    <div class="emotion-progress">
                        <div class="emotion-fill" style="width: ${score}%; background: ${getEmotionColor(emotion)}"></div>
                    </div>
                </div>
            `;
        }
    }
    
    // Determine recording quality
    let quality = 'Good';
    let qualityClass = 'good';
    if (duration < 3) {
        quality = 'Short';
        qualityClass = 'poor';
    } else if (duration > 10) {
        quality = 'Excellent';
        qualityClass = 'excellent';
    }
    
    voiceResult.innerHTML = `
        <div class="voice-analysis-result">
            <div class="result-header">
                <h3><i class="fas fa-waveform"></i> Voice Analysis Results</h3>
                <div class="confidence-badge" style="background: ${getConfidenceColor(analysis.confidence)}">
                    <i class="fas fa-brain"></i>
                    ${(analysis.confidence * 100).toFixed(1)}% Confidence
                </div>
            </div>
            
            <div class="recording-info">
                <div class="recording-stats">
                    <div class="stat">
                        <i class="fas fa-clock"></i>
                        <span>Duration: ${duration} seconds</span>
                    </div>
                    <div class="stat">
                        <i class="fas fa-microphone"></i>
                        <span>Quality: 
                            <span class="quality-indicator">
                                <span class="quality-dot ${qualityClass}"></span>
                                ${quality}
                            </span>
                        </span>
                    </div>
                </div>
            </div>
            
            <div class="sentiment-analysis">
                <div class="sentiment-tags">
                    <div class="sentiment-badge" style="background: ${getEmotionColor(analysis.dominant_emotion)}">
                        <i class="fas fa-star"></i>
                        ${analysis.dominant_emotion.toUpperCase()}
                    </div>
                    <div class="confidence-badge" style="background: #607D8B;">
                        <i class="fas fa-brain"></i>
                        Confidence: ${(analysis.confidence * 100).toFixed(1)}%
                    </div>
                </div>
                
                <div class="analysis-details">
                    <div class="detail-item">
                        <h4><i class="fas fa-analytics"></i> Analysis</h4>
                        <p>${analysis.emotional_analysis}</p>
                    </div>
                </div>
                
                ${emotionsHTML ? `
                <div class="emotions-breakdown">
                    <h4><i class="fas fa-chart-bar"></i> Sentiment Breakdown</h4>
                    ${emotionsHTML}
                </div>
                ` : ''}
            </div>
        </div>
    `;
}

// Face Detection Functions
startCameraBtn.addEventListener('click', startCamera);
stopCameraBtn.addEventListener('click', stopCamera);
captureFaceBtn.addEventListener('click', captureFace);

async function startCamera() {
    try {
        faceStatus.innerHTML = '<div class="status-message"><i class="fas fa-camera"></i> Starting camera...</div>';
        faceResult.innerHTML = '';
        
        // Access the user's camera
        videoStream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: 'user',
                width: { ideal: 640 },
                height: { ideal: 480 }
            } 
        });
        
        // Set the video stream
        video.srcObject = videoStream;
        await video.play();
        
        isCameraOn = true;
        
        startCameraBtn.disabled = true;
        stopCameraBtn.disabled = false;
        captureFaceBtn.disabled = false;
        
        faceStatus.innerHTML = '<div class="success-message"><i class="fas fa-check-circle"></i> Camera started! Click "Analyze Sentiment" to capture</div>';
        showNotification('Camera started successfully', 'success');
        
    } catch (error) {
        console.error('Camera error:', error);
        faceStatus.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-triangle"></i> Camera error: ${error.message}</div>`;
        faceResult.innerHTML = '<p>⚠️ Camera access denied or not available.</p>';
        showNotification('Camera access denied', 'error');
    }
}

function stopCamera() {
    if (videoStream) {
        // Stop all tracks in the stream
        videoStream.getTracks().forEach(track => track.stop());
        video.srcObject = null;
        videoStream = null;
        isCameraOn = false;
        
        startCameraBtn.disabled = false;
        stopCameraBtn.disabled = true;
        captureFaceBtn.disabled = true;
        
        faceStatus.innerHTML = '<div class="status-message"><i class="fas fa-camera"></i> Camera stopped. Click "Start Camera" to begin again.</div>';
        faceResult.innerHTML = '';
        showNotification('Camera stopped', 'info');
    }
}

async function captureFace() {
    if (!isCameraOn || !videoStream) {
        faceStatus.innerHTML = '<div class="error-message"><i class="fas fa-exclamation-circle"></i> Please start camera first!</div>';
        return;
    }

    try {
        showLoading();
        faceStatus.innerHTML = '<div class="status-message"><i class="fas fa-spinner fa-spin"></i> Analyzing facial sentiment with AI...</div>';
        faceResult.innerHTML = '';
        
        // Capture image from video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert canvas to base64 image
        const imageData = canvas.toDataURL('image/jpeg');
        
        // Call backend API for face analysis
        const response = await fetch(`${API_BASE_URL}/analyze-face`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                image: imageData 
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.status === 'success') {
            displayFaceResults(data.face_analysis);
            showAIResponse(data.face_analysis.ai_response);
            faceStatus.innerHTML = '<div class="success-message"><i class="fas fa-check-circle"></i> Facial sentiment analysis complete!</div>';
            
            addToHistory('face', { imageData: imageData }, 'Face capture', data.face_analysis);
            
            showNotification('Facial sentiment analysis completed!', 'success');
        } else {
            throw new Error(data.message);
        }
        
        hideLoading();
        
    } catch (error) {
        console.error('Face analysis error:', error);
        faceStatus.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-circle"></i> Analysis error: ${error.message}</div>`;
        faceResult.innerHTML = `
            <div class="error-message">
                <p>Face captured but analysis failed. Make sure backend is running.</p>
            </div>
        `;
        showNotification('Face analysis error', 'error');
        hideLoading();
    }
}

function displayFaceResults(analysis) {
    let emotionsHTML = '';
    
    if (analysis.emotions_breakdown) {
        for (const [emotion, score] of Object.entries(analysis.emotions_breakdown)) {
            emotionsHTML += `
                <div class="emotion-bar">
                    <div class="emotion-label">
                        <span>${emotion.charAt(0).toUpperCase() + emotion.slice(1)}</span>
                        <span>${score}%</span>
                    </div>
                    <div class="emotion-progress">
                        <div class="emotion-fill" style="width: ${score}%; background: ${getEmotionColor(emotion)}"></div>
                    </div>
                </div>
            `;
        }
    }
    
    faceResult.innerHTML = `
        <div class="face-analysis-result">
            <div class="result-header">
                <h3><i class="fas fa-user-circle"></i> Face Analysis Results</h3>
                <div class="confidence-badge" style="background: ${getConfidenceColor(analysis.confidence)}">
                    <i class="fas fa-brain"></i>
                    ${(analysis.confidence * 100).toFixed(1)}% Confidence
                </div>
            </div>
            
            <div class="sentiment-analysis">
                <div class="sentiment-tags">
                    <div class="sentiment-badge" style="background: ${getEmotionColor(analysis.dominant_emotion)}">
                        <i class="fas fa-star"></i>
                        ${analysis.dominant_emotion.toUpperCase()}
                    </div>
                </div>
                
                <div class="analysis-details">
                    <div class="detail-item">
                        <h4><i class="fas fa-analytics"></i> Analysis</h4>
                        <p>${analysis.emotional_analysis}</p>
                    </div>
                </div>
                
                ${emotionsHTML ? `
                <div class="emotions-breakdown">
                    <h4><i class="fas fa-chart-bar"></i> Sentiment Breakdown</h4>
                    ${emotionsHTML}
                </div>
                ` : ''}
            </div>
        </div>
    `;
}

function showAIResponse(message) {
    aiResponseSection.style.display = 'block';
    aiResponseSection.style.animation = 'slideUp 0.5s ease-out';
    
    aiResponse.innerHTML = `
        <div class="ai-message">
            <div class="message-content">
                <p>${message}</p>
            </div>
            <div class="message-footer">
                <span><i class="fas fa-robot"></i> Sentiment Analysis Assistant</span>
            </div>
        </div>
    `;
    
    setTimeout(() => {
        aiResponseSection.scrollIntoView({ behavior: 'smooth' });
    }, 300);
}

// Visualizer functions
function initializeVisualizer() {
    const bars = document.querySelectorAll('.visualizer-bars .bar');
    bars.forEach((bar, index) => {
        bar.style.animationDelay = `${index * 0.1}s`;
    });
}

// Loading functions
function showLoading() {
    loadingSpinner.style.display = 'flex';
}

function hideLoading() {
    loadingSpinner.style.display = 'none';
}

// Notification system
function showNotification(message, type = 'info') {
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    document.body.appendChild(notification);
    
    if (!document.querySelector('#notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(20px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 12px;
                padding: 1rem 1.5rem;
                color: white;
                z-index: 10000;
                animation: slideInRight 0.3s ease-out;
                max-width: 400px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            }
            .notification-success {
                border-left: 4px solid #10b981;
            }
            .notification-error {
                border-left: 4px solid #ef4444;
            }
            .notification-info {
                border-left: 4px solid #3b82f6;
            }
            .notification-warning {
                border-left: 4px solid #f59e0b;
            }
            .notification-content {
                display: flex;
                align-items: center;
                gap: 0.75rem;
            }
            .notification-close {
                background: none;
                border: none;
                color: var(--text-lighter);
                cursor: pointer;
                padding: 0.25rem;
                margin-left: 1rem;
            }
            .notification-close:hover {
                color: white;
            }
            @keyframes slideInRight {
                from {
                    opacity: 0;
                    transform: translateX(100%);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
        `;
        document.head.appendChild(styles);
    }
    
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

function getNotificationIcon(type) {
    const icons = {
        'success': 'check-circle',
        'error': 'exclamation-triangle',
        'info': 'info-circle',
        'warning': 'exclamation-circle'
    };
    return icons[type] || 'info-circle';
}

// Enhanced emotion color mapping with 70+ emotions
function getEmotionColor(emotion) {
    const colors = {
        // Positive emotions
        'happy': '#10b981', 'joyful': '#10b981', 'ecstatic': '#059669',
        'content': '#0ea5e9', 'satisfied': '#0ea5e9', 'cheerful': '#10b981',
        'optimistic': '#06b6d4', 'hopeful': '#06b6d4', 'grateful': '#10b981',
        'proud': '#059669', 'loving': '#ec4899', 'playful': '#f59e0b',
        'excited': '#ec4899', 'enthusiastic': '#ec4899', 'thrilled': '#ec4899',
        'eager': '#f59e0b', 'animated': '#ec4899', 'jubilant': '#10b981',
        'elated': '#10b981', 'exhilarated': '#ec4899', 'keen': '#f59e0b',
        'ardent': '#f97316', 'zealous': '#f97316', 'passionate': '#ec4899',
        'fervent': '#f97316',
        
        // Negative emotions
        'sad': '#3b82f6', 'depressed': '#1d4ed8', 'melancholic': '#1e40af',
        'lonely': '#3b82f6', 'heartbroken': '#3b82f6', 'disappointed': '#f97316',
        'angry': '#ef4444', 'furious': '#dc2626', 'irritated': '#f97316',
        'frustrated': '#f97316', 'anxious': '#f97316', 'nervous': '#f59e0b',
        'worried': '#f59e0b', 'stressed': '#f97316', 'fearful': '#7c3aed',
        'tired': '#57534e', 'exhausted': '#44403c', 'fatigued': '#57534e',
        'bored': '#78716c', 'indifferent': '#9ca3af', 'disgusted': '#78450b',
        'repulsed': '#7c2d12', 'jealous': '#dc2626', 'envious': '#b91c1c',
        'guilty': '#7c2d12', 'ashamed': '#57534e', 'miserable': '#1e40af',
        'unhappy': '#3b82f6', 'despair': '#1e3a8a', 'hopeless': '#1e3a8a',
        'dejected': '#3b82f6', 'downcast': '#3b82f6', 'gloomy': '#334155',
        'dismal': '#334155', 'outraged': '#b91c1c', 'infuriated': '#b91c1c',
        'livid': '#b91c1c', 'irate': '#dc2626', 'incensed': '#dc2626',
        'fuming': '#b91c1c', 'seething': '#b91c1c', 'wrathful': '#b91c1c',
        'indignant': '#dc2626', 'bitter': '#ca8a04', 'aggravated': '#f97316',
        'annoyed': '#f97316', 'vexed': '#f97316', 'panicked': '#7c3aed',
        'terrified': '#6d28d9', 'apprehensive': '#f59e0b', 'uneasy': '#f59e0b',
        'tense': '#f59e0b', 'restless': '#f59e0b', 'agitated': '#f97316',
        'distressed': '#f97316', 'fretful': '#f59e0b', 'jittery': '#f59e0b',
        'paranoid': '#7c3aed', 'drained': '#57534e', 'burned out': '#44403c',
        'worn out': '#57534e', 'weary': '#57534e', 'lethargic': '#57534e',
        'sluggish': '#57534e', 'drowsy': '#57534e', 'sleepy': '#57534e',
        'spent': '#57534e', 'depleted': '#57534e', 'apathetic': '#9ca3af',
        'uninterested': '#9ca3af', 'disengaged': '#9ca3af', 'appalled': '#7c2d12',
        'sickened': '#7c2d12', 'nauseated': '#7c2d12', 'contempt': '#7c2d12',
        'disdain': '#7c2d12', 'loathe': '#7c2d12', 'abhor': '#7c2d12',
        'detest': '#7c2d12', 'covetous': '#dc2626', 'resentful': '#dc2626',
        'insecure': '#f59e0b', 'possessive': '#dc2626',
        
        // Complex emotions
        'sarcastic': '#f59e0b', 'ironic': '#f59e0b', 'satirical': '#d97706',
        'cynical': '#d97706', 'confused': '#64748b', 'surprised': '#f59e0b',
        'shocked': '#f59e0b', 'astonished': '#f59e0b', 'amazed': '#f59e0b',
        'bewildered': '#64748b', 'nostalgic': '#7c3aed', 'sentimental': '#7c3aed',
        'wistful': '#7c3aed', 'reminiscent': '#7c3aed', 'longing': '#3b82f6',
        'curious': '#06b6d4', 'inquisitive': '#06b6d4', 'intrigued': '#06b6d4',
        'interested': '#06b6d4', 'wondering': '#06b6d4', 'focused': '#6366f1',
        'concentrated': '#6366f1', 'absorbed': '#6366f1', 'engrossed': '#6366f1',
        'immersed': '#6366f1', 'overwhelmed': '#dc2626', 'underwhelmed': '#64748b',
        'mixed': '#8b5cf6', 'conflicted': '#8b5cf6', 'ambivalent': '#8b5cf6',
        'neutral': '#9ca3af', 'calm': '#0ea5e9', 'peaceful': '#10b981',
        'serene': '#10b981', 'composed': '#0ea5e9', 'balanced': '#0ea5e9',
        'thoughtful': '#64748b', 'reflective': '#64748b', 'pensive': '#64748b',
        'contemplative': '#64748b', 'meditative': '#0ea5e9', 'mocking': '#f59e0b',
        'sardonic': '#d97706', 'witty': '#f59e0b', 'amusing': '#f59e0b',
        'lighthearted': '#10b981', 'affectionate': '#ec4899', 'caring': '#ec4899',
        'tender': '#ec4899', 'fond': '#ec4899', 'devoted': '#ec4899',
        'thankful': '#10b981', 'appreciative': '#10b981', 'indebted': '#10b981',
        'beholden': '#10b981', 'accomplished': '#059669', 'self-assured': '#059669',
        'dignified': '#059669', 'remorseful': '#7c2d12', 'regretful': '#7c2d12',
        'contrite': '#7c2d12', 'uncertain': '#64748b', 'doubtful': '#64748b',
        'hesitant': '#64748b', 'skeptical': '#64748b', 'suspicious': '#7c3aed',
        'distrustful': '#7c3aed', 'yearning': '#3b82f6', 'craving': '#ec4899',
        'desiring': '#ec4899', 'longing': '#3b82f6', 'emphatic': '#f97316',
        'forceful': '#f97316', 'vigorous': '#10b981', 'dynamic': '#ec4899',
        'vibrant': '#ec4899', 'lively': '#10b981', 'energetic': '#10b981',
        'active': '#10b981', 'alert': '#f59e0b', 'attentive': '#6366f1',
        'observant': '#6366f1', 'perceptive': '#6366f1', 'discerning': '#6366f1',
        'insightful': '#8b5cf6', 'intuitive': '#8b5cf6', 'wise': '#8b5cf6',
        'judicious': '#8b5cf6', 'prudent': '#0ea5e9', 'cautious': '#f59e0b',
        'wary': '#f59e0b', 'vigilant': '#f59e0b', 'guarded': '#f59e0b',
        'reserved': '#64748b', 'reticent': '#64748b', 'taciturn': '#64748b',
        'aloof': '#9ca3af', 'detached': '#9ca3af', 'isolated': '#3b82f6',
        'secluded': '#3b82f6', 'solitary': '#3b82f6', 'withdrawn': '#3b82f6',
        'reclusive': '#3b82f6', 'lonesome': '#3b82f6', 'forlorn': '#1e40af',
        'desolate': '#1e40af', 'bereaved': '#1e40af', 'mourning': '#1e40af',
        'grieving': '#1e40af', 'aggrieved': '#1e40af', 'woeful': '#1e40af',
        'doleful': '#1e40af', 'lugubrious': '#1e40af', 'morose': '#334155',
        'sullen': '#334155', 'glum': '#334155', 'somber': '#334155',
        'grave': '#334155', 'stern': '#334155', 'austere': '#334155',
        'stolid': '#57534e', 'impassive': '#57534e', 'phlegmatic': '#57534e',
        'stoic': '#57534e', 'unflappable': '#0ea5e9', 'unruffled': '#0ea5e9',
        'composed': '#0ea5e9', 'collected': '#0ea5e9', 'poised': '#0ea5e9',
        'dignified': '#059669', 'stately': '#059669', 'majestic': '#8b5cf6',
        'regal': '#8b5cf6', 'imperious': '#8b5cf6', 'authoritative': '#6366f1',
        'commanding': '#6366f1', 'dominant': '#6366f1', 'assertive': '#6366f1',
        'confident': '#059669', 'self-confident': '#059669', 'assured': '#059669',
        'self-possessed': '#059669', 'self-reliant': '#059669', 'independent': '#6366f1',
        'autonomous': '#6366f1', 'self-sufficient': '#6366f1', 'self-contained': '#6366f1',
        'self-supporting': '#6366f1', 'self-sustaining': '#6366f1', 'self-governing': '#6366f1'
    };
    return colors[emotion.toLowerCase()] || '#64748b';
}

function getSentimentColor(sentiment) {
    const colors = {
        'positive': '#10b981',
        'negative': '#ef4444',
        'neutral': '#f59e0b',
        'mixed': '#8b5cf6',
        'ironic': '#f59e0b'
    };
    return colors[sentiment] || '#f59e0b';
}

function getConfidenceColor(confidence) {
    if (confidence >= 0.8) return '#10b981';
    if (confidence >= 0.6) return '#f59e0b';
    return '#ef4444';
}
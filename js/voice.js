// voice.js - Handles Voice Quiz logic with Web Speech API

const AudioSynth = {
  ctx: null,
  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  },
  playTone(freq, type, duration, vol) {
    if (!this.ctx) this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  },
  success() {
    this.playTone(400, 'sine', 0.1, 0.1);
    setTimeout(() => this.playTone(600, 'sine', 0.15, 0.1), 100);
  },
  fail() {
    this.playTone(300, 'sawtooth', 0.2, 0.1);
    setTimeout(() => this.playTone(200, 'sawtooth', 0.3, 0.1), 200);
  }
};

let questions = [];
let currentIdx = 0;
let correctCount = 0;
let timeLeft = 30;
let timerInt = null;
let isRecording = false;
let hasAnsweredCurrent = false;

// Speech Recognition Setup
window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let speechSupported = !!window.SpeechRecognition;

document.addEventListener('DOMContentLoaded', async () => {
  auth.requireAuth(['student', 'admin']);
  document.body.addEventListener('click', () => AudioSynth.init(), {once: true});
  
  if (!speechSupported) {
    document.getElementById('loading-area').innerHTML = `
      <h2 class="alert alert-danger">Error: Speech Recognition API is not supported in this browser.</h2>
      <p>Please use Google Chrome or Edge.</p>
    `;
    return;
  }
  
  initSpeechRecognition();
  await loadQuestions();
});

function initSpeechRecognition() {
  recognition = new window.SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';
  
  recognition.onstart = () => {
    isRecording = true;
    document.getElementById('mic-btn').classList.add('recording');
    document.getElementById('mic-status').textContent = 'Listening... Speak now.';
  };
  
  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript.toLowerCase();
    document.getElementById('speech-text').innerHTML = `<strong>You said:</strong> "${transcript}"`;
    checkAnswer(transcript);
  };
  
  recognition.onerror = (event) => {
    console.error('Speech recognition error', event.error);
    stopRecording(true);
    document.getElementById('mic-status').textContent = 'Error: ' + event.error + ' - Tap to try again';
  };
  
  recognition.onend = () => {
    if (isRecording) {
      stopRecording();
    }
  };
}

async function loadQuestions() {
  const localQ = localStorage.getItem('quiz_questions');
  let allQ = [];
  if (localQ) {
    allQ = JSON.parse(localQ);
  } else {
    try {
      const res = await fetch('data/questions.json');
      allQ = await res.json();
    } catch(e) {
      document.getElementById('loading-area').innerHTML = '<h2 class="alert alert-danger">Error loading questions.</h2>';
      return;
    }
  }
  
  questions = allQ.filter(q => q.type === 'voice');
  
  if (questions.length === 0) {
    document.getElementById('loading-area').innerHTML = '<h2 class="alert alert-danger">No Voice questions found in the database.</h2>';
    return;
  }
  
  document.getElementById('loading-area').style.display = 'none';
  document.getElementById('quiz-area').style.display = 'block';
  
  document.getElementById('q-total').textContent = questions.length;
  renderQuestion();
}

function renderQuestion() {
  const q = questions[currentIdx];
  document.getElementById('q-current').textContent = currentIdx + 1;
  document.getElementById('question-text').textContent = q.question;
  
  // Reset UI
  document.getElementById('speech-text').innerHTML = '<span style="color: var(--gray-light); font-style: italic;">Tap microphone and answer...</span>';
  document.getElementById('mic-status').textContent = 'Tap to Start Speaking';
  document.getElementById('result-indicator').className = 'result-badge';
  document.getElementById('btn-next').disabled = true;
  document.getElementById('mic-btn').disabled = false;
  document.getElementById('mic-btn').style.opacity = '1';
  hasAnsweredCurrent = false;
  
  if (currentIdx === questions.length - 1) {
    document.getElementById('btn-next').innerHTML = 'Submit Quiz <i class="fa-solid fa-check"></i>';
  } else {
    document.getElementById('btn-next').innerHTML = 'Next <i class="fa-solid fa-arrow-right"></i>';
  }
  
  resetTimer();
}

function toggleRecording() {
  if (hasAnsweredCurrent) return;
  
  if (isRecording) {
    stopRecording();
  } else {
    try {
      recognition.start();
    } catch(e) {
      console.error(e);
    }
  }
}

function stopRecording(isError = false) {
  isRecording = false;
  document.getElementById('mic-btn').classList.remove('recording');
  try {
    recognition.stop();
  } catch(e){}
  
  if (!isError && !hasAnsweredCurrent) {
    document.getElementById('mic-status').textContent = 'Processing...';
  }
}

function checkAnswer(transcript) {
  if (hasAnsweredCurrent) return;
  hasAnsweredCurrent = true;
  clearInterval(timerInt);
  
  document.getElementById('mic-btn').disabled = true;
  document.getElementById('mic-btn').style.opacity = '0.5';
  
  const keyword = questions[currentIdx].keyword.toLowerCase();
  const indicator = document.getElementById('result-indicator');
  
  if (transcript.includes(keyword) || keyword.includes(transcript)) {
    correctCount++;
    indicator.textContent = 'Correct!';
    indicator.className = 'result-badge correct';
    AudioSynth.success();
  } else {
    indicator.innerHTML = `Wrong! <span style="font-size:1rem; display:block; margin-top:0.5rem">Expected: "${keyword}"</span>`;
    indicator.className = 'result-badge wrong';
    AudioSynth.fail();
  }
  
  document.getElementById('btn-next').disabled = false;
}

function resetTimer() {
  clearInterval(timerInt);
  timeLeft = 30;
  updateTimerDisplay();
  
  timerInt = setInterval(() => {
    timeLeft--;
    updateTimerDisplay();
    
    if (timeLeft <= 0) {
      clearInterval(timerInt);
      if (isRecording) stopRecording();
      
      if (!hasAnsweredCurrent) {
        document.getElementById('speech-text').innerHTML = '<span style="color: var(--danger);">Time is up!</span>';
        checkAnswer(''); // Submit empty answer
      }
    }
  }, 1000);
}

function updateTimerDisplay() {
  document.getElementById('time-left').textContent = timeLeft;
}

function nextQuestion() {
  if (currentIdx < questions.length - 1) {
    currentIdx++;
    renderQuestion();
  } else {
    submitQuiz();
  }
}

function confirmExit() {
  if (confirm("Are you sure you want to exit? Your progress will be lost.")) {
    window.location.href = 'dashboard.html';
  }
}

function submitQuiz() {
  clearInterval(timerInt);
  
  const scoreData = {
    userId: auth.currentUser.id,
    userName: auth.currentUser.username || 'Student',
    mode: 'Voice',
    total: questions.length,
    correct: correctCount,
    wrong: questions.length - correctCount,
    percentage: Math.round((correctCount / questions.length) * 100),
    date: new Date().toISOString()
  };
  
  sessionStorage.setItem('last_quiz_result', JSON.stringify(scoreData));
  
  // Save to leaderboard
  const leaderboard = JSON.parse(localStorage.getItem('quiz_leaderboard')) || [];
  leaderboard.push(scoreData);
  localStorage.setItem('quiz_leaderboard', JSON.stringify(leaderboard));
  
  window.location.href = 'result.html';
}

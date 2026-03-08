// quiz.js - Handles MCQ Quiz logic
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
  click() { this.playTone(600, 'sine', 0.1, 0.1); },
  warn() { this.playTone(300, 'square', 0.2, 0.1); },
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
let userAnswers = {}; // { questionId: selectedOptionIndex }
let timeLeft = 30;
let timerInt = null;

document.addEventListener('DOMContentLoaded', async () => {
  auth.requireAuth(['student', 'admin']);
  // Init Audio on first user interaction
  document.body.addEventListener('click', () => AudioSynth.init(), {once: true});
  
  await loadQuestions();
});

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
      console.error(e);
      document.getElementById('loading-area').innerHTML = '<h2 class="alert alert-danger">Error loading questions.</h2>';
      return;
    }
  }
  
  questions = allQ.filter(q => q.type === 'mcq');
  
  if (questions.length === 0) {
    document.getElementById('loading-area').innerHTML = '<h2 class="alert alert-danger">No MCQ questions found in the database.</h2>';
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
  
  const progressPercent = ((currentIdx) / questions.length) * 100;
  document.getElementById('progress-bar').style.width = `${progressPercent}%`;
  
  const optionsGrid = document.getElementById('options-grid');
  optionsGrid.innerHTML = '';
  
  q.options.forEach((opt, idx) => {
    const card = document.createElement('label');
    card.className = `option-card ${userAnswers[q.id] === idx ? 'selected' : ''}`;
    card.innerHTML = `
      <div style="display: flex; align-items: center; gap: 1rem;">
        <input type="radio" name="mq-${q.id}" value="${idx}" ${userAnswers[q.id] === idx ? 'checked' : ''} onchange="selectOption(${q.id}, ${idx})" style="transform: scale(1.5); accent-color: var(--gold); cursor: pointer;">
        <span>${String.fromCharCode(65 + idx)}. ${opt}</span>
      </div>
      <i class="fa-solid fa-circle-check tick"></i>
    `;
    optionsGrid.appendChild(card);
  });
  
  document.getElementById('btn-prev').disabled = currentIdx === 0;
  
  if (currentIdx === questions.length - 1) {
    document.getElementById('btn-next').innerHTML = 'Submit Quiz <i class="fa-solid fa-check"></i>';
    document.getElementById('btn-next').className = 'btn btn-primary';
    document.getElementById('btn-next').style.background = 'var(--success)';
  } else {
    document.getElementById('btn-next').innerHTML = 'Next <i class="fa-solid fa-arrow-right"></i>';
    document.getElementById('btn-next').className = 'btn btn-primary';
    document.getElementById('btn-next').style.background = '';
  }
  
  resetTimer();
}

function selectOption(qId, optIdx) {
  AudioSynth.click();
  userAnswers[qId] = optIdx;
  renderQuestion(); // Re-render to show tick
}

function resetTimer() {
  clearInterval(timerInt);
  timeLeft = 30;
  updateTimerDisplay();
  
  timerInt = setInterval(() => {
    timeLeft--;
    updateTimerDisplay();
    
    if (timeLeft <= 5 && timeLeft > 0) {
      AudioSynth.warn();
      document.getElementById('timer').classList.add('warning');
    } else {
      document.getElementById('timer').classList.remove('warning');
    }
    
    if (timeLeft <= 0) {
      clearInterval(timerInt);
      nextQuestion(true); // Auto advance
    }
  }, 1000);
}

function updateTimerDisplay() {
  document.getElementById('time-left').textContent = timeLeft;
}

function prevQuestion() {
  if (currentIdx > 0) {
    currentIdx--;
    renderQuestion();
  }
}

function nextQuestion(auto = false) {
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
  
  let correctCount = 0;
  questions.forEach(q => {
    if (userAnswers[q.id] === q.correctAnswer) {
      correctCount++;
    }
  });
  
  const scoreData = {
    userId: auth.currentUser.id,
    userName: auth.currentUser.username || 'Student',
    mode: 'MCQ',
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

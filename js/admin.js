// admin.js - Handles Admin Dashboard logic

document.addEventListener('DOMContentLoaded', () => {
  auth.requireAuth(['admin']);
  initializeQuestions();
});

let questions = [];

async function initializeQuestions() {
  // First check local storage
  const localQ = localStorage.getItem('quiz_questions');
  if (localQ && JSON.parse(localQ).length > 0) {
    questions = JSON.parse(localQ);
    renderQuestions();
  } else {
    // Fetch from JSON file if local storage is empty
    try {
      const res = await fetch('data/questions.json');
      questions = await res.json();
      saveQuestionsCache();
      renderQuestions();
    } catch (e) {
      console.error("Failed to load generic questions", e);
    }
  }
  toggleFields();
}

function saveQuestionsCache() {
  localStorage.setItem('quiz_questions', JSON.stringify(questions));
}

function toggleFields() {
  const type = document.getElementById('q-type').value;
  if (type === 'mcq') {
    document.getElementById('mcq-fields').style.display = 'block';
    document.getElementById('voice-fields').style.display = 'none';
    // Make required
    ['q-opt0','q-opt1','q-opt2','q-opt3'].forEach(id => document.getElementById(id).required = true);
    document.getElementById('q-keyword').required = false;
  } else {
    document.getElementById('mcq-fields').style.display = 'none';
    document.getElementById('voice-fields').style.display = 'block';
    // Make required
    ['q-opt0','q-opt1','q-opt2','q-opt3'].forEach(id => document.getElementById(id).required = false);
    document.getElementById('q-keyword').required = true;
  }
}

function renderQuestions() {
  const list = document.getElementById('q-list');
  list.innerHTML = '';
  
  questions.forEach((q, index) => {
    const item = document.createElement('div');
    item.className = 'question-item';
    
    let details = q.type === 'mcq' 
      ? `Correct: Option ${['A','B','C','D'][q.correctAnswer]}` 
      : `Keyword: ${q.keyword}`;
      
    item.innerHTML = `
      <div class="q-actions">
        <button class="btn-icon edit" onclick="editQuestion(${q.id})"><i class="fa-solid fa-pen"></i></button>
        <button class="btn-icon delete" onclick="deleteQuestion(${q.id})"><i class="fa-solid fa-trash"></i></button>
      </div>
      <h4>${q.question}</h4>
      <span class="badge ${q.type}">${q.type.toUpperCase()}</span>
      <p class="mt-1">${details}</p>
    `;
    list.appendChild(item);
  });
}

function resetForm() {
  document.getElementById('question-form').reset();
  document.getElementById('q-id').value = '';
  document.getElementById('form-title').textContent = 'Add New Question';
  document.getElementById('save-btn').textContent = 'Save Question';
  toggleFields();
}

function editQuestion(id) {
  const q = questions.find(x => x.id === id);
  if (!q) return;
  
  document.getElementById('form-title').textContent = 'Edit Question';
  document.getElementById('save-btn').textContent = 'Update Question';
  
  document.getElementById('q-id').value = q.id;
  document.getElementById('q-type').value = q.type;
  document.getElementById('q-text').value = q.question;
  
  toggleFields();
  
  if (q.type === 'mcq') {
    document.getElementById('q-opt0').value = q.options[0];
    document.getElementById('q-opt1').value = q.options[1];
    document.getElementById('q-opt2').value = q.options[2];
    document.getElementById('q-opt3').value = q.options[3];
    document.getElementById('q-correct').value = q.correctAnswer;
  } else {
    document.getElementById('q-keyword').value = q.keyword;
  }
  
  window.scrollTo(0, 0);
}

function deleteQuestion(id) {
  if (confirm('Are you sure you want to delete this question?')) {
    questions = questions.filter(q => q.id !== id);
    saveQuestionsCache();
    renderQuestions();
    Utils.showAlert('admin-alert', 'Question deleted successfully', 'success');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('question-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const id = document.getElementById('q-id').value;
      const type = document.getElementById('q-type').value;
      const text = document.getElementById('q-text').value;
      
      let newQ = {
        id: id ? parseInt(id) : Date.now(),
        type: type,
        question: text
      };
      
      if (type === 'mcq') {
        newQ.options = [
          document.getElementById('q-opt0').value,
          document.getElementById('q-opt1').value,
          document.getElementById('q-opt2').value,
          document.getElementById('q-opt3').value
        ];
        newQ.correctAnswer = parseInt(document.getElementById('q-correct').value);
      } else {
        newQ.keyword = document.getElementById('q-keyword').value.toLowerCase().trim();
      }
      
      if (id) {
        // Update
        const idx = questions.findIndex(q => q.id === parseInt(id));
        if (idx !== -1) questions[idx] = newQ;
        Utils.showAlert('admin-alert', 'Question updated successfully', 'success');
      } else {
        // Add
        questions.push(newQ);
        Utils.showAlert('admin-alert', 'Question added successfully', 'success');
      }
      
      saveQuestionsCache();
      renderQuestions();
      resetForm();
    });
  }
});

// dashboard.js - Handles Student Dashboard logic

document.addEventListener('DOMContentLoaded', () => {
  auth.requireAuth(['student']);
  document.getElementById('welcome-name').textContent = auth.currentUser.username || 'Student';
  
  // Load stats
  const leaderboard = JSON.parse(localStorage.getItem('quiz_leaderboard')) || [];
  const myScores = leaderboard.filter(entry => entry.userId === auth.currentUser.id);
  
  if (myScores.length > 0) {
    document.getElementById('stat-quizzes').textContent = myScores.length;
    const avg = Math.round(myScores.reduce((sum, item) => sum + item.percentage, 0) / myScores.length);
    document.getElementById('stat-avg').textContent = `${avg}%`;
    const best = Math.max(...myScores.map(m => m.percentage));
    document.getElementById('stat-best').textContent = `${best}%`;
  }
});

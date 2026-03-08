// leaderboard.js - Handles Leaderboard logic

document.addEventListener('DOMContentLoaded', () => {
  auth.requireAuth(['student', 'admin']);
  renderLeaderboard();
});

function goBack() {
  if (auth.currentUser.role === 'admin') {
    window.location.href = 'admin.html';
  } else {
    window.location.href = 'dashboard.html';
  }
}

function renderLeaderboard() {
  const leaderboard = JSON.parse(localStorage.getItem('quiz_leaderboard')) || [];
  const listEl = document.getElementById('leaderboard-list');
  
  if (leaderboard.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-ghost fa-3x mb-2" style="opacity: 0.5;"></i>
        <h3>No scores yet!</h3>
        <p>Be the first to take a quiz and claim the #1 spot.</p>
      </div>
    `;
    return;
  }
  
  // Sort primarily by percentage (desc), then by date (asc, earlier is better if tied)
  const sorted = leaderboard.sort((a, b) => {
    if (b.percentage !== a.percentage) {
      return b.percentage - a.percentage;
    }
    return new Date(a.date) - new Date(b.date);
  });
  
  // Get top 10 unique user's best scores
  const top10 = getTopUniqueUsers(sorted, 10);
  
  listEl.innerHTML = '';
  
  top10.forEach((entry, index) => {
    const rank = index + 1;
    const rankClass = rank <= 3 ? `rank-${rank}` : '';
    const trophyIcon = rank === 1 ? '<i class="fa-solid fa-crown" style="color: #FFD700; margin-left: 0.5rem;"></i>' : '';
    const dateStr = new Date(entry.date).toLocaleDateString();
    
    const item = document.createElement('div');
    item.className = `rank-item ${rankClass}`;
    
    item.innerHTML = `
      <div class="rank-number">#${rank}</div>
      <div class="rank-details">
        <div>
          <div class="player-name">${entry.userName} ${trophyIcon}</div>
          <div class="player-meta">
            <span style="display:inline-block; padding:0.1rem 0.4rem; background:rgba(255,255,255,0.1); border-radius:4px; margin-right:0.5rem;">${entry.mode}</span>
            ${dateStr}
          </div>
        </div>
        <div class="player-score">
          ${entry.percentage}%
          <span>${entry.correct}/${entry.total} Correct</span>
        </div>
      </div>
    `;
    listEl.appendChild(item);
  });
}

// Helper to get only the highest score for each unique user in the list
function getTopUniqueUsers(sortedScores, limit) {
  const topUnique = [];
  const seenUserIds = new Set();
  
  for (const score of sortedScores) {
    if (!seenUserIds.has(score.userId)) {
      topUnique.push(score);
      seenUserIds.add(score.userId);
    }
    if (topUnique.length === limit) break;
  }
  return topUnique;
}

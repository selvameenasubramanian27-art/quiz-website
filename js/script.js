// script.js - General utility functions

const Utils = {
  showAlert(elementId, message, type = 'danger') {
    const el = document.getElementById(elementId);
    if (el) {
      el.textContent = message;
      el.className = `alert alert-${type}`;
      el.style.display = 'block';
      setTimeout(() => { el.style.display = 'none'; }, 3000);
    }
  },
  
  updateUserInfo() {
    const userInfo = document.getElementById('user-info');
    if (userInfo && auth.currentUser) {
      userInfo.textContent = auth.currentUser.username || 'User';
    }
  },

  setupLogout() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        auth.logout();
      });
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  Utils.updateUserInfo();
  Utils.setupLogout();
});

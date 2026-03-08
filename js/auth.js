// auth.js - Handles signup, login, session and role management

class Auth {
  constructor() {
    this.users = JSON.parse(localStorage.getItem('quiz_users')) || [];
    this.currentUser = JSON.parse(sessionStorage.getItem('quiz_current_user')) || null;
    
    let adminUser = this.users.find(u => u.role === 'admin');
    if (!adminUser) {
      this.users.push({
        username: 'Admin',
        email: 'admin@quiz.com',
        password: 'admin123', // Demo password
        role: 'admin'
      });
      this.saveUsers();
    } else if (adminUser.password === 'admin') {
      adminUser.password = 'admin123';
      this.saveUsers();
    }
  }

  saveUsers() {
    localStorage.setItem('quiz_users', JSON.stringify(this.users));
  }

  signup(username, email, password, role = 'student') {
    if (this.users.some(u => u.email === email)) {
      throw new Error('Email already exists');
    }
    
    const newUser = { id: Date.now(), username, email, password, role };
    this.users.push(newUser);
    this.saveUsers();
    return newUser;
  }

  // added optional expectedRole so pages can enforce student/admin login separately
  login(email, password, expectedRole = null) {
    const user = this.users.find(u => u.email === email && u.password === password);
    if (!user) {
      throw new Error('Invalid email or password');
    }
    if (expectedRole && user.role !== expectedRole) {
      // throw with a helpful message so calling page can display it
      throw new Error(`Please use the ${expectedRole} login page`);
    }

    // Store in session (without password)
    const sessionUser = { id: user.id, username: user.username, email: user.email, role: user.role };
    sessionStorage.setItem('quiz_current_user', JSON.stringify(sessionUser));
    this.currentUser = sessionUser;
    
    return user;
  }

  logout() {
    sessionStorage.removeItem('quiz_current_user');
    this.currentUser = null;
    // send everyone back to the homepage where they can choose login type
    window.location.href = 'index.html';
  }

  requireAuth(allowedRoles = ['student', 'admin']) {
    if (!this.currentUser) {
      // if not logged in send to homepage so they can pick student/admin
      window.location.href = 'index.html';
      return false;
    }
    
    if (allowedRoles && !allowedRoles.includes(this.currentUser.role)) {
      // Redirect based on role if unauthorized
      if (this.currentUser.role === 'admin') {
        window.location.href = 'admin.html';
      } else {
        window.location.href = 'dashboard.html';
      }
      return false;
    }
    
    return true;
  }
  
  redirectIfAuthenticated() {
    if (this.currentUser) {
      if (this.currentUser.role === 'admin') {
        window.location.href = 'admin.html';
      } else {
        window.location.href = 'dashboard.html';
      }
    }
  }
}

const auth = new Auth();

// API Configuration
const API_BASE_URL = 'http://localhost:5000/api';

// State Management
let currentUser = null;
let authToken = null;

// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const dashboardScreen = document.getElementById('dashboardScreen');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const roleSelect = document.getElementById('role');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userName = document.getElementById('userName');
const userRole = document.getElementById('userRole');
const navBtns = document.querySelectorAll('.nav-btn');
const views = document.querySelectorAll('.view');
const adminOnlyElements = document.querySelectorAll('.admin-only');
const apiStatus = document.getElementById('apiStatus');
const currentTime = document.getElementById('currentTime');

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Update time every second
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
    
    // Check if user is already logged in
    const savedUser = localStorage.getItem('user');
    const savedToken = localStorage.getItem('token');
    
    if (savedUser && savedToken) {
        currentUser = JSON.parse(savedUser);
        authToken = savedToken;
        showDashboard();
        loadDashboardData();
    }
    
    // Setup event listeners
    setupEventListeners();
    
    // Test API connection
    testAPIConnection();
});

function setupEventListeners() {
    // Login button
    loginBtn.addEventListener('click', handleLogin);
    
    // Logout button
    logoutBtn.addEventListener('click', handleLogout);
    
    // Navigation buttons
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;
            switchView(view);
        });
    });
    
    // Course search
    const courseSearch = document.getElementById('courseSearch');
    if (courseSearch) {
        courseSearch.addEventListener('input', filterCourses);
    }
    
    // Refresh courses
    const refreshBtn = document.getElementById('refreshCourses');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadCourses);
    }
    
    // Admin buttons
    document.getElementById('manageUsersBtn')?.addEventListener('click', manageUsers);
    document.getElementById('manageCoursesBtn')?.addEventListener('click', manageCourses);
    document.getElementById('viewStatsBtn')?.addEventListener('click', viewStats);
    
    // Profile buttons
    document.getElementById('editProfileBtn')?.addEventListener('click', editProfile);
    document.getElementById('changePasswordBtn')?.addEventListener('click', changePassword);
}

function updateCurrentTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    const dateString = now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    if (currentTime) {
        currentTime.textContent = `${dateString} | ${timeString}`;
    }
}

async function testAPIConnection() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        if (response.ok) {
            const data = await response.json();
            apiStatus.innerHTML = `<i class="fas fa-check-circle"></i> API Connected (${data.database})`;
            apiStatus.className = 'status-success';
            return true;
        }
    } catch (error) {
        apiStatus.innerHTML = '<i class="fas fa-exclamation-circle"></i> API Connection Failed';
        apiStatus.className = 'status-error';
    }
    return false;
}

async function handleLogin() {
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const role = roleSelect.value;
    
    if (!email || !password) {
        alert('Please enter both email and password');
        return;
    }
    
    try {
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
        loginBtn.disabled = true;
        
        // Try demo login first (always works with demo data)
        const response = await fetch(`${API_BASE_URL}/demo/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        if (response.ok) {
            const data = await response.json();
            
            currentUser = data.user;
            authToken = data.token;
            
            // Save to localStorage
            localStorage.setItem('user', JSON.stringify(currentUser));
            localStorage.setItem('token', authToken);
            
            showDashboard();
            loadDashboardData();
            
            alert(`Welcome back, ${currentUser.name}!`);
        } else {
            alert('Login failed. Please use demo credentials: student@test.com / password123');
        }
        
    } catch (error) {
        console.error('Login error:', error);
        alert('Cannot connect to server. Make sure the backend is running on http://localhost:5000');
    } finally {
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Login';
        loginBtn.disabled = false;
    }
}

function handleLogout() {
    currentUser = null;
    authToken = null;
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    
    // Clear all inputs
    emailInput.value = 'student@test.com';
    passwordInput.value = 'password123';
    roleSelect.value = 'student';
    
    showLogin();
}

function showDashboard() {
    loginScreen.classList.remove('active');
    dashboardScreen.classList.add('active');
    
    // Update user info
    if (currentUser) {
        userName.textContent = currentUser.name;
        userRole.textContent = currentUser.role;
        
        // Show/hide admin elements
        adminOnlyElements.forEach(el => {
            el.style.display = currentUser.role === 'admin' ? 'flex' : 'none';
        });
    }
    
    // Load initial view
    switchView('overview');
}

function showLogin() {
    dashboardScreen.classList.remove('active');
    loginScreen.classList.add('active');
}

function switchView(viewName) {
    // Update active nav button
    navBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === viewName);
    });
    
    // Show selected view
    views.forEach(view => {
        view.classList.toggle('active', view.id === `${viewName}View`);
    });
    
    // Load data for specific views
    switch(viewName) {
        case 'overview':
            loadDashboardData();
            break;
        case 'courses':
            loadCourses();
            break;
        case 'profile':
            loadProfile();
            break;
        case 'admin':
            loadAdminPanel();
            break;
    }
}

async function loadDashboardData() {
    try {
        // Use demo endpoint for consistent data
        const response = await fetch(`${API_BASE_URL}/demo/dashboard`);
        
        if (response.ok) {
            const data = await response.json();
            const dashboardData = data.data || data;
            
            // Update stats
            document.getElementById('statCourses').textContent = dashboardData.enrolledCourses;
            document.getElementById('statClasses').textContent = dashboardData.upcomingClasses;
            document.getElementById('statAssignments').textContent = dashboardData.pendingAssignments;
            document.getElementById('statGrade').textContent = dashboardData.averageGrade;
            
            // Update recent courses
            const recentCoursesDiv = document.getElementById('recentCourses');
            if (recentCoursesDiv && dashboardData.recentCourses) {
                recentCoursesDiv.innerHTML = dashboardData.recentCourses.map(course => `
                    <div class="course-item">
                        <h4>${course.courseName}</h4>
                        <p>Code: ${course.courseCode} | Instructor: ${course.instructor}</p>
                    </div>
                `).join('');
            }
            
            // Update deadlines
            const deadlinesDiv = document.getElementById('upcomingDeadlines');
            if (deadlinesDiv && dashboardData.upcomingDeadlines) {
                deadlinesDiv.innerHTML = dashboardData.upcomingDeadlines.map(deadline => {
                    const dueDate = new Date(deadline.dueDate).toLocaleDateString();
                    return `
                        <div class="deadline-item">
                            <h4>${deadline.title}</h4>
                            <p>Course: ${deadline.course} | Due: ${dueDate} | Type: ${deadline.type}</p>
                        </div>
                    `;
                }).join('');
            }
            
            // Update user info if not already set
            if (dashboardData.user && !currentUser) {
                currentUser = dashboardData.user;
                userName.textContent = currentUser.name;
                userRole.textContent = currentUser.role;
            }
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
        
        // Show demo data on error
        document.getElementById('statCourses').textContent = '4';
        document.getElementById('statClasses').textContent = '3';
        document.getElementById('statAssignments').textContent = '2';
        document.getElementById('statGrade').textContent = 'A-';
        
        const recentCoursesDiv = document.getElementById('recentCourses');
        if (recentCoursesDiv) {
            recentCoursesDiv.innerHTML = `
                <div class="course-item">
                    <h4>Computer Science 101</h4>
                    <p>Code: CS101 | Instructor: Dr. Smith</p>
                </div>
                <div class="course-item">
                    <h4>Calculus I</h4>
                    <p>Code: MATH201 | Instructor: Dr. Johnson</p>
                </div>
            `;
        }
        
        const deadlinesDiv = document.getElementById('upcomingDeadlines');
        if (deadlinesDiv) {
            deadlinesDiv.innerHTML = `
                <div class="deadline-item">
                    <h4>CS101 Assignment 1</h4>
                    <p>Course: CS101 | Due: Tomorrow | Type: assignment</p>
                </div>
                <div class="deadline-item">
                    <h4>MATH201 Quiz 2</h4>
                    <p>Course: MATH201 | Due: Friday | Type: quiz</p>
                </div>
            `;
        }
    }
}

async function loadCourses() {
    try {
        const coursesList = document.getElementById('coursesList');
        if (!coursesList) return;
        
        coursesList.innerHTML = '<p class="loading">Loading courses...</p>';
        
        const response = await fetch(`${API_BASE_URL}/courses`);
        
        if (response.ok) {
            const data = await response.json();
            const courses = data.courses || [];
            
            if (courses.length === 0) {
                coursesList.innerHTML = '<p class="loading">No courses available.</p>';
                return;
            }
            
            coursesList.innerHTML = courses.map(course => `
                <div class="course-card">
                    <h3>${course.courseName}</h3>
                    <span class="course-code">${course.courseCode}</span>
                    
                    <div class="course-details">
                        <p><strong>Instructor:</strong> ${course.instructor}</p>
                        <p><strong>Department:</strong> ${course.department}</p>
                        <p><strong>Semester:</strong> ${course.semester}</p>
                        <p><strong>Credits:</strong> ${course.credits}</p>
                        <p><strong>Schedule:</strong> ${course.schedule?.day || 'TBA'} ${course.schedule?.time || ''}</p>
                        <p><strong>Room:</strong> ${course.schedule?.room || 'TBA'}</p>
                    </div>
                    
                    ${course.description ? `<p class="course-description">${course.description}</p>` : ''}
                    
                    ${currentUser?.role === 'student' ? `
                        <button class="btn btn-primary enroll-btn" data-course-id="${course.id}">
                            <i class="fas fa-plus"></i> Enroll
                        </button>
                    ` : ''}
                </div>
            `).join('');
            
            // Add event listeners to enroll buttons
            document.querySelectorAll('.enroll-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const courseId = e.target.closest('.enroll-btn').dataset.courseId;
                    enrollInCourse(courseId);
                });
            });
        }
    } catch (error) {
        console.error('Error loading courses:', error);
        document.getElementById('coursesList').innerHTML = `
            <div class="course-card">
                <h3>Computer Science 101</h3>
                <span class="course-code">CS101</span>
                <div class="course-details">
                    <p><strong>Instructor:</strong> Dr. Smith</p>
                    <p><strong>Department:</strong> Computer Science</p>
                    <p><strong>Semester:</strong> 1</p>
                    <p><strong>Credits:</strong> 3</p>
                    <p><strong>Schedule:</strong> Mon/Wed 10:00 AM</p>
                    <p><strong>Room:</strong> Room 101</p>
                </div>
                <p class="course-description">Fundamentals of programming and computer science principles.</p>
                ${currentUser?.role === 'student' ? `
                    <button class="btn btn-primary enroll-btn" data-course-id="1">
                        <i class="fas fa-plus"></i> Enroll
                    </button>
                ` : ''}
            </div>
            
            <div class="course-card">
                <h3>Calculus I</h3>
                <span class="course-code">MATH201</span>
                <div class="course-details">
                    <p><strong>Instructor:</strong> Dr. Johnson</p>
                    <p><strong>Department:</strong> Mathematics</p>
                    <p><strong>Semester:</strong> 1</p>
                    <p><strong>Credits:</strong> 4</p>
                    <p><strong>Schedule:</strong> Tue/Thu 2:00 PM</p>
                    <p><strong>Room:</strong> Room 205</p>
                </div>
                <p class="course-description">Introduction to differential and integral calculus.</p>
                ${currentUser?.role === 'student' ? `
                    <button class="btn btn-primary enroll-btn" data-course-id="2">
                        <i class="fas fa-plus"></i> Enroll
                    </button>
                ` : ''}
            </div>
        `;
        
        // Add event listeners to demo enroll buttons
        document.querySelectorAll('.enroll-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const courseId = e.target.closest('.enroll-btn').dataset.courseId;
                enrollInCourse(courseId);
            });
        });
    }
}

function filterCourses() {
    const searchTerm = document.getElementById('courseSearch').value.toLowerCase();
    const courseCards = document.querySelectorAll('.course-card');
    
    courseCards.forEach(card => {
        const title = card.querySelector('h3').textContent.toLowerCase();
        const code = card.querySelector('.course-code').textContent.toLowerCase();
        
        if (title.includes(searchTerm) || code.includes(searchTerm)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

async function enrollInCourse(courseId) {
    if (!currentUser || currentUser.role !== 'student') {
        alert('Only students can enroll in courses');
        return;
    }
    
    if (!authToken) {
        alert('Please login first');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/courses/${courseId}/enroll`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            alert(data.message || 'Successfully enrolled in course!');
            loadCourses(); // Refresh course list
            loadDashboardData(); // Refresh dashboard
        } else {
            const error = await response.json();
            alert(error.message || 'Failed to enroll in course');
        }
    } catch (error) {
        console.error('Enrollment error:', error);
        alert('Successfully enrolled in course! (Demo)');
        
        // Update UI for demo
        const courseCard = document.querySelector(`[data-course-id="${courseId}"]`)?.closest('.course-card');
        if (courseCard) {
            const enrollBtn = courseCard.querySelector('.enroll-btn');
            if (enrollBtn) {
                enrollBtn.innerHTML = '<i class="fas fa-check"></i> Enrolled';
                enrollBtn.disabled = true;
                enrollBtn.classList.remove('btn-primary');
                enrollBtn.classList.add('btn-secondary');
            }
        }
        
        // Update dashboard stats
        const statCourses = document.getElementById('statCourses');
        if (statCourses) {
            const current = parseInt(statCourses.textContent) || 0;
            statCourses.textContent = current + 1;
        }
    }
}

function loadProfile() {
    if (!currentUser) {
        // Load demo profile
        currentUser = {
            name: 'John Student',
            email: 'student@test.com',
            studentId: 'S123456',
            department: 'Computer Science',
            semester: 2,
            role: 'student'
        };
    }
    
    document.getElementById('profileName').textContent = currentUser.name;
    document.getElementById('profileEmail').textContent = currentUser.email;
    document.getElementById('profileStudentId').textContent = currentUser.studentId || 'Not assigned';
    document.getElementById('profileDepartment').textContent = currentUser.department || 'Not specified';
    document.getElementById('profileSemester').textContent = currentUser.semester || 'Not specified';
    document.getElementById('profileRole').textContent = currentUser.role || 'Student';
}

function loadAdminPanel() {
    // Admin panel functionality
    console.log('Admin panel loaded');
}

function manageUsers() {
    if (currentUser?.role !== 'admin') {
        alert('Only administrators can access this feature');
        return;
    }
    
    alert('Manage Users feature would open here');
    // In a real app, this would fetch and display all users
}

function manageCourses() {
    if (currentUser?.role !== 'admin') {
        alert('Only administrators can access this feature');
        return;
    }
    
    alert('Manage Courses feature would open here');
    // In a real app, this would open course management interface
}

function viewStats() {
    if (currentUser?.role !== 'admin') {
        alert('Only administrators can access this feature');
        return;
    }
    
    alert('View Statistics feature would open here');
    // In a real app, this would show system statistics
}

function editProfile() {
    const newName = prompt('Enter your new name:', currentUser?.name || 'John Student');
    if (newName && newName.trim()) {
        currentUser.name = newName.trim();
        localStorage.setItem('user', JSON.stringify(currentUser));
        loadProfile();
        userName.textContent = currentUser.name;
        alert('Profile updated successfully!');
    }
}

function changePassword() {
    alert('Change Password feature would open here\n(Demo mode - in real app this would update password)');
}
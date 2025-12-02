const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Demo Data
const demoUsers = {
    'student@test.com': {
        id: '1',
        name: 'John Student',
        email: 'student@test.com',
        password: 'password123',
        role: 'student',
        studentId: 'S123456',
        department: 'Computer Science',
        semester: 2,
        profileImage: 'https://via.placeholder.com/150',
        enrolledCourses: ['1', '2']
    },
    'admin@test.com': {
        id: '2',
        name: 'Admin User',
        email: 'admin@test.com',
        password: 'password123',
        role: 'admin',
        profileImage: 'https://via.placeholder.com/150'
    }
};

const demoCourses = [
    {
        id: '1',
        courseCode: 'CS101',
        courseName: 'Introduction to Computer Science',
        instructor: 'Dr. Smith',
        department: 'Computer Science',
        semester: 1,
        credits: 3,
        schedule: { day: 'Mon/Wed', time: '10:00 AM', room: 'Room 101' },
        description: 'Fundamentals of programming and computer science principles.',
        enrolledStudents: ['1']
    },
    {
        id: '2',
        courseCode: 'MATH201',
        courseName: 'Calculus I',
        instructor: 'Dr. Johnson',
        department: 'Mathematics',
        semester: 1,
        credits: 4,
        schedule: { day: 'Tue/Thu', time: '2:00 PM', room: 'Room 205' },
        description: 'Introduction to differential and integral calculus.',
        enrolledStudents: ['1']
    },
    {
        id: '3',
        courseCode: 'ENG102',
        courseName: 'English Composition',
        instructor: 'Prof. Davis',
        department: 'English',
        semester: 1,
        credits: 3,
        schedule: { day: 'Mon/Fri', time: '1:00 PM', room: 'Room 150' },
        description: 'Developing writing skills for academic and professional contexts.',
        enrolledStudents: []
    },
    {
        id: '4',
        courseCode: 'PHY101',
        courseName: 'Physics I',
        instructor: 'Dr. Wilson',
        department: 'Physics',
        semester: 2,
        credits: 4,
        schedule: { day: 'Tue/Thu', time: '9:00 AM', room: 'Lab 301' },
        description: 'Mechanics, thermodynamics, and wave motion.',
        enrolledStudents: []
    },
    {
        id: '5',
        courseCode: 'CS201',
        courseName: 'Data Structures',
        instructor: 'Dr. Brown',
        department: 'Computer Science',
        semester: 2,
        credits: 3,
        schedule: { day: 'Mon/Wed/Fri', time: '11:00 AM', room: 'Room 102' },
        description: 'Study of fundamental data structures and algorithms.',
        enrolledStudents: []
    }
];

// Simple token generator (no JWT)
const generateSimpleToken = (user) => {
    return `demo-token-${user.id}-${Date.now()}`;
};

// Simple token validator
const validateSimpleToken = (token) => {
    if (!token || !token.startsWith('demo-token-')) {
        return null;
    }
    
    const parts = token.split('-');
    if (parts.length < 3) return null;
    
    const userId = parts[2];
    const email = userId === '1' ? 'student@test.com' : 'admin@test.com';
    
    return demoUsers[email] || null;
};

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        message: 'Student Dashboard API is running!',
        timestamp: new Date().toISOString(),
        database: 'demo mode'
    });
});

// ==================== AUTH ENDPOINTS ====================

// Login endpoint
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: 'Please provide email and password'
        });
    }
    
    const user = demoUsers[email];
    
    if (!user || user.password !== password) {
        return res.status(401).json({
            success: false,
            message: 'Invalid credentials'
        });
    }
    
    const token = generateSimpleToken(user);
    const userResponse = { ...user };
    delete userResponse.password;
    
    res.json({
        success: true,
        message: 'Login successful',
        token,
        user: userResponse
    });
});

// Register endpoint
app.post('/api/auth/register', (req, res) => {
    const { name, email, password, role = 'student', studentId } = req.body;
    
    if (!name || !email || !password) {
        return res.status(400).json({
            success: false,
            message: 'Please provide name, email, and password'
        });
    }
    
    if (demoUsers[email]) {
        return res.status(400).json({
            success: false,
            message: 'User already exists with this email'
        });
    }
    
    // Create new user
    const newUserId = Object.keys(demoUsers).length + 1;
    const newUser = {
        id: newUserId.toString(),
        name,
        email,
        password,
        role,
        studentId: role === 'student' ? studentId : undefined,
        department: 'General',
        semester: 1,
        profileImage: 'https://via.placeholder.com/150',
        enrolledCourses: [],
        createdAt: new Date()
    };
    
    demoUsers[email] = newUser;
    
    const token = generateSimpleToken(newUser);
    const userResponse = { ...newUser };
    delete userResponse.password;
    
    res.status(201).json({
        success: true,
        message: 'Registration successful',
        token,
        user: userResponse
    });
});

// Get current user
app.get('/api/auth/me', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'No token provided'
        });
    }
    
    const user = validateSimpleToken(token);
    
    if (!user) {
        return res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
    
    const userResponse = { ...user };
    delete userResponse.password;
    
    res.json({
        success: true,
        user: userResponse
    });
});

// ==================== COURSES ENDPOINTS ====================

// Get all courses
app.get('/api/courses', (req, res) => {
    res.json({
        success: true,
        count: demoCourses.length,
        courses: demoCourses
    });
});

// Get single course
app.get('/api/courses/:id', (req, res) => {
    const course = demoCourses.find(c => c.id === req.params.id);
    
    if (!course) {
        return res.status(404).json({
            success: false,
            message: 'Course not found'
        });
    }
    
    res.json({
        success: true,
        course
    });
});

// Enroll in course
app.post('/api/courses/:id/enroll', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'No token provided'
        });
    }
    
    const user = validateSimpleToken(token);
    
    if (!user) {
        return res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
    
    if (user.role !== 'student') {
        return res.status(403).json({
            success: false,
            message: 'Only students can enroll in courses'
        });
    }
    
    const course = demoCourses.find(c => c.id === req.params.id);
    
    if (!course) {
        return res.status(404).json({
            success: false,
            message: 'Course not found'
        });
    }
    
    if (course.enrolledStudents.includes(user.id)) {
        return res.status(400).json({
            success: false,
            message: 'Already enrolled in this course'
        });
    }
    
    // Enroll student
    course.enrolledStudents.push(user.id);
    
    // Add course to user's enrolled courses
    if (!user.enrolledCourses) user.enrolledCourses = [];
    user.enrolledCourses.push(course.id);
    
    res.json({
        success: true,
        message: 'Successfully enrolled in course',
        course
    });
});

// Unenroll from course
app.post('/api/courses/:id/unenroll', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'No token provided'
        });
    }
    
    const user = validateSimpleToken(token);
    
    if (!user) {
        return res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
    
    const course = demoCourses.find(c => c.id === req.params.id);
    
    if (!course) {
        return res.status(404).json({
            success: false,
            message: 'Course not found'
        });
    }
    
    if (!course.enrolledStudents.includes(user.id)) {
        return res.status(400).json({
            success: false,
            message: 'Not enrolled in this course'
        });
    }
    
    // Remove student
    course.enrolledStudents = course.enrolledStudents.filter(id => id !== user.id);
    user.enrolledCourses = user.enrolledCourses.filter(id => id !== course.id);
    
    res.json({
        success: true,
        message: 'Successfully unenrolled from course'
    });
});

// ==================== STUDENT ENDPOINTS ====================

// Get student dashboard
app.get('/api/students/dashboard', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    let user = null;
    
    if (token) {
        user = validateSimpleToken(token);
    }
    
    // If no valid user, use demo student
    if (!user) {
        user = demoUsers['student@test.com'];
    }
    
    // Get user's courses
    const userCourses = demoCourses.filter(course => 
        user.enrolledCourses && user.enrolledCourses.includes(course.id)
    );
    
    const dashboardData = {
        enrolledCourses: userCourses.length,
        upcomingClasses: userCourses.length * 2,
        pendingAssignments: 3,
        averageGrade: 'A-',
        recentCourses: userCourses.slice(0, 3).map(course => ({
            courseName: course.courseName,
            courseCode: course.courseCode,
            instructor: course.instructor
        })),
        upcomingDeadlines: [
            {
                title: 'CS101 Assignment 1',
                course: 'CS101',
                dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
                type: 'assignment'
            },
            {
                title: 'MATH201 Quiz 2',
                course: 'MATH201',
                dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
                type: 'quiz'
            }
        ],
        user: {
            name: user.name,
            email: user.email,
            role: user.role,
            studentId: user.studentId,
            department: user.department || 'Computer Science',
            semester: user.semester || 2,
            profileImage: user.profileImage
        }
    };
    
    res.json({
        success: true,
        data: dashboardData
    });
});

// Get student profile
app.get('/api/students/profile', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'No token provided'
        });
    }
    
    const user = validateSimpleToken(token);
    
    if (!user) {
        return res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
    
    if (user.role !== 'student') {
        return res.status(403).json({
            success: false,
            message: 'Only students can access this endpoint'
        });
    }
    
    const userResponse = { ...user };
    delete userResponse.password;
    
    res.json({
        success: true,
        user: userResponse
    });
});

// Update student profile
app.put('/api/students/profile', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'No token provided'
        });
    }
    
    const user = validateSimpleToken(token);
    
    if (!user) {
        return res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
    
    const updates = req.body;
    
    // Update user fields
    Object.keys(updates).forEach(key => {
        if (key !== 'email' && key !== 'password' && key !== 'role') {
            user[key] = updates[key];
        }
    });
    
    const userResponse = { ...user };
    delete userResponse.password;
    
    res.json({
        success: true,
        message: 'Profile updated successfully',
        user: userResponse
    });
});

// ==================== ADMIN ENDPOINTS ====================

// Get all users (admin only)
app.get('/api/admin/users', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'No token provided'
        });
    }
    
    const user = validateSimpleToken(token);
    
    if (!user || user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Admin only.'
        });
    }
    
    // Get all users without passwords
    const users = Object.values(demoUsers).map(u => {
        const { password, ...userWithoutPassword } = u;
        return userWithoutPassword;
    });
    
    res.json({
        success: true,
        count: users.length,
        users
    });
});

// Get admin statistics
app.get('/api/admin/statistics', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'No token provided'
        });
    }
    
    const user = validateSimpleToken(token);
    
    if (!user || user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Admin only.'
        });
    }
    
    const totalUsers = Object.keys(demoUsers).length;
    const totalStudents = Object.values(demoUsers).filter(u => u.role === 'student').length;
    const totalCourses = demoCourses.length;
    
    res.json({
        success: true,
        statistics: {
            totalUsers,
            totalStudents,
            totalAdmins: totalUsers - totalStudents,
            totalCourses,
            activeCourses: demoCourses.length,
            recentRegistrations: 0
        }
    });
});

// ==================== DEMO ENDPOINTS ====================

// Demo login (no validation)
app.post('/api/demo/login', (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: 'Please provide email and password'
        });
    }
    
    const user = demoUsers[email];
    
    if (!user || user.password !== password) {
        return res.status(401).json({
            success: false,
            message: 'Invalid credentials'
        });
    }
    
    const token = generateSimpleToken(user);
    const userResponse = { ...user };
    delete userResponse.password;
    
    res.json({
        success: true,
        message: 'Login successful',
        token,
        user: userResponse
    });
});

// Demo courses
app.get('/api/demo/courses', (req, res) => {
    res.json({
        success: true,
        courses: demoCourses
    });
});

// Demo dashboard
app.get('/api/demo/dashboard', (req, res) => {
    const user = demoUsers['student@test.com'];
    const userCourses = demoCourses.filter(course => 
        user.enrolledCourses && user.enrolledCourses.includes(course.id)
    );
    
    const dashboardData = {
        enrolledCourses: userCourses.length,
        upcomingClasses: userCourses.length * 2,
        pendingAssignments: 3,
        averageGrade: 'A-',
        recentCourses: userCourses.slice(0, 3).map(course => ({
            courseName: course.courseName,
            courseCode: course.courseCode,
            instructor: course.instructor
        })),
        upcomingDeadlines: [
            {
                title: 'CS101 Assignment 1',
                course: 'CS101',
                dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
                type: 'assignment'
            },
            {
                title: 'MATH201 Quiz 2',
                course: 'MATH201',
                dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
                type: 'quiz'
            }
        ],
        user: {
            name: user.name,
            email: user.email,
            role: user.role,
            studentId: user.studentId,
            department: user.department,
            semester: user.semester,
            profileImage: user.profileImage
        }
    };
    
    res.json({
        success: true,
        data: dashboardData
    });
});

// ==================== SERVE FRONTEND ====================

// Serve static files
app.use(express.static('public'));

// Default route
app.get('/', (req, res) => {
    res.json({
        message: 'Student Dashboard API',
        version: '1.0.0',
        endpoints: {
            auth: {
                login: 'POST /api/auth/login',
                register: 'POST /api/auth/register',
                profile: 'GET /api/auth/me'
            },
            courses: {
                all: 'GET /api/courses',
                single: 'GET /api/courses/:id',
                enroll: 'POST /api/courses/:id/enroll'
            },
            students: {
                dashboard: 'GET /api/students/dashboard',
                profile: 'GET /api/students/profile'
            },
            admin: {
                users: 'GET /api/admin/users',
                statistics: 'GET /api/admin/statistics'
            },
            demo: {
                login: 'POST /api/demo/login',
                courses: 'GET /api/demo/courses',
                dashboard: 'GET /api/demo/dashboard'
            }
        },
        demoCredentials: {
            student: 'student@test.com / password123',
            admin: 'admin@test.com / password123'
        }
    });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log('='.repeat(50));
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 API Base URL: http://localhost:${PORT}`);
    console.log(`🔗 Database: Demo Mode (No MongoDB needed)`);
    console.log('\n🔑 Demo Login Credentials:');
    console.log('   📘 Student: student@test.com / password123');
    console.log('   👑 Admin: admin@test.com / password123');
    console.log('\n🔧 Available Endpoints:');
    console.log('   POST /api/auth/login      - User login');
    console.log('   GET  /api/courses         - Get all courses');
    console.log('   GET  /api/students/dashboard - Student dashboard');
    console.log('   POST /api/demo/login      - Demo login (no validation)');
    console.log('='.repeat(50));
    console.log('\n💡 The system is now fully functional!');
    console.log('   No JWT errors will occur with this version.');
    console.log('='.repeat(50));
});
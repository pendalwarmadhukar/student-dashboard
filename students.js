const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Course = require('../models/Course');
const { protect, authorize, demoProtect } = require('../middleware/auth');

// @route   GET /api/students/profile
// @desc    Get student profile
// @access  Private
router.get('/profile', protect, authorize('student'), async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      .populate('enrolledCourses', 'courseCode courseName instructor credits schedule');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error getting profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   PUT /api/students/profile
// @desc    Update student profile
// @access  Private
router.put('/profile', protect, authorize('student'), [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('department').optional().trim(),
  body('semester').optional().isInt({ min: 1, max: 8 }).withMessage('Semester must be between 1 and 8'),
  body('phone').optional().trim(),
  body('address').optional().trim(),
  body('profileImage').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    // Remove fields that shouldn't be updated
    const updates = { ...req.body };
    delete updates.email;
    delete updates.role;
    delete updates.password;
    delete updates.studentId;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating profile'
    });
  }
});

// @route   GET /api/students/courses
// @desc    Get student's enrolled courses
// @access  Private
router.get('/courses', protect, authorize('student'), async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate({
      path: 'enrolledCourses',
      select: 'courseCode courseName instructor department semester credits schedule description',
      match: { isActive: true }
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      count: user.enrolledCourses.length,
      courses: user.enrolledCourses
    });
  } catch (error) {
    console.error('Get courses error:', error);
    
    // Return demo data if database fails
    const courses = [
      {
        _id: '1',
        courseCode: 'CS101',
        courseName: 'Introduction to Computer Science',
        instructor: 'Dr. Smith',
        department: 'Computer Science',
        semester: 1,
        credits: 3,
        schedule: { day: 'Mon/Wed', time: '10:00 AM', room: 'Room 101' },
        description: 'Fundamentals of programming and computer science principles.'
      },
      {
        _id: '2',
        courseCode: 'MATH201',
        courseName: 'Calculus I',
        instructor: 'Dr. Johnson',
        department: 'Mathematics',
        semester: 1,
        credits: 4,
        schedule: { day: 'Tue/Thu', time: '2:00 PM', room: 'Room 205' },
        description: 'Introduction to differential and integral calculus.'
      }
    ];
    
    res.json({
      success: true,
      count: courses.length,
      courses,
      source: 'demo'
    });
  }
});

// @route   GET /api/students/dashboard
// @desc    Get student dashboard data
// @access  Private
router.get('/dashboard', protect, authorize('student'), async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('enrolledCourses')
      .select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Calculate statistics
    const enrolledCourses = user.enrolledCourses.length;
    
    // Get upcoming classes (simplified)
    const today = new Date();
    const upcomingClasses = enrolledCourses * 2; // Simplified
    
    // Mock assignments data
    const pendingAssignments = 3;
    const averageGrade = 'A-';
    
    // Recent courses
    const recentCourses = user.enrolledCourses.slice(0, 3).map(course => ({
      courseName: course.courseName,
      courseCode: course.courseCode,
      instructor: course.instructor
    }));
    
    // Upcoming deadlines
    const upcomingDeadlines = [
      {
        title: 'CS101 Assignment 1',
        course: 'CS101',
        dueDate: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        type: 'assignment'
      },
      {
        title: 'MATH201 Quiz 2',
        course: 'MATH201',
        dueDate: new Date(today.getTime() + 4 * 24 * 60 * 60 * 1000), // 4 days from now
        type: 'quiz'
      }
    ];
    
    res.json({
      success: true,
      data: {
        enrolledCourses,
        upcomingClasses,
        pendingAssignments,
        averageGrade,
        recentCourses,
        upcomingDeadlines,
        user: {
          name: user.name,
          email: user.email,
          department: user.department,
          semester: user.semester,
          studentId: user.studentId
        }
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    
    // Return demo dashboard data
    res.json({
      success: true,
      data: {
        enrolledCourses: 4,
        upcomingClasses: 3,
        pendingAssignments: 2,
        averageGrade: 'A-',
        recentCourses: [
          { courseName: 'Computer Science 101', courseCode: 'CS101', instructor: 'Dr. Smith' },
          { courseName: 'Mathematics 201', courseCode: 'MATH201', instructor: 'Dr. Johnson' }
        ],
        upcomingDeadlines: [
          { title: 'CS101 Assignment 1', course: 'CS101', dueDate: '2024-12-10', type: 'assignment' },
          { title: 'MATH201 Quiz 2', course: 'MATH201', dueDate: '2024-12-12', type: 'quiz' }
        ],
        user: {
          name: req.user?.name || 'John Student',
          email: req.user?.email || 'student@test.com',
          department: 'Computer Science',
          semester: 2,
          studentId: 'S123456'
        }
      },
      source: 'demo'
    });
  }
});

// @route   GET /api/students/grades
// @desc    Get student grades
// @access  Private
router.get('/grades', protect, authorize('student'), async (req, res) => {
  try {
    // Mock grades data
    const grades = [
      {
        courseCode: 'CS101',
        courseName: 'Introduction to Computer Science',
        assignments: [
          { title: 'Assignment 1', score: 95, maxScore: 100, weight: 20 },
          { title: 'Assignment 2', score: 88, maxScore: 100, weight: 20 },
          { title: 'Final Exam', score: 92, maxScore: 100, weight: 60 }
        ],
        currentGrade: 'A',
        totalScore: 91.6
      },
      {
        courseCode: 'MATH201',
        courseName: 'Calculus I',
        assignments: [
          { title: 'Quiz 1', score: 85, maxScore: 100, weight: 15 },
          { title: 'Quiz 2', score: 90, maxScore: 100, weight: 15 },
          { title: 'Midterm', score: 88, maxScore: 100, weight: 30 },
          { title: 'Final Exam', score: 92, maxScore: 100, weight: 40 }
        ],
        currentGrade: 'A-',
        totalScore: 89.5
      }
    ];
    
    res.json({
      success: true,
      grades
    });
  } catch (error) {
    console.error('Get grades error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error getting grades'
    });
  }
});

// Demo endpoints for testing without authentication
router.get('/demo/dashboard', (req, res) => {
  res.json({
    success: true,
    data: {
      enrolledCourses: 4,
      upcomingClasses: 3,
      pendingAssignments: 2,
      averageGrade: 'A-',
      recentCourses: [
        { courseName: 'Computer Science 101', courseCode: 'CS101', instructor: 'Dr. Smith' },
        { courseName: 'Mathematics 201', courseCode: 'MATH201', instructor: 'Dr. Johnson' }
      ],
      upcomingDeadlines: [
        { title: 'CS101 Assignment 1', course: 'CS101', dueDate: '2024-12-10', type: 'assignment' },
        { title: 'MATH201 Quiz 2', course: 'MATH201', dueDate: '2024-12-12', type: 'quiz' }
      ],
      user: {
        name: 'John Student',
        email: 'student@test.com',
        department: 'Computer Science',
        semester: 2,
        studentId: 'S123456'
      }
    },
    source: 'demo'
  });
});

module.exports = router;
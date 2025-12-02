const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Course = require('../models/Course');
const User = require('../models/User');
const { protect, authorize, demoProtect } = require('../middleware/auth');

// @route   GET /api/courses
// @desc    Get all courses
// @access  Public (with optional authentication)
router.get('/', async (req, res) => {
  try {
    // Try to use database first
    const courses = await Course.find({ isActive: true })
      .populate('enrolledStudents', 'name email studentId')
      .sort({ semester: 1, courseCode: 1 });
    
    res.json({
      success: true,
      count: courses.length,
      courses
    });
  } catch (error) {
    // If database fails, return demo data
    console.log('Using demo courses data');
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
        description: 'Fundamentals of programming and computer science principles.',
        enrolledStudents: [],
        enrolledCount: 25,
        availableSeats: 5
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
        description: 'Introduction to differential and integral calculus.',
        enrolledStudents: [],
        enrolledCount: 30,
        availableSeats: 0
      },
      {
        _id: '3',
        courseCode: 'ENG102',
        courseName: 'English Composition',
        instructor: 'Prof. Davis',
        department: 'English',
        semester: 1,
        credits: 3,
        schedule: { day: 'Mon/Fri', time: '1:00 PM', room: 'Room 150' },
        description: 'Developing writing skills for academic and professional contexts.',
        enrolledStudents: [],
        enrolledCount: 20,
        availableSeats: 10
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

// @route   GET /api/courses/:id
// @desc    Get single course
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('enrolledStudents', 'name email studentId department')
      .populate('instructorId', 'name email');
    
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
  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/courses
// @desc    Create new course (Admin/Instructor only)
// @access  Private
router.post('/', protect, authorize('admin', 'instructor'), [
  body('courseCode').trim().notEmpty().withMessage('Course code is required'),
  body('courseName').trim().notEmpty().withMessage('Course name is required'),
  body('instructor').trim().notEmpty().withMessage('Instructor name is required'),
  body('department').trim().notEmpty().withMessage('Department is required'),
  body('semester').isInt({ min: 1, max: 8 }).withMessage('Semester must be between 1 and 8'),
  body('credits').isInt({ min: 1, max: 5 }).withMessage('Credits must be between 1 and 5'),
  body('schedule.day').notEmpty().withMessage('Day is required'),
  body('schedule.time').notEmpty().withMessage('Time is required'),
  body('schedule.room').notEmpty().withMessage('Room is required'),
  body('capacity').optional().isInt({ min: 1 }).withMessage('Capacity must be at least 1')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    // Check if course code already exists
    const existingCourse = await Course.findOne({ courseCode: req.body.courseCode });
    if (existingCourse) {
      return res.status(400).json({
        success: false,
        message: 'Course with this code already exists'
      });
    }

    // Add instructor ID if user is instructor
    if (req.user.role === 'instructor') {
      req.body.instructorId = req.user.id;
    }

    const course = await Course.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      course
    });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating course'
    });
  }
});

// @route   PUT /api/courses/:id
// @desc    Update course
// @access  Private (Admin/Instructor only)
router.put('/:id', protect, authorize('admin', 'instructor'), async (req, res) => {
  try {
    let course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if instructor is updating their own course
    if (req.user.role === 'instructor' && course.instructorId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this course'
      });
    }

    course = await Course.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Course updated successfully',
      course
    });
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating course'
    });
  }
});

// @route   DELETE /api/courses/:id
// @desc    Delete course
// @access  Private (Admin only)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Soft delete by setting isActive to false
    course.isActive = false;
    await course.save();

    res.json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting course'
    });
  }
});

// @route   POST /api/courses/:id/enroll
// @desc    Enroll in a course
// @access  Private (Student only)
router.post('/:id/enroll', protect, authorize('student'), async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if course is active
    if (!course.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Course is not active'
      });
    }

    // Check if already enrolled
    if (course.enrolledStudents.includes(req.user.id)) {
      return res.status(400).json({
        success: false,
        message: 'Already enrolled in this course'
      });
    }

    // Check capacity
    if (course.enrolledStudents.length >= course.capacity) {
      return res.status(400).json({
        success: false,
        message: 'Course is full'
      });
    }

    // Add student to course
    course.enrolledStudents.push(req.user.id);
    await course.save();

    // Add course to student's enrolled courses
    await User.findByIdAndUpdate(
      req.user.id,
      { $addToSet: { enrolledCourses: course._id } }
    );

    res.json({
      success: true,
      message: 'Successfully enrolled in course',
      course
    });
  } catch (error) {
    console.error('Enroll error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error enrolling in course'
    });
  }
});

// @route   POST /api/courses/:id/unenroll
// @desc    Unenroll from a course
// @access  Private (Student only)
router.post('/:id/unenroll', protect, authorize('student'), async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if enrolled
    if (!course.enrolledStudents.includes(req.user.id)) {
      return res.status(400).json({
        success: false,
        message: 'Not enrolled in this course'
      });
    }

    // Remove student from course
    course.enrolledStudents = course.enrolledStudents.filter(
      studentId => studentId.toString() !== req.user.id
    );
    await course.save();

    // Remove course from student's enrolled courses
    await User.findByIdAndUpdate(
      req.user.id,
      { $pull: { enrolledCourses: course._id } }
    );

    res.json({
      success: true,
      message: 'Successfully unenrolled from course'
    });
  } catch (error) {
    console.error('Unenroll error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error unenrolling from course'
    });
  }
});

// Demo endpoints for testing
router.get('/demo/all', (req, res) => {
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
      description: 'Fundamentals of programming and computer science principles.',
      enrolledStudents: [],
      enrolledCount: 25,
      availableSeats: 5
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
      description: 'Introduction to differential and integral calculus.',
      enrolledStudents: [],
      enrolledCount: 30,
      availableSeats: 0
    }
  ];
  
  res.json({
    success: true,
    count: courses.length,
    courses,
    source: 'demo'
  });
});

module.exports = router;
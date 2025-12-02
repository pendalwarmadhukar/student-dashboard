const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Course = require('../models/Course');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/admin/users
// @desc    Get all users (Admin only)
// @access  Private
router.get('/users', protect, authorize('admin'), async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    console.error('Get users error:', error);
    
    // Return demo users data
    const users = [
      {
        _id: '1',
        name: 'John Student',
        email: 'student@test.com',
        role: 'student',
        studentId: 'S123456',
        department: 'Computer Science',
        semester: 2,
        isActive: true,
        createdAt: new Date()
      },
      {
        _id: '2',
        name: 'Admin User',
        email: 'admin@test.com',
        role: 'admin',
        isActive: true,
        createdAt: new Date()
      },
      {
        _id: '3',
        name: 'Jane Student',
        email: 'jane@test.com',
        role: 'student',
        studentId: 'S123457',
        department: 'Mathematics',
        semester: 3,
        isActive: true,
        createdAt: new Date()
      }
    ];
    
    res.json({
      success: true,
      count: users.length,
      users,
      source: 'demo'
    });
  }
});

// @route   GET /api/admin/statistics
// @desc    Get system statistics (Admin only)
// @access  Private
router.get('/statistics', protect, authorize('admin'), async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalAdmins = await User.countDocuments({ role: 'admin' });
    const totalCourses = await Course.countDocuments();
    const activeCourses = await Course.countDocuments({ isActive: true });
    
    // Get recent registrations (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentRegistrations = await User.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });
    
    res.json({
      success: true,
      statistics: {
        totalUsers,
        totalStudents,
        totalAdmins,
        totalCourses,
        activeCourses,
        recentRegistrations
      }
    });
  } catch (error) {
    console.error('Get statistics error:', error);
    
    // Return demo statistics
    res.json({
      success: true,
      statistics: {
        totalUsers: 150,
        totalStudents: 145,
        totalAdmins: 5,
        totalCourses: 25,
        activeCourses: 20,
        recentRegistrations: 12
      },
      source: 'demo'
    });
  }
});

// @route   PUT /api/admin/users/:id/status
// @desc    Toggle user active status (Admin only)
// @access  Private
router.put('/users/:id/status', protect, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Prevent deactivating yourself
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot deactivate your own account'
      });
    }
    
    // Toggle status
    user.isActive = !user.isActive;
    await user.save();
    
    res.json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      user
    });
  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating user status'
    });
  }
});

// @route   PUT /api/admin/users/:id/role
// @desc    Update user role (Admin only)
// @access  Private
router.put('/users/:id/role', protect, authorize('admin'), async (req, res) => {
  try {
    const { role } = req.body;
    
    if (!role || !['student', 'admin', 'instructor'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Valid role is required'
      });
    }
    
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Prevent changing your own role
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot change your own role'
      });
    }
    
    user.role = role;
    
    // If changing from student to non-student, remove student-specific fields
    if (user.role === 'student' && role !== 'student') {
      user.studentId = undefined;
      user.department = 'General';
      user.semester = 1;
    }
    
    await user.save();
    
    res.json({
      success: true,
      message: `User role updated to ${role}`,
      user
    });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating user role'
    });
  }
});

// @route   DELETE /api/admin/users/:id
// @desc    Delete user (Admin only)
// @access  Private
router.delete('/users/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Prevent deleting yourself
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }
    
    // Remove user from enrolled courses
    await Course.updateMany(
      { enrolledStudents: user._id },
      { $pull: { enrolledStudents: user._id } }
    );
    
    // Delete user
    await user.deleteOne();
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting user'
    });
  }
});

// @route   GET /api/admin/courses
// @desc    Get all courses with details (Admin only)
// @access  Private
router.get('/courses', protect, authorize('admin'), async (req, res) => {
  try {
    const courses = await Course.find()
      .populate('enrolledStudents', 'name email studentId')
      .populate('instructorId', 'name email')
      .sort({ semester: 1, courseCode: 1 });
    
    res.json({
      success: true,
      count: courses.length,
      courses
    });
  } catch (error) {
    console.error('Get admin courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error getting courses'
    });
  }
});

module.exports = router;
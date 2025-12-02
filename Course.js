const mongoose = require('mongoose');

const CourseSchema = new mongoose.Schema({
  courseCode: {
    type: String,
    required: [true, 'Please provide course code'],
    unique: true,
    uppercase: true,
    trim: true
  },
  courseName: {
    type: String,
    required: [true, 'Please provide course name'],
    trim: true,
    maxlength: [200, 'Course name cannot be more than 200 characters']
  },
  instructor: {
    type: String,
    required: [true, 'Please provide instructor name'],
    trim: true
  },
  instructorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  department: {
    type: String,
    required: [true, 'Please provide department'],
    trim: true
  },
  semester: {
    type: Number,
    required: [true, 'Please provide semester'],
    min: 1,
    max: 8
  },
  credits: {
    type: Number,
    required: [true, 'Please provide credits'],
    min: 1,
    max: 5
  },
  schedule: {
    day: {
      type: String,
      required: true
    },
    time: {
      type: String,
      required: true
    },
    room: {
      type: String,
      required: true
    }
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot be more than 1000 characters']
  },
  syllabus: String,
  prerequisites: [String],
  capacity: {
    type: Number,
    default: 30,
    min: 1
  },
  enrolledStudents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  assignments: [{
    title: String,
    description: String,
    dueDate: Date,
    maxScore: Number,
    submissionType: {
      type: String,
      enum: ['file', 'text', 'both'],
      default: 'both'
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update updatedAt timestamp
CourseSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for enrolled count
CourseSchema.virtual('enrolledCount').get(function() {
  return this.enrolledStudents.length;
});

// Virtual for available seats
CourseSchema.virtual('availableSeats').get(function() {
  return this.capacity - this.enrolledStudents.length;
});

module.exports = mongoose.models.Course || mongoose.model('Course', CourseSchema);
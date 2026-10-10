const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    // =========================================================
    // BASIC INFORMATION
    // =========================================================

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: ''
    },

    mobileNo: {
      type: String,
      required: true,
      trim: true
    },

    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
      required: true
    },

    dob: {
      type: String,
      default: ''
    },

    nationality: {
      type: String,
      default: 'India',
      trim: true
    },

    domicileState: {
      type: String,
      default: 'Punjab',
      trim: true
    },

    // =========================================================
    // STUDENT / ACADEMIC INFORMATION
    // =========================================================

    studentId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },

    rollNo: {
      type: String,
      required: true,
      trim: true,
      index: true
    },

    university: {
      type: String,
      default: 'GNDU Amritsar',
      trim: true
    },

    department: {
      type: String,
      default: '',
      trim: true
    },

    faculty: {
      type: String,
      default: '',
      trim: true
    },

    facultyName: {
      type: String,
      default: '',
      trim: true
    },

    session: {
      type: String,
      default: '',
      trim: true
    },

    currentYear: {
      type: Number,
      default: null,
      min: 1
    },

    currentSemester: {
      type: Number,
      default: null,
      min: 1
    },

    // =========================================================
    // PREVIOUS QUALIFICATION
    // =========================================================

    previousQualification: {
      type: String,
      default: '',
      trim: true
    },

    previousQualificationYear: {
      type: Number,
      default: null
    },

    previousPercentage: {
      type: Number,
      default: null,
      min: 0,
      max: 100
    },

    previousCgpa: {
      type: Number,
      default: null,
      min: 0,
      max: 10
    },

    // =========================================================
    // CURRENT ACADEMIC PERFORMANCE
    // =========================================================

    percentage: {
      type: Number,
      default: null,
      min: 0,
      max: 100
    },

    cgpa: {
      type: Number,
      default: null,
      min: 0,
      max: 10
    },

    // =========================================================
    // CATEGORY
    // =========================================================

    category: {
      type: String,
      enum: [
        'General',
        'SC',
        'ST',
        'BC',
        'OBC',
        'EWS',
        'Minority',
        'Other',
        ''
      ],
      default: 'General'
    },

    // =========================================================
    // FAMILY INFORMATION
    // =========================================================

    fatherName: {
      type: String,
      default: '',
      trim: true
    },

    motherName: {
      type: String,
      default: '',
      trim: true
    },

    parentOccupation: {
      type: String,
      default: '',
      trim: true
    },

    annualFamilyIncome: {
      type: Number,
      default: null,
      min: 0
    },

    incomeCertificateNumber: {
      type: String,
      default: '',
      trim: true
    },

    incomeCertificateDate: {
      type: String,
      default: ''
    },

    // =========================================================
    // HOSTEL INFORMATION
    // =========================================================

    hostelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hostel',
      required: true,
      index: true
    },

    hostelNo: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true
    },

    hostelType: {
      type: String,
      default: '',
      trim: true
    },

    // =========================================================
    // ACCOUNT INFORMATION
    // =========================================================

    password: {
      type: String,
      required: true
    },

    role: {
      type: String,
      enum: ['student', 'admin'],
      default: 'student'
    },

    profilePhoto: {
      type: String,
      default: ''
    },

    // =========================================================
    // PROFILE CHANGE LOCKS
    // =========================================================

    isMobileLocked: {
      type: Boolean,
      default: false
    },

    isEmailLocked: {
      type: Boolean,
      default: false
    },

    // =========================================================
    // PASSWORD RESET / OTP
    // =========================================================

    resetPasswordOtp: {
      type: String,
      default: null
    },

    resetPasswordExpires: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);


// =============================================================
// PASSWORD HASHING
// =============================================================

userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }

  this.password =
    await bcrypt.hash(
      this.password,
      10
    );
});


// =============================================================
// PASSWORD VALIDATION
// =============================================================

userSchema.methods.comparePassword =
  async function (candidatePassword) {
    return await bcrypt.compare(
      candidatePassword,
      this.password
    );
  };


// =============================================================
// INDEXES
// =============================================================

// Hostel-wise student lists
userSchema.index({
  hostelId: 1,
  hostelNo: 1
});

// Student searching
userSchema.index({
  name: 1,
  rollNo: 1
});


// =============================================================
// EXPORT
// =============================================================

module.exports =
  mongoose.model(
    'User',
    userSchema
  );

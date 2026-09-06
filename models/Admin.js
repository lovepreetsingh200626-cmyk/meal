const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    email: {
      type: String,
      default: '',
      trim: true,
      lowercase: true
    },

    mobileNo: {
      type: String,
      default: '',
      trim: true
    },

    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other', ''],
      default: ''
    },

    dob: {
      type: String,
      default: ''
    },

    profilePhoto: {
      type: String,
      default: ''
    },

    // Administrative details
    teacherId: {
      type: String,
      default: '',
      trim: true
    },

    designation: {
      type: String,
      enum: [
        'Professor',
        'Associate Professor',
        'Assistant Professor',
        'Warden',
        'Chief Warden',
        'Other',
        ''
      ],
      default: ''
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

    wardenHostel: {
      type: String,
      default: '',
      trim: true
    },

    // Family details
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

    password: {
      type: String,
      required: true
    },

    role: {
      type: String,
      default: 'admin',
      enum: ['admin']
    },

    isMobileLocked: {
      type: Boolean,
      default: false
    },

    isEmailLocked: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);


// Hash password automatically before saving
adminSchema.pre('save', async function () {
  if (!this.isModified('password')) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});


// Compare password during login
adminSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};


module.exports = mongoose.model('Admin', adminSchema);
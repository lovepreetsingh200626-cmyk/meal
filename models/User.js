const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  
  studentId: { type: String, required: true, unique: true, trim: true },
  rollNo: { type: String, required: true,  trim: true },
  
  university: { type: String, default: '' },
  department: { type: String, default: '' },
  session: { type: String, default: '' },
  category: { type: String, enum: ['General', 'SC', 'BC', 'OBC', 'Other', ''], default: '' },
  email: { type: String, trim: true, default: '' },

  hostelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true },
  hostelNo: { type: String, required: true, uppercase: true },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
  mobileNo: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'admin'], default: 'student' },
  profilePhoto: { type: String, default: '' },
  dob: { type: String, default: '' },

  // --- NEW FIELDS FOR OTP PASSWORD RESET ---
  resetPasswordOtp: { type: String, default: null },
  resetPasswordExpires: { type: Date, default: null }

}, { timestamps: true });

// Hash password automatically before saving
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

module.exports = mongoose.model('User', userSchema);
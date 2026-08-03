const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');


// models/User.js
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  rollNo: { type: String, required: true, unique: true },
  studentId: { type: String, default: '' },
  
  // --- ADD THESE NEW FIELDS HERE ---
  university: { type: String, default: '' },
  department: { type: String, default: '' },
  session: { type: String, default: '' },
  category: { type: String, enum: ['General', 'SC', 'BC', 'OBC', 'Other', ''], default: '' },
  email: { type: String, trim: true, default: '' },
  // ---------------------------------

  hostelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true },
  hostelNo: { type: String, required: true, uppercase: true },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
  mobileNo: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'admin'], default: 'student' },
  profilePhoto: { type: String, default: '' },
  dob: { type: String, default: '' }
}, { timestamps: true });

userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

module.exports = mongoose.model('User', userSchema);

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  rollNo: { type: String, required: true, unique: true, uppercase: true },
  hostelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true },
  hostelNo: { type: String, required: true, uppercase: true }, // Cached for quick display
  hostelType: { type: String, enum: ['boys', 'girls'], required: true },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
  mobileNo: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'admin'], default: 'student' }
}, { timestamps: true });

// ✅ FIXED: Removed 'next' parameter and next() calls for async middleware
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

module.exports = mongoose.model('User', userSchema);
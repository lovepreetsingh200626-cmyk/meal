const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  
  // --- NEWLY ADDED REGISTRATION FIELDS ---
  fatherName: { type: String, default: '', trim: true },
  motherName: { type: String, default: '', trim: true },
  faculty: { type: String, default: '', trim: true },
  facultyName: { type: String, default: '', trim: true },
  nationality: { type: String, default: 'India', trim: true },
  domicileState: { type: String, default: 'Punjab', trim: true },
  // ---------------------------------------

  studentId: { type: String, required: true, unique: true, trim: true },
  rollNo: { type: String, required: true, trim: true },
  
  university: { type: String, default: 'GNDU Amritsar', trim: true }, // Course / Program Name
  department: { type: String, default: '', trim: true },
  session: { type: String, default: '', trim: true },
  category: { 
    type: String, 
    enum: ['General', 'SC', 'BC', 'OBC', 'Other', ''], 
    default: 'General' 
  },
  email: { 
    type: String, 
    trim: true, 
    lowercase: true, 
    default: '' 
  },

  hostelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true },
  hostelNo: { type: String, required: true, uppercase: true, trim: true },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
  mobileNo: { type: String, required: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'admin'], default: 'student' },
  
  // Large Base64 image string storage
  profilePhoto: { type: String, default: '' },
  dob: { type: String, default: '' },

  // --- OTP PASSWORD RESET FIELDS ---
  resetPasswordOtp: { type: String, default: null },
  resetPasswordExpires: { type: Date, default: null }

}, { timestamps: true });

// Hash password automatically before saving if modified
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

// Helper method to validate passwords during login / reset
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
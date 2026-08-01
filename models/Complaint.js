const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  hostelId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Hostel', 
    required: true 
  },
  hostelNo: { 
    type: String, 
    required: true, 
    uppercase: true 
  },
  category: { 
    type: String, 
    enum: ['Food Quality', 'Cleanliness', 'Timing', 'Staff Behavior', 'Other'], 
    default: 'Food Quality' 
  },
  subject: { 
    type: String, 
    required: true, 
    trim: true 
  },
  description: { 
    type: String, 
    required: true, 
    trim: true 
  },
  // --- ADDED PHOTO PROOF FIELD (Stores Base64 Image String) ---
  photoProof: { 
    type: String 
  },
  status: { 
    type: String, 
    enum: ['Pending', 'In Progress', 'Resolved'], 
    default: 'Pending' 
  },
  adminRemark: { 
    type: String, 
    default: '' 
  }
}, { timestamps: true });

module.exports = mongoose.model('Complaint', complaintSchema);
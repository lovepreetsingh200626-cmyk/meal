const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema(
  {
    // Student who submitted the complaint
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    // Hostel associated with the complaint
    hostelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hostel',
      required: true,
      index: true
    },

    // Hostel number/name
    hostelNo: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true
    },

    // Complaint category
    category: {
      type: String,
      enum: [
        'Food Quality',
        'Cleanliness',
        'Timing',
        'Staff Behavior',
        'Other'
      ],
      default: 'Food Quality',
      index: true
    },

    // Short complaint subject
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },

    // Detailed complaint
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1500
    },

    // Optional photo evidence
    // Stored as Base64 image string
    photoProof: {
      type: String,
      default: ''
    },

    // Complaint status
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Resolved'],
      default: 'Pending',
      index: true
    },

    // Remark added by admin/warden
    adminRemark: {
      type: String,
      default: '',
      trim: true,
      maxlength: 1000
    },

    // When admin last changed/resolved the complaint
    resolvedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Useful for student complaint history
complaintSchema.index({ userId: 1, createdAt: -1 });

// Useful for admin complaint management
complaintSchema.index({ hostelId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Complaint', complaintSchema);
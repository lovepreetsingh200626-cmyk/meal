const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema(
  {
    // Notice title
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150
    },

    // Full notice content
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000
    },

    // Target hostel
    // ALL = visible to every hostel
    hostelNo: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      default: 'ALL',
      index: true
    },

    // Admin/warden who posted the notice
    postedBy: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    }
  },
  {
    timestamps: true
  }
);

// Newest notices first
noticeSchema.index({
  hostelNo: 1,
  createdAt: -1
});

module.exports = mongoose.model('Notice', noticeSchema);
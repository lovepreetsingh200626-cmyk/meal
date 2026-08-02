const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true, 
    trim: true 
  },
  content: { 
    type: String, 
    required: true, 
    trim: true 
  },
  hostelNo: { 
    type: String, 
    required: true, 
    uppercase: true,
    default: 'ALL' // Can be 'ALL' for campus-wide or specific like 'BH1'
  },
  postedBy: { 
    type: String, 
    required: true 
  }
}, { timestamps: true });

module.exports = mongoose.model('Notice', noticeSchema);
const express = require('express');
const Complaint = require('../models/Complaint');
const router = express.Router();

// ==========================================
// 1. SUBMIT A NEW COMPLAINT (Student)
// ==========================================
// @route   POST /api/complaints
router.post('/', async (req, res) => {
  try {
    const { userId, hostelId, hostelNo, category, subject, description, photoProof } = req.body;

    if (!userId || !hostelId || !hostelNo || !subject || !description) {
      return res.status(400).json({ message: 'All required fields must be filled.' });
    }

    const newComplaint = new Complaint({
      userId,
      hostelId,
      hostelNo: hostelNo.toUpperCase(),
      category,
      subject: subject.trim(),
      description: description.trim(),
      photoProof: photoProof || '' // <-- Added photoProof here
    });

    await newComplaint.save();
    
    const populatedComplaint = await Complaint.findById(newComplaint._id)
      .populate('userId', 'name rollNo mobileNo');

    res.status(201).json({ 
      message: 'Complaint submitted successfully!', 
      complaint: populatedComplaint 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 2. GET COMPLAINTS FOR A SPECIFIC STUDENT
// ==========================================
// @route   GET /api/complaints/user/:userId
router.get('/user/:userId', async (req, res) => {
  try {
    const complaints = await Complaint.find({ userId: req.params.userId })
      .sort({ createdAt: -1 });
    res.json(complaints);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 3. GET ALL CAMPUS COMPLAINTS (Admin Only)
// ==========================================
// @route   GET /api/complaints/all
router.get('/all', async (req, res) => {
  try {
    const complaints = await Complaint.find({})
      .populate('userId', 'name rollNo mobileNo studentId')
      .populate('hostelId', 'hostelNumber name')
      .sort({ createdAt: -1 });
    res.json(complaints);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 4. UPDATE COMPLAINT STATUS / REMARK (Admin Only)
// ==========================================
// @route   PUT /api/complaints/:id
router.put('/:id', async (req, res) => {
  try {
    const { status, adminRemark } = req.body;

    const updateFields = {};
    if (status) updateFields.status = status;
    if (adminRemark !== undefined) updateFields.adminRemark = adminRemark.trim();

    const updatedComplaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true }
    ).populate('userId', 'name rollNo mobileNo');

    if (!updatedComplaint) {
      return res.status(404).json({ message: 'Complaint not found.' });
    }

    res.json({ 
      message: 'Complaint status updated successfully!', 
      complaint: updatedComplaint 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 5. DELETE A COMPLAINT (Student or Admin)
// ==========================================
// @route   DELETE /api/complaints/:id
router.delete('/:id', async (req, res) => {
  try {
    const deletedComplaint = await Complaint.findByIdAndDelete(req.params.id);
    if (!deletedComplaint) {
      return res.status(404).json({ message: 'Complaint not found.' });
    }
    res.json({ message: 'Complaint deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
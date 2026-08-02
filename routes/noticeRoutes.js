const express = require('express');
const Notice = require('../models/Notice');
const router = express.Router();

// ==========================================
// 1. CREATE A NEW NOTICE (Admin Only)
// ==========================================
// @route   POST /api/notices
router.post('/', async (req, res) => {
  try {
    const { title, content, hostelNo, postedBy } = req.body;

    if (!title || !content || !postedBy) {
      return res.status(400).json({ message: 'Title, content, and author are required.' });
    }

    const newNotice = new Notice({
      title: title.trim(),
      content: content.trim(),
      hostelNo: hostelNo ? hostelNo.toUpperCase() : 'ALL',
      postedBy: postedBy.trim()
    });

    await newNotice.save();
    res.status(201).json({ message: 'Notice posted successfully!', notice: newNotice });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 2. GET ALL NOTICES (Students & Admins)
// ==========================================
// @route   GET /api/notices
router.get('/', async (req, res) => {
  try {
    const notices = await Notice.find({}).sort({ createdAt: -1 });
    res.json(notices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 3. DELETE A NOTICE (Admin Only)
// ==========================================
// @route   DELETE /api/notices/:id
router.delete('/:id', async (req, res) => {
  try {
    const deletedNotice = await Notice.findByIdAndDelete(req.params.id);
    if (!deletedNotice) {
      return res.status(404).json({ message: 'Notice not found.' });
    }
    res.json({ message: 'Notice deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
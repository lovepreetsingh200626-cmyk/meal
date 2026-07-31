const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Hostel = require('../models/Hostel');
const router = express.Router();

// @route   POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, rollNo, hostelNo, gender, mobileNo, password } = req.body;

    const hostel = await Hostel.findOne({ hostelNumber: hostelNo.toUpperCase() });
    if (!hostel) {
      return res.status(404).json({ message: 'Hostel not found. Please contact admin.' });
    }

    const newUser = new User({
      name,
      rollNo,
      hostelId: hostel._id,
      hostelNo: hostel.hostelNumber,
      hostelType: hostel.type,
      gender,
      mobileNo,
      password
    });

    await newUser.save();
    res.status(201).json({ message: 'User registered successfully!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// @route   POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { rollNo, password } = req.body;
    const user = await User.findOne({ rollNo: rollNo.toUpperCase() }).populate('hostelId');
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, 'YOUR_SECRET_KEY', { expiresIn: '1d' });
    res.json({ token, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
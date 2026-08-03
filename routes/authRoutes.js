const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin');
const Hostel = require('../models/Hostel');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'YOUR_SECRET_KEY';
const ADMIN_SECRET_CODE = process.env.ADMIN_SECRET_CODE || 'GNDU_ADMIN_2026';

// ==========================================
// 1. STUDENT REGISTER
// ==========================================
router.post('/register', async (req, res) => {
  try {
    const { name, rollNo, hostelNo, gender, mobileNo, password } = req.body;

    const hostel = await Hostel.findOne({ hostelNumber: hostelNo.toUpperCase() });
    if (!hostel) {
      return res.status(404).json({ message: 'Hostel not found. Please contact admin.' });
    }

    const newUser = new User({
      name: name.trim(),
      rollNo: rollNo.trim(),
      hostelId: hostel._id,
      hostelNo: hostel.hostelNumber,
      hostelType: hostel.type,
      gender,
      mobileNo,
      password,
      role: 'student'
    });

    await newUser.save();
    res.status(201).json({ message: 'Student registered successfully!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 2. ADMIN REGISTER
// ==========================================
router.post('/register-admin', async (req, res) => {
  try {
    const { name, password, adminSecret } = req.body;

    if (adminSecret != ADMIN_SECRET_CODE) {
      return res.status(403).json({ message: 'Invalid Admin Authorization Secret Code!' });
    }

    const newAdmin = new Admin({
      name: name.trim(),
      password,
      role: 'admin'
    });

    await newAdmin.save();
    res.status(201).json({ message: 'Admin account registered successfully!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 3. UNIFIED LOGIN
// ==========================================
router.post('/login', async (req, res) => {
  try {
    const { rollNo, name, password, role } = req.body;
    let account;

    if (role === 'admin') {
      if (!name) {
        return res.status(400).json({ message: 'Admin Name is required for login.' });
      }
      account = await Admin.findOne({
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
      });
    } else {
      if (!rollNo) {
        return res.status(400).json({ message: 'Roll Number is required for login.' });
      }
      account = await User.findOne({ rollNo: rollNo.trim() }).populate('hostelId');
    }

    if (!account || !(await bcrypt.compare(password, account.password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: account._id, role: account.role }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: account });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 4. GET ALL STUDENTS
// ==========================================
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 5. ROLE UPDATE ROUTE
// ==========================================
router.put('/update-role', async (req, res) => {
  try {
    const { targetRollNo, newRole } = req.body;

    if (!['student', 'admin'].includes(newRole)) {
      return res.status(400).json({ message: 'Invalid role specified.' });
    }

    const updatedUser = await User.findOneAndUpdate(
      { rollNo: targetRollNo.trim() },
      { $set: { role: newRole } },
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User with this Roll Number not found.' });
    }

    res.json({
      message: `Successfully updated role of Roll No ${targetRollNo} to ${newRole}`,
      user: updatedUser
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// REMOVE STUDENT BY ROLL NUMBER
// ==========================================
router.delete('/users/:rollNo', async (req, res) => {
  try {
    const { rollNo } = req.params;
    const deletedUser = await User.findOneAndDelete({ rollNo: rollNo.trim() });

    if (!deletedUser) {
      return res.status(404).json({ message: 'Student with this Roll Number not found.' });
    }

    res.json({ message: `Student Roll No ${rollNo} removed successfully.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// ADMIN: RESET/CHANGE STUDENT PASSWORD
// ==========================================
router.put('/users/:rollNo/password', async (req, res) => {
  try {
    const { rollNo } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters long.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    const updatedUser = await User.findOneAndUpdate(
      { rollNo: rollNo.trim() },
      { $set: { password: hashedPassword } },
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: 'Student with this Roll Number not found.' });
    }

    res.json({ message: `Password for Roll No ${rollNo} has been successfully updated!` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// UPDATE STUDENT PROFILE (Student Self-Update)
// ==========================================
// ==========================================
// UPDATE STUDENT PROFILE (Student Self-Update)
// ==========================================
router.put('/profile/:id', async (req, res) => {
  try {
    const { 
      name, 
      gender, 
      mobileNo, 
      dob, 
      profilePhoto, 
      studentId, 
      university, 
      department, 
      session, 
      category, 
      email 
    } = req.body;

    const currentUser = await User.findById(req.params.id);
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const updateFields = {};
    if (name) updateFields.name = name.trim();
    if (gender) updateFields.gender = gender;
    if (mobileNo) updateFields.mobileNo = mobileNo.replace(/\D/g, '');
    if (dob) updateFields.dob = dob;
    if (profilePhoto) updateFields.profilePhoto = profilePhoto;

    if (studentId !== undefined) updateFields.studentId = studentId.trim();
    
    // Explicitly map and assign the new fields here so they save to MongoDB:
    if (university !== undefined) updateFields.university = university.trim();
    if (department !== undefined) updateFields.department = department.trim();
    if (session !== undefined) updateFields.session = session.trim();
    if (category !== undefined) updateFields.category = category;
    if (email !== undefined) updateFields.email = email.trim();

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      message: 'Profile updated successfully!',
      user: updatedUser
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// ADMIN: UPDATE STUDENT DETAILS (Full Access)
// ==========================================
router.put('/users/:rollNo', async (req, res) => {
  try {
    const { rollNo } = req.params;
    const { newRollNo, name, gender, mobileNo, dob, studentId, hostelNo, university, department, session, category, email } = req.body;

    const updateFields = {};
    if (name) updateFields.name = name.trim();
    if (gender) updateFields.gender = gender;
    if (mobileNo) updateFields.mobileNo = mobileNo.replace(/\D/g, '');
    if (dob) updateFields.dob = dob;

    if (newRollNo && newRollNo.trim() !== rollNo.trim()) {
      const existingUser = await User.findOne({ rollNo: newRollNo.trim() });
      if (existingUser) {
        return res.status(400).json({ message: 'Roll Number already in use by another student.' });
      }
      updateFields.rollNo = newRollNo.trim();
    }

    if (studentId !== undefined) updateFields.studentId = studentId.trim();
    if (university !== undefined) updateFields.university = university.trim();
    if (department !== undefined) updateFields.department = department.trim();
    if (session !== undefined) updateFields.session = session.trim();
    if (category !== undefined) updateFields.category = category;
    if (email !== undefined) updateFields.email = email.trim();

    if (hostelNo) {
      const hostel = await Hostel.findOne({ hostelNumber: hostelNo.toUpperCase() });
      if (!hostel) {
        return res.status(404).json({ message: `Hostel ${hostelNo} not found.` });
      }
      updateFields.hostelId = hostel._id;
      updateFields.hostelNo = hostel.hostelNumber;
      updateFields.hostelType = hostel.type;
    }

    const updatedUser = await User.findOneAndUpdate(
      { rollNo: rollNo.trim() },
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select('-password').populate('hostelId');

    if (!updatedUser) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    res.json({ message: `Student details updated successfully!`, user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// ADMIN DIRECTORY ROUTES
// ==========================================
router.get('/admins', async (req, res) => {
  try {
    const admins = await Admin.find({}).select('-password').sort({ createdAt: -1 });
    res.json(admins);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/admins/:id', async (req, res) => {
  try {
    const { name, mobileNo, dob, profilePhoto } = req.body;
    const updateFields = {};

    if (name) updateFields.name = name.trim();
    if (mobileNo !== undefined) updateFields.mobileNo = mobileNo.replace(/\D/g, '');
    if (dob !== undefined) updateFields.dob = dob;
    if (profilePhoto) updateFields.profilePhoto = profilePhoto;

    const updatedAdmin = await Admin.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedAdmin) {
      return res.status(404).json({ message: 'Admin not found.' });
    }

    res.json({
      message: 'Admin details updated successfully!',
      admin: updatedAdmin
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/admins/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedAdmin = await Admin.findByIdAndDelete(id);

    if (!deletedAdmin) {
      return res.status(404).json({ message: 'Admin account not found.' });
    }

    res.json({ message: `Admin account removed successfully.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
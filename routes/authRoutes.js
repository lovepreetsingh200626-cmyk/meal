const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin'); // <-- Import new Admin model
const Hostel = require('../models/Hostel');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'YOUR_SECRET_KEY';
const ADMIN_SECRET_CODE = process.env.ADMIN_SECRET_CODE || 'GNDU_ADMIN_2026';

// ==========================================
// 1. STUDENT REGISTER
// ==========================================
// @route   POST /api/auth/register
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
// 2. ADMIN REGISTER (Uses separate Admin model)
// ==========================================
// @route   POST /api/auth/register-admin
router.post('/register-admin', async (req, res) => {
  try {
    const { name, password, adminSecret } = req.body;

    if (adminSecret != ADMIN_SECRET_CODE) {
      return res.status(403).json({ message: 'Invalid Admin Authorization Secret Code!' });
    }

    // Save directly into the clean Admin collection
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
// 3. UNIFIED LOGIN (Checks Admin OR User Collection)
// ==========================================
// @route   POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { rollNo, name, password, role } = req.body;
    let account;

    // 1. If Admin Mode -> Search Admin collection by Name
    if (role === 'admin') {
      if (!name) {
        return res.status(400).json({ message: 'Admin Name is required for login.' });
      }
      account = await Admin.findOne({
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
      });
    }
    // 2. Otherwise -> Search User collection by Roll Number
    else {
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
// 4. GET ALL STUDENTS (Used by Admin Dashboard)
// ==========================================
// @route   GET /api/auth/users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 5. ROLE UPDATE ROUTE (Admin Only)
// ==========================================
// @route   PUT /api/auth/update-role
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

// @route   GET /api/meals/all (Admin Only)
router.get('/all', async (req, res) => {
  try {
    const allMeals = await Meal.find({})
      .populate('userId', 'name rollNo')
      .populate('hostelId', 'hostelNumber name')
      .sort({ date: -1 });
    res.json(allMeals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// REMOVE STUDENT BY ROLL NUMBER (Admin Only)
// ==========================================
// @route   DELETE /api/auth/users/:rollNo
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
// @route   PUT /api/auth/users/:rollNo/password
router.put('/users/:rollNo/password', async (req, res) => {
  try {
    const { rollNo } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters long.' });
    }

    // 1. Hash the new password safely
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // 2. Update in MongoDB
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
// UPDATE STUDENT PROFILE
// ==========================================
// @route   PUT /api/auth/profile/:id
router.put('/profile/:id', async (req, res) => {
  try {
    const { name, gender, mobileNo, dob, profilePhoto, studentId } = req.body;

    // 1. Fetch current user to check existing fields
    const currentUser = await User.findById(req.params.id);
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // 2. Build the update object
    const updateFields = {};
    if (name) updateFields.name = name.trim();
    if (gender) updateFields.gender = gender;
    if (mobileNo) updateFields.mobileNo = mobileNo.replace(/\D/g, '');
    if (dob) updateFields.dob = dob;
    if (profilePhoto) updateFields.profilePhoto = profilePhoto;

    // 3. STUDENT ID LOGIC: Only allow saving if it doesn't already exist
    if (studentId && studentId.trim() !== '') {
      if (currentUser.studentId && currentUser.studentId !== studentId.trim()) {
        return res.status(400).json({ message: 'Student ID has already been set and cannot be changed.' });
      } else if (!currentUser.studentId) {
        updateFields.studentId = studentId.trim();
      }
    }

    // 4. Update the user
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
// @route   PUT /api/auth/users/:rollNo
router.put('/users/:rollNo', async (req, res) => {
  try {
    const { rollNo } = req.params;
    const { name, gender, mobileNo, dob, studentId, hostelNo } = req.body;

    const updateFields = {};
    if (name) updateFields.name = name.trim();
    if (gender) updateFields.gender = gender;
    if (mobileNo) updateFields.mobileNo = mobileNo.replace(/\D/g, '');
    if (dob) updateFields.dob = dob;

    // Admins have override privileges for the Student ID
    if (studentId !== undefined) {
      updateFields.studentId = studentId.trim();
    }

    // If the admin is moving the student to a new hostel, we must look up the new Hostel ID
    if (hostelNo) {
      const hostel = await Hostel.findOne({ hostelNumber: hostelNo.toUpperCase() });
      if (!hostel) {
        return res.status(404).json({ message: `Hostel ${hostelNo} not found in database.` });
      }
      updateFields.hostelId = hostel._id;
      updateFields.hostelNo = hostel.hostelNumber;
      updateFields.hostelType = hostel.type;
    }

    // Find and update the user based on their Roll Number
    const updatedUser = await User.findOneAndUpdate(
      { rollNo: rollNo.trim() },
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: 'Student with this Roll Number not found.' });
    }

    res.json({
      message: `Details for Roll No ${rollNo} updated successfully!`,
      user: updatedUser
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// ==========================================
// ADMIN DIRECTORY: UPDATE ADMIN PROFILE
// ==========================================
// @route   PUT /api/auth/admins/profile/:id
router.put('/admins/profile/:id', async (req, res) => {
  try {
    const { mobileNo, dob, profilePhoto } = req.body;
    const updateFields = {};

    // Only update fields that were actually sent in the request
    if (mobileNo) updateFields.mobileNo = mobileNo.replace(/\D/g, ''); // Strip non-numeric characters
    if (dob) updateFields.dob = dob;
    if (profilePhoto) updateFields.profilePhoto = profilePhoto;

    // Find the admin by ID and apply updates
    const updatedAdmin = await Admin.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true }
    ).select('-password');

    if (!updatedAdmin) {
      return res.status(404).json({ message: 'Admin not found.' });
    }

    res.json({
      message: 'Admin profile updated successfully!',
      admin: updatedAdmin
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// ADMIN DIRECTORY: GET ALL ADMINS
// ==========================================
// @route   GET /api/auth/admins
router.get('/admins', async (req, res) => {
  try {
    // Fetch all admins, exclude passwords, and sort by newest first
    const admins = await Admin.find({}).select('-password').sort({ createdAt: -1 });
    res.json(admins);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// ADMIN DIRECTORY: UPDATE ANY ADMIN DETAILS (Full Access)
// ==========================================
// @route   PUT /api/auth/admins/:id
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

// ==========================================
// ADMIN DIRECTORY: DELETE AN ADMIN ACCOUNT
// ==========================================
// @route   DELETE /api/auth/admins/:id
router.delete('/admins/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Optional safeguard: Prevent an admin from deleting their own currently logged-in account
    if (req.user && req.user.id === id) {
      return res.status(400).json({ message: 'You cannot delete your own active admin account.' });
    }

    const deletedAdmin = await Admin.findByIdAndDelete(id);

    if (!deletedAdmin) {
      return res.status(404).json({ message: 'Admin account not found.' });
    }

    res.json({ message: `Admin account (${deletedAdmin.name}) removed successfully.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// ==========================================

module.exports = router;
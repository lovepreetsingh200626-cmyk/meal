const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const User = require('../models/User');
const Admin = require('../models/Admin');
const Hostel = require('../models/Hostel');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'YOUR_SECRET_KEY';
const ADMIN_SECRET_CODE = process.env.ADMIN_SECRET_CODE || 'GNDU_ADMIN_2026';

// ---------------------------------------------------------
// 2. CONFIGURE NODEMAILER TRANSPORTER
// ---------------------------------------------------------
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// ==========================================
// 1. STUDENT REGISTER
// ==========================================
router.post('/register', async (req, res) => {
  try {
    const { name, email, studentId, rollNo, hostelNo, gender, mobileNo, password } = req.body;

    if (!studentId || !studentId.trim()) return res.status(400).json({ message: 'Student ID is required.' });
    if (studentId.trim().length > 13) return res.status(400).json({ message: 'Student ID cannot exceed 13 digits.' });

    if (!rollNo || !rollNo.trim()) return res.status(400).json({ message: 'Roll Number is required.' });
    if (rollNo.trim().length > 3) return res.status(400).json({ message: 'Roll Number cannot exceed 3 digits.' });

    const hostel = await Hostel.findOne({ hostelNumber: hostelNo.toUpperCase() });
    if (!hostel) return res.status(404).json({ message: 'Hostel not found. Please contact admin.' });

    // 1. Check if Student ID is globally unique
    const existingStudentId = await User.findOne({ studentId: studentId.trim() });
    if (existingStudentId) {
      return res.status(400).json({ message: 'This Student ID is already registered in the system.' });
    }

    // 2. Check if Roll No is unique WITHIN the chosen hostel
    const existingRollInHostel = await User.findOne({ 
      rollNo: rollNo.trim(), 
      hostelNo: hostel.hostelNumber 
    });
    if (existingRollInHostel) {
      return res.status(400).json({ message: `Roll Number ${rollNo.trim()} is already taken in ${hostel.hostelNumber}.` });
    }

    const newUser = new User({
      name: name.trim(),
      email: email ? email.trim() : '', 
      studentId: studentId.trim(),
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
    console.log("New User Registered:", newUser.studentId);
    res.status(201).json({ message: 'Student registered successfully!', newUser });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Database Error: A unique field constraint was violated. (Ensure you deleted the rollNo index in MongoDB).' });
    }
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 2. ADMIN REGISTER
// ==========================================
router.post('/register-admin', async (req, res) => {
  try {
    const { name, password, adminSecret } = req.body;

    if (adminSecret != ADMIN_SECRET_CODE) return res.status(403).json({ message: 'Invalid Admin Authorization Secret Code!' });

    const newAdmin = new Admin({ name: name.trim(), password, role: 'admin' });
    await newAdmin.save();
    res.status(201).json({ message: 'Admin account registered successfully!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 3. UNIFIED LOGIN (UPDATED: StudentID only)
// ==========================================
router.post('/login', async (req, res) => {
  try {
    const { studentId, name, password, role } = req.body;
    let account;

    if (role === 'admin') {
      if (!name) return res.status(400).json({ message: 'Admin Name is required for login.' });
      account = await Admin.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } });
    } else {
      if (!studentId || !studentId.trim()) return res.status(400).json({ message: 'Student ID is required for login.' });
      
      account = await User.findOne({ 
        studentId: studentId.trim()
      }).populate('hostelId');
    }

    if (!account) return res.status(401).json({ message: 'Account not found. Please check your credentials.' });
    if (!(await bcrypt.compare(password, account.password))) return res.status(401).json({ message: 'Invalid password.' });

    const token = jwt.sign({ id: account._id, role: account.role }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: account });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 3A. FORGOT PASSWORD - GMAIL EMAIL OTP
// ==========================================
router.post('/forgot-password', async (req, res) => {
  try {
    const { studentId } = req.body;
    if (!studentId) return res.status(400).json({ message: 'Student ID is required.' });

    const user = await User.findOne({ studentId: studentId.trim() });
    if (!user) return res.status(404).json({ message: 'No account found with this Student ID.' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordOtp = otp;
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; 
    await user.save();

    console.log(`\n=============================================`);
    console.log(`🔐 OTP for ${user.name} (${user.studentId}): ${otp}`);
    console.log(`=============================================\n`);

    if (!user.email || user.email.trim() === '') {
      return res.status(400).json({ message: 'No email address is linked to this account. Please contact the administrator to reset your password.' });
    }

    const mailOptions = {
      from: `"GNDU Dining & Attendance" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Password Reset Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-w: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
          <h2 style="color: #2563eb; text-align: center;">GNDU Mess Portal</h2>
          <p style="color: #334155; font-size: 16px;">Hello <strong>${user.name}</strong>,</p>
          <p style="color: #334155; font-size: 14px;">You recently requested to reset your password. Use the verification code below to securely change your password.</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; background-color: #f1f5f9; padding: 15px 25px; border-radius: 8px; letter-spacing: 8px; color: #0f172a;">${otp}</span>
          </div>
          <p style="color: #64748b; font-size: 13px; text-align: center;">This code is valid for exactly 10 minutes. If you did not request this, please ignore this email.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    const maskedEmail = user.email.replace(/(.{2})(.*)(?=@)/, (gp1, gp2, gp3) => { 
      let mask = ''; for(let i=0; i<gp3.length; i++) mask+="*"; return gp1 + mask; 
    });

    res.json({ message: `An OTP has been successfully sent to ${maskedEmail}` });
  } catch (error) {
    res.status(500).json({ error: 'Server error. Failed to send email.' });
  }
});

// ==========================================
// 3B. RESET PASSWORD - VERIFY OTP & SAVE NEW PASSWORD
// ==========================================
router.post('/reset-password', async (req, res) => {
  try {
    const { studentId, otp, newPassword } = req.body;
    if (!studentId || !otp || !newPassword) return res.status(400).json({ message: 'Student ID, OTP, and new password are required.' });

    const user = await User.findOne({ 
      studentId: studentId.trim(),
      resetPasswordOtp: otp.trim(),
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) return res.status(400).json({ message: 'OTP is invalid or has expired. Please request a new one.' });

    user.password = newPassword;
    user.resetPasswordOtp = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.json({ message: 'Password has been reset successfully! You can now log in.' });
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
    const { targetStudentId, targetRollNo, newRole } = req.body;
    const identifier = targetStudentId || targetRollNo;

    if (!identifier) return res.status(400).json({ message: 'Student identifier required.' });
    if (!['student', 'admin'].includes(newRole)) return res.status(400).json({ message: 'Invalid role specified.' });

    let query = { $or: [{ studentId: identifier.toString().trim() }] };
    if (mongoose.Types.ObjectId.isValid(identifier.toString().trim())) {
      query.$or.push({ _id: identifier.toString().trim() });
    }

    const updatedUser = await User.findOneAndUpdate(query, { $set: { role: newRole } }, { returnDocument: 'after' }).select('-password');
    if (!updatedUser) return res.status(404).json({ message: 'User not found.' });

    res.json({ message: `Successfully updated role to ${newRole}`, user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// REMOVE STUDENT BY IDENTIFIER
// ==========================================
router.delete('/users/:identifier', async (req, res) => {
  try {
    const identifier = req.params.identifier.trim();
    
    let query = { studentId: identifier };
    if (mongoose.Types.ObjectId.isValid(identifier)) query = { _id: identifier };

    const deletedUser = await User.findOneAndDelete(query);
    if (!deletedUser) return res.status(404).json({ message: 'Student not found.' });

    res.json({ message: `Student removed successfully.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// ADMIN: RESET/CHANGE STUDENT PASSWORD DIRECTLY
// ==========================================
router.put('/users/:identifier/password', async (req, res) => {
  try {
    const identifier = req.params.identifier.trim();
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) return res.status(400).json({ message: 'New password must be at least 8 characters long.' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    let query = { studentId: identifier };
    if (mongoose.Types.ObjectId.isValid(identifier)) query = { _id: identifier };

    const updatedUser = await User.findOneAndUpdate(query, { $set: { password: hashedPassword } }, { returnDocument: 'after' }).select('-password');
    if (!updatedUser) return res.status(404).json({ message: 'Student not found.' });

    res.json({ message: `Password has been successfully updated!` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// UPDATE STUDENT PROFILE (Normal User Route)
// ==========================================
router.put('/profile/:id', async (req, res) => {
  try {
    const { name, gender, mobileNo, dob, profilePhoto, studentId, rollNo, university, department, session, category, email } = req.body;
    const currentUser = await User.findById(req.params.id);
    if (!currentUser) return res.status(404).json({ message: 'User not found.' });

    const updateFields = {};
    if (name) updateFields.name = name.trim();
    if (gender) updateFields.gender = gender;
    if (mobileNo) updateFields.mobileNo = mobileNo.replace(/\D/g, '');
    if (dob) updateFields.dob = dob;
    if (profilePhoto) updateFields.profilePhoto = profilePhoto;
    if (rollNo !== undefined) updateFields.rollNo = rollNo.trim();

    if (studentId && studentId.trim() !== '') {
      if (currentUser.studentId && currentUser.studentId !== studentId.trim()) {
        return res.status(400).json({ message: 'Student ID cannot be changed once set.' });
      } else if (!currentUser.studentId) {
        updateFields.studentId = studentId.trim();
      }
    }

    if (university !== undefined) updateFields.university = university.trim();
    if (department !== undefined) updateFields.department = department.trim();
    if (session !== undefined) updateFields.session = session.trim();
    if (category !== undefined) updateFields.category = category;
    if (email !== undefined) updateFields.email = email.trim();

    const updatedUser = await User.findByIdAndUpdate(req.params.id, { $set: updateFields }, { returnDocument: 'after', runValidators: true }).select('-password');
    res.json({ message: 'Profile updated successfully!', user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// ADMIN: UPDATE STUDENT DETAILS (Full Access)
// ==========================================
router.put('/users/:identifier', async (req, res) => {
  try {
    const identifier = req.params.identifier.trim();
    const { newRollNo, name, gender, mobileNo, dob, hostelNo, university, department, session, category, email, studentId } = req.body;

    // Find the student first
    let query = { studentId: identifier };
    if (mongoose.Types.ObjectId.isValid(identifier)) query = { _id: identifier };
    
    const currentUser = await User.findOne(query);
    if (!currentUser) return res.status(404).json({ message: 'Student not found.' });

    const updateFields = {};
    if (name) updateFields.name = name.trim();
    if (gender) updateFields.gender = gender;
    if (mobileNo) updateFields.mobileNo = mobileNo.replace(/\D/g, '');
    if (dob) updateFields.dob = dob;
    if (university !== undefined) updateFields.university = university.trim();
    if (department !== undefined) updateFields.department = department.trim();
    if (session !== undefined) updateFields.session = session.trim();
    if (category !== undefined) updateFields.category = category;
    if (email !== undefined) updateFields.email = email.trim();

    // 1. Check Student ID updates
    if (studentId !== undefined && studentId.trim() !== currentUser.studentId) {
      const existingId = await User.findOne({ studentId: studentId.trim() });
      if (existingId) return res.status(400).json({ message: 'This new Student ID already exists.' });
      updateFields.studentId = studentId.trim();
    }

    // 2. Check Hostel / Roll Number combination updates
    let targetHostelNum = currentUser.hostelNo;
    if (hostelNo) {
      const hostel = await Hostel.findOne({ hostelNumber: hostelNo.toUpperCase() });
      if (!hostel) return res.status(404).json({ message: `Hostel ${hostelNo} not found.` });
      updateFields.hostelId = hostel._id;
      updateFields.hostelNo = hostel.hostelNumber;
      updateFields.hostelType = hostel.type;
      targetHostelNum = hostel.hostelNumber;
    }

    const targetRoll = newRollNo !== undefined ? newRollNo.trim() : currentUser.rollNo;
    
    // Only query the DB for a clash if the RollNo or Hostel is actually changing
    if (targetRoll !== currentUser.rollNo || targetHostelNum !== currentUser.hostelNo) {
      const rollConflict = await User.findOne({ rollNo: targetRoll, hostelNo: targetHostelNum, _id: { $ne: currentUser._id } });
      if (rollConflict) {
        return res.status(400).json({ message: `Roll Number ${targetRoll} is already taken by another student in ${targetHostelNum}.` });
      }
      updateFields.rollNo = targetRoll;
    }

    const updatedUser = await User.findOneAndUpdate(
      query,
      { $set: updateFields },
      { returnDocument: 'after', runValidators: true }
    ).select('-password').populate('hostelId');

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

    const updatedAdmin = await Admin.findByIdAndUpdate(req.params.id, { $set: updateFields }, { returnDocument: 'after', runValidators: true }).select('-password');
    if (!updatedAdmin) return res.status(404).json({ message: 'Admin not found.' });

    res.json({ message: 'Admin details updated successfully!', admin: updatedAdmin });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/admins/:id', async (req, res) => {
  try {
    const deletedAdmin = await Admin.findByIdAndDelete(req.params.id);
    if (!deletedAdmin) return res.status(404).json({ message: 'Admin account not found.' });
    res.json({ message: `Admin account removed successfully.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
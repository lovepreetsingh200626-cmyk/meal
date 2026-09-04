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
// NODEMAILER TRANSPORTER CONFIGURATION
// ---------------------------------------------------------
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// ==========================================
// 1. STUDENT REGISTRATION (PHOTO + DOSSIER)
// ==========================================
router.post('/register', async (req, res) => {
  try {
    const { 
      name, 
      fatherName,
      motherName,
      dob,
      nationality,
      email, 
      studentId, 
      rollNo, 
      hostelNo, 
      gender, 
      mobileNo, 
      password,
      university,   // Course / Degree Name
      department,   // Department Name
      faculty,      // Faculty Name
      facultyName,  // Alternative Faculty Key
      session,      // Academic Session
      domicileState,// State of Domicile
      category,     // Social Category
      profilePhoto  // Base64 Image
    } = req.body;

    // STRICT MANDATORY FIELD VALIDATION (NO EMPTY BLOCKS ALLOWED)
    if (!name || !name.trim()) return res.status(400).json({ message: 'Candidate Name is required.' });
    if (!fatherName || !fatherName.trim()) return res.status(400).json({ message: "Father's Name is required." });
    if (!motherName || !motherName.trim()) return res.status(400).json({ message: "Mother's Name is required." });
    if (!dob || !dob.trim()) return res.status(400).json({ message: 'Date of Birth is required.' });
    if (!nationality || !nationality.trim()) return res.status(400).json({ message: 'Nationality is required.' });
    if (!email || !email.trim()) return res.status(400).json({ message: 'Email Address is required.' });
    if (!studentId || !studentId.trim()) return res.status(400).json({ message: 'Student ID is required.' });
    if (studentId.trim().length > 13) return res.status(400).json({ message: 'Student ID cannot exceed 13 digits.' });
    if (!rollNo || !rollNo.trim()) return res.status(400).json({ message: 'Roll Number is required.' });
    if (!hostelNo || !hostelNo.trim()) return res.status(400).json({ message: 'Residence Hall is required.' });
    if (!gender || !gender.trim()) return res.status(400).json({ message: 'Gender is required.' });
    if (!mobileNo || !mobileNo.trim() || mobileNo.trim().length !== 10) return res.status(400).json({ message: 'Valid 10-digit mobile number is required.' });
    if (!password || password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
    if (!university || !university.trim()) return res.status(400).json({ message: 'Course / Degree Name is required.' });
    if (!department || !department.trim()) return res.status(400).json({ message: 'Department Name is required.' });
    const resolvedFaculty = faculty || facultyName;
    if (!resolvedFaculty || !resolvedFaculty.trim()) return res.status(400).json({ message: 'Faculty Name is required.' });
    if (!session || !session.trim()) return res.status(400).json({ message: 'Academic Session is required.' });
    if (!domicileState || !domicileState.trim()) return res.status(400).json({ message: 'Domicile State is required.' });
    if (!category || !category.trim()) return res.status(400).json({ message: 'Category is required.' });
    if (!profilePhoto || !profilePhoto.trim()) return res.status(400).json({ message: 'Member Photograph is required.' });

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
      fatherName: fatherName.trim(),
      motherName: motherName.trim(),
      dob: dob.trim(),
      nationality: nationality.trim(),
      email: email.trim().toLowerCase(), 
      studentId: studentId.trim(),
      rollNo: rollNo.trim(),
      hostelId: hostel._id,
      hostelNo: hostel.hostelNumber,
      hostelType: hostel.type,
      gender: gender.trim(),
      mobileNo: mobileNo.trim(),
      password,
      role: 'student',
      university: university.trim(),
      department: department.trim(),
      faculty: resolvedFaculty.trim(),
      facultyName: resolvedFaculty.trim(),
      session: session.trim(),
      domicileState: domicileState.trim(),
      category: domicileState.trim() === 'Punjab' ? category.trim() : 'General',
      profilePhoto: profilePhoto.trim()
    });

    await newUser.save();
    console.log("Registered New Student with Photo:", newUser.studentId);

    // Issue JWT token upon registration
    const token = jwt.sign({ id: newUser._id, role: newUser.role }, JWT_SECRET, { expiresIn: '1d' });

    res.status(201).json({ 
      message: 'Student registered successfully!', 
      token, 
      newUser, 
      user: newUser 
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Database Error: A unique constraint on student records was violated.' });
    }
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 2. ADMIN REGISTRATION
// ==========================================
router.post('/register-admin', async (req, res) => {
  try {
    const { name, password, adminSecret } = req.body;

    if (adminSecret !== ADMIN_SECRET_CODE) return res.status(403).json({ message: 'Invalid Admin Authorization Secret Code!' });
    if (!password || password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters long.' });

    const newAdmin = new Admin({ name: name.trim(), password, role: 'admin' });
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
// 3A. FORGOT PASSWORD - GMAIL OTP
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
      return res.status(400).json({ message: 'No email address is linked to this account. Please contact the administrator.' });
    }

    const mailOptions = {
      from: `"GNDU Dining & Attendance" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Password Reset Verification Code - GNDU Portal',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 6px;">
          <h2 style="color: #1e3a8a; text-align: center;">GNDU Mess Portal</h2>
          <p style="color: #334155; font-size: 15px;">Hello <strong>${user.name}</strong>,</p>
          <p style="color: #334155; font-size: 14px;">Use the verification code below to reset your password:</p>
          <div style="text-align: center; margin: 25px 0;">
            <span style="font-size: 30px; font-weight: bold; background-color: #f1f5f9; padding: 12px 24px; border-radius: 6px; letter-spacing: 6px; color: #0f172a;">${otp}</span>
          </div>
          <p style="color: #64748b; font-size: 12px; text-align: center;">This OTP is valid for 10 minutes. If you did not request this, please ignore this email.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    const maskedEmail = user.email.replace(/(.{2})(.*)(?=@)/, (gp1, gp2, gp3) => { 
      let mask = ''; for (let i = 0; i < gp3.length; i++) mask += "*"; return gp1 + mask; 
    });

    res.json({ message: `An OTP has been successfully sent to ${maskedEmail}` });
  } catch (error) {
    res.status(500).json({ error: 'Server error. Failed to send email.' });
  }
});

// ==========================================
// 3B. RESET PASSWORD - VERIFY OTP & SAVE
// ==========================================
router.post('/reset-password', async (req, res) => {
  try {
    const { studentId, otp, newPassword } = req.body;
    if (!studentId || !otp || !newPassword) return res.status(400).json({ message: 'Student ID, OTP, and new password are required.' });
    if (newPassword.length < 8) return res.status(400).json({ message: 'New password must be at least 8 characters long.' });

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
// 6. REMOVE STUDENT BY IDENTIFIER
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
// 7. ADMIN: DIRECT PASSWORD RESET
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
// 8. UPDATE STUDENT PROFILE & FULL DOSSIER
// ==========================================
router.put(['/profile/:id', '/users/:identifier'], async (req, res) => {
  try {
    const identifier = (req.params.identifier || req.params.id).trim();
    const { 
      name, gender, mobileNo, dob, profilePhoto, 
      studentId, rollNo, newRollNo, hostelNo,
      university, department, faculty, facultyName, session, category, email,
      fatherName, motherName, domicileState, nationality
    } = req.body;

    let query = { studentId: identifier };
    if (mongoose.Types.ObjectId.isValid(identifier)) query = { _id: identifier };

    const currentUser = await User.findOne(query);
    if (!currentUser) return res.status(404).json({ message: 'User not found.' });

    const updateFields = {};

    if (name) updateFields.name = name.trim();
    if (gender) updateFields.gender = gender;
    if (mobileNo !== undefined) updateFields.mobileNo = mobileNo.replace(/\D/g, '');
    if (dob !== undefined) updateFields.dob = dob;
    if (profilePhoto !== undefined) updateFields.profilePhoto = profilePhoto;

    // Academic & Family Details
    if (university !== undefined) updateFields.university = university.trim();
    if (department !== undefined) updateFields.department = department.trim();
    const resolvedFac = faculty || facultyName;
    if (resolvedFac !== undefined) {
      updateFields.faculty = resolvedFac.trim();
      updateFields.facultyName = resolvedFac.trim();
    }
    if (session !== undefined) updateFields.session = session.trim();
    if (category !== undefined) updateFields.category = category;
    if (email !== undefined) updateFields.email = email.trim().toLowerCase();
    if (fatherName !== undefined) updateFields.fatherName = fatherName.trim();
    if (motherName !== undefined) updateFields.motherName = motherName.trim();
    if (domicileState !== undefined) updateFields.domicileState = domicileState.trim();
    if (nationality !== undefined) updateFields.nationality = nationality.trim();

    // Roll number verification
    const targetRoll = newRollNo || rollNo;
    let targetHostelNum = currentUser.hostelNo;

    if (hostelNo) {
      const hostel = await Hostel.findOne({ hostelNumber: hostelNo.toUpperCase() });
      if (hostel) {
        updateFields.hostelId = hostel._id;
        updateFields.hostelNo = hostel.hostelNumber;
        updateFields.hostelType = hostel.type;
        targetHostelNum = hostel.hostelNumber;
      }
    }

    if (targetRoll && (targetRoll.trim() !== currentUser.rollNo || (hostelNo && targetHostelNum !== currentUser.hostelNo))) {
      const rollConflict = await User.findOne({ 
        rollNo: targetRoll.trim(), 
        hostelNo: targetHostelNum, 
        _id: { $ne: currentUser._id } 
      });
      if (rollConflict) {
        return res.status(400).json({ message: `Roll Number ${targetRoll.trim()} is already taken in ${targetHostelNum}.` });
      }
      updateFields.rollNo = targetRoll.trim();
    }

    if (studentId !== undefined && studentId.trim() !== '' && studentId.trim() !== currentUser.studentId) {
      const existingId = await User.findOne({ studentId: studentId.trim() });
      if (existingId) return res.status(400).json({ message: 'This new Student ID already exists.' });
      updateFields.studentId = studentId.trim();
    }

    const updatedUser = await User.findOneAndUpdate(
      query,
      { $set: updateFields },
      { returnDocument: 'after', runValidators: true }
    ).select('-password').populate('hostelId');

    res.json({ message: 'Profile updated successfully!', user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 9. ADMIN DIRECTORY ROUTES
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
    if (profilePhoto !== undefined) updateFields.profilePhoto = profilePhoto;

    const updatedAdmin = await Admin.findByIdAndUpdate(
      req.params.id, 
      { $set: updateFields }, 
      { returnDocument: 'after', runValidators: true }
    ).select('-password');

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
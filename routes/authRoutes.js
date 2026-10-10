const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');

const User = require('../models/User');
const Admin = require('../models/Admin');
const Hostel = require('../models/Hostel');

const router = express.Router();

const JWT_SECRET =
  process.env.JWT_SECRET || 'YOUR_SECRET_KEY';

const ADMIN_SECRET_CODE =
  process.env.ADMIN_SECRET_CODE ||
  'GNDU_ADMIN_2026';


// =========================================================
// NODEMAILER
// =========================================================

const transporter = nodemailer.createTransport({
  service: 'gmail',

  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});


// =========================================================
// 1. STUDENT REGISTRATION
// =========================================================

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
      university,
      department,
      faculty,
      facultyName,
      session,
      domicileState,
      category,
      profilePhoto
    } = req.body;


    // -----------------------------------------------------
    // REQUIRED FIELDS
    // -----------------------------------------------------

    if (!name || !name.trim()) {
      return res.status(400).json({
        message: 'Candidate Name is required.'
      });
    }

    if (!fatherName || !fatherName.trim()) {
      return res.status(400).json({
        message: "Father's Name is required."
      });
    }

    if (!motherName || !motherName.trim()) {
      return res.status(400).json({
        message: "Mother's Name is required."
      });
    }

    if (!dob || !dob.trim()) {
      return res.status(400).json({
        message: 'Date of Birth is required.'
      });
    }

    if (!nationality || !nationality.trim()) {
      return res.status(400).json({
        message: 'Nationality is required.'
      });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({
        message: 'Email Address is required.'
      });
    }

    if (!studentId || !studentId.trim()) {
      return res.status(400).json({
        message: 'Student ID is required.'
      });
    }

    if (studentId.trim().length > 13) {
      return res.status(400).json({
        message:
          'Student ID cannot exceed 13 digits.'
      });
    }

    if (!rollNo || !rollNo.trim()) {
      return res.status(400).json({
        message: 'Roll Number is required.'
      });
    }

    if (!hostelNo || !hostelNo.trim()) {
      return res.status(400).json({
        message: 'Residence Hall is required.'
      });
    }

    if (!gender || !gender.trim()) {
      return res.status(400).json({
        message: 'Gender is required.'
      });
    }

    if (
      !mobileNo ||
      !mobileNo.trim() ||
      mobileNo.trim().length !== 10
    ) {
      return res.status(400).json({
        message:
          'Valid 10-digit mobile number is required.'
      });
    }

    if (!password || password.length < 8) {
      return res.status(400).json({
        message:
          'Password must be at least 8 characters long.'
      });
    }

    if (!university || !university.trim()) {
      return res.status(400).json({
        message:
          'Course / Degree Name is required.'
      });
    }

    if (!department || !department.trim()) {
      return res.status(400).json({
        message:
          'Department Name is required.'
      });
    }

    const resolvedFaculty =
      faculty || facultyName || 'General';

    if (!session || !session.trim()) {
      return res.status(400).json({
        message:
          'Academic Session is required.'
      });
    }

    if (
      !domicileState ||
      !domicileState.trim()
    ) {
      return res.status(400).json({
        message:
          'Domicile State is required.'
      });
    }

    if (!category || !category.trim()) {
      return res.status(400).json({
        message:
          'Category is required.'
      });
    }

    if (
      !profilePhoto ||
      !profilePhoto.trim()
    ) {
      return res.status(400).json({
        message:
          'Member Photograph is required.'
      });
    }


    // -----------------------------------------------------
    // FIND HOSTEL
    // -----------------------------------------------------

    const hostel =
      await Hostel.findOne({
        hostelNumber:
          hostelNo.toUpperCase()
      });


    if (!hostel) {
      return res.status(404).json({
        message:
          'Hostel not found. Please contact admin.'
      });
    }


    // -----------------------------------------------------
    // CHECK STUDENT ID
    // -----------------------------------------------------

    const existingStudentId =
      await User.findOne({
        studentId:
          studentId.trim()
      });


    if (existingStudentId) {
      return res.status(400).json({
        message:
          'This Student ID is already registered in the system.'
      });
    }


    // -----------------------------------------------------
    // CHECK ROLL NUMBER INSIDE HOSTEL
    // -----------------------------------------------------

    const existingRollInHostel =
      await User.findOne({
        rollNo:
          rollNo.trim(),

        hostelNo:
          hostel.hostelNumber
      });


    if (existingRollInHostel) {
      return res.status(400).json({
        message:
          `Roll Number ${rollNo.trim()} is already taken in ${hostel.hostelNumber}.`
      });
    }


    // -----------------------------------------------------
    // CREATE STUDENT
    // -----------------------------------------------------

    const newUser =
      new User({

        name:
          name.trim(),

        fatherName:
          fatherName.trim(),

        motherName:
          motherName.trim(),

        dob:
          dob.trim(),

        nationality:
          nationality.trim(),

        email:
          email.trim().toLowerCase(),

        studentId:
          studentId.trim(),

        rollNo:
          rollNo.trim(),

        hostelId:
          hostel._id,

        hostelNo:
          hostel.hostelNumber,

        hostelType:
          hostel.type,

        gender:
          gender.trim(),

        mobileNo:
          mobileNo.trim(),

        password:
          password,

        role:
          'student',

        university:
          university.trim(),

        department:
          department.trim(),

        faculty:
          resolvedFaculty.trim(),

        facultyName:
          resolvedFaculty.trim(),

        session:
          session.trim(),

        domicileState:
          domicileState.trim(),

        category:
          category.trim(),

        profilePhoto:
          profilePhoto.trim(),

        isMobileLocked:
          false,

        isEmailLocked:
          false
      });


    // User.js handles password hashing
    await newUser.save();


    console.log(
      '✅ [REGISTER SUCCESS] New Student:',
      newUser.studentId
    );


    // -----------------------------------------------------
    // CREATE JWT
    // -----------------------------------------------------

    const token =
      jwt.sign(
        {
          id:
            newUser._id,

          role:
            newUser.role
        },

        JWT_SECRET,

        {
          expiresIn:
            '1d'
        }
      );


    const safeUser =
      newUser.toObject();

    delete safeUser.password;


    res.status(201).json({

      message:
        'Student registered successfully!',

      token,

      user:
        safeUser

    });

  } catch (error) {

    console.error(
      '❌ [REGISTER ERROR]:',
      error
    );


    if (error.code === 11000) {

      return res.status(400).json({
        message:
          'Database Error: A unique constraint on student records was violated.'
      });

    }


    res.status(500).json({
      error:
        error.message
    });
  }
});


// =========================================================
// 2. ADMIN REGISTRATION
// =========================================================

router.post(
  '/register-admin',
  async (req, res) => {

    try {

      const {
        name,
        password,
        adminSecret
      } = req.body;


      if (!name || !name.trim()) {

        return res.status(400).json({
          message:
            'Admin Name is required.'
        });

      }


      if (
        adminSecret !==
        ADMIN_SECRET_CODE
      ) {

        return res.status(403).json({
          message:
            'Invalid Admin Authorization Secret Code!'
        });

      }


      if (
        !password ||
        password.length < 8
      ) {

        return res.status(400).json({
          message:
            'Password must be at least 8 characters long.'
        });

      }


      const newAdmin =
        new Admin({

          name:
            name.trim(),

          password:
            password,

          role:
            'admin'
        });


      await newAdmin.save();


      console.log(
        '✅ [ADMIN REGISTER SUCCESS]:',
        newAdmin.name
      );


      res.status(201).json({

        message:
          'Admin account registered successfully!'

      });

    } catch (error) {

      console.error(
        '❌ [ADMIN REGISTER ERROR]:',
        error
      );


      if (error.code === 11000) {

        return res.status(400).json({
          message:
            'An admin with this name already exists.'
        });

      }


      res.status(500).json({
        error:
          error.message
      });
    }
  }
);


// =========================================================
// 3. LOGIN
// =========================================================

router.post(
  '/login',
  async (req, res) => {

    try {

      const {
        studentId,
        name,
        password,
        role
      } = req.body;


      console.log(
        `\n🔍 [LOGIN ATTEMPT] Role: ${role || 'student'}, Identifier: ${studentId || name}`
      );


      if (!password) {

        return res.status(400).json({
          message:
            'Password is required.'
        });

      }


      let account;


      // ---------------------------------------------------
      // ADMIN LOGIN
      // ---------------------------------------------------

      if (role === 'admin') {

        if (!name) {

          return res.status(400).json({
            message:
              'Admin Name is required for login.'
          });

        }


        account =
          await Admin.findOne({

            name: {
              $regex:
                new RegExp(
                  `^${name.trim()}$`,
                  'i'
                )
            }

          });

      }


      // ---------------------------------------------------
      // STUDENT LOGIN
      // ---------------------------------------------------

      else {

        if (
          !studentId ||
          !studentId.trim()
        ) {

          return res.status(400).json({
            message:
              'Student ID is required for login.'
          });

        }


        account =
          await User.findOne({

            studentId: {
              $regex:
                new RegExp(
                  `^${studentId.trim()}$`,
                  'i'
                )
            }

          })
          .populate('hostelId');

      }


      // ---------------------------------------------------
      // ACCOUNT NOT FOUND
      // ---------------------------------------------------

      if (!account) {

        console.warn(
          `⚠️ [LOGIN FAILED] Account NOT found: ${studentId || name}`
        );


        return res.status(401).json({

          message:
            'Account not found. Please check your credentials or register.'

        });

      }


      // ---------------------------------------------------
      // PASSWORD CHECK
      // ---------------------------------------------------

      const isMatch =
        await bcrypt.compare(
          password,
          account.password
        );


      if (!isMatch) {

        console.warn(
          `⚠️ [LOGIN FAILED] Password mismatch: ${account._id}`
        );


        return res.status(401).json({
          message:
            'Invalid password.'
        });

      }


      // ---------------------------------------------------
      // CREATE JWT
      // ---------------------------------------------------

      const token =
        jwt.sign(

          {
            id:
              account._id,

            role:
              account.role
          },

          JWT_SECRET,

          {
            expiresIn:
              '1d'
          }
        );


      const safeUser =
        account.toObject();

      delete safeUser.password;


      console.log(
        `🚀 [LOGIN SUCCESS] ${account._id} (${account.name || account.studentId})`
      );


      res.json({

        token,

        user:
          safeUser

      });

    } catch (error) {

      console.error(
        '💥 [LOGIN ERROR]:',
        error
      );


      res.status(500).json({
        error:
          error.message
      });

    }
  }
);


// =========================================================
// 4. FORGOT PASSWORD
// =========================================================

router.post(
  '/forgot-password',
  async (req, res) => {

    try {

      const {
        studentId
      } = req.body;


      if (!studentId) {

        return res.status(400).json({
          message:
            'Student ID is required.'
        });

      }


      const user =
        await User.findOne({

          studentId: {
            $regex:
              new RegExp(
                `^${studentId.trim()}$`,
                'i'
              )
          }

        });


      if (!user) {

        return res.status(404).json({
          message:
            'No account found with this Student ID.'
        });

      }


      const otp =
        Math.floor(
          100000 +
          Math.random() * 900000
        ).toString();


      user.resetPasswordOtp =
        otp;

      user.resetPasswordExpires =
        Date.now() +
        10 * 60 * 1000;


      await user.save();


      console.log(
        `🔐 [OTP GENERATED] ${user.studentId}: ${otp}`
      );


      if (
        !user.email ||
        user.email.trim() === ''
      ) {

        return res.status(400).json({
          message:
            'No email address is linked to this account. Please contact the administrator.'
        });

      }


      const mailOptions = {

        from:
          `"Student Mess Cooperative" <${process.env.EMAIL_USER}>`,

        to:
          user.email,

        subject:
          'Password Reset Verification Code - Mess Portal',

        html: `
          <div style="
            font-family: Arial, sans-serif;
            max-width: 500px;
            margin: 0 auto;
            padding: 20px;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
          ">

            <h2 style="
              color: #1e3a8a;
              text-align: center;
            ">
              Student Mess Cooperative Ledger
            </h2>

            <p style="
              color: #334155;
              font-size: 15px;
            ">
              Hello <strong>${user.name}</strong>,
            </p>

            <p style="
              color: #334155;
              font-size: 14px;
            ">
              Use the verification code below to reset your password:
            </p>

            <div style="
              text-align: center;
              margin: 25px 0;
            ">

              <span style="
                font-size: 30px;
                font-weight: bold;
                background-color: #f1f5f9;
                padding: 12px 24px;
                border-radius: 6px;
                letter-spacing: 6px;
                color: #0f172a;
              ">
                ${otp}
              </span>

            </div>

            <p style="
              color: #64748b;
              font-size: 12px;
              text-align: center;
            ">
              This OTP is valid for 10 minutes.
            </p>

          </div>
        `
      };


      await transporter.sendMail(
        mailOptions
      );


      const maskedEmail =
        user.email.replace(
          /(.{2})(.*)(?=@)/,
          (gp1, gp2, gp3) => {

            let mask = '';

            for (
              let i = 0;
              i < gp3.length;
              i++
            ) {

              mask += '*';

            }

            return gp1 + mask;
          }
        );


      res.json({

        message:
          `An OTP has been successfully sent to ${maskedEmail}`

      });

    } catch (error) {

      console.error(
        '❌ [FORGOT PASSWORD ERROR]:',
        error
      );


      res.status(500).json({

        error:
          'Server error. Failed to send email.'

      });

    }
  }
);


// =========================================================
// 5. RESET PASSWORD
// =========================================================

router.post(
  '/reset-password',
  async (req, res) => {

    try {

      const {
        studentId,
        otp,
        newPassword
      } = req.body;


      if (
        !studentId ||
        !otp ||
        !newPassword
      ) {

        return res.status(400).json({
          message:
            'Student ID, OTP, and new password are required.'
        });

      }


      if (
        newPassword.length < 8
      ) {

        return res.status(400).json({
          message:
            'New password must be at least 8 characters long.'
        });

      }


      const user =
        await User.findOne({

          studentId: {
            $regex:
              new RegExp(
                `^${studentId.trim()}$`,
                'i'
              )
          },

          resetPasswordOtp:
            otp.trim(),

          resetPasswordExpires: {
            $gt:
              Date.now()
          }

        });


      if (!user) {

        return res.status(400).json({
          message:
            'OTP is invalid or has expired. Please request a new one.'
        });

      }


      user.password =
        newPassword;

      user.resetPasswordOtp =
        null;

      user.resetPasswordExpires =
        null;


      await user.save();


      console.log(
        `✅ [PASSWORD RESET SUCCESS] ${user.studentId}`
      );


      res.json({

        message:
          'Password has been reset successfully! You can now log in.'

      });

    } catch (error) {

      console.error(
        '❌ [RESET PASSWORD ERROR]:',
        error
      );


      res.status(500).json({
        error:
          error.message
      });

    }
  }
);


// =========================================================
// 6. GET ALL STUDENTS
// =========================================================

router.get(
  '/users',
  async (req, res) => {

    try {

      const users =
        await User.find({})

          .select('-password')

          .sort({
            createdAt: -1
          });


      res.json(users);

    } catch (error) {

      res.status(500).json({
        error:
          error.message
      });

    }
  }
);


// =========================================================
// 7. ROLE UPDATE
// =========================================================

router.put(
  '/update-role',
  async (req, res) => {

    try {

      const {
        targetStudentId,
        targetRollNo,
        newRole
      } = req.body;


      const identifier =
        targetStudentId ||
        targetRollNo;


      if (!identifier) {

        return res.status(400).json({
          message:
            'Student identifier required.'
        });

      }


      if (
        !['student', 'admin']
          .includes(newRole)
      ) {

        return res.status(400).json({
          message:
            'Invalid role specified.'
        });

      }


      let query = {

        $or: [

          {
            studentId:
              identifier
                .toString()
                .trim()
          }

        ]

      };


      if (
        mongoose.Types.ObjectId.isValid(
          identifier.toString().trim()
        )
      ) {

        query.$or.push({

          _id:
            identifier
              .toString()
              .trim()

        });

      }


      const updatedUser =
        await User.findOneAndUpdate(

          query,

          {
            $set: {
              role:
                newRole
            }
          },

          {
            returnDocument:
              'after'
          }

        )
        .select('-password');


      if (!updatedUser) {

        return res.status(404).json({
          message:
            'User not found.'
        });

      }


      res.json({

        message:
          `Successfully updated role to ${newRole}`,

        user:
          updatedUser

      });

    } catch (error) {

      res.status(500).json({
        error:
          error.message
      });

    }
  }
);


// =========================================================
// 8. REMOVE STUDENT
// =========================================================

router.delete(
  '/users/:identifier',
  async (req, res) => {

    try {

      const identifier =
        req.params.identifier.trim();


      let query = {
        studentId:
          identifier
      };


      if (
        mongoose.Types.ObjectId.isValid(
          identifier
        )
      ) {

        query = {
          _id:
            identifier
        };

      }


      const deletedUser =
        await User.findOneAndDelete(
          query
        );


      if (!deletedUser) {

        return res.status(404).json({
          message:
            'Student not found.'
        });

      }


      res.json({

        message:
          'Student removed successfully.'

      });

    } catch (error) {

      res.status(500).json({
        error:
          error.message
      });

    }
  }
);


// =========================================================
// 9. ADMIN DIRECT STUDENT PASSWORD RESET
// =========================================================

router.put(
  '/users/:identifier/password',
  async (req, res) => {

    try {

      const identifier =
        req.params.identifier.trim();


      const {
        newPassword
      } = req.body;


      if (
        !newPassword ||
        newPassword.length < 8
      ) {

        return res.status(400).json({
          message:
            'New password must be at least 8 characters long.'
        });

      }


      const salt =
        await bcrypt.genSalt(10);


      const hashedPassword =
        await bcrypt.hash(
          newPassword,
          salt
        );


      let query = {

        studentId:
          identifier

      };


      if (
        mongoose.Types.ObjectId.isValid(
          identifier
        )
      ) {

        query = {

          _id:
            identifier

        };

      }


      const updatedUser =
        await User.findOneAndUpdate(

          query,

          {
            $set: {
              password:
                hashedPassword
            }
          },

          {
            returnDocument:
              'after'
          }

        )
        .select('-password');


      if (!updatedUser) {

        return res.status(404).json({
          message:
            'Student not found.'
        });

      }


      res.json({

        message:
          'Password has been successfully updated!'

      });

    } catch (error) {

      res.status(500).json({
        error:
          error.message
      });

    }
  }
);


// =========================================================
// 10. UPDATE STUDENT PROFILE
// =========================================================

router.put(
  ['/profile/:id', '/users/:identifier'],
  async (req, res) => {

    try {

      const identifier =
        (
          req.params.identifier ||
          req.params.id
        ).trim();


      const {

        // -------------------------------------------------
        // BASIC INFORMATION
        // -------------------------------------------------

        name,
        gender,
        mobileNo,
        dob,
        profilePhoto,

        // -------------------------------------------------
        // IDENTITY / HOSTEL
        // -------------------------------------------------

        studentId,
        rollNo,
        newRollNo,
        hostelNo,

        // -------------------------------------------------
        // ACADEMIC INFORMATION
        // -------------------------------------------------

        university,
        department,
        faculty,
        facultyName,
        session,

        currentYear,
        currentSemester,

        // -------------------------------------------------
        // PREVIOUS QUALIFICATION
        // -------------------------------------------------

        previousQualification,
        previousQualificationYear,
        previousPercentage,
        previousCgpa,

        // -------------------------------------------------
        // CURRENT ACADEMIC PERFORMANCE
        // -------------------------------------------------

        percentage,
        cgpa,

        // -------------------------------------------------
        // PERSONAL INFORMATION
        // -------------------------------------------------

        category,
        email,
        domicileState,
        nationality,

        // -------------------------------------------------
        // FAMILY INFORMATION
        // -------------------------------------------------

        fatherName,
        motherName,
        parentOccupation,

        // -------------------------------------------------
        // FINANCIAL INFORMATION
        // -------------------------------------------------

        annualFamilyIncome,
        incomeCertificateNumber,
        incomeCertificateDate,

        // -------------------------------------------------
        // SECURITY
        // -------------------------------------------------

        isMobileLocked,
        isEmailLocked

      } = req.body;


      // ===================================================
      // FIND STUDENT
      // ===================================================

      let query = {
        studentId: identifier
      };


      if (
        mongoose.Types.ObjectId.isValid(
          identifier
        )
      ) {

        query = {
          _id: identifier
        };

      }


      const currentUser =
        await User.findOne(query);


      if (!currentUser) {

        return res.status(404).json({
          message:
            'User not found.'
        });

      }


      const updateFields = {};


      // ===================================================
      // BASIC INFORMATION
      // ===================================================

      if (
        name !== undefined &&
        typeof name === 'string' &&
        name.trim() !== ''
      ) {

        updateFields.name =
          name.trim();

      }


      if (gender !== undefined) {

        updateFields.gender =
          gender;

      }


      if (dob !== undefined) {

        updateFields.dob =
          dob;

      }


      if (profilePhoto !== undefined) {

        updateFields.profilePhoto =
          profilePhoto;

      }


      // ===================================================
      // MOBILE NUMBER
      // ===================================================

      if (
        mobileNo !== undefined &&
        mobileNo !== ''
      ) {

        const cleanedMobile =
          mobileNo.replace(
            /\D/g,
            ''
          );


        if (
          cleanedMobile.length !== 10
        ) {

          return res.status(400).json({
            message:
              'Mobile number must contain exactly 10 digits.'
          });

        }


        // -----------------------------------------------
        // LOCKED MOBILE CANNOT BE CHANGED
        // -----------------------------------------------

        if (
          currentUser.isMobileLocked &&
          cleanedMobile !==
            currentUser.mobileNo
        ) {

          return res.status(403).json({
            message:
              'Security Policy: Mobile number is permanently locked and cannot be edited.'
          });

        }


        // -----------------------------------------------
        // FIRST CHANGE LOCKS MOBILE
        // -----------------------------------------------

        if (
          cleanedMobile !==
          currentUser.mobileNo
        ) {

          updateFields.mobileNo =
            cleanedMobile;

          updateFields.isMobileLocked =
            true;

        }
        else if (
          isMobileLocked !== undefined
        ) {

          updateFields.isMobileLocked =
            isMobileLocked;

        }

      }
      else if (
        isMobileLocked !== undefined
      ) {

        updateFields.isMobileLocked =
          isMobileLocked;

      }


      // ===================================================
      // EMAIL
      // ===================================================

      if (
        email !== undefined &&
        typeof email === 'string' &&
        email.trim() !== ''
      ) {

        const cleanedEmail =
          email
            .trim()
            .toLowerCase();


        // -----------------------------------------------
        // BASIC EMAIL FORMAT CHECK
        // -----------------------------------------------

        const emailPattern =
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


        if (
          !emailPattern.test(
            cleanedEmail
          )
        ) {

          return res.status(400).json({
            message:
              'Please enter a valid email address.'
          });

        }


        // -----------------------------------------------
        // LOCKED EMAIL CANNOT BE CHANGED
        // -----------------------------------------------

        if (
          currentUser.isEmailLocked &&
          cleanedEmail !==
            currentUser.email
        ) {

          return res.status(403).json({
            message:
              'Security Policy: Email address is permanently locked and cannot be edited.'
          });

        }


        // -----------------------------------------------
        // FIRST CHANGE LOCKS EMAIL
        // -----------------------------------------------

        if (
          cleanedEmail !==
          currentUser.email
        ) {

          updateFields.email =
            cleanedEmail;

          updateFields.isEmailLocked =
            true;

        }
        else if (
          isEmailLocked !== undefined
        ) {

          updateFields.isEmailLocked =
            isEmailLocked;

        }

      }
      else if (
        isEmailLocked !== undefined
      ) {

        updateFields.isEmailLocked =
          isEmailLocked;

      }


      // ===================================================
      // ACADEMIC INFORMATION
      // ===================================================

      if (
        university !== undefined &&
        typeof university === 'string'
      ) {

        updateFields.university =
          university.trim();

      }


      if (
        department !== undefined &&
        typeof department === 'string'
      ) {

        updateFields.department =
          department.trim();

      }


      const resolvedFaculty =
        faculty !== undefined
          ? faculty
          : facultyName;


      if (
        resolvedFaculty !== undefined &&
        typeof resolvedFaculty === 'string'
      ) {

        updateFields.faculty =
          resolvedFaculty.trim();

        updateFields.facultyName =
          resolvedFaculty.trim();

      }


      if (
        session !== undefined &&
        typeof session === 'string'
      ) {

        updateFields.session =
          session.trim();

      }


      // ===================================================
      // CURRENT YEAR
      // ===================================================

      if (
        currentYear !== undefined &&
        currentYear !== ''
      ) {

        const year =
          Number(currentYear);


        if (
          !Number.isInteger(year) ||
          year < 1
        ) {

          return res.status(400).json({
            message:
              'Current academic year is invalid.'
          });

        }


        updateFields.currentYear =
          year;

      }


      // ===================================================
      // CURRENT SEMESTER
      // ===================================================

      if (
        currentSemester !== undefined &&
        currentSemester !== ''
      ) {

        const semester =
          Number(currentSemester);


        if (
          !Number.isInteger(semester) ||
          semester < 1
        ) {

          return res.status(400).json({
            message:
              'Current semester is invalid.'
          });

        }


        updateFields.currentSemester =
          semester;

      }


      // ===================================================
      // PREVIOUS QUALIFICATION
      // ===================================================

      if (
        previousQualification !== undefined &&
        typeof previousQualification === 'string'
      ) {

        updateFields.previousQualification =
          previousQualification.trim();

      }


      // ===================================================
      // PREVIOUS QUALIFICATION YEAR
      // ===================================================

      if (
        previousQualificationYear !== undefined &&
        previousQualificationYear !== ''
      ) {

        const qualificationYear =
          Number(
            previousQualificationYear
          );


        if (
          !Number.isInteger(
            qualificationYear
          )
        ) {

          return res.status(400).json({
            message:
              'Previous qualification year is invalid.'
          });

        }


        updateFields.previousQualificationYear =
          qualificationYear;

      }


      // ===================================================
      // PREVIOUS PERCENTAGE
      // ===================================================

      if (
        previousPercentage !== undefined &&
        previousPercentage !== ''
      ) {

        const value =
          Number(
            previousPercentage
          );


        if (
          Number.isNaN(value) ||
          value < 0 ||
          value > 100
        ) {

          return res.status(400).json({
            message:
              'Previous percentage must be between 0 and 100.'
          });

        }


        updateFields.previousPercentage =
          value;

      }


      // ===================================================
      // PREVIOUS CGPA
      // ===================================================

      if (
        previousCgpa !== undefined &&
        previousCgpa !== ''
      ) {

        const value =
          Number(
            previousCgpa
          );


        if (
          Number.isNaN(value) ||
          value < 0 ||
          value > 10
        ) {

          return res.status(400).json({
            message:
              'Previous CGPA must be between 0 and 10.'
          });

        }


        updateFields.previousCgpa =
          value;

      }


      // ===================================================
      // CURRENT PERCENTAGE
      // ===================================================

      if (
        percentage !== undefined &&
        percentage !== ''
      ) {

        const value =
          Number(
            percentage
          );


        if (
          Number.isNaN(value) ||
          value < 0 ||
          value > 100
        ) {

          return res.status(400).json({
            message:
              'Percentage must be between 0 and 100.'
          });

        }


        updateFields.percentage =
          value;

      }


      // ===================================================
      // CURRENT CGPA
      // ===================================================

      if (
        cgpa !== undefined &&
        cgpa !== ''
      ) {

        const value =
          Number(cgpa);


        if (
          Number.isNaN(value) ||
          value < 0 ||
          value > 10
        ) {

          return res.status(400).json({
            message:
              'CGPA must be between 0 and 10.'
          });

        }


        updateFields.cgpa =
          value;

      }


      // ===================================================
      // CATEGORY
      // ===================================================

      if (
        category !== undefined &&
        typeof category === 'string'
      ) {

        updateFields.category =
          category.trim();

      }


      // ===================================================
      // FAMILY INFORMATION
      // ===================================================

      if (
        fatherName !== undefined &&
        typeof fatherName === 'string'
      ) {

        updateFields.fatherName =
          fatherName.trim();

      }


      if (
        motherName !== undefined &&
        typeof motherName === 'string'
      ) {

        updateFields.motherName =
          motherName.trim();

      }


      if (
        parentOccupation !== undefined &&
        typeof parentOccupation === 'string'
      ) {

        updateFields.parentOccupation =
          parentOccupation.trim();

      }


      // ===================================================
      // ANNUAL FAMILY INCOME
      // ===================================================

      if (
        annualFamilyIncome !== undefined &&
        annualFamilyIncome !== ''
      ) {

        const income =
          Number(
            annualFamilyIncome
          );


        if (
          Number.isNaN(income) ||
          income < 0
        ) {

          return res.status(400).json({
            message:
              'Annual family income is invalid.'
          });

        }


        updateFields.annualFamilyIncome =
          income;

      }


      // ===================================================
      // INCOME CERTIFICATE NUMBER
      // ===================================================

      if (
        incomeCertificateNumber !== undefined &&
        typeof incomeCertificateNumber === 'string'
      ) {

        updateFields.incomeCertificateNumber =
          incomeCertificateNumber.trim();

      }


      // ===================================================
      // INCOME CERTIFICATE DATE
      // ===================================================

      if (
        incomeCertificateDate !== undefined
      ) {

        updateFields.incomeCertificateDate =
          incomeCertificateDate;

      }


      // ===================================================
      // DOMICILE
      // ===================================================

      if (
        domicileState !== undefined &&
        typeof domicileState === 'string'
      ) {

        updateFields.domicileState =
          domicileState.trim();

      }


      // ===================================================
      // NATIONALITY
      // ===================================================

      if (
        nationality !== undefined &&
        typeof nationality === 'string'
      ) {

        updateFields.nationality =
          nationality.trim();

      }


      // ===================================================
      // HOSTEL
      // ===================================================

      const targetRoll =
        newRollNo !== undefined &&
        newRollNo !== ''
          ? newRollNo
          : rollNo;


      let targetHostelNum =
        currentUser.hostelNo;


      if (
        hostelNo !== undefined &&
        hostelNo !== ''
      ) {

        const hostel =
          await Hostel.findOne({

            hostelNumber:
              hostelNo
                .trim()
                .toUpperCase()

          });


        if (!hostel) {

          return res.status(404).json({
            message:
              'Selected hostel was not found.'
          });

        }


        updateFields.hostelId =
          hostel._id;

        updateFields.hostelNo =
          hostel.hostelNumber;

        updateFields.hostelType =
          hostel.type;

        targetHostelNum =
          hostel.hostelNumber;

      }


      // ===================================================
      // ROLL NUMBER CONFLICT
      // ===================================================

      if (
        targetRoll !== undefined &&
        targetRoll !== ''
      ) {

        const cleanedRoll =
          targetRoll
            .toString()
            .trim();


        const rollChanged =
          cleanedRoll !==
          currentUser.rollNo;


        const hostelChanged =
          targetHostelNum !==
          currentUser.hostelNo;


        if (
          rollChanged ||
          hostelChanged
        ) {

          const rollConflict =
            await User.findOne({

              rollNo:
                cleanedRoll,

              hostelNo:
                targetHostelNum,

              _id: {
                $ne:
                  currentUser._id
              }

            });


          if (rollConflict) {

            return res.status(400).json({
              message:
                `Roll Number ${cleanedRoll} is already taken in ${targetHostelNum}.`
            });

          }


          updateFields.rollNo =
            cleanedRoll;

        }

      }


      // ===================================================
      // STUDENT ID
      // ===================================================

      if (
        studentId !== undefined &&
        typeof studentId === 'string' &&
        studentId.trim() !== '' &&
        studentId.trim() !==
          currentUser.studentId
      ) {

        const cleanedStudentId =
          studentId.trim();


        if (
          cleanedStudentId.length > 13
        ) {

          return res.status(400).json({
            message:
              'Student ID cannot exceed 13 digits.'
          });

        }


        const existingId =
          await User.findOne({

            studentId:
              cleanedStudentId,

            _id: {
              $ne:
                currentUser._id
            }

          });


        if (existingId) {

          return res.status(400).json({
            message:
              'This new Student ID already exists.'
          });

        }


        updateFields.studentId =
          cleanedStudentId;

      }


      // ===================================================
      // NOTHING TO UPDATE
      // ===================================================

      if (
        Object.keys(updateFields).length === 0
      ) {

        const unchangedUser =
          await User.findOne(query)
            .select('-password')
            .populate('hostelId');


        return res.json({

          message:
            'No changes were made to the student profile.',

          user:
            unchangedUser

        });

      }


      // ===================================================
      // SAVE UPDATED STUDENT
      // ===================================================

      const updatedUser =
        await User.findOneAndUpdate(

          query,

          {
            $set:
              updateFields
          },

          {
            returnDocument:
              'after',

            runValidators:
              true
          }

        )
        .select('-password')
        .populate('hostelId');


      if (!updatedUser) {

        return res.status(404).json({
          message:
            'Student could not be updated.'
        });

      }


      // ===================================================
      // RESPONSE
      // ===================================================

      console.log(
        '✅ [PROFILE UPDATE SUCCESS]:',
        updatedUser.studentId
      );


      return res.json({

        message:
          'Student profile updated successfully.',

        user:
          updatedUser

      });

    } catch (error) {

      console.error(
        '❌ [PROFILE UPDATE ERROR]:',
        error
      );


      // -----------------------------------------------
      // DUPLICATE KEY
      // -----------------------------------------------

      if (
        error.code === 11000
      ) {

        return res.status(400).json({

          message:
            'A student record with this Student ID already exists.'

        });

      }


      // -----------------------------------------------
      // VALIDATION ERROR
      // -----------------------------------------------

      if (
        error.name === 'ValidationError'
      ) {

        return res.status(400).json({

          message:
            'Student profile validation failed.',

          error:
            error.message

        });

      }


      return res.status(500).json({

        message:
          'Failed to update student profile.',

        error:
          error.message

      });

    }

  }
);


// =========================================================
// 11. GET ALL ADMINS
// =========================================================

router.get(
  '/admins',
  async (req, res) => {

    try {

      const admins =
        await Admin.find({})

          .select('-password')

          .sort({
            createdAt:
              -1
          });


      res.json(admins);

    } catch (error) {

      res.status(500).json({

        error:
          error.message

      });

    }
  }
);


// =========================================================
// 12. UPDATE ADMIN PROFILE
// =========================================================

router.put(
  '/admin-profile/:id',
  async (req, res) => {

    try {

      const {
        name,
        email,
        mobileNo,
        gender,
        dob,
        profilePhoto,

        teacherId,
        designation,

        department,
        faculty,
        facultyName,

        wardenHostel,

        fatherName,
        motherName,

        isMobileLocked,
        isEmailLocked
      } = req.body;


      const admin =
        await Admin.findById(
          req.params.id
        );


      if (!admin) {

        return res.status(404).json({
          message:
            'Admin not found.'
        });

      }


      const updateFields = {};


      // ---------------------------------------------------
      // BASIC DETAILS
      // ---------------------------------------------------

      if (
        name !== undefined &&
        name.trim() !== ''
      ) {

        updateFields.name =
          name.trim();

      }


      if (gender !== undefined) {

        updateFields.gender =
          gender;

      }


      if (dob !== undefined) {

        updateFields.dob =
          dob;

      }


      if (profilePhoto !== undefined) {

        updateFields.profilePhoto =
          profilePhoto;

      }


      // ---------------------------------------------------
      // MOBILE
      // ---------------------------------------------------

      if (
        mobileNo !== undefined &&
        mobileNo !== ''
      ) {

        const cleanedMobile =
          mobileNo.replace(
            /\D/g,
            ''
          );


        if (
          admin.isMobileLocked &&
          cleanedMobile !==
            admin.mobileNo
        ) {

          return res.status(403).json({
            message:
              'Security Policy: Mobile number is permanently locked and cannot be edited.'
          });

        }


        if (
          cleanedMobile !==
          admin.mobileNo
        ) {

          updateFields.mobileNo =
            cleanedMobile;

          updateFields.isMobileLocked =
            true;

        } else if (
          isMobileLocked !== undefined
        ) {

          updateFields.isMobileLocked =
            isMobileLocked;

        }

      }


      // ---------------------------------------------------
      // EMAIL
      // ---------------------------------------------------

      if (
        email !== undefined &&
        email.trim() !== ''
      ) {

        const cleanedEmail =
          email
            .trim()
            .toLowerCase();


        if (
          admin.isEmailLocked &&
          cleanedEmail !==
            admin.email
        ) {

          return res.status(403).json({
            message:
              'Security Policy: Email address is permanently locked and cannot be edited.'
          });

        }


        if (
          cleanedEmail !==
          admin.email
        ) {

          updateFields.email =
            cleanedEmail;

          updateFields.isEmailLocked =
            true;

        } else if (
          isEmailLocked !== undefined
        ) {

          updateFields.isEmailLocked =
            isEmailLocked;

        }

      }


      // ---------------------------------------------------
      // ADMINISTRATIVE DETAILS
      // ---------------------------------------------------

      if (teacherId !== undefined) {

        updateFields.teacherId =
          teacherId.trim();

      }


      if (designation !== undefined) {

        updateFields.designation =
          designation;

      }


      if (department !== undefined) {

        updateFields.department =
          department.trim();

      }


      const resolvedFaculty =
        faculty ||
        facultyName;


      if (
        resolvedFaculty !== undefined
      ) {

        updateFields.faculty =
          resolvedFaculty.trim();

        updateFields.facultyName =
          resolvedFaculty.trim();

      }


      if (
        wardenHostel !== undefined
      ) {

        updateFields.wardenHostel =
          wardenHostel.trim();

      }


      // ---------------------------------------------------
      // FAMILY DETAILS
      // ---------------------------------------------------

      if (fatherName !== undefined) {

        updateFields.fatherName =
          fatherName.trim();

      }


      if (motherName !== undefined) {

        updateFields.motherName =
          motherName.trim();

      }


      // ---------------------------------------------------
      // UPDATE
      // ---------------------------------------------------

      const updatedAdmin =
        await Admin.findByIdAndUpdate(

          req.params.id,

          {
            $set:
              updateFields
          },

          {
            returnDocument:
              'after',

            runValidators:
              true

          }

        )
        .select('-password');


      if (!updatedAdmin) {

        return res.status(404).json({
          message:
            'Admin not found.'
        });

      }


      res.json({

        message:
          'Admin profile updated successfully!',

        admin:
          updatedAdmin,

        user:
          updatedAdmin

      });

    } catch (error) {

      console.error(
        '❌ [ADMIN PROFILE UPDATE ERROR]:',
        error
      );


      res.status(500).json({

        error:
          error.message

      });

    }
  }
);


// =========================================================
// 13. ADMIN DIRECTORY UPDATE
// =========================================================

router.put(
  '/admins/:id',
  async (req, res) => {

    try {

      const {
        name,
        email,
        mobileNo,
        gender,
        dob,
        profilePhoto,

        teacherId,
        designation,

        department,
        faculty,
        facultyName,

        wardenHostel,

        fatherName,
        motherName
      } = req.body;


      const updateFields = {};


      if (name) {

        updateFields.name =
          name.trim();

      }


      if (email !== undefined) {

        updateFields.email =
          email
            .trim()
            .toLowerCase();

      }


      if (mobileNo !== undefined) {

        updateFields.mobileNo =
          mobileNo.replace(
            /\D/g,
            ''
          );

      }


      if (gender !== undefined) {

        updateFields.gender =
          gender;

      }


      if (dob !== undefined) {

        updateFields.dob =
          dob;

      }


      if (profilePhoto !== undefined) {

        updateFields.profilePhoto =
          profilePhoto;

      }


      if (teacherId !== undefined) {

        updateFields.teacherId =
          teacherId.trim();

      }


      if (designation !== undefined) {

        updateFields.designation =
          designation;

      }


      if (department !== undefined) {

        updateFields.department =
          department.trim();

      }


      const resolvedFaculty =
        faculty ||
        facultyName;


      if (
        resolvedFaculty !== undefined
      ) {

        updateFields.faculty =
          resolvedFaculty.trim();

        updateFields.facultyName =
          resolvedFaculty.trim();

      }


      if (
        wardenHostel !== undefined
      ) {

        updateFields.wardenHostel =
          wardenHostel.trim();

      }


      if (
        fatherName !== undefined
      ) {

        updateFields.fatherName =
          fatherName.trim();

      }


      if (
        motherName !== undefined
      ) {

        updateFields.motherName =
          motherName.trim();

      }


      const updatedAdmin =
        await Admin.findByIdAndUpdate(

          req.params.id,

          {
            $set:
              updateFields
          },

          {
            returnDocument:
              'after',

            runValidators:
              true

          }

        )
        .select('-password');


      if (!updatedAdmin) {

        return res.status(404).json({
          message:
            'Admin not found.'
        });

      }


      res.json({

        message:
          'Admin details updated successfully!',

        admin:
          updatedAdmin,

        user:
          updatedAdmin

      });

    } catch (error) {

      console.error(
        '❌ [ADMIN UPDATE ERROR]:',
        error
      );


      res.status(500).json({

        error:
          error.message

      });

    }
  }
);


// =========================================================
// 14. DELETE ADMIN
// =========================================================

router.delete(
  '/admins/:id',
  async (req, res) => {

    try {

      const deletedAdmin =
        await Admin.findByIdAndDelete(
          req.params.id
        );


      if (!deletedAdmin) {

        return res.status(404).json({
          message:
            'Admin account not found.'
        });

      }


      res.json({

        message:
          'Admin account removed successfully.'

      });

    } catch (error) {

      res.status(500).json({

        error:
          error.message

      });

    }
  }
);


// =========================================================
// EXPORT
// =========================================================

module.exports = router;

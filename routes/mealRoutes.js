const express = require('express');
const mongoose = require('mongoose');

const MealRecord = require('../models/MealRecord');
const User = require('../models/User');
const Hostel = require('../models/Hostel');

const {
  authMiddleware,
  requireStudent,
  requireAdmin
} = require('../middleware/authMiddleware');

const router = express.Router();

// -------------------------------------------------------
// HELPERS
// -------------------------------------------------------

const isValidObjectId = (id) =>
  mongoose.Types.ObjectId.isValid(id);

const isMealTaken = (value) =>
  value === true ||
  value === 1 ||
  value === '1' ||
  value === 'true' ||
  value === 'taken' ||
  value === 'Taken';

const normalizeMeals = (meals = {}) => ({
  breakfast: isMealTaken(meals.breakfast),
  lunch: isMealTaken(meals.lunch),
  dinner: isMealTaken(meals.dinner)
});

const calculateMealCount = (meals) => {
  let count = 0;

  if (meals.breakfast) count++;
  if (meals.lunch) count++;
  if (meals.dinner) count++;

  return count;
};

const normalizeExtras = (extras) => {
  if (!Array.isArray(extras)) {
    return [];
  }

  return extras
    .map((item) => ({
      itemName: String(
        item?.itemName || item?.name || ''
      ).trim(),
      cost: Number(item?.cost) || 0
    }))
    .filter(
      (item) =>
        item.itemName &&
        item.cost > 0
    );
};

const calculateExtrasCost = (extras) =>
  extras.reduce(
    (sum, item) => sum + (Number(item.cost) || 0),
    0
  );

// -------------------------------------------------------
// STUDENT: SAVE MEAL RECORD
// -------------------------------------------------------

router.post(
  '/log',
  authMiddleware,
  requireStudent,
  async (req, res) => {
    try {
      /*
       * SECURITY:
       * NEVER trust req.body.userId.
       *
       * The authenticated student's ID comes from the JWT.
       */
      const authenticatedUserId = req.user.id;

      if (!isValidObjectId(authenticatedUserId)) {
        return res.status(401).json({
          message: 'Invalid student authentication.'
        });
      }

      const student = await User.findById(
        authenticatedUserId
      );

      if (!student) {
        return res.status(401).json({
          message:
            'Student account no longer exists. Please contact the administrator.'
        });
      }

      const {
        date,
        meals,
        extras
      } = req.body;

      if (!date) {
        return res.status(400).json({
          message: 'Meal date is required.'
        });
      }

      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(date)
      ) {
        return res.status(400).json({
          message: 'Invalid meal date format.'
        });
      }

      const normalizedMeals =
        normalizeMeals(meals);

      const normalizedExtras =
        normalizeExtras(extras);

      /*
       * Check whether today's record already exists.
       */
      const existingEntry =
        await MealRecord.findOne({
          userId: authenticatedUserId,
          date
        });

      /*
       * Previously recorded meals are locked.
       *
       * We only allow new meal flags to be added.
       * Existing true values cannot be changed to false.
       */
      if (existingEntry) {
        const oldMeals =
          normalizeMeals(existingEntry.meals);

        if (
          oldMeals.breakfast &&
          !normalizedMeals.breakfast
        ) {
          return res.status(400).json({
            message:
              'Breakfast has already been recorded and cannot be removed.'
          });
        }

        if (
          oldMeals.lunch &&
          !normalizedMeals.lunch
        ) {
          return res.status(400).json({
            message:
              'Lunch has already been recorded and cannot be removed.'
          });
        }

        if (
          oldMeals.dinner &&
          !normalizedMeals.dinner
        ) {
          return res.status(400).json({
            message:
              'Dinner has already been recorded and cannot be removed.'
          });
        }
      }

      /*
       * Resolve hostel from the actual student account.
       *
       * Do NOT trust hostelId supplied by the browser.
       */
      let hostel = null;

      if (student.hostelId) {
        hostel = await Hostel.findById(
          student.hostelId
        );
      }

      if (!hostel && student.hostelNo) {
        hostel = await Hostel.findOne({
          hostelNumber: student.hostelNo
        });
      }

      if (!hostel) {
        return res.status(400).json({
          message:
            'Your hostel could not be identified. Please contact the administrator.'
        });
      }

      const breakfastCost =
        Number(
          hostel.mealCosts?.breakfast
        ) || 37;

      const lunchCost =
        Number(
          hostel.mealCosts?.lunch
        ) || 37;

      const dinnerCost =
        Number(
          hostel.mealCosts?.dinner
        ) || 37;

      // ---------------------------------------------------
      // CALCULATE MEAL COST
      // ---------------------------------------------------

      const mealCount =
        calculateMealCount(normalizedMeals);

      let mealCost = 0;

      if (normalizedMeals.breakfast) {
        mealCost += breakfastCost;
      }

      if (normalizedMeals.lunch) {
        mealCost += lunchCost;
      }

      if (normalizedMeals.dinner) {
        mealCost += dinnerCost;
      }

      // ---------------------------------------------------
      // ONE-MEAL MINIMUM DIET PENALTY
      // ---------------------------------------------------

      let penaltyCost = 0;

      if (mealCount === 1) {
        const missedMeals = [];

        if (!normalizedMeals.breakfast) {
          missedMeals.push(breakfastCost);
        }

        if (!normalizedMeals.lunch) {
          missedMeals.push(lunchCost);
        }

        if (!normalizedMeals.dinner) {
          missedMeals.push(dinnerCost);
        }

        if (missedMeals.length > 0) {
          penaltyCost =
            Math.min(...missedMeals);
        }
      }

      // ---------------------------------------------------
      // EXTRAS
      // ---------------------------------------------------

      const extrasCost =
        calculateExtrasCost(
          normalizedExtras
        );

      const dailyTotal =
        mealCost +
        penaltyCost +
        extrasCost;

      // ---------------------------------------------------
      // SAVE
      // ---------------------------------------------------

      const record = await MealRecord.findOneAndUpdate(
        {
          userId: authenticatedUserId,
          date
        },
        {
          $set: {
            userId: authenticatedUserId,
            hostelId: hostel._id,
            date,
            meals: normalizedMeals,
            extras: normalizedExtras,
            mealCount,
            mealCost,
            penaltyCost,
            extrasCost,
            dailyTotal,

            /*
             * Keep this temporarily for compatibility with
             * older frontend records/code.
             */
            dailyTotalCost: dailyTotal,

            role: 'student'
          }
        },
        {
          new: true,
          upsert: true,
          runValidators: true
        }
      );

      return res.status(200).json({
        message:
          'Meal record saved successfully.',
        record
      });
    } catch (error) {
      console.error(
        'Save meal record error:',
        error
      );

      return res.status(500).json({
        message:
          'Unable to save the meal record.',
        error:
          process.env.NODE_ENV === 'development'
            ? error.message
            : undefined
      });
    }
  }
);

// -------------------------------------------------------
// STUDENT: GET OWN MEAL RECORDS
// -------------------------------------------------------

router.get(
  '/user/:userId',
  authMiddleware,
  async (req, res) => {
    try {
      const requestedUserId =
        req.params.userId;

      if (!isValidObjectId(requestedUserId)) {
        return res.status(400).json({
          message: 'Invalid student ID.'
        });
      }

      /*
       * Students can ONLY access their own records.
       * Admins may access any student.
       */
      if (
        req.user.role === 'student' &&
        String(req.user.id) !==
          String(requestedUserId)
      ) {
        return res.status(403).json({
          message:
            'You are not allowed to access another student\'s meal records.'
        });
      }

      if (
        req.user.role !== 'student' &&
        req.user.role !== 'admin'
      ) {
        return res.status(403).json({
          message: 'Access denied.'
        });
      }

      const studentExists =
        await User.exists({
          _id: requestedUserId
        });

      if (
        !studentExists &&
        req.user.role === 'student'
      ) {
        return res.status(404).json({
          message:
            'Student account not found.'
        });
      }

      const records =
        await MealRecord.find({
          userId: requestedUserId
        })
          .populate(
            'userId',
            'name rollNo studentId hostelNo department'
          )
          .populate(
            'hostelId',
            'hostelNumber name mealCosts'
          )
          .sort({
            date: -1
          });

      return res.status(200).json(
        records
      );
    } catch (error) {
      console.error(
        'Get student meals error:',
        error
      );

      return res.status(500).json({
        message:
          'Unable to load meal records.'
      });
    }
  }
);

// -------------------------------------------------------
// ADMIN: GET ALL MEAL RECORDS
// -------------------------------------------------------

router.get(
  '/all',
  authMiddleware,
  requireAdmin,
  async (req, res) => {
    try {
      const records =
        await MealRecord.find({})
          .populate(
            'userId',
            'name rollNo studentId hostelNo department faculty mobileNo'
          )
          .populate(
            'hostelId',
            'hostelNumber name mealCosts'
          )
          .sort({
            date: -1,
            createdAt: -1
          });

      return res.status(200).json(
        records
      );
    } catch (error) {
      console.error(
        'Get all meal records error:',
        error
      );

      return res.status(500).json({
        message:
          'Unable to load all meal records.'
      });
    }
  }
);

// -------------------------------------------------------
// ADMIN: UPDATE MEAL RECORD
// -------------------------------------------------------

router.put(
  '/:id',
  authMiddleware,
  requireAdmin,
  async (req, res) => {
    try {
      const recordId =
        req.params.id;

      if (!isValidObjectId(recordId)) {
        return res.status(400).json({
          message:
            'Invalid meal record ID.'
        });
      }

      const existingRecord =
        await MealRecord.findById(
          recordId
        );

      if (!existingRecord) {
        return res.status(404).json({
          message:
            'Meal record not found.'
        });
      }

      const allowedFields = [
        'meals',
        'extras',
        'date'
      ];

      const updateFields = {};

      allowedFields.forEach(
        (field) => {
          if (
            Object.prototype.hasOwnProperty.call(
              req.body,
              field
            )
          ) {
            updateFields[field] =
              req.body[field];
          }
        }
      );

      const updatedRecord =
        await MealRecord.findByIdAndUpdate(
          recordId,
          {
            $set: updateFields
          },
          {
            new: true,
            runValidators: true
          }
        )
          .populate(
            'userId',
            'name rollNo studentId hostelNo department'
          )
          .populate(
            'hostelId',
            'hostelNumber name mealCosts'
          );

      return res.status(200).json({
        message:
          'Meal record updated successfully.',
        record: updatedRecord
      });
    } catch (error) {
      console.error(
        'Update meal record error:',
        error
      );

      return res.status(500).json({
        message:
          'Unable to update meal record.'
      });
    }
  }
);

// -------------------------------------------------------
// ADMIN: DELETE MEAL RECORD
// -------------------------------------------------------

router.delete(
  '/:id',
  authMiddleware,
  requireAdmin,
  async (req, res) => {
    try {
      const recordId =
        req.params.id;

      if (!isValidObjectId(recordId)) {
        return res.status(400).json({
          message:
            'Invalid meal record ID.'
        });
      }

      const deletedRecord =
        await MealRecord.findByIdAndDelete(
          recordId
        );

      if (!deletedRecord) {
        return res.status(404).json({
          message:
            'Meal record not found.'
        });
      }

      return res.status(200).json({
        message:
          'Meal record deleted successfully.'
      });
    } catch (error) {
      console.error(
        'Delete meal record error:',
        error
      );

      return res.status(500).json({
        message:
          'Unable to delete meal record.'
      });
    }
  }
);

module.exports = router;
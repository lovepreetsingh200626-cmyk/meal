const express = require('express');
const MealRecord = require('../models/MealRecord');
const Hostel = require('../models/Hostel');
const router = express.Router();

// ==========================================
// 1. STUDENT / USER LOG MEAL ENTRY
// ==========================================
// @route   POST /api/meals/log
router.post('/log', async (req, res) => {
  try {
    const { userId, hostelId, date, meals, extras, role } = req.body;

    if (!userId || !date || !meals) {
      return res.status(400).json({ message: 'User ID, date, and meal choices are required.' });
    }

    // 1. Check if an entry already exists for this date
    const existingEntry = await MealRecord.findOne({ userId, date });

    // 2. Strict Lock Enforcer: Prevent students from unchecking locked meals
    const isStudent = (req.user && req.user.role === 'student') || role === 'student' || role !== 'admin';

    if (existingEntry && existingEntry.meals && isStudent) {
      if (existingEntry.meals.breakfast && !meals.breakfast) {
        return res.status(403).json({
          message: 'Security Policy: Breakfast is permanently locked once selected. Contact an administrator to remove it.'
        });
      }
      if (existingEntry.meals.lunch && !meals.lunch) {
        return res.status(403).json({
          message: 'Security Policy: Lunch is permanently locked once selected. Contact an administrator to remove it.'
        });
      }
      if (existingEntry.meals.dinner && !meals.dinner) {
        return res.status(403).json({
          message: 'Security Policy: Dinner is permanently locked once selected. Contact an administrator to remove it.'
        });
      }
    }

    // 3. Retrieve hostel rates dynamically (Safe lookup supporting both ObjectId & string like "BH1")
    let bRate = 37;
    let lRate = 37;
    let dRate = 37;
    let resolvedHostelRef = null;

    if (hostelId) {
      const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(hostelId);
      const hostel = await Hostel.findOne({
        $or: [
          { _id: isValidObjectId ? hostelId : null },
          { hostelNumber: hostelId }
        ]
      });

      if (hostel) {
        resolvedHostelRef = hostel._id;
        if (hostel.mealCosts) {
          bRate = hostel.mealCosts.breakfast || 37;
          lRate = hostel.mealCosts.lunch || 37;
          dRate = hostel.mealCosts.dinner || 37;
        }
      }
    }

    // 4. Calculate meal count and attended meals cost
    let mealCount = 0;
    let standardMealsCost = 0;

    if (meals.breakfast) { mealCount++; standardMealsCost += bRate; }
    if (meals.lunch) { mealCount++; standardMealsCost += lRate; }
    if (meals.dinner) { mealCount++; standardMealsCost += dRate; }

    // 5. Apply "1 Diet = 2 Diets" Rule
    let appliedRule = 'STANDARD';
    if (mealCount === 1) {
      const missedRates = [];
      if (!meals.breakfast) missedRates.push(bRate);
      if (!meals.lunch) missedRates.push(lRate);
      if (!meals.dinner) missedRates.push(dRate);

      const penaltyCost = Math.min(...missedRates);
      standardMealsCost += penaltyCost;
      appliedRule = '1_DIET_BUMPED_TO_2';
    } else if (mealCount === 0) {
      appliedRule = 'NO_MEALS';
    }

    // 6. Calculate extras cost
    const extrasCost = extras && extras.length > 0 
      ? extras.reduce((sum, item) => sum + Number(item.cost || 0), 0) 
      : 0;

    const dailyTotalCost = standardMealsCost + extrasCost;

    // 7. Upsert or update record for that date
    const record = await MealRecord.findOneAndUpdate(
      { userId, date },
      { 
        $set: {
          hostelId: resolvedHostelRef || hostelId, 
          meals, 
          extras: extras || [], 
          dailyTotalCost, 
          appliedDietRule: appliedRule 
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(200).json(record);
  } catch (error) {
    console.error('Meal save error:', error);
    res.status(500).json({ message: 'Server error saving meal log', error: error.message });
  }
});

// ==========================================
// 2. GET MEALS FOR SINGLE STUDENT
// ==========================================
// @route   GET /api/meals/user/:userId
router.get('/user/:userId', async (req, res) => {
  try {
    const records = await MealRecord.find({ userId: req.params.userId }).sort({ date: -1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 3. GET ALL MEALS (ADMIN ONLY)
// ==========================================
// @route   GET /api/meals/all
router.get('/all', async (req, res) => {
  try {
    const allMeals = await MealRecord.find({})
      .populate('userId', 'name rollNo')
      .populate('hostelId', 'hostelNumber name')
      .sort({ date: -1 });
    res.json(allMeals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 4. ADMIN: UPDATE ANY STUDENT'S MEAL LOG (FULL OVERRIDE)
// ==========================================
// @route   PUT /api/meals/:id
router.put('/:id', async (req, res) => {
  try {
    const { meals, extras, date } = req.body;
    
    const mealLog = await MealRecord.findById(req.params.id);
    if (!mealLog) {
      return res.status(404).json({ message: 'Meal log not found.' });
    }

    let bRate = 37;
    let lRate = 37;
    let dRate = 37;

    const hostelRef = mealLog.hostelId?._id || mealLog.hostelId;
    if (hostelRef) {
      const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(hostelRef.toString());
      const hostel = await Hostel.findOne({
        $or: [
          { _id: isValidObjectId ? hostelRef : null },
          { hostelNumber: hostelRef }
        ]
      });

      if (hostel && hostel.mealCosts) {
        bRate = hostel.mealCosts.breakfast || 37;
        lRate = hostel.mealCosts.lunch || 37;
        dRate = hostel.mealCosts.dinner || 37;
      }
    }

    let mealCount = 0;
    let standardMealsCost = 0;

    if (meals.breakfast) { mealCount++; standardMealsCost += bRate; }
    if (meals.lunch) { mealCount++; standardMealsCost += lRate; }
    if (meals.dinner) { mealCount++; standardMealsCost += dRate; }

    let appliedRule = 'STANDARD';
    if (mealCount === 1) {
      const missedRates = [];
      if (!meals.breakfast) missedRates.push(bRate);
      if (!meals.lunch) missedRates.push(lRate);
      if (!meals.dinner) missedRates.push(dRate);
      standardMealsCost += Math.min(...missedRates);
      appliedRule = '1_DIET_BUMPED_TO_2';
    } else if (mealCount === 0) {
      appliedRule = 'NO_MEALS';
    }

    const extrasCost = extras ? extras.reduce((sum, item) => sum + Number(item.cost || 0), 0) : 0;
    const dailyTotalCost = standardMealsCost + extrasCost;

    mealLog.meals = meals;
    if (extras !== undefined) mealLog.extras = extras;
    if (date) mealLog.date = date;
    mealLog.dailyTotalCost = dailyTotalCost;
    mealLog.appliedDietRule = appliedRule;

    await mealLog.save();

    const updatedLog = await MealRecord.findById(mealLog._id)
      .populate('userId', 'name rollNo')
      .populate('hostelId', 'hostelNumber name');

    res.json({ message: 'Meal log updated successfully by Authority!', meal: updatedLog });
  } catch (error) {
    console.error('Meal update error:', error);
    res.status(500).json({ message: 'Server error updating meal record', error: error.message });
  }
});

// ==========================================
// 5. ADMIN: DELETE ANY STUDENT'S MEAL LOG
// ==========================================
// @route   DELETE /api/meals/:id
router.delete('/:id', async (req, res) => {
  try {
    const deletedMeal = await MealRecord.findByIdAndDelete(req.params.id);
    if (!deletedMeal) {
      return res.status(404).json({ message: 'Meal log not found.' });
    }
    res.json({ message: 'Meal log deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
const express = require('express');
const MealRecord = require('../models/MealRecord');
const Hostel = require('../models/Hostel');
const router = express.Router();

// @route   POST /api/meals/log
router.post('/log', async (req, res) => {
  try {
    const { userId, hostelId, date, meals, extras } = req.body;

    // 1. Count how many standard meals the student selected
    let mealCount = 0;
    if (meals.breakfast) mealCount++;
    if (meals.lunch) mealCount++;
    if (meals.dinner) mealCount++;

    // 2. Apply "1 Diet = 2 Diets" Rule (Using standard ₹37 rate)
    const DIET_RATE = 37;
    let standardMealsCost = 0;
    let appliedRule = 'STANDARD';

    if (mealCount === 1) {
      standardMealsCost = DIET_RATE * 2; // Rule: 1 diet bumped to 2
      appliedRule = '1_DIET_BUMPED_TO_2';
    } else if (mealCount > 1) {
      standardMealsCost = mealCount * DIET_RATE; // 2 or 3 diets charged normally
    }

    // 3. Calculate Extras
    const extrasCost = extras && extras.length > 0 
      ? extras.reduce((sum, item) => sum + Number(item.cost), 0) 
      : 0;

    const dailyTotalCost = standardMealsCost + extrasCost;

    // 4. Save or Update (Upsert) the record for that specific date
    // FIXED: Changed "Meal" to "MealRecord"
    const record = await MealRecord.findOneAndUpdate(
      { userId, date },
      { 
        hostelId, 
        meals, 
        extras, 
        dailyTotalCost, 
        appliedDietRule: appliedRule 
      },
      { upsert: true, new: true } // Creates new if it doesn't exist, updates if it does
    );

    res.status(200).json(record);
  } catch (error) {
    res.status(500).json({ message: 'Server error saving meal log', error: error.message });
  }
});

// @route   GET /api/meals/user/:userId
router.get('/user/:userId', async (req, res) => {
  try {
    const records = await MealRecord.find({ userId: req.params.userId }).sort({ date: -1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   GET /api/meals/all (Admin Only - Used by AdminDashboard)
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
// ADMIN: UPDATE ANY STUDENT'S MEAL LOG
// ==========================================
// @route   PUT /api/meals/:id
router.put('/:id', async (req, res) => {
  try {
    const { meals, extras, date } = req.body;
    
    const mealLog = await Meal.findById(req.params.id);
    if (!mealLog) {
      return res.status(404).json({ message: 'Meal log not found.' });
    }

    // Recalculate cost (1 diet = 2 diets rule)
    let mealCount = 0;
    if (meals.breakfast) mealCount++;
    if (meals.lunch) mealCount++;
    if (meals.dinner) mealCount++;

    const dietRate = 37; 
    let standardMealsCost = 0;

    if (mealCount === 1) {
      standardMealsCost = dietRate * 2; 
      mealLog.appliedDietRule = '1_DIET_BUMPED_TO_2';
    } else if (mealCount > 1) {
      standardMealsCost = mealCount * dietRate;
      mealLog.appliedDietRule = 'STANDARD';
    } else {
      mealLog.appliedDietRule = 'NO_MEALS';
    }

    const extrasCost = extras ? extras.reduce((sum, item) => sum + Number(item.cost), 0) : 0;
    const dailyTotalCost = standardMealsCost + extrasCost;

    mealLog.meals = meals;
    if (extras) mealLog.extras = extras;
    if (date) mealLog.date = date;
    mealLog.dailyTotalCost = dailyTotalCost;

    await mealLog.save();

    const updatedLog = await MealRecord.findById(mealLog._id)
      .populate('userId', 'name rollNo')
      .populate('hostelId', 'hostelNumber name');

    res.json({ message: 'Meal log updated successfully!', meal: updatedLog });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// ADMIN: DELETE ANY STUDENT'S MEAL LOG
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
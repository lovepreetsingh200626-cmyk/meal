const express = require('express');
const MealRecord = require('../models/MealRecord');
const Hostel = require('../models/Hostel');
const router = express.Router();

// @route   POST /api/meals/log
// @desc    Log daily meals & extras, automatically computing the cost
router.post('/log', async (req, res) => {
  try {
    const { userId, hostelId, date, meals, extras } = req.body;

    const hostel = await Hostel.findById(hostelId);
    if (!hostel) return res.status(404).json({ message: 'Hostel not found' });

    // Calculate daily costs
    let total = 0;
    if (meals.breakfast) total += hostel.mealCosts.breakfast;
    if (meals.lunch) total += hostel.mealCosts.lunch;
    if (meals.dinner) total += hostel.mealCosts.dinner;

    if (extras && extras.length > 0) {
      total += extras.reduce((sum, item) => sum + Number(item.cost), 0);
    }

    const updatedRecord = await MealRecord.findOneAndUpdate(
      { userId, date },
      { userId, hostelId, date, meals, extras, dailyTotalCost: total },
      { new: true, upsert: true }
    );

    res.json(updatedRecord);
  } catch (error) {
    res.status(500).json({ error: error.message });
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

module.exports = router;
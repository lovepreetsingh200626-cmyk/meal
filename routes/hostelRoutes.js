const express = require('express');
const Hostel = require('../models/Hostel');
const router = express.Router();

// @route   POST /api/hostels
// @desc    Create a new hostel entity with default or custom meal costs
router.post('/', async (req, res) => {
  try {
    const { hostelNumber, name, type, mealCosts } = req.body;

    // Check if hostel number already exists (e.g., 'BH1')
    const existingHostel = await Hostel.findOne({ hostelNumber: hostelNumber.toUpperCase() });
    if (existingHostel) {
      return res.status(400).json({ message: 'Hostel number already exists' });
    }

    const newHostel = new Hostel({
      hostelNumber: hostelNumber.toUpperCase(),
      name,
      type,
      mealCosts: mealCosts || {
        breakfast: 40,
        lunch: 60,
        dinner: 60
      }
    });

    const savedHostel = await newHostel.save();
    res.status(201).json(savedHostel);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   GET /api/hostels
// @desc    Get all hostels (useful for populating registration dropdowns)
router.get('/', async (req, res) => {
  try {
    const hostels = await Hostel.find().sort({ hostelNumber: 1 });
    res.json(hostels);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   GET /api/hostels/:hostelNumber
// @desc    Get a single hostel by its identifier (e.g., /api/hostels/BH1)
router.get('/:hostelNumber', async (req, res) => {
  try {
    const hostel = await Hostel.findOne({ 
      hostelNumber: req.params.hostelNumber.toUpperCase() 
    });
    
    if (!hostel) {
      return res.status(404).json({ message: 'Hostel not found' });
    }
    
    res.json(hostel);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   PUT /api/hostels/:hostelNumber/meal-costs
// @desc    Update meal costs for a specific hostel
router.put('/:hostelNumber/meal-costs', async (req, res) => {
  try {
    const { breakfast, lunch, dinner } = req.body;

    const updatedHostel = await Hostel.findOneAndUpdate(
      { hostelNumber: req.params.hostelNumber.toUpperCase() },
      { 
        $set: { 
          'mealCosts.breakfast': breakfast,
          'mealCosts.lunch': lunch,
          'mealCosts.dinner': dinner
        } 
      },
      { new: true }
    );

    if (!updatedHostel) {
      return res.status(404).json({ message: 'Hostel not found' });
    }

    res.json(updatedHostel);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// ADMIN: UPDATE HOSTEL DIET RATES
// ==========================================
router.put('/:id/rates', async (req, res) => {
  try {
    const { mealCosts } = req.body;
    
    if (!mealCosts || !mealCosts.breakfast || !mealCosts.lunch || !mealCosts.dinner) {
      return res.status(400).json({ message: 'All three meal rates (breakfast, lunch, dinner) are required.' });
    }

    const updatedHostel = await Hostel.findByIdAndUpdate(
      req.params.id,
      { $set: { mealCosts: mealCosts } },
      { new: true, runValidators: true }
    );

    if (!updatedHostel) {
      return res.status(404).json({ message: 'Hostel not found.' });
    }

    res.json({ message: 'Hostel diet rates updated successfully', hostel: updatedHostel });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
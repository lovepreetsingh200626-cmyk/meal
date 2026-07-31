const mongoose = require('mongoose')
const dns = require('dns');
const Hostel = require("../server/models/Hostel.js")

require('dotenv').config();
try {
  dns.setServers(['1.1.1.1', '8.8.8.8', '8.8.4.4']);
} catch (error) {
  console.warn('⚠️ Could not set custom DNS servers:', error.message);
}
const defaultHostels = [
  {
    hostelNumber: 'BH1',
    name: 'Boys Hostel 1',
    type: 'boys',
    mealCosts: {
      breakfast: 40,
      lunch: 60,
      dinner: 60
    }
  },
  {
    hostelNumber: 'BH2',
    name: 'Boys Hostel 2',
    type: 'boys',
    mealCosts: {
      breakfast: 40,
      lunch: 60,
      dinner: 60
    }
  },
  {
    hostelNumber: 'GH1',
    name: 'Girls Hostel 1',
    type: 'girls',
    mealCosts: {
      breakfast: 40,
      lunch: 60,
      dinner: 60
    }
  }
];
console.log(process.env.MONGO_URI)
async function seedDatabase() {
  try {
    console.log("⏳ Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB successfully.");

    for (const hostelData of defaultHostels) {
      // Check if hostel already exists so we don't create duplicates
      const existing = await Hostel.findOne({ hostelNumber: hostelData.hostelNumber });
      if (existing) {
        console.log(`ℹ️ Hostel ${hostelData.hostelNumber} already exists. Skipping...`);
      } else {
        await Hostel.create(hostelData);
        console.log(`🎉 Successfully seeded: ${hostelData.hostelNumber} (${hostelData.name})`);
      }
    }

    console.log("✅ Database seeding completed!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error.message);
    process.exit(1);
  }
}

seedDatabase();
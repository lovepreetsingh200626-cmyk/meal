const cron = require('node-cron');
const User = require('../models/User');
const MealRecord = require('../models/MealRecord'); // Aligned with your meals.js model reference

const initializeBillingCron = () => {
  // Runs every day at 23:50 (11:50 PM)
  cron.schedule('50 23 * * *', async () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Check if tomorrow is the 1st of the next month (meaning today is the last day of the current month)
    if (tomorrow.getDate() === 1) {
      console.log('⚙️ [CRON] Executing Monthly Deficit Billing Engine...');
      try {
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const monthPrefix = `${year}-${month}`;
        const lastDayString = today.toISOString().split('T')[0];

        const students = await User.find({ role: 'student' });
        let surchargeCount = 0;

        for (const student of students) {
          const monthlyMeals = await MealRecord.find({
            userId: student._id,
            date: { $regex: `^${monthPrefix}` }
          });

          const totalSpent = monthlyMeals.reduce((sum, m) => sum + (m.dailyTotalCost || 0), 0);
          
          // Unified minimum charge (1000 for females, 1100 for males/others)
          const minRequired = (student.gender === 'Female' || student.gender === 'female') ? 1000 : 1100;

          if (totalSpent < minRequired) {
            const deficit = minRequired - totalSpent;
            
            const surchargeEntry = new MealRecord({
              userId: student._id,
              hostelId: student.hostelId,
              date: lastDayString,
              meals: { breakfast: false, lunch: false, dinner: false },
              extras: [{ itemName: 'Mandatory Minimum Surcharge', cost: deficit }],
              dailyTotalCost: deficit,
              appliedDietRule: 'MANDATORY_SURCHARGE'
            });

            await surchargeEntry.save();
            surchargeCount++;
          }
        }
        console.log(`✅ [CRON] Billing complete. Applied ${surchargeCount} mandatory surcharges.`);
      } catch (error) {
        console.error('❌ [CRON] Automated billing failed:', error);
      }
    }
  });
};

module.exports = initializeBillingCron;
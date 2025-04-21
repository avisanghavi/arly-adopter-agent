require('dotenv').config();
const mongoose = require('mongoose');
const { User, Highlight, Feedback } = require('./init');

async function cleanupTestData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('\n🔌 Connected to MongoDB successfully\n');

    // Delete test early adopter (preserve admin)
    const result1 = await User.deleteMany({ 
      role: 'early_adopter',
      email: 'early.adopter@videofusion.io'
    });
    console.log(`Deleted ${result1.deletedCount} test users`);

    // Delete all test highlights
    const result2 = await Highlight.deleteMany({
      content: 'Test feature usage highlight'
    });
    console.log(`Deleted ${result2.deletedCount} test highlights`);

    // Delete all test feedback
    const result3 = await Feedback.deleteMany({
      content: 'Test feedback for database connectivity'
    });
    console.log(`Deleted ${result3.deletedCount} test feedback entries`);

    console.log('\n✅ Cleanup completed successfully');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

cleanupTestData(); 
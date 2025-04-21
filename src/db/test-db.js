require('dotenv').config();
const mongoose = require('mongoose');
const { User, Highlight, Feedback } = require('./init');

async function testDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('\n🔌 Connected to MongoDB successfully\n');

    // Test Users Collection
    console.log('👥 Testing Users Collection:');
    const users = await User.find({}).select('name email role engagement.segment');
    console.log('Found users:', users.length);
    users.forEach(user => {
      console.log(`- ${user.name} (${user.email}) - Role: ${user.role}, Segment: ${user.engagement.segment}`);
    });

    // Create a test early adopter if none exists
    const testUser = await User.findOne({ role: 'early_adopter' });
    if (!testUser) {
      const newUser = await User.create({
        name: 'Test Early Adopter',
        email: 'early.adopter@videofusion.io',
        role: 'early_adopter',
        engagement: {
          score: 75,
          segment: 'high'
        }
      });
      console.log('\nCreated test early adopter:', newUser.name);
    }

    // Test Highlights Collection
    console.log('\n🌟 Testing Highlights Collection:');
    const testHighlight = await Highlight.create({
      userId: (testUser || await User.findOne({ role: 'early_adopter' }))._id,
      content: 'Test feature usage highlight',
      type: 'feature_usage',
      metadata: {
        featureName: 'Database Testing',
        duration: '5 minutes'
      }
    });
    console.log('Created test highlight:', testHighlight);

    const highlights = await Highlight.find({})
      .populate('userId', 'name email')
      .limit(5);
    console.log('\nRecent highlights:', highlights.length);
    highlights.forEach(highlight => {
      console.log(`- ${highlight.type} by ${highlight.userId.name}: ${highlight.content}`);
    });

    // Test Feedback Collection
    console.log('\n💭 Testing Feedback Collection:');
    const testFeedback = await Feedback.create({
      userId: (testUser || await User.findOne({ role: 'early_adopter' }))._id,
      type: 'feature',
      content: 'Test feedback for database connectivity',
      priority: 'high'
    });
    console.log('Created test feedback:', testFeedback);

    const feedback = await Feedback.find({})
      .populate('userId', 'name email')
      .limit(5);
    console.log('\nRecent feedback:', feedback.length);
    feedback.forEach(item => {
      console.log(`- ${item.type} (${item.priority}) by ${item.userId.name}: ${item.content}`);
    });

    console.log('\n✅ Database test completed successfully');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Database test failed:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

testDatabase(); 
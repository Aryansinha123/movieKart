const mongoose = require('mongoose');

const MONGODB_URI = "mongodb+srv://mk_user:Aryan7293@mk.bulzuqb.mongodb.net/?appName=mk";

async function migrate() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB for migration");
    
    const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    
    // Update all users who don't have preferredLanguages
    const result = await User.updateMany(
      { preferredLanguages: { $exists: false } },
      { $set: { preferredLanguages: [] } }
    );
    
    console.log(`Migration completed. Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);
    
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

migrate();

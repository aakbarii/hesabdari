const mongoose = require("mongoose");
require("dotenv").config();

const MONGO_URI = process.env.MONGO_URI;

async function resetDatabase() {
  try {
    console.log("🔄 درحال اتصال به MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB متصل شد");

    console.log("🗑️  درحال حذف تمام داده‌ها...");
    
    // حذف تمام collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    for (const collection of collections) {
      await mongoose.connection.db.dropCollection(collection.name);
      console.log(`✅ Collection "${collection.name}" حذف شد`);
    }

    console.log("✨ دیتابیس با موفقیت ریست شد!");
    process.exit(0);
  } catch (err) {
    console.error("❌ خطا در ریست دیتابیس:", err.message);
    process.exit(1);
  }
}

resetDatabase();

const mongoose = require('mongoose');
const Transaction = require('./models/Transaction');
const Account = require('./models/Account');
const Category = require('./models/Category');
const Goal = require('./models/Goal');
const User = require('./models/User');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI;

async function resetDatabase() {
  try {
    console.log('🔄 در حال اتصال به MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ اتصال برقرار شد');

    console.log('🗑️ در حال پاک کردن تمام داده‌ها...');
    
    await User.deleteMany({});
    console.log('✅ کاربران پاک شدند');
    
    await Transaction.deleteMany({});
    console.log('✅ تراکنش‌ها پاک شدند');
    
    await Account.deleteMany({});
    console.log('✅ حساب‌ها پاک شدند');
    
    await Goal.deleteMany({});
    console.log('✅ اهداف پاک شدند');
    
    await Category.deleteMany({});
    console.log('✅ دسته‌بندی‌ها پاک شدند');

    console.log('🔄 در حال ایجاد دسته‌بندی‌های پیش‌فرض...');
    
    const defaultCategories = [
      { name: 'غذا', type: 'expense', color: '#FF6384', icon: '🍕', isDefault: true },
      { name: 'حمل‌ونقل', type: 'expense', color: '#36A2EB', icon: '🚗', isDefault: true },
      { name: 'خرید', type: 'expense', color: '#FFCE56', icon: '🛍️', isDefault: true },
      { name: 'تفریح', type: 'expense', color: '#4BC0C0', icon: '🎮', isDefault: true },
      { name: 'پزشکی', type: 'expense', color: '#9966FF', icon: '🏥', isDefault: true },
      { name: 'آموزش', type: 'expense', color: '#FF9F40', icon: '📚', isDefault: true },
      { name: 'حقوق', type: 'income', color: '#4BC0C0', icon: '💰', isDefault: true },
      { name: 'سایر', type: 'expense', color: '#C9CBCF', icon: '📁', isDefault: true }
    ];
    
    await Category.insertMany(defaultCategories);
    console.log('✅ دسته‌بندی‌های پیش‌فرض ایجاد شدند');

    console.log('🎉 دیتابیس کاملاً ریست شد!');
    console.log('');
    console.log('📋 آمار نهایی:');
    console.log(`👤 کاربران: ${await User.countDocuments()}`);
    console.log(`💰 تراکنش‌ها: ${await Transaction.countDocuments()}`);
    console.log(`🏦 حساب‌ها: ${await Account.countDocuments()}`);
    console.log(`🎯 اهداف: ${await Goal.countDocuments()}`);
    console.log(`🏷️ دسته‌بندی‌ها: ${await Category.countDocuments()}`);

  } catch (error) {
    console.error('❌ خطا در ریست دیتابیس:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 اتصال قطع شد');
    process.exit(0);
  }
}

console.log('⚠️  هشدار: این عمل تمام داده‌های دیتابیس را پاک می‌کند!');
console.log('⏳ شروع عملیات ریست در 3 ثانیه...');

setTimeout(() => {
  resetDatabase();
}, 3000);

const TelegramBot = require("node-telegram-bot-api");
const mongoose = require("mongoose");
const Transaction = require("./models/Transaction");
const Account = require("./models/Account");
const Category = require("./models/Category");
const Goal = require("./models/Goal");
const User = require("./models/User");
const AIService = require("./ai-service");
require("dotenv").config();
const moment = require('moment-jalaali');

// ====== تنظیمات ======
const TOKEN = process.env.TOKEN;
const CHAT_ID = +process.env.CHAT_ID;
const MONGO_URI = process.env.MONGO_URI;
const OPENROUTER_API_KEY = process.env.AI_KEY;

// ====== ایجاد سرویس هوش مصنوعی ======
const aiService = new AIService(OPENROUTER_API_KEY);

// ====== اتصال به MongoDB ======
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ====== ساخت ربات ======
const bot = new TelegramBot(TOKEN, { 
  polling: {
    interval: 1000,
    autoStart: true,
    params: {
      timeout: 10
    }
  }
});

// ====== مدیریت خطاهای polling ======
bot.on('polling_error', (error) => {
  console.error('❌ Polling error:', error.message);
  
  if (error.code === 'ETELEGRAM' && error.message.includes('409')) {
    console.log('⏳ Waiting 5 seconds before retrying...');
    setTimeout(() => {
      console.log('🔄 Retrying bot connection...');
    }, 5000);
  }
});

bot.on('error', (error) => {
  console.error('❌ Bot error:', error);
});

// ====== تابع مدیریت کاربر ======
async function getUserOrCreate(telegramId, username, firstName, lastName) {
  try {
    let user = await User.findOne({ telegramId });
    if (!user) {
      user = new User({
        telegramId,
        username,
        firstName,
        lastName
      });
      await user.save();
      console.log(`✅ New user created: ${firstName} (${telegramId})`);
    } else {
      // به‌روزرسانی اطلاعات کاربر
      user.username = username;
      user.firstName = firstName;
      user.lastName = lastName;
      user.lastActivity = new Date();
      await user.save();
    }
    return user;
  } catch (err) {
    console.error("❌ Error managing user:", err);
    return null;
  }
}

// ====== دستور شروع ======
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  
  // مدیریت کاربر
  const user = await getUserOrCreate(
    chatId,
    msg.from.username,
    msg.from.first_name,
    msg.from.last_name
  );
  
  if (!user) {
    return bot.sendMessage(chatId, "❌ خطا در ایجاد کاربر. لطفاً دوباره تلاش کنید.");
  }

  bot.sendMessage(
    chatId,
    `🤖 سلام ${user.firstName}! من دستیار مالی هوشمند شما هستم! 🎉\n\n` +
    `💬 دیگه نیازی به دکمه زدن نیست! فقط با من چت کن و من همه کارهات رو انجام میدم.\n\n` +
    `📅 امروز: ${moment().format('jYYYY/jMM/jDD')}\n\n` +
    `✨ من می‌تونم برات:\n` +
    `• تراکنش اضافه کنم (درآمد یا هزینه)\n` +
    `• گزارش‌های مالی بهت بدم\n` +
    `• حساب‌هات رو مدیریت کنم\n` +
    `• اهداف مالیت رو پیگیری کنم\n` +
    `• توی تراکنش‌ها جستجو کنم\n` +
    `• نصیحت‌های مالی بهت بدم\n\n` +
    `💡 مثال: "یه هزینه 50 هزار تومانی برای ناهار اضافه کن" یا "گزارش این ماه رو نشون بده"\n\n` +
    `چیکار برات انجام بدم؟ 🤗`,
    {
      reply_markup: {
        remove_keyboard: true
      }
    }
  );
});

// ====== مدیریت پیام‌ها ======
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  
  // نادیده گیری دستور /start
  if (msg.text && msg.text.startsWith('/start')) {
    return;
  }
  
  // مدیریت کاربر
  const user = await getUserOrCreate(
    chatId,
    msg.from.username,
    msg.from.first_name,
    msg.from.last_name
  );
  
  if (!user) {
    return bot.sendMessage(chatId, "❌ خطا در احراز هویت. لطفاً /start را بزنید.");
  }

  const text = msg.text?.trim();
  
  // اگر پیام متنی نیست، نادیده بگیر
  if (!text) {
    return;
  }

  try {
    // نمایش حالت typing
    await bot.sendChatAction(chatId, 'typing');
    
    // پردازش درخواست توسط هوش مصنوعی
    const result = await aiService.processUserRequest(user._id, text);
    
    if (result.success) {
      await bot.sendMessage(chatId, result.message);
    } else {
      await bot.sendMessage(chatId, `❌ ${result.message}`);
    }
  } catch (error) {
    console.error('خطا در پردازش پیام:', error);
    await bot.sendMessage(chatId, "❌ متاسفانه مشکلی پیش آمده. لطفاً دوباره تلاش کنید.");
  }
});

// ====== ایجاد دسته‌بندی‌های پیش‌فرض ======
async function createDefaultCategories() {
  try {
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
    
    for (const cat of defaultCategories) {
      await Category.findOneAndUpdate(
        { name: cat.name },
        cat,
        { upsert: true, new: true }
      );
    }
    
    console.log("✅ Default categories created");
  } catch (err) {
    console.error("❌ Error creating default categories:", err);
  }
}

// ====== اجرای تابع ایجاد دسته‌بندی‌های پیش‌فرض ======
createDefaultCategories();

console.log("🤖 AI-Powered Financial Bot is up and running…");
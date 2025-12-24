const TelegramBot = require("node-telegram-bot-api");
const mongoose = require("mongoose");
const Category = require("./models/Category");
const User = require("./models/User");
const AIService = require("./ai-service");
require("dotenv").config();
const moment = require('moment-jalaali');

const TOKEN = process.env.TOKEN;
const MONGO_URI = process.env.MONGO_URI;
const OPENROUTER_API_KEY = process.env.AI_KEY;

const aiService = new AIService(OPENROUTER_API_KEY);

mongoose.connect(MONGO_URI).then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

const bot = new TelegramBot(TOKEN, { 
  polling: {
    interval: 1000,
    autoStart: true,
    params: {
      timeout: 10
    }
  }
});

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

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  
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
    `🤖 سلام ${user.firstName}! من دستیار مالی فوق‌العاده هوشمند شما هستم! 🎉✨\n\n` +
    `💬 دیگه نیازی به دکمه زدن نیست! فقط با من چت کن و من همه کارهات رو انجام میدم.\n\n` +
    `📅 امروز: ${moment().format('jYYYY/jMM/jDD')}\n\n` +
    `🚀 قدرت‌های من:\n\n` +
    `💰 مدیریت مالی:\n` +
    `• ثبت تراکنش‌های درآمد و هزینه\n` +
    `• انتقال پول بین حساب‌ها\n` +
    `• تراکنش‌های تکراری (روزانه، هفتگی، ماهانه)\n\n` +
    `📊 گزارش‌ها و تحلیل:\n` +
    `• گزارش‌های کامل (هفته، ماه، سال)\n` +
    `• تحلیل روند مالی\n` +
    `• مقایسه دوره‌های مختلف\n` +
    `• آمار دسته‌بندی‌ها\n` +
    `• جستجوی پیشرفته\n\n` +
    `🎯 مدیریت اهداف:\n` +
    `• ایجاد و پیگیری اهداف مالی\n` +
    `• بررسی پیشرفت\n\n` +
    `💡 نصیحت و مشاوره:\n` +
    `• نصیحت‌های شخصی‌سازی شده\n` +
    `• پیشنهادهای مالی هوشمند\n\n` +
    `💡 نمونه دستورات:\n` +
    `• "215 هزار هزینه غذا کردم"\n` +
    `• "گزارش کامل این ماه"\n` +
    `• "نسبت به ماه قبل چقدر خرج کردم؟"\n` +
    `• "روند هزینه‌هام چطوریه؟"\n` +
    `• "200 هزار از بلو به کش ببر"\n` +
    `• "یه هدف 10 میلیونی برای خرید ماشین تا پایان سال بذار"\n` +
    `• "چیکار کنم پول بیشتری پس‌انداز کنم؟"\n` +
    `• "هزینه‌های غذا رو نشون بده"\n\n` +
    `چیکار برات انجام بدم؟ 🤗`,
    {
      reply_markup: {
        remove_keyboard: true
      }
    }
  );
});

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  
  if (msg.text && msg.text.startsWith('/start')) {
    return;
  }
  
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
  
  if (!text) {
    return;
  }

  try {
    await bot.sendChatAction(chatId, 'typing');
    
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

createDefaultCategories();

console.log("🤖 AI-Powered Financial Bot is up and running…");
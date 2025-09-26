const TelegramBot = require("node-telegram-bot-api");
const mongoose = require("mongoose");
const Transaction = require("./models/Transaction");
const Account = require("./models/Account");
const Category = require("./models/Category");
const Goal = require("./models/Goal");
require("dotenv").config();
const moment = require('moment-jalaali');   

// ====== تنظیمات ======
const TOKEN = process.env.TOKEN;
const CHAT_ID = +process.env.CHAT_ID;
const MONGO_URI = process.env.MONGO_URI;

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

// ====== ذخیره وضعیت کاربران ======
const userStates = {};

// ====== رنگ‌های پیش‌فرض برای دسته‌ها ======
const categoryColors = {
  'غذا': '#FF6384',
  'حمل‌ونقل': '#36A2EB', 
  'خرید': '#FFCE56',
  'تفریح': '#4BC0C0',
  'پزشکی': '#9966FF',
  'آموزش': '#FF9F40',
  'حقوق': '#4BC0C0',
  'سایر': '#C9CBCF'
};

// ====== دستور شروع ======
bot.onText(/\/start/, (msg) => {
  if (msg.chat.id !== CHAT_ID) return;
  
  delete userStates[CHAT_ID];

  bot.sendMessage(
    CHAT_ID,
    "🤖 ربات حسابداری پیشرفته خوش آمدید!\n\nاز دکمه‌های زیر استفاده کنید:",
    {
      reply_markup: {
        keyboard: [
          ["➕ افزودن تراکنش", "📋 لیست تراکنش‌ها"],
          ["🏦 مدیریت حساب‌ها", "📊 گزارش‌گیری"],
          ["🎯 اهداف مالی", "⚙️ تنظیمات"],
          ["ℹ️ راهنما"]
        ],
        resize_keyboard: true,
        one_time_keyboard: false,
      },
    }
  );
});

// ====== مدیریت پیام‌ها ======
bot.on("message", async (msg) => {
  if (msg.chat.id !== CHAT_ID) return;

  const text = msg.text.trim();
  const chatId = msg.chat.id;

  // ====== دکمه افزودن تراکنش ======
  if (text === "➕ افزودن تراکنش") {
    userStates[chatId] = { step: 'type', data: {} };
    
    bot.sendMessage(
      chatId,
      "🔸 نوع تراکنش را انتخاب کنید:",
      {
        reply_markup: {
          keyboard: [
            ["💰 درآمد", "💸 هزینه", "🔄 انتقال"],
            ["❌ انصراف"]
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }
    );
    return;
  }

  // ====== انتخاب نوع تراکنش ======
  if (text === "💰 درآمد" || text === "💸 هزینه" || text === "🔄 انتقال") {
    if (userStates[chatId]?.step === 'type') {
      userStates[chatId].data.type = text === "💰 درآمد" ? "income" : 
                                   text === "💸 هزینه" ? "expense" : "transfer";
      userStates[chatId].step = 'account';
      
      // دریافت لیست حساب‌ها
      const accounts = await Account.find({ isActive: true });
      if (accounts.length === 0) {
        return bot.sendMessage(chatId, "❌ ابتدا باید حساب ایجاد کنید. از منوی '🏦 مدیریت حساب‌ها' استفاده کنید.");
      }
      
      const accountButtons = accounts.map(acc => `${acc.icon || '🏦'} ${acc.name}`);
      accountButtons.push("❌ انصراف");
      
      bot.sendMessage(
        chatId,
        "🏦 حساب را انتخاب کنید:",
        {
          reply_markup: {
            keyboard: [accountButtons],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        }
      );
    }
    return;
  }

  // ====== انتخاب حساب ======
  if (userStates[chatId]?.step === 'account' && !text.startsWith("❌")) {
    const accounts = await Account.find({ isActive: true });
    const selectedAccount = accounts.find(acc => text.includes(acc.name));
    
    if (!selectedAccount) {
      return bot.sendMessage(chatId, "❌ حساب نامعتبر است.");
    }
    
    userStates[chatId].data.account = selectedAccount._id;
    userStates[chatId].step = 'title';
    
    bot.sendMessage(
      chatId,
      "📝 عنوان تراکنش را وارد کنید:",
      {
        reply_markup: {
          keyboard: [["❌ انصراف"]],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }
    );
    return;
  }

  // ====== دریافت عنوان ======
  if (userStates[chatId]?.step === 'title' && !text.startsWith("❌")) {
    userStates[chatId].data.title = text;
    userStates[chatId].step = 'amount';
    
    bot.sendMessage(
      chatId,
      "💰 مبلغ تراکنش را وارد کنید (فقط عدد):",
      {
        reply_markup: {
          keyboard: [["❌ انصراف"]],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }
    );
    return;
  }

  // ====== دریافت مبلغ ======
  if (userStates[chatId]?.step === 'amount' && !text.startsWith("❌")) {
    const amount = parseInt(text);
    if (isNaN(amount) || amount <= 0) {
      return bot.sendMessage(chatId, "❌ مبلغ نامعتبر است. لطفاً عدد صحیح وارد کنید.");
    }
    
    userStates[chatId].data.amount = amount;
    userStates[chatId].step = 'category';
    
    // دریافت لیست دسته‌بندی‌ها
    const categories = await Category.find({ 
      type: userStates[chatId].data.type === 'transfer' ? 'expense' : userStates[chatId].data.type 
    });
    
    const categoryButtons = categories.map(cat => `${cat.icon} ${cat.name}`);
    categoryButtons.push("❌ انصراف");
    
    bot.sendMessage(
      chatId,
      "🏷️ دسته‌بندی را انتخاب کنید:",
      {
        reply_markup: {
          keyboard: [categoryButtons],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }
    );
    return;
  }

  // ====== انتخاب دسته‌بندی ======
  if (userStates[chatId]?.step === 'category' && !text.startsWith("❌")) {
    const categories = await Category.find({ 
      type: userStates[chatId].data.type === 'transfer' ? 'expense' : userStates[chatId].data.type 
    });
    const selectedCategory = categories.find(cat => text.includes(cat.name));
    
    if (!selectedCategory) {
      return bot.sendMessage(chatId, "❌ دسته‌بندی نامعتبر است.");
    }
    
    userStates[chatId].data.category = selectedCategory._id;
    userStates[chatId].step = 'description';
    
    bot.sendMessage(
      chatId,
      "📄 توضیحات تراکنش (اختیاری):",
      {
        reply_markup: {
          keyboard: [["❌ انصراف"]],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }
    );
    return;
  }

  // ====== دریافت توضیحات و ذخیره ======
  if (userStates[chatId]?.step === 'description' && !text.startsWith("❌")) {
    userStates[chatId].data.description = text;
    
    try {
      const transaction = new Transaction({
        type: userStates[chatId].data.type,
        amount: userStates[chatId].data.amount,
        title: userStates[chatId].data.title,
        description: userStates[chatId].data.description,
        category: userStates[chatId].data.category,
        account: userStates[chatId].data.account,
        date: new Date(),
      });

      await transaction.save();
      
      // به‌روزرسانی مانده حساب
      const account = await Account.findById(userStates[chatId].data.account);
      if (userStates[chatId].data.type === 'income') {
        account.balance += userStates[chatId].data.amount;
      } else if (userStates[chatId].data.type === 'expense') {
        account.balance -= userStates[chatId].data.amount;
      }
      await account.save();
      
      // به‌روزرسانی تعداد استفاده دسته‌بندی
      await Category.findByIdAndUpdate(userStates[chatId].data.category, {
        $inc: { usageCount: 1 }
      });
      
      delete userStates[chatId];
      
      bot.sendMessage(
        chatId,
        `✅ تراکنش با موفقیت ثبت شد!\n\n` +
        `📝 عنوان: ${transaction.title}\n` +
        `💰 مبلغ: ${transaction.amount.toLocaleString()} تومان\n` +
        `📊 نوع: ${transaction.type === 'income' ? 'درآمد' : 'هزینه'}\n` +
        `🏦 حساب: ${account.name}\n` +
        `💳 مانده: ${account.balance.toLocaleString()} تومان`,
        {
          reply_markup: {
            keyboard: [
              ["➕ افزودن تراکنش", "📋 لیست تراکنش‌ها"],
              ["🏦 مدیریت حساب‌ها", "📊 گزارش‌گیری"],
              ["🎯 اهداف مالی", "⚙️ تنظیمات"],
              ["ℹ️ راهنما"]
            ],
            resize_keyboard: true,
            one_time_keyboard: false,
          },
        }
      );
    } catch (err) {
      console.error(err);
      bot.sendMessage(chatId, "❌ خطا در ذخیره تراکنش. لطفاً دوباره تلاش کنید.");
    }
    return;
  }

  // ====== مدیریت حساب‌ها ======
  if (text === "🏦 مدیریت حساب‌ها") {
    const accounts = await Account.find({ isActive: true });
    
    if (accounts.length === 0) {
      bot.sendMessage(
        chatId,
        "🏦 هیچ حسابی وجود ندارد.\n\nحساب جدید ایجاد کنید:",
        {
          reply_markup: {
            keyboard: [
              ["➕ ایجاد حساب جدید"],
              ["🔙 بازگشت"]
            ],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        }
      );
    } else {
      let accountList = "🏦 لیست حساب‌ها:\n\n";
      for (const acc of accounts) {
        accountList += `${acc.icon || '🏦'} ${acc.name}\n`;
        accountList += `💰 مانده: ${acc.balance.toLocaleString()} تومان\n`;
        accountList += `📊 نوع: ${acc.type === 'cash' ? 'نقدی' : acc.type === 'bank' ? 'بانکی' : acc.type === 'card' ? 'کارت' : 'پس‌انداز'}\n\n`;
      }
      
      bot.sendMessage(
        chatId,
        accountList,
        {
          reply_markup: {
            keyboard: [
              ["➕ ایجاد حساب جدید", "📊 گزارش حساب‌ها"],
              ["🔙 بازگشت"]
            ],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        }
      );
    }
    return;
  }

  // ====== ایجاد حساب جدید ======
  if (text === "➕ ایجاد حساب جدید") {
    userStates[chatId] = { step: 'new_account_name', data: {} };
    
    bot.sendMessage(
      chatId,
      "📝 نام حساب را وارد کنید:\nمثال: حساب جاری، کیف پول، کارت اعتباری",
      {
        reply_markup: {
          keyboard: [["❌ انصراف"]],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }
    );
    return;
  }

  // ====== دریافت نام حساب جدید ======
  if (userStates[chatId]?.step === 'new_account_name' && !text.startsWith("❌")) {
    userStates[chatId].data.name = text;
    userStates[chatId].step = 'new_account_type';
    
    bot.sendMessage(
      chatId,
      "🏦 نوع حساب را انتخاب کنید:",
      {
        reply_markup: {
          keyboard: [
            ["💵 نقدی", "🏦 بانکی", "💳 کارت", "💰 پس‌انداز"],
            ["❌ انصراف"]
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }
    );
    return;
  }

  // ====== دریافت نوع حساب جدید ======
  if (userStates[chatId]?.step === 'new_account_type' && !text.startsWith("❌")) {
    const typeMap = {
      '💵 نقدی': 'cash',
      '🏦 بانکی': 'bank', 
      '💳 کارت': 'card',
      '💰 پس‌انداز': 'savings'
    };
    
    userStates[chatId].data.type = typeMap[text];
    userStates[chatId].step = 'new_account_balance';
    
    bot.sendMessage(
      chatId,
      "💰 مانده اولیه حساب را وارد کنید (اختیاری - فقط عدد):",
      {
        reply_markup: {
          keyboard: [["❌ انصراف"]],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }
    );
    return;
  }

  // ====== دریافت مانده اولیه و ایجاد حساب ======
  if (userStates[chatId]?.step === 'new_account_balance' && !text.startsWith("❌")) {
    const balance = text === '' ? 0 : parseInt(text) || 0;
    
    try {
      const account = new Account({
        name: userStates[chatId].data.name,
        type: userStates[chatId].data.type,
        balance: balance
      });
      
      await account.save();
      delete userStates[chatId];
      
      bot.sendMessage(
        chatId,
        `✅ حساب "${account.name}" با موفقیت ایجاد شد!\n💰 مانده: ${account.balance.toLocaleString()} تومان`,
        {
          reply_markup: {
            keyboard: [
              ["➕ افزودن تراکنش", "📋 لیست تراکنش‌ها"],
              ["🏦 مدیریت حساب‌ها", "📊 گزارش‌گیری"],
              ["🎯 اهداف مالی", "⚙️ تنظیمات"],
              ["ℹ️ راهنما"]
            ],
            resize_keyboard: true,
            one_time_keyboard: false,
          },
        }
      );
    } catch (err) {
      console.error(err);
      bot.sendMessage(chatId, "❌ خطا در ایجاد حساب.");
    }
    return;
  }

  // ====== گزارش‌گیری ======
  if (text === "📊 گزارش‌گیری") {
    bot.sendMessage(
      chatId,
      "📊 نوع گزارش را انتخاب کنید:",
      {
        reply_markup: {
          keyboard: [
            ["📅 گزارش ماهانه", "📈 مقایسه ماه‌ها"],
            ["🏷️ گزارش دسته‌بندی", "💰 گزارش حساب‌ها"],
            ["🔙 بازگشت"]
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }
    );
    return;
  }

  // ====== گزارش ماهانه ======
  if (text === "📅 گزارش ماهانه") {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const start = new Date(currentYear, currentMonth, 1);
    const end = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

    try {
      const transactions = await Transaction.find({
        date: { $gte: start, $lte: end },
      }).populate('category account').sort({ date: -1 });

      if (!transactions.length) {
        return bot.sendMessage(chatId, "📭 هیچ تراکنشی در این ماه یافت نشد.");
      }

      let report = `📆 گزارش ماهانه:\n\n`;
      let totalIncome = 0;
      let totalExpense = 0;

      for (const tx of transactions) {
        const persianDate = moment(tx.date).format('jYYYY/jMM/jDD');
        const line = `• ${tx.title}\n` +
          `💰 ${tx.amount.toLocaleString()} تومان | ` +
          `${tx.type === "income" ? "➕ درآمد" : "➖ هزینه"}\n` +
          `📅 ${persianDate} | 🏦 ${tx.account?.name || 'نامشخص'}\n` +
          `${tx.description ? `📄 ${tx.description}\n` : ''}\n`;
        report += line;
        
        if (tx.type === "income") totalIncome += tx.amount;
        else totalExpense += tx.amount;
      }

      report += `\n📊 خلاصه ماه:\n`;
      report += `💰 جمع درآمد: ${totalIncome.toLocaleString()} تومان\n`;
      report += `💸 جمع هزینه: ${totalExpense.toLocaleString()} تومان\n`;
      report += `💼 مانده: ${(totalIncome - totalExpense).toLocaleString()} تومان`;

      if (report.length > 4000) {
        const chunks = report.match(/[\s\S]{1,4000}/g) || [];
        for (let i = 0; i < chunks.length; i++) {
          await bot.sendMessage(chatId, chunks[i]);
        }
      } else {
        bot.sendMessage(chatId, report);
      }
    } catch (err) {
      console.error(err);
      bot.sendMessage(chatId, "❌ خطا در دریافت گزارش.");
    }
    return;
  }

  // ====== مقایسه ماه‌ها ======
  if (text === "📈 مقایسه ماه‌ها") {
    try {
      const currentMonth = moment();
      const lastMonth = moment().subtract(1, 'month');
      
      // گزارش ماه جاری
      const currentStart = currentMonth.startOf('month').toDate();
      const currentEnd = currentMonth.endOf('month').toDate();
      
      const currentTransactions = await Transaction.find({
        date: { $gte: currentStart, $lte: currentEnd }
      });
      
      // گزارش ماه قبل
      const lastStart = lastMonth.startOf('month').toDate();
      const lastEnd = lastMonth.endOf('month').toDate();
      
      const lastTransactions = await Transaction.find({
        date: { $gte: lastStart, $lte: lastEnd }
      });
      
      // محاسبه آمار
      const currentIncome = currentTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const currentExpense = currentTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      
      const lastIncome = lastTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const lastExpense = lastTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      
      const incomeChange = currentIncome - lastIncome;
      const expenseChange = currentExpense - lastExpense;
      
      let report = `📈 مقایسه ماه‌ها:\n\n`;
      report += `📅 ماه جاری (${currentMonth.format('jYYYY/jMM')}):\n`;
      report += `💰 درآمد: ${currentIncome.toLocaleString()} تومان\n`;
      report += `💸 هزینه: ${currentExpense.toLocaleString()} تومان\n`;
      report += `💼 مانده: ${(currentIncome - currentExpense).toLocaleString()} تومان\n\n`;
      
      report += `📅 ماه قبل (${lastMonth.format('jYYYY/jMM')}):\n`;
      report += `💰 درآمد: ${lastIncome.toLocaleString()} تومان\n`;
      report += `💸 هزینه: ${lastExpense.toLocaleString()} تومان\n`;
      report += `💼 مانده: ${(lastIncome - lastExpense).toLocaleString()} تومان\n\n`;
      
      report += `📊 تغییرات:\n`;
      report += `💰 درآمد: ${incomeChange >= 0 ? '+' : ''}${incomeChange.toLocaleString()} تومان\n`;
      report += `💸 هزینه: ${expenseChange >= 0 ? '+' : ''}${expenseChange.toLocaleString()} تومان\n`;
      
      bot.sendMessage(chatId, report);
  } catch (err) {
    console.error(err);
      bot.sendMessage(chatId, "❌ خطا در ایجاد مقایسه.");
    }
    return;
  }

  // ====== اهداف مالی ======
  if (text === "🎯 اهداف مالی") {
    const goals = await Goal.find({ isCompleted: false });
    
    if (goals.length === 0) {
      bot.sendMessage(
        chatId,
        "🎯 هیچ هدف مالی تعریف نشده.\n\nهدف جدید ایجاد کنید:",
        {
          reply_markup: {
            keyboard: [
              ["➕ ایجاد هدف جدید"],
              ["🔙 بازگشت"]
            ],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        }
      );
    } else {
      let goalsList = "🎯 اهداف مالی:\n\n";
      for (const goal of goals) {
        const progress = Math.round((goal.currentAmount / goal.targetAmount) * 100);
        goalsList += `🎯 ${goal.title}\n`;
        goalsList += `💰 پیشرفت: ${goal.currentAmount.toLocaleString()} / ${goal.targetAmount.toLocaleString()} تومان\n`;
        goalsList += `📊 درصد: ${progress}%\n`;
        goalsList += `📅 مهلت: ${goal.deadline ? moment(goal.deadline).format('jYYYY/jMM/jDD') : 'تعیین نشده'}\n\n`;
      }
      
      bot.sendMessage(
        chatId,
        goalsList,
        {
          reply_markup: {
            keyboard: [
              ["➕ ایجاد هدف جدید", "📊 گزارش اهداف"],
              ["🔙 بازگشت"]
            ],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        }
      );
    }
    return;
  }

  // ====== انصراف ======
  if (text === "❌ انصراف" || text === "🔙 بازگشت") {
    delete userStates[chatId];
    bot.sendMessage(
      chatId,
      "🔙 بازگشت به منوی اصلی",
      {
        reply_markup: {
          keyboard: [
            ["➕ افزودن تراکنش", "📋 لیست تراکنش‌ها"],
            ["🏦 مدیریت حساب‌ها", "📊 گزارش‌گیری"],
            ["🎯 اهداف مالی", "⚙️ تنظیمات"],
            ["ℹ️ راهنما"]
          ],
          resize_keyboard: true,
          one_time_keyboard: false,
        },
      }
    );
    return;
  }

  // ====== راهنما ======
  if (text === "ℹ️ راهنما") {
    bot.sendMessage(
      chatId,
      `📚 راهنمای استفاده:\n\n` +
      `➕ افزودن تراکنش: ثبت درآمد، هزینه یا انتقال\n` +
      `🏦 مدیریت حساب‌ها: ایجاد و مدیریت حساب‌های مختلف\n` +
      `📊 گزارش‌گیری: گزارش‌های تفصیلی و مقایسه‌ای\n` +
      `🎯 اهداف مالی: تعریف و پیگیری اهداف مالی\n` +
      `⚙️ تنظیمات: تنظیم دسته‌بندی‌ها و رنگ‌ها\n\n` +
      `💡 نکته: ابتدا حساب ایجاد کنید، سپس تراکنش ثبت کنید.`
    );
    return;
  }

  // ====== اگر در حال ثبت تراکنش هستیم و پیام نامعتبر ======
  if (userStates[chatId]) {
    bot.sendMessage(chatId, "❌ لطفاً از دکمه‌های موجود استفاده کنید یا 'انصراف' را بزنید.");
    return;
  }
});

// ====== ایجاد دسته‌بندی‌های پیش‌فرض ======
async function createDefaultCategories() {
  try {
    const defaultCategories = [
      { name: 'غذا', type: 'expense', color: '#FF6384', icon: '🍕' },
      { name: 'حمل‌ونقل', type: 'expense', color: '#36A2EB', icon: '🚗' },
      { name: 'خرید', type: 'expense', color: '#FFCE56', icon: '🛍️' },
      { name: 'تفریح', type: 'expense', color: '#4BC0C0', icon: '🎮' },
      { name: 'پزشکی', type: 'expense', color: '#9966FF', icon: '🏥' },
      { name: 'آموزش', type: 'expense', color: '#FF9F40', icon: '📚' },
      { name: 'حقوق', type: 'income', color: '#4BC0C0', icon: '💰' },
      { name: 'سایر', type: 'expense', color: '#C9CBCF', icon: '📁' }
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

console.log("🤖 Advanced Bot is up and running…");
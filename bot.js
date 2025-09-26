const TelegramBot = require("node-telegram-bot-api");
const mongoose = require("mongoose");
const Transaction = require("./models/Transaction");
const Account = require("./models/Account");
const Category = require("./models/Category");
const Goal = require("./models/Goal");
const User = require("./models/User");
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
  
  delete userStates[chatId];

  bot.sendMessage(
    chatId,
    `🤖 ربات حسابداری پیشرفته خوش آمدید!\n\n👤 کاربر: ${user.firstName}\n📅 تاریخ: ${moment().format('jYYYY/jMM/jDD')}\n\nاز دکمه‌های زیر استفاده کنید:`,
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
  const chatId = msg.chat.id;
  
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

  const text = msg.text.trim();

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
      const accounts = await Account.find({ userId: user._id, isActive: true });
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
    const accounts = await Account.find({ userId: user._id, isActive: true });
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
        userId: user._id,
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
    const accounts = await Account.find({ userId: user._id, isActive: true });
    
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
        userId: user._id,
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
        userId: user._id,
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
        userId: user._id,
        date: { $gte: currentStart, $lte: currentEnd }
      });
      
      // گزارش ماه قبل
      const lastStart = lastMonth.startOf('month').toDate();
      const lastEnd = lastMonth.endOf('month').toDate();
      
      const lastTransactions = await Transaction.find({
        userId: user._id,
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
    const goals = await Goal.find({ userId: user._id, isCompleted: false });
    
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

  // ====== ایجاد هدف جدید ======
  if (text === "➕ ایجاد هدف جدید") {
    userStates[chatId] = { step: 'new_goal_title', data: {} };
    
    bot.sendMessage(
      chatId,
      "🎯 عنوان هدف را وارد کنید:\nمثال: خرید لپ‌تاپ، سفر به اروپا، پس‌انداز اضطراری",
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

  // ====== دریافت عنوان هدف جدید ======
  if (userStates[chatId]?.step === 'new_goal_title' && !text.startsWith("❌")) {
    userStates[chatId].data.title = text;
    userStates[chatId].step = 'new_goal_amount';
    
    bot.sendMessage(
      chatId,
      "💰 مبلغ هدف را وارد کنید (فقط عدد):",
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

  // ====== دریافت مبلغ هدف جدید ======
  if (userStates[chatId]?.step === 'new_goal_amount' && !text.startsWith("❌")) {
    const amount = parseInt(text);
    if (isNaN(amount) || amount <= 0) {
      return bot.sendMessage(chatId, "❌ مبلغ نامعتبر است. لطفاً عدد صحیح وارد کنید.");
    }
    
    userStates[chatId].data.targetAmount = amount;
    userStates[chatId].step = 'new_goal_type';
    
    bot.sendMessage(
      chatId,
      "🎯 نوع هدف را انتخاب کنید:",
      {
        reply_markup: {
          keyboard: [
            ["💰 پس‌انداز", "💸 محدودیت هزینه", "📈 هدف درآمد"],
            ["❌ انصراف"]
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }
    );
    return;
  }

  // ====== دریافت نوع هدف جدید ======
  if (userStates[chatId]?.step === 'new_goal_type' && !text.startsWith("❌")) {
    const typeMap = {
      '💰 پس‌انداز': 'savings',
      '💸 محدودیت هزینه': 'expense_limit',
      '📈 هدف درآمد': 'income_target'
    };
    
    userStates[chatId].data.type = typeMap[text];
    userStates[chatId].step = 'new_goal_deadline';
    
    bot.sendMessage(
      chatId,
      "📅 مهلت هدف (اختیاری - فرمت: YYYY-MM-DD):\nاگر مهلت ندارید، 'ندارد' بنویسید",
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

  // ====== دریافت مهلت هدف جدید ======
  if (userStates[chatId]?.step === 'new_goal_deadline' && !text.startsWith("❌")) {
    let deadline = null;
    if (text !== 'ندارد') {
      deadline = new Date(text);
      if (isNaN(deadline.getTime())) {
        return bot.sendMessage(chatId, "❌ فرمت تاریخ نامعتبر است. لطفاً دوباره تلاش کنید.");
      }
    }
    
    try {
      const goal = new Goal({
        userId: user._id,
        title: userStates[chatId].data.title,
        targetAmount: userStates[chatId].data.targetAmount,
        type: userStates[chatId].data.type,
        deadline: deadline
      });
      
      await goal.save();
      delete userStates[chatId];
      
      bot.sendMessage(
        chatId,
        `✅ هدف "${goal.title}" با موفقیت ایجاد شد!\n💰 مبلغ: ${goal.targetAmount.toLocaleString()} تومان\n📅 مهلت: ${deadline ? moment(deadline).format('jYYYY/jMM/jDD') : 'تعیین نشده'}`,
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
      bot.sendMessage(chatId, "❌ خطا در ایجاد هدف.");
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

  // ====== تنظیمات ======
  if (text === "⚙️ تنظیمات") {
    bot.sendMessage(
      chatId,
      "⚙️ تنظیمات:\n\n" +
      "👤 اطلاعات کاربر:\n" +
      `نام: ${user.firstName} ${user.lastName || ''}\n` +
      `نام کاربری: @${user.username || 'ندارد'}\n` +
      `آخرین فعالیت: ${moment(user.lastActivity).format('jYYYY/jMM/jDD HH:mm')}\n\n` +
      "از دکمه‌های زیر استفاده کنید:",
      {
        reply_markup: {
          keyboard: [
            ["🏷️ مدیریت دسته‌بندی‌ها", "📊 آمار کلی"],
            ["🔙 بازگشت"]
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }
    );
    return;
  }

  // ====== مدیریت دسته‌بندی‌ها ======
  if (text === "🏷️ مدیریت دسته‌بندی‌ها") {
    const categories = await Category.find({ isDefault: true });
    
    let categoryList = "🏷️ دسته‌بندی‌های موجود:\n\n";
    for (const cat of categories) {
      categoryList += `${cat.icon} ${cat.name}\n`;
      categoryList += `📊 استفاده: ${cat.usageCount} بار\n`;
      categoryList += `🎨 رنگ: ${cat.color}\n\n`;
    }
    
    bot.sendMessage(
      chatId,
      categoryList,
      {
        reply_markup: {
          keyboard: [
            ["➕ افزودن دسته جدید", "🎨 تغییر رنگ دسته‌ها"],
            ["🔙 بازگشت"]
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }
    );
    return;
  }

  // ====== گزارش دسته‌بندی ======
  if (text === "🏷️ گزارش دسته‌بندی") {
    try {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const start = new Date(currentYear, currentMonth, 1);
      const end = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

      const transactions = await Transaction.find({
        userId: user._id,
        date: { $gte: start, $lte: end },
        type: "expense"
      }).populate('category');

      if (!transactions.length) {
        return bot.sendMessage(chatId, "📭 هیچ هزینه‌ای در این ماه یافت نشد.");
      }

      // جمع‌آوری آمار دسته‌بندی‌ها
      const categoryStats = {};
      let totalExpense = 0;

      for (const tx of transactions) {
        const categoryName = tx.category?.name || 'سایر';
        if (!categoryStats[categoryName]) {
          categoryStats[categoryName] = { amount: 0, count: 0 };
        }
        categoryStats[categoryName].amount += tx.amount;
        categoryStats[categoryName].count += 1;
        totalExpense += tx.amount;
      }

      let report = `🏷️ گزارش دسته‌بندی ماه جاری:\n\n`;
      
      // مرتب‌سازی بر اساس مبلغ
      const sortedCategories = Object.entries(categoryStats)
        .sort(([,a], [,b]) => b.amount - a.amount);

      for (const [categoryName, stats] of sortedCategories) {
        const percentage = Math.round((stats.amount / totalExpense) * 100);
        const bar = '█'.repeat(Math.round(percentage / 5));
        report += `${categoryName}:\n`;
        report += `💰 ${stats.amount.toLocaleString()} تومان (${percentage}%)\n`;
        report += `📊 ${stats.count} تراکنش\n`;
        report += `📈 ${bar} ${percentage}%\n\n`;
      }

      report += `\n📊 خلاصه:\n`;
      report += `💸 کل هزینه: ${totalExpense.toLocaleString()} تومان\n`;
      report += `🏷️ تعداد دسته: ${sortedCategories.length} دسته`;

      bot.sendMessage(chatId, report);
    } catch (err) {
      console.error(err);
      bot.sendMessage(chatId, "❌ خطا در دریافت گزارش دسته‌بندی.");
    }
    return;
  }

  // ====== گزارش حساب‌ها ======
  if (text === "💰 گزارش حساب‌ها") {
    try {
      const accounts = await Account.find({ userId: user._id, isActive: true });
      
      if (!accounts.length) {
        return bot.sendMessage(chatId, "🏦 هیچ حسابی یافت نشد.");
      }

      let report = `💰 گزارش حساب‌ها:\n\n`;
      let totalBalance = 0;

      for (const account of accounts) {
        const transactions = await Transaction.find({
          userId: user._id,
          account: account._id
        });

        const income = transactions
          .filter(t => t.type === 'income')
          .reduce((sum, t) => sum + t.amount, 0);
        
        const expense = transactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0);

        report += `🏦 ${account.name}\n`;
        report += `💰 مانده: ${account.balance.toLocaleString()} تومان\n`;
        report += `📈 درآمد: ${income.toLocaleString()} تومان\n`;
        report += `📉 هزینه: ${expense.toLocaleString()} تومان\n`;
        report += `📊 تراکنش: ${transactions.length} عدد\n\n`;
        
        totalBalance += account.balance;
      }

      report += `📊 خلاصه:\n`;
      report += `💰 کل مانده: ${totalBalance.toLocaleString()} تومان\n`;
      report += `🏦 تعداد حساب: ${accounts.length} حساب`;

      bot.sendMessage(chatId, report);
    } catch (err) {
      console.error(err);
      bot.sendMessage(chatId, "❌ خطا در دریافت گزارش حساب‌ها.");
    }
    return;
  }

  // ====== گزارش اهداف ======
  if (text === "📊 گزارش اهداف") {
    try {
      const goals = await Goal.find({ userId: user._id });
      
      if (!goals.length) {
        return bot.sendMessage(chatId, "🎯 هیچ هدفی تعریف نشده.");
      }

      let report = `🎯 گزارش اهداف:\n\n`;
      let completedGoals = 0;
      let totalTarget = 0;
      let totalCurrent = 0;

      for (const goal of goals) {
        const progress = Math.round((goal.currentAmount / goal.targetAmount) * 100);
        const status = goal.isCompleted ? '✅ تکمیل شده' : 
                      progress >= 80 ? '🟡 نزدیک به تکمیل' :
                      progress >= 50 ? '🟠 در حال پیشرفت' : '🔴 شروع شده';
        
        report += `🎯 ${goal.title}\n`;
        report += `💰 ${goal.currentAmount.toLocaleString()} / ${goal.targetAmount.toLocaleString()} تومان\n`;
        report += `📊 ${progress}% ${'█'.repeat(Math.round(progress / 10))}\n`;
        report += `📅 مهلت: ${goal.deadline ? moment(goal.deadline).format('jYYYY/jMM/jDD') : 'تعیین نشده'}\n`;
        report += `📈 وضعیت: ${status}\n\n`;
        
        if (goal.isCompleted) completedGoals++;
        totalTarget += goal.targetAmount;
        totalCurrent += goal.currentAmount;
      }

      const overallProgress = Math.round((totalCurrent / totalTarget) * 100);
      report += `📊 خلاصه اهداف:\n`;
      report += `✅ تکمیل شده: ${completedGoals} از ${goals.length}\n`;
      report += `📈 پیشرفت کلی: ${overallProgress}%\n`;
      report += `💰 کل هدف: ${totalTarget.toLocaleString()} تومان\n`;
      report += `💰 کل جمع‌آوری: ${totalCurrent.toLocaleString()} تومان`;

      bot.sendMessage(chatId, report);
    } catch (err) {
      console.error(err);
      bot.sendMessage(chatId, "❌ خطا در دریافت گزارش اهداف.");
    }
    return;
  }

  // ====== آمار کلی ======
  if (text === "📊 آمار کلی") {
    try {
      const totalTransactions = await Transaction.countDocuments({ userId: user._id });
      const totalAccounts = await Account.countDocuments({ userId: user._id });
      const totalGoals = await Goal.countDocuments({ userId: user._id });
      
      const thisMonth = moment().startOf('month');
      const thisMonthTransactions = await Transaction.find({
        userId: user._id,
        date: { $gte: thisMonth.toDate() }
      });
      
      const thisMonthIncome = thisMonthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const thisMonthExpense = thisMonthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      
      let stats = `📊 آمار کلی:\n\n`;
      stats += `👤 کاربر: ${user.firstName}\n`;
      stats += `📅 عضویت: ${moment(user.createdAt).format('jYYYY/jMM/jDD')}\n\n`;
      stats += `📈 آمار ماه جاری:\n`;
      stats += `💰 درآمد: ${thisMonthIncome.toLocaleString()} تومان\n`;
      stats += `💸 هزینه: ${thisMonthExpense.toLocaleString()} تومان\n`;
      stats += `💼 مانده: ${(thisMonthIncome - thisMonthExpense).toLocaleString()} تومان\n\n`;
      stats += `📊 آمار کلی:\n`;
      stats += `📝 تراکنش‌ها: ${totalTransactions} عدد\n`;
      stats += `🏦 حساب‌ها: ${totalAccounts} عدد\n`;
      stats += `🎯 اهداف: ${totalGoals} عدد\n`;
      
      bot.sendMessage(chatId, stats);
    } catch (err) {
      console.error(err);
      bot.sendMessage(chatId, "❌ خطا در دریافت آمار.");
    }
    return;
  }

  // ====== لیست تراکنش‌ها ======
  if (text === "📋 لیست تراکنش‌ها") {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const start = new Date(currentYear, currentMonth, 1);
    const end = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

    try {
      const transactions = await Transaction.find({
        userId: user._id,
        date: { $gte: start, $lte: end },
      }).populate('category account').sort({ date: -1 });

      if (!transactions.length) {
        return bot.sendMessage(chatId, "📭 هیچ تراکنشی در این ماه یافت نشد.");
      }

      let report = `📆 لیست تراکنش‌های ماه جاری:\n\n`;
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
      bot.sendMessage(chatId, "❌ خطا در دریافت لیست تراکنش‌ها.");
    }
    return;
  }

  // ====== نمودار هزینه‌ها ======
  if (text === "📊 نمودار هزینه‌ها") {
    try {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const start = new Date(currentYear, currentMonth, 1);
      const end = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

      const transactions = await Transaction.find({
        userId: user._id,
        date: { $gte: start, $lte: end },
        type: "expense"
      }).populate('category');

      if (!transactions.length) {
        return bot.sendMessage(chatId, "📭 هیچ هزینه‌ای در این ماه یافت نشد.");
      }

      // جمع‌آوری آمار دسته‌بندی‌ها
      const categoryMap = {};
      transactions.forEach((tx) => {
        const categoryName = tx.category?.name || 'سایر';
        categoryMap[categoryName] = (categoryMap[categoryName] || 0) + tx.amount;
      });

      const labels = Object.keys(categoryMap);
      const data = Object.values(categoryMap);

      const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(
        JSON.stringify({
          type: "doughnut",
          data: {
            labels,
            datasets: [
              {
                label: "هزینه‌ها",
                data,
                backgroundColor: [
                  '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
                  '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
                ]
              },
            ],
          },
          options: {
            plugins: {
              legend: { position: "right" },
              title: {
                display: true,
                text: `نمودار هزینه‌های ${moment().format('jYYYY/jMM')}`,
              },
            },
          },
        })
      )}`;

      bot.sendPhoto(chatId, chartUrl, {
        caption: `📊 نمودار هزینه‌های ${moment().format('jYYYY/jMM')}`,
      });
    } catch (err) {
      console.error(err);
      bot.sendMessage(chatId, "❌ خطا در ایجاد نمودار.");
    }
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

console.log("🤖 Advanced Bot is up and running…");
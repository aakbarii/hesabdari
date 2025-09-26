const TelegramBot = require("node-telegram-bot-api");
const mongoose = require("mongoose");
const Transaction = require("./models/Transaction");
require("dotenv").config();
const moment = require('moment-jalaali');   

// ====== تنظیمات ======
const TOKEN = process.env.TOKEN;
const CHAT_ID = +process.env.CHAT_ID;
const MONGO_URI = process.env.MONGO_URI;

// ====== اتصال به MongoDB ======
mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ====== ساخت ربات ======
const bot = new TelegramBot(TOKEN, { polling: true });

// ====== ذخیره وضعیت کاربران ======
const userStates = {};

// ====== دستور شروع ======
bot.onText(/\/start/, (msg) => {
  if (msg.chat.id !== CHAT_ID) return;
  
  // پاک کردن وضعیت قبلی
  delete userStates[CHAT_ID];
  
  bot.sendMessage(
    CHAT_ID,
    "🤖 ربات حسابداری شخصی خوش آمدید!\n\nاز دکمه‌های زیر استفاده کنید:",
    {
      reply_markup: {
        keyboard: [
          ["➕ افزودن تراکنش", "📋 لیست تراکنش‌ها"],
          ["📊 نمودار هزینه‌ها", "ℹ️ راهنما"]
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
            ["💰 درآمد", "💸 هزینه"],
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
  if (text === "💰 درآمد" || text === "💸 هزینه") {
    if (userStates[chatId]?.step === 'type') {
      userStates[chatId].data.type = text === "💰 درآمد" ? "income" : "expense";
      userStates[chatId].step = 'title';
      
      bot.sendMessage(
        chatId,
        "📝 عنوان تراکنش را وارد کنید:\nمثال: خرید نان، حقوق ماهانه، کرایه تاکسی",
        {
          reply_markup: {
            keyboard: [["❌ انصراف"]],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        }
      );
    }
    return;
  }

  // ====== دریافت عنوان ======
  if (userStates[chatId]?.step === 'title' && !text.startsWith("❌")) {
    userStates[chatId].data.title = text;
    userStates[chatId].step = 'amount';
    
    bot.sendMessage(
      chatId,
      "💰 مبلغ تراکنش را وارد کنید (فقط عدد):\nمثال: 50000",
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
    userStates[chatId].step = 'description';
    
    bot.sendMessage(
      chatId,
      "📄 توضیحات تراکنش (اختیاری):\nاگر توضیحی ندارید، 'خالی' بنویسید",
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

  // ====== دریافت توضیحات ======
  if (userStates[chatId]?.step === 'description' && !text.startsWith("❌")) {
    userStates[chatId].data.description = text === 'خالی' ? '' : text;
    userStates[chatId].step = 'category';
    
    bot.sendMessage(
      chatId,
      "🏷️ دسته‌بندی تراکنش (اختیاری):\nمثال: غذا، حمل‌ونقل، خرید، حقوق\nاگر دسته‌بندی ندارید، 'خالی' بنویسید",
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

  // ====== دریافت دسته‌بندی و ذخیره ======
  if (userStates[chatId]?.step === 'category' && !text.startsWith("❌")) {
    userStates[chatId].data.category = text === 'خالی' ? '' : text;
    
    try {
      const transaction = new Transaction({
        type: userStates[chatId].data.type,
        amount: userStates[chatId].data.amount,
        title: userStates[chatId].data.title,
        description: userStates[chatId].data.description,
        category: userStates[chatId].data.category,
        date: new Date(),
      });

      await transaction.save();
      
      // پاک کردن وضعیت
      delete userStates[chatId];
      
      bot.sendMessage(
        chatId,
        `✅ تراکنش با موفقیت ثبت شد!\n\n` +
        `📝 عنوان: ${transaction.title}\n` +
        `💰 مبلغ: ${transaction.amount.toLocaleString()} تومان\n` +
        `📊 نوع: ${transaction.type === 'income' ? 'درآمد' : 'هزینه'}\n` +
        `📄 توضیحات: ${transaction.description || 'ندارد'}\n` +
        `🏷️ دسته: ${transaction.category || 'ندارد'}`,
        {
          reply_markup: {
            keyboard: [
              ["➕ افزودن تراکنش", "📋 لیست تراکنش‌ها"],
              ["📊 نمودار هزینه‌ها", "ℹ️ راهنما"]
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

  // ====== انصراف ======
  if (text === "❌ انصراف") {
    delete userStates[chatId];
    bot.sendMessage(
      chatId,
      "❌ عملیات لغو شد.",
      {
        reply_markup: {
          keyboard: [
            ["➕ افزودن تراکنش", "📋 لیست تراکنش‌ها"],
            ["📊 نمودار هزینه‌ها", "ℹ️ راهنما"]
          ],
          resize_keyboard: true,
          one_time_keyboard: false,
        },
      }
    );
    return;
  }

  // ====== دکمه لیست تراکنش‌ها ======
  if (text === "📋 لیست تراکنش‌ها") {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const start = new Date(currentYear, currentMonth, 1);
    const end = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

    try {
      const transactions = await Transaction.find({
        date: { $gte: start, $lte: end },
      }).sort({ date: -1 });

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
          `📅 ${persianDate}\n` +
          `${tx.description ? `📄 ${tx.description}\n` : ''}` +
          `${tx.category ? `🏷️ ${tx.category}\n` : ''}\n`;
        report += line;
        
        if (tx.type === "income") totalIncome += tx.amount;
        else totalExpense += tx.amount;
      }

      report += `\n📊 خلاصه ماه:\n`;
      report += `💰 جمع درآمد: ${totalIncome.toLocaleString()} تومان\n`;
      report += `💸 جمع هزینه: ${totalExpense.toLocaleString()} تومان\n`;
      report += `💼 مانده: ${(totalIncome - totalExpense).toLocaleString()} تومان`;

      // اگر پیام خیلی طولانی باشد، آن را تقسیم کن
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

  // ====== دکمه نمودار ======
  if (text === "📊 نمودار هزینه‌ها") {
    const monthInput = moment().format("jYYYY-jMM");
    const [jy, jm] = monthInput.split("-").map(Number);
    
    try {
      const start = moment(`${jy}-${jm}-01`, "jYYYY-jMM-jDD").startOf("day").toDate();
      const end = moment(`${jy}-${jm}-01`, "jYYYY-jMM-jDD").endOf("month").toDate();

      const transactions = await Transaction.find({
        date: { $gte: start, $lte: end },
        type: "expense",
      });

      if (!transactions.length) {
        return bot.sendMessage(chatId, `❌ هیچ هزینه‌ای در ${monthInput} ثبت نشده.`);
      }

      // جمع هزینه‌ها به تفکیک دسته‌بندی
      const categoryMap = {};
      transactions.forEach((tx) => {
        const category = tx.category || 'سایر';
        categoryMap[category] = (categoryMap[category] || 0) + tx.amount;
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
                text: `نمودار هزینه‌های ${monthInput}`,
              },
            },
          },
        })
      )}`;

      bot.sendPhoto(chatId, chartUrl, {
        caption: `📊 نمودار هزینه‌های ${monthInput}`,
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
      `➕ افزودن تراکنش: برای ثبت درآمد یا هزینه جدید\n` +
      `📋 لیست تراکنش‌ها: نمایش تمام تراکنش‌های ماه جاری\n` +
      `📊 نمودار هزینه‌ها: نمودار دایره‌ای هزینه‌ها بر اساس دسته‌بندی\n\n` +
      `💡 نکته: برای افزودن تراکنش، مراحل را به ترتیب طی کنید.`
    );
    return;
  }

  // ====== اگر در حال ثبت تراکنش هستیم و پیام نامعتبر ======
  if (userStates[chatId]) {
    bot.sendMessage(chatId, "❌ لطفاً از دکمه‌های موجود استفاده کنید یا 'انصراف' را بزنید.");
    return;
  }
});

console.log("🤖 Bot is up and running…");
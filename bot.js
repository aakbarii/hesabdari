// index.js
const TelegramBot = require("node-telegram-bot-api");
const mongoose = require("mongoose");
const cron = require("node-cron");
const Transaction = require("./models/Transaction");
require("dotenv").config();
const axios = require("axios");
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

bot.onText(/\/start/, (msg) => {
  if (msg.chat.id !== CHAT_ID) return;
  bot.sendMessage(
    CHAT_ID,
    "ربات حسابداری شخصی خوش آمدید! با /add تراکنش جدید ثبت کنید."
  );
});

// دستور برای شروع افزودن
bot.onText(/\/add/, (msg) => {
  if (msg.chat.id !== CHAT_ID) return;
  bot.sendMessage(
    CHAT_ID,
    `فرمت ثبت تراکنش:\n\n` +
      `type | amount | title | description | category\n\n` +
      `مثال:\n` +
      `expense | 50000 | ناهار | ساندویچ | غذا`
  );
});

bot.onText(/\/list/, async (msg) => {
  if (msg.chat.id !== CHAT_ID) return;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // صفر تا یازده
  const start = new Date(currentYear, currentMonth, 1);
  const end = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

  console.log("📅 بازه میلادی:", start.toISOString(), "تا", end.toISOString());

  const transactions = await Transaction.find({
    date: { $gte: start, $lte: end },
  }).sort({ date: -1 });

  if (!transactions.length) {
    return bot.sendMessage(CHAT_ID, `هیچ تراکنشی در این ماه یافت نشد.`);
  }

  let report = `📆 لیست تراکنش‌ها:\n\n`;
  let totalIncome = 0;
  let totalExpense = 0;

  for (const tx of transactions) {
    const line = `• ${tx.title} (${
      tx.category
    })\n💰 ${tx.amount.toLocaleString()} تومان | ${
      tx.type === "income" ? "➕ درآمد" : "➖ هزینه"
    } | 🗓 ${tx.date.toLocaleDateString("fa-IR")}\n\n`;
    report += line;
    if (tx.type === "income") totalIncome += tx.amount;
    else totalExpense += tx.amount;
  }

  report += `\n📊 جمع درآمد: ${totalIncome.toLocaleString()} تومان`;
  report += `\n📉 جمع هزینه: ${totalExpense.toLocaleString()} تومان`;
  report += `\n💼 مانده: ${(
    totalIncome - totalExpense
  ).toLocaleString()} تومان`;

  bot.sendMessage(CHAT_ID, report);
});

bot.onText(/\/chart(?: (.+))?/, async (msg, match) => {
  if (msg.chat.id !== CHAT_ID) return;

  const monthInput = match[1] || moment().format("jYYYY-jMM");
  const [jy, jm] = monthInput.split("-").map(Number);
  if (!jy || !jm || jm < 1 || jm > 12) {
    return bot.sendMessage(
      CHAT_ID,
      "❌ فرمت تاریخ اشتباه است. مثال: /chart 1403-04"
    );
  }

  const start = moment(`${jy}-${jm}-01`, "jYYYY-jMM-jDD")
    .startOf("day")
    .toDate();
  const end = moment(`${jy}-${jm}-01`, "jYYYY-jMM-jDD").endOf("month").toDate();

  const transactions = await Transaction.find({
    date: { $gte: start, $lte: end },
    type: "expense",
  });

  if (!transactions.length) {
    return bot.sendMessage(
      CHAT_ID,
      `❌ هیچ هزینه‌ای در ${monthInput} ثبت نشده.`
    );
  }

  // جمع هزینه‌ها به تفکیک دسته‌بندی
  const categoryMap = {};
  transactions.forEach((tx) => {
    categoryMap[tx.category] = (categoryMap[tx.category] || 0) + tx.amount;
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

  bot.sendPhoto(CHAT_ID, chartUrl, {
    caption: `📊 نمودار هزینه‌های ${monthInput}`,
  });
});

bot.onText(/\/start/, (msg) => {
  if (msg.chat.id !== CHAT_ID) return;

  bot.sendMessage(
    CHAT_ID,
    "به ربات حسابداری خوش اومدی 👋\nاز دکمه‌های زیر استفاده کن:",
    {
      reply_markup: {
        keyboard: [
          ["➕ افزودن تراکنش", "📋 لیست تراکنش‌ها"],
          ["📊 نمودار هزینه‌ها"],
          ["ℹ️ راهنما"],
        ],
        resize_keyboard: true,
        one_time_keyboard: false,
      },
    }
  );
});

bot.on("message", async (msg) => {
  if (msg.chat.id !== CHAT_ID) return;

  const text = msg.text.trim();

  if (text === "➕ افزودن تراکنش") {
    return bot.sendMessage(
      CHAT_ID,
      `فرمت ثبت تراکنش:\n\n` +
        `type | amount | title | description | category\n\n` +
        `مثال:\n` +
        `expense | 50000 | ناهار | ساندویچ | غذا`
    );
  }

  if (text === "📋 لیست تراکنش‌ها") {
    const monthInput = moment().format("jYYYY-jMM");
    bot.emit("text", { chat: { id: CHAT_ID }, text: `/list ${monthInput}` });
    return;
  }

  if (text === "📊 نمودار هزینه‌ها") {
    const monthInput = moment().format("jYYYY-jMM");
    bot.emit("text", { chat: { id: CHAT_ID }, text: `/chart ${monthInput}` });
    return;
  }

  if (text === "ℹ️ راهنما") {
    return bot.sendMessage(
      CHAT_ID,
      `📚 دستورات:\n` +
        `/add → افزودن تراکنش\n` +
        `/list YYYY-MM → لیست تراکنش‌های ماه\n` +
        `/chart YYYY-MM → نمودار هزینه‌ها\n` +
        `/start → نمایش دکمه‌ها`
    );
  }

  // اگر هیچ‌کدام از دکمه‌ها نبود، فرض می‌کنیم تراکنشه
  if (text.startsWith("/")) return; // اگر دستور بود رد کن

  const parts = text.split("|").map((p) => p.trim());
  if (parts.length < 5) {
    return bot.sendMessage(CHAT_ID, "فرمت درست نیست، دوباره تلاش کن.");
  }

  const [type, amount, title, description, category] = parts;
  try {
    const tx = new Transaction({
      type,
      amount: +amount,
      title,
      description,
      category,
      date: moment().toDate(), // لحظه ثبت به زمان میلادی قابل تطابق با moment-jalaali
    });

    await tx.save();
    bot.sendMessage(CHAT_ID, "✅ تراکنش ذخیره شد!");
  } catch (err) {
    console.error(err);
    bot.sendMessage(CHAT_ID, "❌ خطا در ذخیره تراکنش.");
  }
});

console.log("🤖 Bot is up and running…");

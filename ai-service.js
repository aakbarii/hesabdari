const axios = require('axios');
const Transaction = require('./models/Transaction');
const Account = require('./models/Account');
const Category = require('./models/Category');
const Goal = require('./models/Goal');
const User = require('./models/User');
const moment = require('moment-jalaali');

class AIService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
  }

  // ======= تماس با API هوش مصنوعی =======
  async callAI(messages, functions = null) {
    try {
      const payload = {
        model: "tngtech/deepseek-r1t2-chimera:free",
        messages: messages,
        temperature: 0.7,
        max_tokens: 2000
      };

      if (functions) {
        payload.functions = functions;
        payload.function_call = "auto";
      }

      const response = await axios.post(this.apiUrl, payload, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://hesabdari-bot.com',
          'X-Title': 'Hesabdari Bot'
        }
      });

      return response.data.choices[0].message;
    } catch (error) {
      console.error('خطا در تماس با AI:', error.message);
      throw new Error('مشکلی در ارتباط با هوش مصنوعی وجود دارد.');
    }
  }

  // ======= توابع عملیاتی =======
  async addTransaction(userId, type, amount, title, description, categoryName, accountName) {
    try {
      // پیدا کردن حساب
      const account = await Account.findOne({ 
        userId: userId, 
        name: { $regex: accountName, $options: 'i' },
        isActive: true 
      });
      
      if (!account) {
        return { success: false, message: `حساب "${accountName}" یافت نشد.` };
      }

      // پیدا کردن دسته‌بندی
      const category = await Category.findOne({ 
        name: { $regex: categoryName, $options: 'i' },
        type: type 
      });
      
      if (!category) {
        return { success: false, message: `دسته‌بندی "${categoryName}" یافت نشد.` };
      }

      // ایجاد تراکنش
      const transaction = new Transaction({
        userId: userId,
        type: type,
        amount: amount,
        title: title,
        description: description,
        category: category._id,
        account: account._id,
        date: new Date()
      });

      await transaction.save();

      // به‌روزرسانی مانده حساب
      if (type === 'income') {
        account.balance += amount;
      } else if (type === 'expense') {
        account.balance -= amount;
      }
      await account.save();

      // به‌روزرسانی آمار دسته‌بندی
      await Category.findByIdAndUpdate(category._id, {
        $inc: { usageCount: 1 }
      });

      return { 
        success: true, 
        message: `✅ تراکنش "${title}" با مبلغ ${amount.toLocaleString()} تومان ثبت شد.\n🏦 حساب: ${account.name}\n💳 مانده جدید: ${account.balance.toLocaleString()} تومان` 
      };
    } catch (error) {
      console.error('خطا در ثبت تراکنش:', error);
      return { success: false, message: 'خطایی در ثبت تراکنش رخ داد.' };
    }
  }

  async getMonthlyReport(userId) {
    try {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const start = new Date(currentYear, currentMonth, 1);
      const end = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

      const transactions = await Transaction.find({
        userId: userId,
        date: { $gte: start, $lte: end }
      }).populate('category account').sort({ date: -1 });

      if (!transactions.length) {
        return { success: true, message: "📭 هیچ تراکنشی در این ماه یافت نشد." };
      }

      let totalIncome = 0;
      let totalExpense = 0;
      let report = `📆 گزارش ماهانه ${moment().format('jYYYY/jMM')}:\n\n`;

      for (const tx of transactions.slice(0, 10)) { // فقط 10 تراکنش اخیر
        const persianDate = moment(tx.date).format('jYYYY/jMM/jDD');
        report += `• ${tx.title}\n`;
        report += `💰 ${tx.amount.toLocaleString()} تومان | ${tx.type === "income" ? "➕ درآمد" : "➖ هزینه"}\n`;
        report += `📅 ${persianDate} | 🏦 ${tx.account?.name || 'نامشخص'}\n\n`;
        
        if (tx.type === "income") totalIncome += tx.amount;
        else totalExpense += tx.amount;
      }

      if (transactions.length > 10) {
        report += `... و ${transactions.length - 10} تراکنش دیگر\n\n`;
      }

      report += `📊 خلاصه ماه:\n`;
      report += `💰 جمع درآمد: ${totalIncome.toLocaleString()} تومان\n`;
      report += `💸 جمع هزینه: ${totalExpense.toLocaleString()} تومان\n`;
      report += `💼 مانده: ${(totalIncome - totalExpense).toLocaleString()} تومان`;

      return { success: true, message: report };
    } catch (error) {
      console.error('خطا در گزارش ماهانه:', error);
      return { success: false, message: 'خطایی در تهیه گزارش رخ داد.' };
    }
  }

  async getAccountBalance(userId, accountName = null) {
    try {
      let accounts;
      if (accountName) {
        accounts = await Account.find({ 
          userId: userId, 
          name: { $regex: accountName, $options: 'i' },
          isActive: true 
        });
      } else {
        accounts = await Account.find({ userId: userId, isActive: true });
      }

      if (!accounts.length) {
        return { success: false, message: "هیچ حسابی یافت نشد." };
      }

      let report = `💰 مانده حساب‌ها:\n\n`;
      let totalBalance = 0;

      for (const account of accounts) {
        report += `🏦 ${account.name}: ${account.balance.toLocaleString()} تومان\n`;
        totalBalance += account.balance;
      }

      if (accounts.length > 1) {
        report += `\n💼 مجموع: ${totalBalance.toLocaleString()} تومان`;
      }

      return { success: true, message: report };
    } catch (error) {
      console.error('خطا در گزارش حساب‌ها:', error);
      return { success: false, message: 'خطایی در دریافت مانده حساب‌ها رخ داد.' };
    }
  }

  async searchTransactions(userId, query, type = 'title') {
    try {
      let searchFilter = { userId: userId };
      
      if (type === 'title') {
        searchFilter.title = { $regex: query, $options: 'i' };
      } else if (type === 'amount') {
        const amount = parseInt(query);
        if (!isNaN(amount)) {
          searchFilter.amount = amount;
        }
      } else if (type === 'date') {
        const searchDate = new Date(query);
        if (!isNaN(searchDate.getTime())) {
          const start = new Date(searchDate.getFullYear(), searchDate.getMonth(), searchDate.getDate());
          const end = new Date(searchDate.getFullYear(), searchDate.getMonth(), searchDate.getDate(), 23, 59, 59);
          searchFilter.date = { $gte: start, $lte: end };
        }
      }

      const transactions = await Transaction.find(searchFilter)
        .populate('category account')
        .sort({ date: -1 })
        .limit(10);

      if (!transactions.length) {
        return { success: true, message: `🔍 هیچ تراکنشی با "${query}" یافت نشد.` };
      }

      let results = `🔍 نتایج جستجو برای "${query}":\n\n`;
      let totalAmount = 0;

      for (const tx of transactions) {
        const persianDate = moment(tx.date).format('jYYYY/jMM/jDD');
        results += `• ${tx.title}\n`;
        results += `💰 ${tx.amount.toLocaleString()} تومان | ${tx.type === "income" ? "➕ درآمد" : "➖ هزینه"}\n`;
        results += `📅 ${persianDate} | 🏦 ${tx.account?.name || 'نامشخص'}\n\n`;
        totalAmount += tx.amount;
      }

      results += `📊 مجموع: ${totalAmount.toLocaleString()} تومان`;
      results += `\n📝 تعداد: ${transactions.length} تراکنش`;

      return { success: true, message: results };
    } catch (error) {
      console.error('خطا در جستجو:', error);
      return { success: false, message: 'خطایی در جستجو رخ داد.' };
    }
  }

  async createAccount(userId, name, type, initialBalance = 0) {
    try {
      const account = new Account({
        userId: userId,
        name: name,
        type: type,
        balance: initialBalance
      });

      await account.save();

      return { 
        success: true, 
        message: `✅ حساب "${name}" با موفقیت ایجاد شد!\n💰 مانده اولیه: ${initialBalance.toLocaleString()} تومان` 
      };
    } catch (error) {
      console.error('خطا در ایجاد حساب:', error);
      return { success: false, message: 'خطایی در ایجاد حساب رخ داد.' };
    }
  }

  async getGoals(userId) {
    try {
      const goals = await Goal.find({ userId: userId, isCompleted: false });
      
      if (!goals.length) {
        return { success: true, message: "🎯 هیچ هدف مالی فعالی تعریف نشده است." };
      }

      let report = `🎯 اهداف مالی:\n\n`;
      
      for (const goal of goals) {
        const progress = Math.round((goal.currentAmount / goal.targetAmount) * 100);
        const remaining = goal.targetAmount - goal.currentAmount;
        
        report += `🎯 ${goal.title}\n`;
        report += `💰 پیشرفت: ${goal.currentAmount.toLocaleString()} / ${goal.targetAmount.toLocaleString()} تومان\n`;
        report += `📊 درصد: ${progress}%\n`;
        report += `💸 باقی‌مانده: ${remaining.toLocaleString()} تومان\n`;
        if (goal.deadline) {
          report += `📅 مهلت: ${moment(goal.deadline).format('jYYYY/jMM/jDD')}\n`;
        }
        report += `\n`;
      }

      return { success: true, message: report };
    } catch (error) {
      console.error('خطا در دریافت اهداف:', error);
      return { success: false, message: 'خطایی در دریافت اهداف رخ داد.' };
    }
  }

  async getCategoryStats(userId) {
    try {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const start = new Date(currentYear, currentMonth, 1);
      const end = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

      const transactions = await Transaction.find({
        userId: userId,
        date: { $gte: start, $lte: end },
        type: "expense"
      }).populate('category');

      if (!transactions.length) {
        return { success: true, message: "📭 هیچ هزینه‌ای در این ماه یافت نشد." };
      }

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

      let report = `📊 آمار دسته‌بندی‌های ماه جاری:\n\n`;
      
      const sortedCategories = Object.entries(categoryStats)
        .sort(([,a], [,b]) => b.amount - a.amount);

      for (const [categoryName, stats] of sortedCategories) {
        const percentage = Math.round((stats.amount / totalExpense) * 100);
        const bar = '█'.repeat(Math.round(percentage / 5));
        report += `🏷️ ${categoryName}:\n`;
        report += `💰 ${stats.amount.toLocaleString()} تومان (${percentage}%)\n`;
        report += `📊 ${stats.count} تراکنش\n`;
        report += `📈 ${bar} ${percentage}%\n\n`;
      }

      report += `💸 کل هزینه: ${totalExpense.toLocaleString()} تومان`;

      return { success: true, message: report };
    } catch (error) {
      console.error('خطا در آمار دسته‌بندی:', error);
      return { success: false, message: 'خطایی در دریافت آمار رخ داد.' };
    }
  }

  // ======= تحلیل درخواست کاربر و اجرای عملیات =======
  async processUserRequest(userId, userMessage) {
    try {
      // دریافت اطلاعات کاربر و داده‌های مربوطه
      const user = await User.findOne({ _id: userId });
      const accounts = await Account.find({ userId: userId, isActive: true });
      const categories = await Category.find({ isDefault: true });

      // تحلیل ساده پیام برای تشخیص نوع درخواست
      const message = userMessage.toLowerCase();
      
      // اگر سلام است
      if (message.includes('سلام') || message.includes('hi') || message.includes('hello')) {
        return {
          success: true,
          message: `سلام ${user?.firstName || 'عزیز'}! چطور می‌تونم بهت کمک کنم؟ 😊\n\nمیخوای تراکنشی ثبت کنی، گزارش بگیری یا کاری دیگه انجام بدی؟`
        };
      }
      
      // اگر درخواست گزارش است
      if (message.includes('گزارش') || message.includes('report')) {
        return await this.getMonthlyReport(userId);
      }
      
      // اگر درخواست مانده است
      if (message.includes('مانده') || message.includes('balance')) {
        return await this.getAccountBalance(userId);
      }
      
      // اگر درخواست افزودن تراکنش است
      if (message.includes('هزینه') || message.includes('ثبت') || message.includes('اضافه') || 
          message.includes('تومان') || /\d+/.test(message)) {
        
        // استخراج اطلاعات از متن
        let amount = null;
        let title = 'هزینه';
        let categoryName = 'سایر';
        let accountName = accounts.length > 0 ? accounts[0].name : null;
        
        // استخراج مبلغ
        const amountMatch = message.match(/(\d+)\s*(هزار|تومان|تومن)?/);
        if (amountMatch) {
          amount = parseInt(amountMatch[1]);
          if (amountMatch[2] === 'هزار') {
            amount *= 1000;
          }
        }
        
        // تشخیص عنوان و دسته‌بندی
        if (message.includes('ناهار') || message.includes('صبحانه') || message.includes('شام') || message.includes('غذا')) {
          title = 'ناهار';
          categoryName = 'غذا';
        } else if (message.includes('تاکسی') || message.includes('اتوبوس') || message.includes('مترو')) {
          title = 'حمل‌ونقل';
          categoryName = 'حمل‌ونقل';
        } else if (message.includes('دارو') || message.includes('دکتر') || message.includes('پزشک')) {
          title = 'پزشکی';
          categoryName = 'پزشکی';
        }
        
        // تشخیص حساب
        if (message.includes('بلو')) {
          const blueAccount = accounts.find(acc => acc.name.toLowerCase().includes('بلو'));
          if (blueAccount) accountName = blueAccount.name;
        } else if (message.includes('ملت')) {
          const mellatAccount = accounts.find(acc => acc.name.toLowerCase().includes('ملت'));
          if (mellatAccount) accountName = mellatAccount.name;
        } else if (message.includes('پاسارگاد')) {
          const pasargadAccount = accounts.find(acc => acc.name.toLowerCase().includes('پاسارگاد'));
          if (pasargadAccount) accountName = pasargadAccount.name;
        }
        
        // اگر اطلاعات کافی نیست
        if (!amount) {
          return {
            success: true,
            message: "مبلغ هزینه رو مشخص نکردی. مثلاً: 50 هزار تومان یا 215 تومان"
          };
        }
        
        if (!accountName || accounts.length === 0) {
          return {
            success: true,
            message: "ابتدا باید یه حساب ایجاد کنی. می‌گی یه حساب جدید بسازم؟"
          };
        }
        
        // ثبت تراکنش
        return await this.addTransaction(
          userId,
          'expense',
          amount,
          title,
          '',
          categoryName,
          accountName
        );
      }
      
      // اگر درخواست ایجاد حساب است
      if (message.includes('حساب') && (message.includes('بساز') || message.includes('ایجاد') || message.includes('جدید'))) {
        return {
          success: true,
          message: "برای ایجاد حساب جدید، نام حساب رو بگو. مثلاً: بلوبانک، ملت، کیف پول"
        };
      }

      // پاسخ پیش‌فرض
      return {
        success: true,
        message: "متوجه نشدم چی می‌خوای! 🤔\n\nمیتونی از این عبارات استفاده کنی:\n• «هزینه 50 هزار تومان برای ناهار از بلو»\n• «گزارش این ماه»\n• «مانده حساب‌هام»\n• «یه حساب جدید بساز»"
      };

    } catch (error) {
      console.error('خطا در پردازش درخواست:', error);
      return {
        success: false,
        message: "متاسفانه مشکلی پیش آمده. لطفاً دوباره تلاش کنید."
      };
    }
  }
}

module.exports = AIService;

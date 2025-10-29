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
    this.conversationHistory = new Map(); // ذخیره تاریخچه مکالمه برای هر کاربر
  }

  // ======= تماس با API هوش مصنوعی پیشرفته =======
  async callAI(messages, functions = null, temperature = 0.7, maxTokens = 3000) {
    try {
      const payload = {
        model: "tngtech/deepseek-r1t2-chimera:free",
        messages: messages,
        temperature: temperature,
        max_tokens: maxTokens
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
        },
        timeout: 30000
      });

      return response.data.choices[0].message;
    } catch (error) {
      console.error('خطا در تماس با AI:', error.message);
      throw new Error('مشکلی در ارتباط با هوش مصنوعی وجود دارد.');
    }
  }

  // ======= ذخیره و بازیابی تاریخچه مکالمه =======
  getConversationHistory(userId, limit = 10) {
    if (!this.conversationHistory.has(userId)) {
      this.conversationHistory.set(userId, []);
    }
    const history = this.conversationHistory.get(userId);
    return history.slice(-limit);
  }

  addToHistory(userId, role, content) {
    if (!this.conversationHistory.has(userId)) {
      this.conversationHistory.set(userId, []);
    }
    const history = this.conversationHistory.get(userId);
    history.push({ role, content, timestamp: new Date() });
    // نگه داشتن فقط 20 پیام آخر
    if (history.length > 20) {
      history.shift();
    }
  }

  clearHistory(userId) {
    this.conversationHistory.delete(userId);
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
      // استفاده از گزارش پیشرفته
      return await this.getAdvancedReport(userId, 'month');
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

  // ======= گزارش پیشرفته با جزئیات بیشتر =======
  async getAdvancedReport(userId, period = 'month') {
    try {
      let start, end, periodName;
      const now = new Date();

      if (period === 'week') {
        const dayOfWeek = now.getDay();
        const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        start = new Date(now.setDate(diff));
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        periodName = `هفته جاری (${moment(start).format('jYYYY/jMM/jDD')} تا ${moment(end).format('jYYYY/jMM/jDD')})`;
      } else if (period === 'year') {
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        periodName = `سال ${now.getFullYear()}`;
      } else {
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        start = new Date(currentYear, currentMonth, 1);
        end = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);
        periodName = moment().format('jYYYY/jMM');
      }

      const transactions = await Transaction.find({
        userId: userId,
        date: { $gte: start, $lte: end }
      }).populate('category account').sort({ date: -1 });

      if (!transactions.length) {
        return { success: true, message: `📭 هیچ تراکنشی در ${periodName} یافت نشد.` };
      }

      let totalIncome = 0;
      let totalExpense = 0;
      const categoryBreakdown = {};
      const accountBreakdown = {};

      for (const tx of transactions) {
        if (tx.type === "income") {
          totalIncome += tx.amount;
        } else {
          totalExpense += tx.amount;
          const catName = tx.category?.name || 'سایر';
          categoryBreakdown[catName] = (categoryBreakdown[catName] || 0) + tx.amount;
        }
        
        const accName = tx.account?.name || 'نامشخص';
        accountBreakdown[accName] = (accountBreakdown[accName] || 0) + (tx.type === 'income' ? tx.amount : -tx.amount);
      }

      let report = `📊 گزارش مالی ${periodName}:\n\n`;
      report += `💰 جمع درآمد: ${totalIncome.toLocaleString()} تومان\n`;
      report += `💸 جمع هزینه: ${totalExpense.toLocaleString()} تومان\n`;
      report += `💼 مانده: ${(totalIncome - totalExpense).toLocaleString()} تومان\n`;
      
      if (totalIncome > 0) {
        const savingsRate = ((totalIncome - totalExpense) / totalIncome * 100).toFixed(1);
        report += `📈 نرخ پس‌انداز: ${savingsRate}%\n`;
      }

      report += `\n📝 تعداد تراکنش‌ها: ${transactions.length}\n`;
      report += `➕ درآمدها: ${transactions.filter(t => t.type === 'income').length}\n`;
      report += `➖ هزینه‌ها: ${transactions.filter(t => t.type === 'expense').length}\n`;

      if (Object.keys(categoryBreakdown).length > 0) {
        report += `\n🏷️ هزینه‌ها بر اساس دسته‌بندی:\n`;
        const sortedCategories = Object.entries(categoryBreakdown)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5);
        
        for (const [cat, amount] of sortedCategories) {
          const percentage = Math.round((amount / totalExpense) * 100);
          report += `• ${cat}: ${amount.toLocaleString()} تومان (${percentage}%)\n`;
        }
      }

      report += `\n📅 آخرین تراکنش‌ها:\n`;
      for (const tx of transactions.slice(0, 5)) {
        const persianDate = moment(tx.date).format('jYYYY/jMM/jDD');
        const emoji = tx.type === "income" ? "➕" : "➖";
        report += `${emoji} ${tx.title}: ${tx.amount.toLocaleString()} تومان (${persianDate})\n`;
      }

      return { success: true, message: report };
    } catch (error) {
      console.error('خطا در گزارش پیشرفته:', error);
      return { success: false, message: 'خطایی در تهیه گزارش رخ داد.' };
    }
  }

  // ======= انتقال پول بین حساب‌ها =======
  async transferMoney(userId, amount, fromAccountName, toAccountName) {
    try {
      const fromAccount = await Account.findOne({
        userId: userId,
        name: { $regex: fromAccountName, $options: 'i' },
        isActive: true
      });

      const toAccount = await Account.findOne({
        userId: userId,
        name: { $regex: toAccountName, $options: 'i' },
        isActive: true
      });

      if (!fromAccount) {
        return { success: false, message: `حساب "${fromAccountName}" یافت نشد.` };
      }

      if (!toAccount) {
        return { success: false, message: `حساب "${toAccountName}" یافت نشد.` };
      }

      if (fromAccount._id.toString() === toAccount._id.toString()) {
        return { success: false, message: "نمی‌تونی از یک حساب به خودش پول منتقل کنی!" };
      }

      if (fromAccount.balance < amount) {
        return { success: false, message: `💰 مانده حساب "${fromAccount.name}" کافی نیست!\n💳 مانده فعلی: ${fromAccount.balance.toLocaleString()} تومان` };
      }

      // ایجاد تراکنش انتقال
      const transaction = new Transaction({
        userId: userId,
        type: 'transfer',
        amount: amount,
        title: `انتقال از ${fromAccount.name} به ${toAccount.name}`,
        description: 'انتقال پول بین حساب‌ها',
        account: fromAccount._id,
        toAccount: toAccount._id,
        date: new Date()
      });

      await transaction.save();

      // به‌روزرسانی مانده حساب‌ها
      fromAccount.balance -= amount;
      toAccount.balance += amount;
      await fromAccount.save();
      await toAccount.save();

      return {
        success: true,
        message: `✅ انتقال انجام شد!\n\n` +
                 `💰 مبلغ: ${amount.toLocaleString()} تومان\n` +
                 `📤 از: ${fromAccount.name} (مانده: ${fromAccount.balance.toLocaleString()} تومان)\n` +
                 `📥 به: ${toAccount.name} (مانده: ${toAccount.balance.toLocaleString()} تومان)`
      };
    } catch (error) {
      console.error('خطا در انتقال پول:', error);
      return { success: false, message: 'خطایی در انتقال پول رخ داد.' };
    }
  }

  // ======= ایجاد هدف مالی =======
  async createGoal(userId, title, targetAmount, deadline, type = 'savings') {
    try {
      let deadlineDate = null;
      if (deadline) {
        // تبدیل تاریخ شمسی به میلادی (ساده‌سازی شده)
        deadlineDate = new Date(deadline);
      }

      const goal = new Goal({
        userId: userId,
        title: title,
        targetAmount: targetAmount,
        currentAmount: 0,
        deadline: deadlineDate,
        type: type
      });

      await goal.save();

      let message = `✅ هدف مالی "${title}" با موفقیت ایجاد شد!\n\n`;
      message += `🎯 هدف: ${targetAmount.toLocaleString()} تومان\n`;
      message += `💰 پیشرفت: 0 تومان (0%)\n`;
      if (deadlineDate) {
        message += `📅 مهلت: ${moment(deadlineDate).format('jYYYY/jMM/jDD')}\n`;
      }

      return { success: true, message: message };
    } catch (error) {
      console.error('خطا در ایجاد هدف:', error);
      return { success: false, message: 'خطایی در ایجاد هدف رخ داد.' };
    }
  }

  // ======= به‌روزرسانی هدف =======
  async updateGoal(userId, goalId, updates) {
    try {
      const goal = await Goal.findOne({ _id: goalId, userId: userId });
      if (!goal) {
        return { success: false, message: "هدف یافت نشد." };
      }

      if (updates.currentAmount !== undefined) {
        goal.currentAmount = updates.currentAmount;
      }
      if (updates.targetAmount !== undefined) {
        goal.targetAmount = updates.targetAmount;
      }
      if (updates.title !== undefined) {
        goal.title = updates.title;
      }
      if (updates.deadline !== undefined) {
        goal.deadline = new Date(updates.deadline);
      }

      // بررسی تکمیل هدف
      if (goal.currentAmount >= goal.targetAmount) {
        goal.isCompleted = true;
      }

      await goal.save();

      const progress = Math.round((goal.currentAmount / goal.targetAmount) * 100);
      return {
        success: true,
        message: `✅ هدف "${goal.title}" به‌روزرسانی شد!\n\n` +
                 `💰 پیشرفت: ${goal.currentAmount.toLocaleString()} / ${goal.targetAmount.toLocaleString()} تومان\n` +
                 `📊 درصد: ${progress}%\n` +
                 `${goal.isCompleted ? '🎉 تبریک! هدف تکمیل شد!' : ''}`
      };
    } catch (error) {
      console.error('خطا در به‌روزرسانی هدف:', error);
      return { success: false, message: 'خطایی در به‌روزرسانی هدف رخ داد.' };
    }
  }

  // ======= تحلیل روند =======
  async getTrendAnalysis(userId, period = 'month') {
    try {
      const now = new Date();
      let monthsToAnalyze = 6;

      if (period === 'year') {
        monthsToAnalyze = 12;
      } else if (period === 'quarter') {
        monthsToAnalyze = 3;
      }

      const trends = [];
      for (let i = monthsToAnalyze - 1; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const start = new Date(date.getFullYear(), date.getMonth(), 1);
        const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

        const incomeData = await Transaction.aggregate([
          { $match: { userId: userId, type: 'income', date: { $gte: start, $lte: end } } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        const expenseData = await Transaction.aggregate([
          { $match: { userId: userId, type: 'expense', date: { $gte: start, $lte: end } } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        trends.push({
          month: moment(start).format('jYYYY/jMM'),
          income: incomeData[0]?.total || 0,
          expense: expenseData[0]?.total || 0
        });
      }

      let report = `📈 تحلیل روند ${monthsToAnalyze} ماه اخیر:\n\n`;
      
      for (const trend of trends) {
        const balance = trend.income - trend.expense;
        const emoji = balance >= 0 ? '✅' : '⚠️';
        report += `${emoji} ${trend.month}:\n`;
        report += `  💰 درآمد: ${trend.income.toLocaleString()} تومان\n`;
        report += `  💸 هزینه: ${trend.expense.toLocaleString()} تومان\n`;
        report += `  💼 مانده: ${balance.toLocaleString()} تومان\n\n`;
      }

      // تحلیل روند
      if (trends.length >= 2) {
        const latest = trends[trends.length - 1];
        const previous = trends[trends.length - 2];
        
        const expenseChange = previous.expense > 0 
          ? ((latest.expense - previous.expense) / previous.expense * 100).toFixed(1)
          : 0;
        
        const incomeChange = previous.income > 0
          ? ((latest.income - previous.income) / previous.income * 100).toFixed(1)
          : 0;

        report += `📊 تحلیل:\n`;
        if (expenseChange > 0) {
          report += `⚠️ هزینه‌ها ${Math.abs(expenseChange)}% افزایش یافته\n`;
        } else if (expenseChange < 0) {
          report += `✅ هزینه‌ها ${Math.abs(expenseChange)}% کاهش یافته\n`;
        } else {
          report += `➡️ هزینه‌ها بدون تغییر\n`;
        }
        
        if (incomeChange > 0) {
          report += `📈 درآمد ${Math.abs(incomeChange)}% افزایش یافته\n`;
        } else if (incomeChange < 0) {
          report += `📉 درآمد ${Math.abs(incomeChange)}% کاهش یافته\n`;
        }
      }

      return { success: true, message: report };
    } catch (error) {
      console.error('خطا در تحلیل روند:', error);
      return { success: false, message: 'خطایی در تحلیل روند رخ داد.' };
    }
  }

  // ======= مقایسه دوره‌ها =======
  async comparePeriods(userId, period = 'month') {
    try {
      const now = new Date();
      let currentStart, currentEnd, previousStart, previousEnd;

      if (period === 'week') {
        const dayOfWeek = now.getDay();
        const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        currentStart = new Date(now.setDate(diff));
        currentStart.setHours(0, 0, 0, 0);
        currentEnd = new Date(now);
        currentEnd.setDate(currentStart.getDate() + 6);
        currentEnd.setHours(23, 59, 59, 999);
        
        previousStart = new Date(currentStart);
        previousStart.setDate(previousStart.getDate() - 7);
        previousEnd = new Date(currentStart);
        previousEnd.setDate(previousEnd.getDate() - 1);
        previousEnd.setHours(23, 59, 59, 999);
      } else {
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        currentStart = new Date(currentYear, currentMonth, 1);
        currentEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);
        
        previousStart = new Date(currentYear, currentMonth - 1, 1);
        previousEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59);
      }

      const currentData = await Transaction.aggregate([
        { $match: { userId: userId, date: { $gte: currentStart, $lte: currentEnd } } },
        { $group: { _id: '$type', total: { $sum: '$amount' } } }
      ]);

      const previousData = await Transaction.aggregate([
        { $match: { userId: userId, date: { $gte: previousStart, $lte: previousEnd } } },
        { $group: { _id: '$type', total: { $sum: '$amount' } } }
      ]);

      let currentIncome = 0;
      let currentExpense = 0;
      let previousIncome = 0;
      let previousExpense = 0;

      currentData.forEach(item => {
        if (item._id === 'income') currentIncome = item.total;
        else if (item._id === 'expense') currentExpense = item.total;
      });

      previousData.forEach(item => {
        if (item._id === 'income') previousIncome = item.total;
        else if (item._id === 'expense') previousExpense = item.total;
      });

      const incomeChange = previousIncome > 0 
        ? ((currentIncome - previousIncome) / previousIncome * 100).toFixed(1)
        : 0;
      
      const expenseChange = previousExpense > 0
        ? ((currentExpense - previousExpense) / previousExpense * 100).toFixed(1)
        : 0;

      let report = `📊 مقایسه ${period === 'week' ? 'هفته' : 'ماه'} جاری با ${period === 'week' ? 'هفته' : 'ماه'} قبل:\n\n`;
      
      report += `💰 درآمد:\n`;
      report += `  این ${period === 'week' ? 'هفته' : 'ماه'}: ${currentIncome.toLocaleString()} تومان\n`;
      report += `  ${period === 'week' ? 'هفته' : 'ماه'} قبل: ${previousIncome.toLocaleString()} تومان\n`;
      if (incomeChange > 0) {
        report += `  📈 تغییر: +${incomeChange}%\n\n`;
      } else if (incomeChange < 0) {
        report += `  📉 تغییر: ${incomeChange}%\n\n`;
      } else {
        report += `  ➡️ بدون تغییر\n\n`;
      }

      report += `💸 هزینه:\n`;
      report += `  این ${period === 'week' ? 'هفته' : 'ماه'}: ${currentExpense.toLocaleString()} تومان\n`;
      report += `  ${period === 'week' ? 'هفته' : 'ماه'} قبل: ${previousExpense.toLocaleString()} تومان\n`;
      if (expenseChange > 0) {
        report += `  ⚠️ تغییر: +${expenseChange}%\n\n`;
      } else if (expenseChange < 0) {
        report += `  ✅ تغییر: ${expenseChange}%\n\n`;
      } else {
        report += `  ➡️ بدون تغییر\n\n`;
      }

      const currentBalance = currentIncome - currentExpense;
      const previousBalance = previousIncome - previousExpense;
      const balanceChange = currentBalance - previousBalance;
      
      report += `💼 مانده:\n`;
      report += `  این ${period === 'week' ? 'هفته' : 'ماه'}: ${currentBalance.toLocaleString()} تومان\n`;
      report += `  ${period === 'week' ? 'هفته' : 'ماه'} قبل: ${previousBalance.toLocaleString()} تومان\n`;
      if (balanceChange > 0) {
        report += `  ✅ بهبود: +${balanceChange.toLocaleString()} تومان`;
      } else if (balanceChange < 0) {
        report += `  ⚠️ کاهش: ${balanceChange.toLocaleString()} تومان`;
      } else {
        report += `  ➡️ بدون تغییر`;
      }

      return { success: true, message: report };
    } catch (error) {
      console.error('خطا در مقایسه دوره‌ها:', error);
      return { success: false, message: 'خطایی در مقایسه دوره‌ها رخ داد.' };
    }
  }

  // ======= نصیحت مالی هوشمند =======
  async getFinancialAdvice(userId) {
    try {
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

      // دریافت داده‌های مالی
      const currentMonthData = await Transaction.aggregate([
        { $match: { userId: userId, date: { $gte: currentMonthStart } } },
        { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]);

      const lastMonthData = await Transaction.aggregate([
        { $match: { userId: userId, date: { $gte: lastMonthStart, $lte: lastMonthEnd } } },
        { $group: { _id: '$type', total: { $sum: '$amount' } } }
      ]);

      const categoryStats = await Transaction.aggregate([
        { 
          $match: { 
            userId: userId, 
            type: 'expense', 
            date: { $gte: currentMonthStart } 
          } 
        },
        { $group: { _id: '$category', total: { $sum: '$amount' } } },
        { $sort: { total: -1 } },
        { $limit: 5 }
      ]);

      const accounts = await Account.find({ userId: userId, isActive: true });
      const goals = await Goal.find({ userId: userId, isCompleted: false });

      let currentIncome = 0;
      let currentExpense = 0;
      let lastMonthExpense = 0;

      currentMonthData.forEach(item => {
        if (item._id === 'income') currentIncome = item.total;
        else if (item._id === 'expense') currentExpense = item.total;
      });

      lastMonthData.forEach(item => {
        if (item._id === 'expense') lastMonthExpense = item.total;
      });

      const savingsRate = currentIncome > 0 
        ? ((currentIncome - currentExpense) / currentIncome * 100)
        : 0;
      
      const expenseChange = lastMonthExpense > 0
        ? ((currentExpense - lastMonthExpense) / lastMonthExpense * 100)
        : 0;

      let advice = `💡 نصیحت‌های مالی شخصی‌سازی شده:\n\n`;

      // نصیحت بر اساس نرخ پس‌انداز
      if (savingsRate < 10) {
        advice += `⚠️ نرخ پس‌انداز شما (${savingsRate.toFixed(1)}%) کم است!\n`;
        advice += `💡 سعی کن حداقل 20% از درآمدت رو پس‌انداز کنی.\n\n`;
      } else if (savingsRate >= 20) {
        advice += `✅ عالی! نرخ پس‌انداز شما (${savingsRate.toFixed(1)}%) عالیه! ادامه بده.\n\n`;
      }

      // نصیحت بر اساس تغییر هزینه‌ها
      if (expenseChange > 20) {
        advice += `⚠️ هزینه‌های این ماه ${expenseChange.toFixed(1)}% افزایش یافته!\n`;
        advice += `💡 بررسی کن ببین کجاها می‌تونی صرفه‌جویی کنی.\n\n`;
      } else if (expenseChange < -10) {
        advice += `✅ هزینه‌هایت ${Math.abs(expenseChange).toFixed(1)}% کاهش یافته! خیلی خوبه!\n\n`;
      }

      // نصیحت بر اساس دسته‌بندی
      if (categoryStats.length > 0) {
        const topCategory = categoryStats[0];
        const topCategoryName = await Category.findById(topCategory._id);
        if (topCategoryName) {
          advice += `📊 بیشترین هزینه‌ت تو دسته "${topCategoryName.name}" هست.\n`;
          advice += `💡 بررسی کن ببین می‌تونی تو این بخش صرفه‌جویی کنی.\n\n`;
        }
      }

      // نصیحت برای اهداف
      if (goals.length === 0) {
        advice += `🎯 هیچ هدف مالی‌ای نداری!\n`;
        advice += `💡 یک هدف مالی تعریف کن تا انگیزه بیشتری برای پس‌انداز داشته باشی.\n\n`;
      } else {
        advice += `🎯 ${goals.length} هدف مالی داری. بهشون ادامه بده!\n\n`;
      }

      // نصیحت کلی
      if (accounts.length === 0) {
        advice += `🏦 هنوز حسابی نداری!\n`;
        advice += `💡 یک حساب ایجاد کن تا بتونی بهتر مدیریت کنی.\n\n`;
      }

      advice += `✨ نکات کلی:\n`;
      advice += `• سعی کن درآمدت رو افزایش بدی\n`;
      advice += `• هزینه‌های غیر ضروری رو کاهش بده\n`;
      advice += `• برای آینده پس‌انداز کن\n`;
      advice += `• اهداف مالی مشخص داشته باش\n`;
      advice += `• منظم تراکنش‌هات رو ثبت کن`;

      return { success: true, message: advice };
    } catch (error) {
      console.error('خطا در نصیحت مالی:', error);
      return { success: false, message: 'خطایی در ارائه نصیحت رخ داد.' };
    }
  }

  // ======= تراکنش تکراری =======
  async createRecurringTransaction(userId, result, accounts, categories) {
    try {
      let account = accounts.find(acc => 
        acc.name.toLowerCase().includes((result.account || '').toLowerCase())
      );
      if (!account && accounts.length > 0) {
        account = accounts[0];
      }

      if (!account) {
        return { success: false, message: "ابتدا باید یک حساب ایجاد کنی." };
      }

      let category = categories.find(cat => 
        cat.name.toLowerCase().includes((result.category || '').toLowerCase())
      );
      if (!category) {
        category = categories.find(cat => cat.name === 'سایر');
      }

      const transaction = new Transaction({
        userId: userId,
        type: result.type || 'expense',
        amount: result.amount,
        title: result.title || 'تراکنش تکراری',
        description: result.description || '',
        category: category?._id,
        account: account._id,
        date: new Date(),
        isRecurring: true,
        recurringType: result.recurringType || 'monthly'
      });

      await transaction.save();

      // به‌روزرسانی مانده
      if (result.type === 'income') {
        account.balance += result.amount;
      } else {
        account.balance -= result.amount;
      }
      await account.save();

      return {
        success: true,
        message: `✅ تراکنش تکراری "${result.title}" ثبت شد!\n\n` +
                 `💰 مبلغ: ${result.amount.toLocaleString()} تومان\n` +
                 `🔄 نوع: ${result.recurringType === 'daily' ? 'روزانه' : result.recurringType === 'weekly' ? 'هفتگی' : result.recurringType === 'monthly' ? 'ماهانه' : 'سالانه'}\n` +
                 `💳 مانده جدید: ${account.balance.toLocaleString()} تومان`
      };
    } catch (error) {
      console.error('خطا در تراکنش تکراری:', error);
      return { success: false, message: 'خطایی در ثبت تراکنش تکراری رخ داد.' };
    }
  }

  // ======= حذف تراکنش =======
  async deleteTransaction(userId, transactionId) {
    try {
      const transaction = await Transaction.findOne({ _id: transactionId, userId: userId });
      if (!transaction) {
        return { success: false, message: "تراکنش یافت نشد." };
      }

      const account = await Account.findById(transaction.account);
      if (account) {
        // برگشت دادن تغییرات حساب
        if (transaction.type === 'income') {
          account.balance -= transaction.amount;
        } else if (transaction.type === 'expense') {
          account.balance += transaction.amount;
        } else if (transaction.type === 'transfer') {
          account.balance += transaction.amount;
          const toAccount = await Account.findById(transaction.toAccount);
          if (toAccount) {
            toAccount.balance -= transaction.amount;
            await toAccount.save();
          }
        }
        await account.save();
      }

      await Transaction.findByIdAndDelete(transactionId);

      return {
        success: true,
        message: `✅ تراکنش "${transaction.title}" حذف شد و تغییرات به حساب برگردانده شد.`
      };
    } catch (error) {
      console.error('خطا در حذف تراکنش:', error);
      return { success: false, message: 'خطایی در حذف تراکنش رخ داد.' };
    }
  }

  // ======= تحلیل درخواست کاربر با هوش مصنوعی پیشرفته =======
  async processUserRequest(userId, userMessage) {
    try {
      // دریافت اطلاعات کامل کاربر
      const user = await User.findOne({ _id: userId });
      const accounts = await Account.find({ userId: userId, isActive: true }).sort({ balance: -1 });
      const categories = await Category.find({ isDefault: true });

      // دریافت آمار مالی برای context بهتر
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      
      const currentMonthExpenses = await Transaction.aggregate([
        { $match: { userId: userId, type: 'expense', date: { $gte: currentMonthStart } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      
      const lastMonthExpenses = await Transaction.aggregate([
        { $match: { userId: userId, type: 'expense', date: { $gte: lastMonthStart, $lte: lastMonthEnd } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      
      const goals = await Goal.find({ userId: userId, isCompleted: false }).limit(3);
      const recentTransactions = await Transaction.find({ userId: userId })
        .populate('category account')
        .sort({ date: -1 })
        .limit(5);
      
      // ساخت context کامل
      const accountsInfo = accounts.length > 0 
        ? accounts.map(acc => `${acc.name} (${acc.balance.toLocaleString()} تومان)`).join(', ')
        : 'هیچ حسابی ندارد';
      
      const categoriesList = categories.map(cat => `${cat.name} (${cat.type === 'income' ? 'درآمد' : 'هزینه'})`).join(', ');
      
      const monthlyExpense = currentMonthExpenses[0]?.total || 0;
      const lastMonthExpense = lastMonthExpenses[0]?.total || 0;
      const expenseChange = lastMonthExpense > 0 
        ? ((monthlyExpense - lastMonthExpense) / lastMonthExpense * 100).toFixed(1)
        : 0;
      
      const goalsInfo = goals.length > 0
        ? goals.map(g => `${g.title}: ${g.currentAmount.toLocaleString()}/${g.targetAmount.toLocaleString()}`).join(' | ')
        : 'هدف مالی فعالی ندارد';
      
      // دریافت تاریخچه مکالمه
      const conversationHistory = this.getConversationHistory(userId);
      
      // ساخت system prompt فوق‌العاده پیشرفته
      const systemPrompt = `تو یک دستیار مالی فوق‌العاده هوشمند و حرفه‌ای هستی که می‌تونی:
1. تراکنش‌های مالی رو ثبت کنی (درآمد، هزینه، انتقال)
2. گزارش‌های جامع مالی بدهی
3. تحلیل روندها و مقایسه دوره‌ها
4. نصیحت و پیشنهاد مالی بدی
5. اهداف مالی رو مدیریت کنی
6. جستجو و فیلتر کردن تراکنش‌ها
7. حساب‌ها و دسته‌بندی‌ها رو مدیریت کنی
8. تراکنش‌های تکراری ایجاد کنی
9. تحلیل دقیق الگوهای مصرف
10. پیش‌بینی مالی

📊 اطلاعات کاربر:
- نام: ${user?.firstName || 'کاربر'}
- تاریخ امروز: ${moment().format('jYYYY/jMM/jDD')}
- حساب‌ها: ${accountsInfo}
- دسته‌بندی‌ها: ${categoriesList}
- هزینه این ماه: ${monthlyExpense.toLocaleString()} تومان
- هزینه ماه قبل: ${lastMonthExpense.toLocaleString()} تومان
- تغییر: ${expenseChange}%
- اهداف: ${goalsInfo}

🎯 قوانین مهم:
1. **تبدیل اعداد**: "215 هزار" = 215000 | "5 میلیون" = 5000000 | "2.5 میلیون" = 2500000
2. **تشخیص intent**: دقیق و هوشمند باش، حتی از پیام‌های غیر مستقیم
3. **context**: از تاریخچه مکالمه و داده‌های مالی استفاده کن
4. **پاسخ‌های مفید**: همیشه اطلاعات مفید و قابل استفاده بده
5. **تحلیل**: تحلیل عمیق کن نه فقط گزارش ساده
6. **نصیحت**: اگر لازمه، نصیحت مالی مفید بده

📝 فرمت JSON برای عملیات:
{
  "action": "add_transaction|monthly_report|account_balance|search_transactions|create_account|transfer_money|create_goal|update_goal|trend_analysis|period_comparison|financial_advice|category_stats|recurring_transaction|delete_transaction",
  "amount": 215000,
  "title": "غذا",
  "description": "...",
  "category": "غذا",
  "account": "نام حساب",
  "toAccount": "حساب مقصد (برای انتقال)",
  "type": "income|expense|transfer",
  "query": "متن جستجو",
  "searchType": "title|amount|date|category",
  "period": "month|week|year|custom",
  "date": "1403/01/15",
  "goalTitle": "...",
  "targetAmount": 10000000,
  "deadline": "1403/12/29",
  "recurringType": "daily|weekly|monthly|yearly"
}

💡 مثال‌های هوشمند:
- "215 هزار هزینه غذا کردم" → {"action":"add_transaction","amount":215000,"title":"غذا","category":"غذا","type":"expense"}
- "گزارش کامل این ماه" → {"action":"monthly_report","period":"month"}
- "نسبت به ماه قبل چقدر خرج کردم؟" → {"action":"period_comparison","period":"month"}
- "روند هزینه‌هام چطوریه؟" → {"action":"trend_analysis"}
- "200 هزار از بلو به کش ببر" → {"action":"transfer_money","amount":200000,"account":"بلو","toAccount":"کش","type":"transfer"}
- "یه هدف 10 میلیونی برای خرید ماشین تا پایان سال بذار" → {"action":"create_goal","goalTitle":"خرید ماشین","targetAmount":10000000,"deadline":"1403/12/29"}
- "چیکار کنم پول بیشتری پس‌انداز کنم؟" → {"action":"financial_advice"}
- "هزینه‌های غذا رو نشون بده" → {"action":"search_transactions","query":"غذا","searchType":"category"}
- "یه تراکنش ماهانه 500 هزار برای اجاره بذار" → {"action":"recurring_transaction","amount":500000,"title":"اجاره","type":"expense","recurringType":"monthly"}

⚠️ نکات مهم:
- اگر حساب مشخص نیست، اولین حساب با بیشترین مانده رو انتخاب کن
- همیشه JSON کامل برگردون، حتی اگر بعضی فیلدها null باشه
- اگه کاربر سوال غیر مالی پرسید، جواب دوستانه و مرتبط بده
- تحلیل عمیق کن و insight بده، نه فقط لیست کردن
- از emoji استفاده کن برای بهتر شدن UX`;

      // ساخت پیام‌ها با تاریخچه
      const messages = [
        { role: "system", content: systemPrompt }
      ];
      
      // اضافه کردن تاریخچه مکالمه (آخرین 5 پیام)
      if (conversationHistory.length > 0) {
        messages.push(...conversationHistory.slice(-5));
      }
      
      messages.push({ role: "user", content: userMessage });
      
      // ذخیره پیام کاربر در تاریخچه
      this.addToHistory(userId, "user", userMessage);
      
      const aiResponse = await this.callAI(messages, null, 0.6, 4000);

      let response = aiResponse.content.trim();
      
      // ذخیره پاسخ AI در تاریخچه
      this.addToHistory(userId, "assistant", response);
      
      // استخراج و پردازش JSON
      if (response.includes('{') && response.includes('}')) {
        try {
          let jsonText = response;
          
          // استخراج JSON از کد بلاک
          if (response.includes('```')) {
            const codeMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
            if (codeMatch) jsonText = codeMatch[1];
          } else {
            // استخراج اولین JSON معتبر
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) jsonText = jsonMatch[0];
          }
          
          const result = JSON.parse(jsonText);
          console.log('🤖 AI Action:', result.action, result);
          
          // اجرای عملیات مختلف
          switch (result.action) {
            case 'add_transaction':
              return await this.handleAddTransaction(userId, result, accounts, categories);
              
            case 'monthly_report':
            case 'report':
              return await this.getAdvancedReport(userId, result.period || 'month');
              
            case 'account_balance':
            case 'balance':
              return await this.getAccountBalance(userId, result.account);
              
            case 'search_transactions':
              return await this.searchTransactions(userId, result.query || '', result.searchType || 'title');
              
            case 'create_account':
              return await this.createAccount(userId, result.name, result.type || 'cash', result.initialBalance || 0);
              
            case 'transfer_money':
              return await this.transferMoney(userId, result.amount, result.account, result.toAccount);
              
            case 'create_goal':
              return await this.createGoal(userId, result.goalTitle, result.targetAmount, result.deadline, result.type || 'savings');
              
            case 'update_goal':
              return await this.updateGoal(userId, result.goalId, result);
              
            case 'trend_analysis':
              return await this.getTrendAnalysis(userId, result.period || 'month');
              
            case 'period_comparison':
              return await this.comparePeriods(userId, result.period || 'month');
              
            case 'financial_advice':
              return await this.getFinancialAdvice(userId);
              
            case 'category_stats':
              return await this.getCategoryStats(userId);
              
            case 'recurring_transaction':
              return await this.createRecurringTransaction(userId, result, accounts, categories);
              
            case 'delete_transaction':
              return await this.deleteTransaction(userId, result.transactionId);
              
            default:
              // اگر action ناشناخته است، پاسخ AI را برگردان
              return { success: true, message: response };
          }
          
        } catch (e) {
          console.error('❌ JSON Parse Error:', e.message);
          console.log('Raw response:', response.substring(0, 500));
          // اگر JSON نیست، پاسخ معمولی را برگردان
          return { success: true, message: response };
        }
      }
      
      // پاسخ معمولی (مکالمه یا سوال غیر مالی)
      return { success: true, message: response };

    } catch (error) {
      console.error('❌ خطا در پردازش درخواست:', error);
      return {
        success: false,
        message: "❌ متاسفانه مشکلی پیش آمده. لطفاً دوباره تلاش کنید.\n\n" +
                 "💡 می‌تونی سوالت رو به شکل دیگری بپرسی یا از دستورات ساده‌تر استفاده کنی."
      };
    }
  }

  // ======= تابع کمکی برای اضافه کردن تراکنش =======
  async handleAddTransaction(userId, result, accounts, categories) {
            let account = null;
            if (result.account) {
              account = accounts.find(acc => 
                acc.name.toLowerCase().includes(result.account.toLowerCase()) ||
                result.account.toLowerCase().includes(acc.name.toLowerCase())
              );
            }
            if (!account && accounts.length > 0) {
      account = accounts[0]; // حساب با بیشترین مانده
            }
            
            let category = null;
            if (result.category) {
              category = categories.find(cat => 
                cat.name.toLowerCase().includes(result.category.toLowerCase())
              );
            }
            if (!category) {
              category = categories.find(cat => cat.name === 'سایر');
            }
            
            if (!account) {
              return {
                success: true,
        message: "❌ ابتدا باید یک حساب ایجاد کنی.\n\n💡 می‌گی یه حساب جدید بسازم؟\nمثلاً: \"یه حساب نقدی با نام بلو بساز\""
      };
    }
            
            return await this.addTransaction(
              userId,
              result.type || 'expense',
              result.amount,
              result.title || 'تراکنش',
      result.description || '',
              category?.name || 'سایر',
              account.name
            );
  }
}

module.exports = AIService;

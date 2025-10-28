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

      const systemContext = `
شما یک دستیار مالی هوشمند و دوستانه هستید که به کاربران کمک می‌کنید تا امور مالی خود را مدیریت کنند.

اطلاعات فعلی کاربر:
- نام: ${user?.firstName || 'کاربر'}
- حساب‌های موجود: ${accounts.length > 0 ? accounts.map(acc => `${acc.name} (${acc.type}) - مانده: ${acc.balance.toLocaleString()} تومان`).join(', ') : 'هیچ حسابی ثبت نشده'}
- دسته‌بندی‌های موجود: ${categories.map(cat => `${cat.name} (${cat.type})`).join(', ')}

شما می‌توانید این عملیات‌ها را انجام دهید:
1. افزودن تراکنش (درآمد، هزینه) - مثال: "یه هزینه 50 هزار تومانی برای ناهار اضافه کن"
2. مشاهده گزارش‌ها (ماهانه، حساب‌ها، دسته‌بندی‌ها) - مثال: "گزارش این ماه رو نشون بده"
3. جستجو در تراکنش‌ها - مثال: "تراکنش‌های ناهار رو پیدا کن"
4. مشاهده اهداف مالی - مثال: "اهداف من چطورن؟"
5. ایجاد حساب جدید - مثال: "یه حساب جدید بساز"
6. مشاهده مانده حساب‌ها - مثال: "مانده حساب‌هام چقدره؟"

اگر کاربر درخواست غیرمرتبط با مالی کند، به صورت دوستانه هدایتش کن که شما فقط دستیار مالی هستید.

درخواست کاربر: "${userMessage}"

اگر کاربر می‌خواهد تراکنش اضافه کند، این اطلاعات را استخراج کنید:
- نوع: درآمد یا هزینه (expense/income)
- مبلغ: عدد به تومان
- عنوان: توضیح کوتاه
- دسته‌بندی: نزدیک‌ترین دسته از لیست موجود
- حساب: نزدیک‌ترین حساب از لیست موجود

توجه: اگر کاربر حساب ندارد، باید ابتدا حساب ایجاد کند.

برای درخواست‌های ساده یا سلام و احوال‌پرسی، مستقیماً پاسخ دوستانه بدهید.
برای درخواست‌های پیچیده که نیاز به عملیات خاص دارند، پاسخ را به صورت JSON با این فرمت بدهید:
{
  "action": "نوع عملیات",
  "params": {اطلاعات مورد نیاز},
  "response": "پاسخ دوستانه برای کاربر",
  "needsMoreInfo": true/false,
  "question": "سوال برای دریافت اطلاعات بیشتر"
}

انواع action ها:
- "add_transaction" - افزودن تراکنش
- "monthly_report" - گزارش ماهانه
- "account_balance" - مانده حساب‌ها
- "search" - جستجو در تراکنش‌ها
- "create_account" - ایجاد حساب جدید
- "goals" - مشاهده اهداف مالی
- "category_stats" - آمار دسته‌بندی‌ها
- "general_chat" - گفتگوی عمومی

مهم: همیشه JSON معتبر برگردانید!
      `;

      const aiResponse = await this.callAI([
        { role: "system", content: systemContext },
        { role: "user", content: userMessage }
      ]);

      let result;
      try {
        // اگر پاسخ JSON است، آن را parse کنیم
        if (aiResponse.content.trim().startsWith('{')) {
          result = JSON.parse(aiResponse.content);
        } else {
          // اگر JSON نیست، پاسخ عادی برگردانیم
          return {
            success: true,
            message: aiResponse.content,
            needsMoreInfo: false
          };
        }
      } catch (e) {
        // اگر JSON نامعتبر بود، پاسخ عادی بدهیم
        return {
          success: true,
          message: aiResponse.content,
          needsMoreInfo: false
        };
      }

      // اگر اطلاعات بیشتری نیاز است
      if (result.needsMoreInfo) {
        return {
          success: true,
          message: result.question || result.response || "لطفاً اطلاعات بیشتری ارائه دهید.",
          needsMoreInfo: true
        };
      }

      // اجرای عملیات بر اساس action
      let operationResult;
      
      switch (result.action) {
        case 'add_transaction':
          operationResult = await this.addTransaction(
            userId,
            result.params.type,
            result.params.amount,
            result.params.title,
            result.params.description || '',
            result.params.category,
            result.params.account
          );
          break;

        case 'monthly_report':
          operationResult = await this.getMonthlyReport(userId);
          break;

        case 'account_balance':
          operationResult = await this.getAccountBalance(userId, result.params.accountName);
          break;

        case 'search':
          operationResult = await this.searchTransactions(
            userId,
            result.params.query,
            result.params.type || 'title'
          );
          break;

        case 'create_account':
          operationResult = await this.createAccount(
            userId,
            result.params.name,
            result.params.type,
            result.params.balance || 0
          );
          break;

        case 'goals':
          operationResult = await this.getGoals(userId);
          break;

        case 'category_stats':
          operationResult = await this.getCategoryStats(userId);
          break;

        case 'general_chat':
        default:
          operationResult = {
            success: true,
            message: result.response || "سلام! چطور می‌تونم بهت کمک کنم؟ می‌تونی ازم بخوای تراکنش اضافه کنم، گزارش بدم، یا هر کار دیگه‌ای انجام بدم! 😊"
          };
      }

      return operationResult;

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

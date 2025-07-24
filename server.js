const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Hesabdari Bot is running');
});

// فایل اصلی ربات
require('./bot');  // اگر فایل اصلی bot.js هست

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Endpoint ساده برای Alive Check
app.get('/', (req, res) => {
  res.send('🤖 حسابداری بات در حال اجرا است');
});

// اجرای وب سرور
app.listen(PORT, () => console.log(`🌐 Web server running on port ${PORT}`));

// اجرای ربات
require('./bot');

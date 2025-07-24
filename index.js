const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Endpoint ساده برای Alive Check
app.get('/', (req, res) => {
  res.send('Bot is running on Render');
});

// اجرای وب سرور
app.listen(PORT, () => console.log(`Web server running on port ${PORT}`));

// اجرای ربات
require('./bot');

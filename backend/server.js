const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const { envProblems } = require('./config/env');
const problems = envProblems();
if (problems.length) {
  console.error('Cannot start:\n - ' + problems.join('\n - '));
  process.exit(1);
}

const app = require('./app');
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 8000 })
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });

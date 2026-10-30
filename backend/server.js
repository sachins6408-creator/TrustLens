const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const dns = require('dns');

dns.setServers(['8.8.8.8', '8.8.4.4']);
// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Connect to MongoDB Database
connectDB();

const app = express();

// Middlewares
// Allowed origins: localhost (dev) + any *.vercel.app preview/production + explicit FRONTEND_URL
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  process.env.FRONTEND_URL,
].filter(Boolean);

// Match any Vercel preview or production domain automatically
const vercelOriginRegex = /^https:\/\/[\w-]+(\.vercel\.app)$/;

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || vercelOriginRegex.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: Origin not allowed → ${origin}`));
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/health', require('./routes/healthRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/websites', require('./routes/websiteRoutes'));
app.use('/api/reviews', require('./routes/reviewRoutes'));
app.use('/api/evaluation-parameters', require('./routes/evaluationParameterRoutes'));
app.use('/api/history', require('./routes/historyRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/data-mining', require('./routes/dataMiningRoutes'));

// 404 & Error Handling Middlewares
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`[TrustLens Backend]: Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Handle server startup errors gracefully (e.g. port already in use)
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`[TrustLens Backend]: Port ${PORT} is already in use by another process.`);
    console.error(`[TrustLens Backend]: Stop the other process (e.g. "Stop-Process -Id (Get-NetTCPConnection -LocalPort ${PORT}).OwningProcess -Force") or change PORT in .env`);
  } else {
    console.error(`[TrustLens Backend]: Server error -> ${error.message}`);
  }
  process.exit(1);
});

// Handle unhandled promise rejections gracefully
process.on('unhandledRejection', (err) => {
  console.error(`[Unhandled Rejection]: ${err.message}`);
  server.close(() => process.exit(1));
});

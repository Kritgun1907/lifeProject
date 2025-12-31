// MUST load environment variables FIRST before any other imports
import dotenv from "dotenv";
dotenv.config();

// Now import everything else
import app from "./app";
import connectDB from "./config/db";
import "./models"; // Register all Mongoose models

const PORT = process.env.PORT || 5001;

// Connect to MongoDB
connectDB();

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🔐 JWT_ACCESS_SECRET loaded: ${process.env.JWT_ACCESS_SECRET ? '✅ YES' : '❌ NO'}`);
  console.log(`🔐 JWT_REFRESH_SECRET loaded: ${process.env.JWT_REFRESH_SECRET ? '✅ YES' : '❌ NO'}`);
});

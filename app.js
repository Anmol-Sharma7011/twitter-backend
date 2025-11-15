import express from "express";
import dotenv from "dotenv";
import databaseConnection from "./config/database.js";
import cookieParser from "cookie-parser";
import userRoute from "./routes/userRoute.js";
import tweetRoute from "./routes/tweetRoute.js";
import cors from "cors";

dotenv.config({ path: ".env" });
databaseConnection();

const app = express();

// 🧩 Middleware
app.use(express.json()); // for parsing application/json
app.use(express.urlencoded({ extended: true })); // for form data
app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:5173", // ✅ must match frontend origin
    credentials: true, // ✅ allow cookies
  })
);

// 🛣️ Routes
app.use("/api/v1/user", userRoute);
app.use("/api/v1/tweet", tweetRoute);

// 🚀 Start Server
app.listen(process.env.PORT, () => {
  console.log(`✅ Server running on port ${process.env.PORT}`);
});

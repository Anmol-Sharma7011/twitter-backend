import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: "../config/.env" });

const databaseConnection = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to DB");
  } catch (error) {
    console.log("DB connection error:", error);
  }
};

export default databaseConnection;

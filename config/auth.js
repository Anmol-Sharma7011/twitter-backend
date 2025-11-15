// import jwt from "jsonwebtoken";
// import dotenv from "dotenv";

// dotenv.config({
//   path: "../config/.env",
// });

// export const isAuthenticated = async (req, res, next) => {
//   try {
//     const { token } = req.cookies;

//     if (!token) {
//       return res.status(401).json({
//         message: "User not authenticated",
//         success: false,
//       });
//     }

//     const decoded = jwt.verify(token, process.env.JWT_SECRET);

//     // ✅ FIX: attach the correct field name
//     req.userId = decoded.userId;   // controller needs this
//     req.user = decoded;            // optional: full payload if needed

//     next();
//   } catch (error) {
//     console.error("Auth error:", error.message);
//     return res.status(401).json({
//       message: "Invalid or expired token",
//       success: false,
//     });
//   }
// };

import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config({ path: "../config/.env" });

export const isAuthenticated = async (req, res, next) => {
  try {
    const { token } = req.cookies;

    if (!token) {
      return res.status(401).json({
        message: "User not authenticated",
        success: false,
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ Keep only the ID to avoid cast errors
    // ✅ Attach both for safety
    req.user = decoded.userId;
    req.userId = decoded.userId;
    next();
  } catch (error) {
    console.error("Auth error:", error.message);
    return res.status(401).json({
      message: "Invalid or expired token",
      success: false,
    });
  }
};

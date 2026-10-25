const { ObjectId } = require("mongodb");

const verifyUser = (req, res, next) => {
  if (!req.session || !req.userId) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized access",
    });
  }

  next();
};



const verifyRecruiter = (userCollection) => {
  return async (req, res, next) => {
    try {
      if (!req.session || !req.userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized access",
        });
      }

      const userId = req.userId.toString();

      if (req.session.userId?.toString() !== userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized access",
        });
      }

      const user = await userCollection.findOne({
        _id: ObjectId.isValid(userId)
          ? new ObjectId(userId)
          : userId,
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      if (user.role?.trim().toLowerCase() !== "recruiter") {
        return res.status(403).json({
          success: false,
          message: "Access denied. Recruiter role required.",
        });
      }

      req.user = user;

      return next();
    } catch (error) {
      console.error("Recruiter verification error:", error.message);

      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };
};












const verifyAdmin = (userCollection) => {
  return async (req, res, next) => {
    try {
      if (!req.session || !req.userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized access",
        });
      }

      const userId = req.userId.toString();

      if (req.session.userId?.toString() !== userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized access",
        });
      }

      const user = await userCollection.findOne({
        _id: ObjectId.isValid(userId)
          ? new ObjectId(userId)
          : userId,
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const role = user.role?.trim().toLowerCase();

      if (!["admin", "superadmin"].includes(role)) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Admin role required.",
        });
      }

      req.user = user;

      return next();
    } catch (error) {
      console.error("Admin verification error:", error.message);

      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  };
};


module.exports = {
  verifyUser,
  verifyRecruiter,
  verifyAdmin,
};
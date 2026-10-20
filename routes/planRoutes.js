const express = require("express");
const { ObjectId } = require("mongodb");

const router = express.Router();

const planRoutes = (planCollection) => {
    
  router.get("/:planId", async (req, res) => {
  try {
    const { planId } = req.params;

    if (!planId || typeof planId !== "string") {
      return res.status(400).json({
        success: false,
        message: "A valid plan ID is required.",
      });
    }

    const plan = await planCollection.findOne({
      $or: [
        { planId: planId.trim() },
        { id: planId.trim() }
      ],
      isActive: true,
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found or inactive.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Plan fetched successfully.",
      data: {
        success: true,
        plan,
      },
    });
  } catch (error) {
    console.error("Error fetching plan:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch plan.",
    });
  }
});

  return router;
};

module.exports = planRoutes;
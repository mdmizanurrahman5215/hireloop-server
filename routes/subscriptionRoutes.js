const express = require("express");
const { ObjectId } = require("mongodb");

const router = express.Router();

const subscriptionRoutes = (subscriptionCollection, userCollection) => {
  router.post("/", async (req, res) => {
    try {
      const {
        userId,
        email,
        planId,
        planName,
        stripeSubscriptionId,
        stripeCustomerId,
        amount,
        currency,
        interval,
        userType,
      } = req.body;

      if (!planId || typeof planId !== "string") {
        return res.status(400).json({
          success: false,
          message: "A valid plan ID is required.",
        });
      }

      if (!userId && !email) {
        return res.status(400).json({
          success: false,
          message: "User ID or email is required to update subscription.",
        });
      }

      const queryFilter = userId
        ? ObjectId.isValid(userId)
          ? { $or: [{ _id: new ObjectId(userId) }, { id: userId }] }
          : { id: userId }
        : { email: email.trim().toLowerCase() };

      const existingUser = await userCollection.findOne(queryFilter);

      if (!existingUser) {
        return res.status(404).json({
          success: false,
          message: "User not found.",
        });
      }

      const subscriptionData = {
        userId: existingUser._id.toString(),
        email: existingUser.email || email,
        planId: planId.trim(),
        planName: planName || "Subscription Plan",
        userType: userType || "jobseeker",
        stripeSubscriptionId: stripeSubscriptionId || null,
        stripeCustomerId: stripeCustomerId || null,
        amount: amount || 0,
        currency: currency || "usd",
        interval: interval || "monthly",
        status: "active",
        startDate: new Date(),
        updatedAt: new Date(),
      };

      await subscriptionCollection.updateOne(
        { userId: existingUser._id.toString() },
        { $set: subscriptionData },
        { upsert: true }
      );

      const userUpdateFields = {
        planId: planId.trim(),
        subscriptionPlanId: planId.trim(),
        subscriptionStatus: "active",
        stripeSubscriptionId: stripeSubscriptionId || existingUser.stripeSubscriptionId,
        updatedAt: new Date(),
      };

      const userUpdateResult = await userCollection.updateOne(
        queryFilter,
        { $set: userUpdateFields }
      );

      return res.status(200).json({
        success: true,
        message: "Subscription saved and user plan updated successfully.",
        data: {
          subscription: subscriptionData,
          userUpdated: userUpdateResult.modifiedCount > 0,
        },
      });
    } catch (error) {
      console.error("Error processing subscription and updating user:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to process subscription and update user.",
      });
    }
  });

  return router;
};

module.exports = subscriptionRoutes;
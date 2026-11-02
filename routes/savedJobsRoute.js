
const express = require("express");
const { ObjectId } = require("mongodb");
const { verifyToken } = require("../middleware/authMiddleware");
const router = express.Router();

const savedJobsRoutes = (
  {savedJobsCollection,
  jobsCollection,
userCollection,
sessionsCollection}
) => {
router.get("/", verifyToken(sessionsCollection), async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const savedJobs = await savedJobsCollection
      .aggregate([
        {
          $match: { userId },
        },
        {
          $sort: { savedAt: -1 },
        },
        {
          $addFields: {
            jobObjectId: {
              $toObjectId: "$jobId",
            },
          },
        },
        {
          $lookup: {
            from: "jobs",
            localField: "jobObjectId",
            foreignField: "_id",
            as: "job",
          },
        },
        {
          $unwind: {
            path: "$job",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: 1,
            jobId: 1,
            savedAt: 1,
            job: 1,
          },
        },
      ])
      .toArray();

    return res.status(200).json({
      success: true,
      data: savedJobs,
    });
  } catch (error) {
    console.error("Get saved jobs error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch saved jobs",
    });
  }
});
  // Save a job
  router.post("/:jobId",verifyToken(sessionsCollection), async (req, res) => {
    try {
      const { jobId } = req.params;

      // Get userId from authenticated session
      const userId = req.userId;
      console.log({userId,jobId})

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      // Verify job exists
      const job = await jobsCollection.findOne({
        _id: new ObjectId(jobId),
      });

      if (!job) {
        return res.status(404).json({
          success: false,
          message: "Job not found",
        });
      }

      await savedJobsCollection.updateOne(
        { userId, jobId },
        {
          $setOnInsert: {
            userId,
            jobId,
            savedAt: new Date(),
          },
        },
        { upsert: true }
      );

      return res.status(200).json({
        success: true,
        message: "Job saved successfully",
      });
    } catch (error) {
      console.error("Save job error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to save job",
      });
    }
  });

  // Remove saved job
  router.delete("/:jobId", verifyToken(sessionsCollection), async (req, res) => {
    try {
      const userId = req.userId;
      const { jobId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      await savedJobsCollection.deleteOne({
        userId,
        jobId,
      });

      return res.status(200).json({
        success: true,
        message: "Job removed from saved jobs",
      });
    } catch (error) {
      console.error("Unsave job error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to remove saved job",
      });
    }
  });

  return router;
};
module.exports = savedJobsRoutes;
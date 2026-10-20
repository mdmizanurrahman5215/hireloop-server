const express = require("express");
const { ObjectId } = require("mongodb");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

// Resolve the upload directory relative to the server root.
const uploadDir = path.resolve(process.cwd(), "public", "uploads");

// Automatically create the directory if it does not exist.
fs.mkdirSync(uploadDir, { recursive: true });

// Configure storage for uploaded files.
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}`;

    const safeName = path
      .basename(file.originalname)
      .replace(/[^a-zA-Z0-9._-]/g, "_");

    cb(null, `${uniqueSuffix}-${safeName}`);
  },
});

// Configure Multer with basic file size and file count limits.
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB per file
    files: 2,
  },
});

const applicationsRoutes = (applicationsCollection) => {
  // POST /api/applications
  router.post(
    "/",
    upload.fields([
      { name: "resume", maxCount: 1 },
      { name: "experience", maxCount: 1 },
    ]),
    async (req, res) => {
      try {
        const {
          userId,
          companyId,
          jobId,
          fullName,
          email,
          phone,
          portfolio,
          coverLetter,
          experience,
        } = req.body;

        // Retrieve uploaded files from Multer.
        const resumeFile = req.files?.resume?.[0];
        const experienceFile = req.files?.experience?.[0];

        // Validate required fields.
        if (!resumeFile) {
          return res.status(400).json({
            success: false,
            error: "Resume file is required",
          });
        }

        if (!fullName || !email || !jobId) {
          return res.status(400).json({
            success: false,
            error: "Full name, email, and job ID are required",
          });
        }

        // Validate MongoDB ObjectIds before creating them.
        const validObjectId = (value) =>
          typeof value === "string" && ObjectId.isValid(value);

        if (!validObjectId(jobId)) {
          return res.status(400).json({
            success: false,
            error: "Invalid job ID",
          });
        }

        if (userId && !validObjectId(userId)) {
          return res.status(400).json({
            success: false,
            error: "Invalid user ID",
          });
        }

        if (companyId && !validObjectId(companyId)) {
          return res.status(400).json({
            success: false,
            error: "Invalid company ID",
          });
        }

        // Store relative URLs for uploaded files.
        const resumeUrl = `/uploads/${resumeFile.filename}`;

        const experienceUrl = experienceFile
          ? `/uploads/${experienceFile.filename}`
          : null;

        // Construct the MongoDB document.
        const applicationDoc = {
          userId: userId ? new ObjectId(userId) : null,
          companyId: companyId ? new ObjectId(companyId) : null,
          jobId: new ObjectId(jobId),
          fullName,
          email,
          phone: phone || "",
          portfolio: portfolio || "",
          coverLetter: coverLetter || "",
          experience: experience || "",
          resumeUrl,
          experienceUrl,
          status: "applied",
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const result = await applicationsCollection.insertOne(
          applicationDoc
        );

        return res.status(201).json({
          success: true,
          message: "Job application submitted successfully",
          data: {
            ...applicationDoc,
            _id: result.insertedId,
          },
        });
      } catch (error) {
        console.error("Error saving application:", error);

        return res.status(500).json({
          success: false,
          error: "Failed to save job application",
        });
      }
    }
  );

  // GET /api/applications/user/:userId


router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate MongoDB ObjectId
    if (!userId || !ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "A valid user ID is required.",
      });
    }

    const applications = await applicationsCollection
      .find({
        userId: new ObjectId(userId),
      })
      .sort({ createdAt: -1 })
      .toArray();

    return res.status(200).json({
      success: true,
      message: "Applications fetched successfully.",
      total: applications.length,
      applications,
    });
  } catch (error) {
    console.error("Error fetching user applications:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch applications.",
    });
  }
});

  return router;
};

// Handle Multer upload errors.
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "Uploaded file must not exceed 5 MB"
        : error.message;

    return res.status(400).json({
      success: false,
      error: message,
    });
  }

  next(error);
});

module.exports = applicationsRoutes;
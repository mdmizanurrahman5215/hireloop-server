const express = require("express");
const { ObjectId } = require("mongodb");

const router = express.Router();

const jobsRoutes = (jobsCollection) => {

router.get("/", async (req, res) => {
  try {
    const {
      companyId,
      status,
      search,
      type,
      category,
      location,
      isRemote,
      minSalary,
      maxSalary,
      page = 1,
    } = req.query;

    const andConditions = [];

    // 1. Filter by companyId (handles ObjectId and string formats)
    if (companyId) {
      if (ObjectId.isValid(companyId)) {
        andConditions.push({
          $or: [
            { companyId: new ObjectId(companyId) },
            { companyId: companyId },
          ],
        });
      } else {
        andConditions.push({ companyId: companyId });
      }
    }

    // 2. Filter by status (defaults to "Active" for public view if not specified)
    if (status && status !== "all") {
      andConditions.push({ status: status });
    }

    // 3. Search Keyword filter (title, location, description, companyName, jobType)
    if (search && search.trim() !== "") {
      const searchRegex = new RegExp(search.trim(), "i");
      andConditions.push({
        $or: [
          { title: searchRegex },
          { location: searchRegex },
          { description: searchRegex },
          { companyName: searchRegex },
          { jobType: searchRegex },
        ],
      });
    }

    // 4. Category filter
    if (category && category.trim() !== "" && category !== "All Categories") {
      andConditions.push({
        $or: [
          { category: new RegExp(`^${category.trim()}$`, "i") },
          { jobCategory: new RegExp(`^${category.trim()}$`, "i") },
        ],
      });
    }

    // 5. Job Type filter (supports comma-separated types: Full-time, Remote, etc.)
    if (type && type.trim() !== "" && type !== "all") {
      const typeArray = type.split(",").map((t) => new RegExp(`^${t.trim()}$`, "i"));
      andConditions.push({
        $or: [
          { type: { $in: typeArray } },
          { jobType: { $in: typeArray } },
        ],
      });
    }

    // 6. Location filter
    if (location && location.trim() !== "") {
      const locationRegex = new RegExp(location.trim(), "i");
      andConditions.push({
        $or: [
          { location: locationRegex },
          { "location.city": locationRegex },
          { "location.country": locationRegex },
        ],
      });
    }

    // 7. Remote Positions Only filter
    if (isRemote === "true") {
      andConditions.push({
        $or: [
          { isRemote: true },
          { type: new RegExp("remote", "i") },
          { jobType: new RegExp("remote", "i") },
          { location: new RegExp("remote", "i") },
        ],
      });
    }

    // 8. Salary Range filter (handles integer and string salary fields)
    if (minSalary || maxSalary) {
      const min = minSalary ? Number(minSalary) : 0;
      const max = maxSalary ? Number(maxSalary) : Infinity;

      const salaryConditions = [
        // Number range check
        { salary: { $gte: min, ...(maxSalary && {$lte: max }) } },
        { minSalary: { $gte: min }, maxSalary: {$lte: max } },
      ];

      andConditions.push({ $or: salaryConditions });
    }

    // Combine all conditions into $and object
    const query = andConditions.length > 0 ? { $and: andConditions } : {};

    // 9. Pagination Setup (6 jobs per page)
    const limit = 6;
    const currentPage = Math.max(1, parseInt(page, 10) || 1);
    const skip = (currentPage - 1) * limit;

    const totalJobs = await jobsCollection.countDocuments(query);
    const totalPages = Math.ceil(totalJobs / limit) || 1;

    const jobs = await jobsCollection
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    return res.status(200).json({
      success: true,
      data: {
        jobs,
        totalPages,
        currentPage,
        totalJobs,
      },
    });
  } catch (error) {
    console.error("Error fetching jobs:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch jobs",
      error: error.message,
    });
  }
});


router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Check if ID exists and basic string check
    if (!id || typeof id !== "string") {
      return res.status(400).json({
        success: false,
        message: "Job ID is required",
      });
    }

    // 2. Exact 24-character hex string validation for BSON ObjectId
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(id);

    let query = {};
    if (isValidObjectId) {
    
      query = {
        $or: [{ _id: new ObjectId(id) }, { _id: id }],
      };
    } else {
    
      query = { _id: id };
    }

    // 3. Database query
    const job = await jobsCollection.findOne(query);

    // 4. If job not found
    if (!job) {
      return res.status(404).json({
        success: false,
        message: `Job not found with ID: ${id}`,
      });
    }

    // 5. Successful Response
    return res.status(200).json({
      success: true,
      data: job,
    });
  } catch (error) {
    console.error("Error fetching job by ID:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch job",
      error: error.message,
    });
  }
});

    
  router.post("/", async (req, res) => {
    try {
      const payload = req.body;

      // Basic validation for required fields
      if (!payload.title || !payload.companyId) {
        return res.status(400).json({
          success: false,
          message: "Title and Company ID are required fields.",
        });
      }

      // Prepare document for database insertion
      const newJob = {
        ...payload,
        title: payload.title,
        category: payload.category || "",
        jobType: payload.jobType || "",
        salary: {
          min: Number(payload.salary?.min) || 0,
          max: Number(payload.salary?.max) || 0,
          currency: payload.salary?.currency || "BDT",
        },
        location: {
          city: payload.location?.remote ? "" : payload.location?.city || "",
          country: payload.location?.remote ? "" : payload.location?.country || "",
          remote: Boolean(payload.location?.remote),
        },
        applicationDeadline: payload.applicationDeadline ? new Date(payload.applicationDeadline) : null,
        description: {
          responsibilities: payload.description?.responsibilities || "",
          requirements: payload.description?.requirements || "",
          benefits: payload.description?.benefits || "",
        },
       companyId: ObjectId.isValid(payload.companyId) ? new ObjectId(payload.companyId) : payload.companyId,
        status: payload.status || "active",
        createdAt: payload.createdAt ? new Date(payload.createdAt) : new Date(),
      };

      const result = await jobsCollection.insertOne(newJob);

      return res.status(201).json({
        success: true,
        message: "Job created successfully",
        insertedId: result.insertedId,
        data: newJob,
      });
    } catch (error) {
      console.error("Error creating job:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to create job post",
        error: error.message,
      });
    }
  });


  return router;
};

module.exports = jobsRoutes;
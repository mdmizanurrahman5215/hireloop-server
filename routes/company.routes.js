const express = require("express");
const { ObjectId } = require("mongodb");
const {verifyToken } = require("../middleware/authMiddleware");
const { verifyAdmin, verifyRecruiter } = require("../middleware/verifyRole");

const router = express.Router();

const companyRoutes = (companiesCollection,userCollection,sessionsCollection) => {
  router.get("/", verifyToken(sessionsCollection),verifyAdmin(userCollection), async (req, res) => {
    try {
      const { category, status, userId } = req.query;

      const query = {};

      // Filter by category
      if (category && category !== "all") {
        query.category = { $regex: new RegExp(`^${category}$`, "i") };
      }

      // Filter by status (e.g., PENDING, APPROVED, REJECTED)
      if (status && status !== "all") {
        query.status = status;
      }

      // Filter by owner userId (handles both ObjectId and string matching)
      if (userId) {
        if (ObjectId.isValid(userId)) {
          query.$or = [{ userId: new ObjectId(userId) }, { userId: userId }];
        } else {
          query.userId = userId;
        }
      }

      const companies = await companiesCollection
        .find(query)
        .sort({ createdAt: -1 })
        .toArray();

      return res.status(200).json({
        success: true,
        companies,
      });
    } catch (error) {
      console.error("Error fetching companies:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch companies",
        error: error.message,
      });
    }
  });

  // GET /:id - Fetch a single company by ID
  router.get("/:id", async (req, res) => {
    try {
      const { id } = req.params;

      const query = ObjectId.isValid(id)
        ? { _id: new ObjectId(id) }
        : { _id: id };

      const company = await companiesCollection.findOne(query);

      if (!company) {
        return res.status(404).json({
          success: false,
          message: "Company not found",
        });
      }

      return res.status(200).json({
        success: true,
        company,
      });
    } catch (error) {
      console.error("Error fetching company details:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch company details",
        error: error.message,
      });
    }
  });

  router.patch("/:id", async (req, res) => {
  try {
    console.log({req});
    
    const { id } = req.params;
    console.log("companyId", id);
    
    const { status } = req.body;
    console.log("request body test", req.body);
    

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    const query = ObjectId.isValid(id)
      ? { _id: new ObjectId(id) }
      : { _id: id };

    const updateDoc = {
      $set: {
        status: status,
        updatedAt: new Date(),
      },
    };

    const result = await companiesCollection.updateOne(query, updateDoc);

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    const updatedCompany = await companiesCollection.findOne(query);

    return res.status(200).json({
      success: true,
      message: "Company status updated successfully",
      company: updatedCompany,
    });
  } catch (error) {
    console.error("Error updating company status:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update company status",
      error: error.message,
    });
  }
});

  // POST / - Register a new company
  router.post("/", async (req, res) => {
    try {
      const {
        name,
        category,
        website,
        location,
        employeeCount,
        description,
        logo,
        status,
        userId,
        userEmail,
        createdAt,
      } = req.body;

      // Required field validation matching client modal requirements
      if (!name || !category || !location || !logo) {
        return res.status(400).json({
          success: false,
          message: "Name, category, location, and logo are required fields.",
        });
      }

      // Prepare payload document for MongoDB insertion
      const newCompany = {
        name: name.trim(),
        category: category.trim(),
        website: website ? website.trim() : "",
        location: location.trim(),
        employeeCount: employeeCount || "1-10 employees",
        logo: logo.trim(),
        description: description ? description.trim() : "",
        status: status || "PENDING",
        userId: userId
          ? ObjectId.isValid(userId)
            ? new ObjectId(userId)
            : userId
          : null,
        userEmail: userEmail || "",
        createdAt: createdAt ? new Date(createdAt) : new Date(),
        updatedAt: new Date(),
      };

      const result = await companiesCollection.insertOne(newCompany);

      return res.status(201).json({
        success: true,
        message: "Company registered successfully",
        insertedId: result.insertedId,
        data: newCompany,
      });
    } catch (error) {
      console.error("Error registering company:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to register company",
        error: error.message,
      });
    }
  });

  return router;
};

module.exports = companyRoutes;

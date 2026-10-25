import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import jobsRoutes from './routes/jobs.routes.js';
import companyRoutes from './routes/company.routes.js';
import applicationsRoutes from './routes/application.routes.js';
import planRoutes from './routes/planRoutes.js';
import subscriptionRoutes from './routes/subscriptionRoutes.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const client = new MongoClient(process.env.MONGO_DB_URI);

async function startServer() {
  try {
    // 1. Connect to MongoDB
    await client.connect();
    console.log("Successfully connected to MongoDB!");

    const database = client.db("hireloop_db");
    const jobsCollection = database.collection("jobs");
    const companyCollection = database.collection("companies")
    const applicationsCollection = database.collection("applications");
    const planCollection = database.collection("plans");
    const subscriptionCollection = database.collection("subscriptions");
    const userCollection = database.collection("user");
    const sessionsCollection = database.collection("session");

    // 2. Register Routes AFTER database connection is ready
    app.use("/api/jobs", jobsRoutes({jobsCollection,sessionsCollection,userCollection}));
    app.use("/api/companies", companyRoutes(companyCollection,userCollection,sessionsCollection));
    app.use("/api/applications", applicationsRoutes(applicationsCollection,userCollection));
    app.use("/api/plans", planRoutes(planCollection,userCollection));
    app.use("/api/subscriptions", subscriptionRoutes(subscriptionCollection,userCollection));

    app.get('/', (req, res) => {
      res.send('Server running successfully');
    });

    // 3. Start Express server ONLY after routes are mounted
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err);
    process.exit(1);
  }
}

// Initialize application
startServer();
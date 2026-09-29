
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());


// Start server after successful database connection
const PORT = process.env.PORT || 5000;

const client = new MongoClient(process.env.MONGO_DB_URI);
export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}
// Call this only when your application terminates
export async function disconnectFromMongoDB() {
//   await client.close();
}

 app.get('/', (req, res)=> {
    res.send('hello world')
 })

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
// //Entry point of API server

import "dotenv/config";

import express from "express";
import { dbconnection } from "./database/dbconnection.js";
import router from "./route/routes.js";

const app = express();

//body parser middleware
app.use(express.json());

// Define a route for GET requests to the root URL
app.get('/', (req, res) => {
  res.send('Hello Smart Budget from Express');
});

app.use(express.urlencoded({ extended: true }));

//routes
app.use("/api", router);

// Database connection globally
await dbconnection();

app.listen(process.env.PORT, () => {
    console.log(`Server is running at PORT ${process.env.PORT}`);
 });
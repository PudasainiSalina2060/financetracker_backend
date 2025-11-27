const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./config/db");

const app = express();
app.use(cors()); // Allow Flutter app to connect
app.use(express.json()); // Parse JSON body

// TEST API — Checking if the server working
app.get("/api/test", (req, res) => {
    res.json({ message: "Backend is running successfully!" });
});

// TEST DATABASE CONNECTION
app.get("/api/db-test", async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW()");
        res.json({ time: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start server
app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
});

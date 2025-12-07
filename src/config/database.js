// Importing the PostgreSQL connection pool
const { Pool } = require("pg");

const pool = new Pool({
    host : "localhost",
    user: "postgres",
    port: 5432,
    password : "Pud@s@ini2060",
    database: "smartbudget"

})

pool.connect().then(()=> console.log("connected"))


import pkg from "../../generated/prisma/index.js";
const { PrismaClient } = pkg;

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

console.log("DATABASE_URL =", process.env.DATABASE_URL);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
});

export const dbconnection = async () => {
  await prisma.$connect();
  console.log("Database connected successfully");
};

//exporting prisma globally
export default prisma;

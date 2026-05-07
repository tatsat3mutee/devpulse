import Pool from "pg";

const dbUrl = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/ai_pulse";
const isLocal = dbUrl.includes("localhost") || dbUrl.includes("127.0.0.1");

// Neon (and other hosted PG) requires SSL. Pool size is capped at 10 to stay
// within Neon's free-tier connection limit (default max_connections = 100 but
// shared across all clients; 10 is a safe ceiling for a single Express worker).
const pool = new Pool.Pool({
  connectionString: isLocal ? dbUrl : dbUrl.replace("sslmode=require", "sslmode=verify-full"),
  ssl: isLocal ? false : { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

// Test connection on startup (also wakes Neon's compute if it was suspended)
pool.query("SELECT NOW()").then(() => {
  console.log("✅ PostgreSQL connected");
}).catch((err) => {
  console.error("❌ PostgreSQL connection failed:", err.message);
});

export default pool;

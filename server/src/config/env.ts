import dotenv from "dotenv";

dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

const rawOrigins = process.env.CLIENT_URLS ?? process.env.CLIENT_URL ?? "http://localhost:5173";
const allowedOrigins = rawOrigins
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: Number(process.env.PORT ?? 4000),
  MONGODB_URI: requireEnv("MONGODB_URI"),
  JWT_SECRET: requireEnv("JWT_SECRET"),
  YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY ?? "",
  ALLOWED_ORIGINS: allowedOrigins,
};

export default env;

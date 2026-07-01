// API origin; client appends "/api" (same rule as the web client).
export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL ?? "https://xws47krskc.ap-southeast-1.awsapprunner.com"
).replace(/\/+$/, "");

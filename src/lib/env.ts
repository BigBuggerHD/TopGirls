import "server-only";

function required(name: string, fallbackDev?: string): string {
  const v = process.env[name];
  if (v && v.length > 0) return v;
  if (process.env.NODE_ENV !== "production" && fallbackDev) return fallbackDev;
  throw new Error(`Umgebungsvariable ${name} fehlt.`);
}

export const env = {
  appUrl: (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  sessionSecret: required("SESSION_SECRET", "dev-session-secret-nicht-fuer-produktion-000000"),
  isProd: process.env.NODE_ENV === "production",
  storageDriver: (process.env.STORAGE_DRIVER ?? "local") as "local" | "s3",
  paymentSandbox: process.env.PAYMENT_SANDBOX === "true",
};

import Paystack from "paystack-sdk";

const secretKey = process.env.PAYSTACK_SECRET_KEY || "";
export const paystack = new Paystack(secretKey);

export function verifyWebhookSignature(rawBody: string, signature?: string) {
  if (!secretKey || !signature) return false;
  const crypto = require("crypto");
  const hash = crypto.createHmac("sha512", secretKey).update(rawBody).digest("hex");
  return hash === signature;
}

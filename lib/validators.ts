import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  phone: z.string().optional(),
});

export const adminUserCreateSchema = registerSchema.extend({
  role: z.enum(["USER", "ADMIN"]).optional(),
});

export const adminUserUpdateSchema = z.object({
  role: z.enum(["USER", "ADMIN"]).optional(),
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const profileUpdateSchema = z.object({
  name: z.string().min(2),
  phone: z.string().optional(),
});

export const walletDepositSchema = z.object({
  amount: z.number().positive(),
  email: z.string().email().optional(),
});

export const walletChargeSchema = z.object({
  orderId: z.string().min(1),
});

export const categorySchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  parentId: z.string().optional(),
});

export const productSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  categoryId: z.string(),
  price: z.number().positive(),
  salePrice: z.number().positive().optional(),
  stock: z.number().int().nonnegative(),
  variants: z.any().optional(),
  media: z.any().optional(),
  type: z.enum(["PHYSICAL", "DIGITAL"]),
  digitalUrl: z.string().url().optional(),
  specs: z.any().optional(),
  active: z.boolean().optional(),
});

export const orderItemSchema = z.object({
  productId: z.string(),
  variant: z.any().optional(),
  qty: z.number().int().positive(),
  price: z.number().positive(),
});

export const orderCreateSchema = z.object({
  items: z.array(orderItemSchema).nonempty(),
  deliveryInfo: z.any().optional(),
});

export const dataPurchaseSchema = z.object({
  network: z.enum(["mtn", "telecel", "airteltigo"]),
  bundleId: z.string(),
  phone: z.string().min(9),
  agentSlug: z.string().min(3).max(40).optional(),
});

export const agentApplySchema = z.object({
  storefrontName: z.string().min(2),
  contactPhone: z.string().min(9),
  whatsappNumber: z.string().min(9),
});

export const agentStorefrontUpdateSchema = z.object({
  storefrontName: z.string().min(2),
  contactPhone: z.string().min(9),
  whatsappNumber: z.string().min(9),
  markups: z.record(z.string(), z.number().min(0).max(200)).optional(),
});

export const agentApplicationReviewSchema = z.object({
  userId: z.string(),
  action: z.enum(["APPROVE", "REJECT"]),
});

export const agentWithdrawalCreateSchema = z.object({
  amount: z.number().min(50),
  momoNumber: z.string().min(9),
  momoName: z.string().min(2),
  momoNetwork: z.enum(["mtn", "telecel", "airteltigo"]),
});

export const agentWithdrawalUpdateSchema = z.object({
  action: z.enum(["PROCESS", "REJECT"]),
});

export const dataBundleSchema = z.object({
  network: z.enum(["mtn", "telecel", "airteltigo"]),
  name: z.string().min(2),
  price: z.number().positive(),
  volume: z.string().min(1),
  validity: z.string().min(1),
  segment: z.string().optional(),
  tag: z.string().optional(),
  badge: z.string().optional(),
  logoUrl: z.string().url().optional(),
});

export const dataBundleUpdateSchema = dataBundleSchema.partial();

export const paystackInitSchema = z.object({
  amount: z.number().positive(),
  email: z.string().email(),
  reference: z.string().min(4),
  metadata: z.any().optional(),
});

export const designRequestSchema = z.object({
  name: z.string().min(2),
  contact: z.string().min(5),
  channel: z.enum(["whatsapp", "telegram"]),
  message: z.string().optional(),
});

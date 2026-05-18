import { Prisma } from "@prisma/client";

type JsonObject = Record<string, unknown>;

type AgentStatus = "PENDING" | "APPROVED" | "REJECTED";

export type AgentProfile = {
  status: AgentStatus;
  storefrontSlug: string;
  storefrontName: string;
  contactPhone: string;
  whatsappNumber: string;
  markups: Record<string, number>;
  appliedAt: string;
  approvedAt?: string;
  approvedByUserId?: string;
  rejectedAt?: string;
  rejectedByUserId?: string;
};

export const AGENT_WITHDRAW_FEE = 1;
export const AGENT_MIN_WITHDRAWAL = 50;

const toObject = (value: unknown): JsonObject => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as JsonObject;
};

const sanitizeSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40)
    .replace(/^-|-$/g, "");

export function generateStorefrontSlug(name: string, seed?: string) {
  const base = sanitizeSlug(name) || "agent-store";
  if (!seed) return base;
  return `${base}-${seed.slice(-4).toLowerCase()}`;
}

export function getAgentProfile(addresses: Prisma.JsonValue | null | undefined): AgentProfile | null {
  const root = toObject(addresses);
  const agentRaw = toObject(root.agent);
  const status = typeof agentRaw.status === "string" ? (agentRaw.status as AgentStatus) : null;
  if (!status) return null;

  return {
    status,
    storefrontSlug: typeof agentRaw.storefrontSlug === "string" ? agentRaw.storefrontSlug : "",
    storefrontName: typeof agentRaw.storefrontName === "string" ? agentRaw.storefrontName : "",
    contactPhone: typeof agentRaw.contactPhone === "string" ? agentRaw.contactPhone : "",
    whatsappNumber: typeof agentRaw.whatsappNumber === "string" ? agentRaw.whatsappNumber : "",
    markups: toObject(agentRaw.markups) as Record<string, number>,
    appliedAt: typeof agentRaw.appliedAt === "string" ? agentRaw.appliedAt : new Date().toISOString(),
    approvedAt: typeof agentRaw.approvedAt === "string" ? agentRaw.approvedAt : undefined,
    approvedByUserId: typeof agentRaw.approvedByUserId === "string" ? agentRaw.approvedByUserId : undefined,
    rejectedAt: typeof agentRaw.rejectedAt === "string" ? agentRaw.rejectedAt : undefined,
    rejectedByUserId: typeof agentRaw.rejectedByUserId === "string" ? agentRaw.rejectedByUserId : undefined,
  };
}

export function setAgentProfile(addresses: Prisma.JsonValue | null | undefined, profile: AgentProfile): Prisma.InputJsonValue {
  const root = toObject(addresses);
  return {
    ...root,
    agent: profile,
  } as Prisma.InputJsonValue;
}

export function isApprovedAgent(profile: AgentProfile | null) {
  return Boolean(profile && profile.status === "APPROVED");
}

export function getAgentMarkup(profile: AgentProfile | null, bundleId: string) {
  if (!profile) return 0;
  const raw = profile.markups?.[bundleId];
  const value = typeof raw === "number" ? raw : 0;
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function computeAgentTier(salesCount: number) {
  if (salesCount >= 3000) return { tier: 4, badge: "Tier 4" };
  if (salesCount >= 1000) return { tier: 3, badge: "Tier 3" };
  if (salesCount >= 500) return { tier: 2, badge: "Tier 2" };
  return { tier: 1, badge: "Tier 1" };
}

export function getAgentWalletMetrics(orders: Array<{ total: Prisma.Decimal; payment: { status: string } | null; deliveryInfo: Prisma.JsonValue; status: string }>) {
  const isType = (info: Prisma.JsonValue, type: string) => {
    if (!info || typeof info !== "object" || Array.isArray(info)) return false;
    return ((info as JsonObject).type || "") === type;
  };

  const commissions = orders.filter((order) => isType(order.deliveryInfo, "AGENT_COMMISSION") && order.payment?.status === "SUCCESS");
  const withdrawalsReserved = orders.filter((order) => {
    if (!isType(order.deliveryInfo, "AGENT_WITHDRAWAL")) return false;
    if (!order.payment) return order.status !== "CANCELED";
    return order.payment.status !== "FAILED";
  });

  const totalCommissions = commissions.reduce((sum, order) => sum + Number(order.total), 0);
  const totalWithdrawalsReserved = withdrawalsReserved.reduce((sum, order) => sum + Number(order.total), 0);
  const balance = Math.max(totalCommissions - totalWithdrawalsReserved, 0);

  return {
    balance,
    totalCommissions,
    totalWithdrawalsReserved,
  };
}

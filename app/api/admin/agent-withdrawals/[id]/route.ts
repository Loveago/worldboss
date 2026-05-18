import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { fail, ok } from "@/lib/response";
import { agentWithdrawalUpdateSchema } from "@/lib/validators";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = requireRole(req, ["ADMIN"] as any);
  if ("body" in auth) return auth;

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { payment: true },
  });
  if (!order) return fail("Withdrawal request not found", 404);

  const info = (order.deliveryInfo || {}) as Record<string, unknown>;
  if (info.type !== "AGENT_WITHDRAWAL") return fail("Not an agent withdrawal request", 400);

  const json = await req.json().catch(() => null);
  const parsed = agentWithdrawalUpdateSchema.safeParse(json);
  if (!parsed.success) return fail("Invalid payload", 400, parsed.error.flatten());

  const isProcess = parsed.data.action === "PROCESS";

  if (order.payment) {
    await prisma.payment.update({
      where: { id: order.payment.id },
      data: {
        status: isProcess ? "SUCCESS" : "FAILED",
      },
    });
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: isProcess ? "DELIVERED" : "CANCELED",
      deliveryInfo: {
        ...info,
        processedAt: new Date().toISOString(),
        processedBy: auth.id,
        adminAction: parsed.data.action,
      },
    },
  });

  return ok({ updated: true, action: parsed.data.action });
}

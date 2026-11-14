import { openPaymentSession, payOrder } from "../api/orders";
import type { PaymentSession } from "../api/commerce";
import type { Order } from "../api/types";
import { launchHalyk } from "./halyk";

export async function startOrderPayment(order: Pick<Order, "id" | "totalAmount">, onSession: (session: PaymentSession) => void) {
  if (order.totalAmount === 0) return payOrder(order.id);
  const session = await openPaymentSession(order.id);
  onSession(session);
  if (session.provider === "SIMULATED") return payOrder(order.id);
  if (session.provider !== "HALYK") throw new Error("Неизвестный платёжный провайдер.");
  await launchHalyk(session);
}

import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env["STRIPE_SECRET_KEY"]!, {
      httpClient: Stripe.createFetchHttpClient(),
    });
  }
  return _stripe;
}

export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

/** Resolve the best payment method ID for an off-session charge.
 *  Priority: subscription.default_payment_method
 *         → customer.invoice_settings.default_payment_method
 *         → first card on file
 */
export async function resolvePaymentMethod(customerId: string, subscriptionId: string | null): Promise<string | null> {
  if (subscriptionId) {
    try {
      const sub = await stripe.subscriptions.retrieve(subscriptionId, { expand: ["default_payment_method"] });
      const pm = sub.default_payment_method as Stripe.PaymentMethod | string | null;
      if (pm) return typeof pm === "string" ? pm : pm.id;
    } catch { /* fall through */ }
  }
  try {
    const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
    if (!customer.deleted) {
      const pm = customer.invoice_settings?.default_payment_method;
      if (pm) return typeof pm === "string" ? pm : (pm as Stripe.PaymentMethod).id;
    }
  } catch { /* fall through */ }
  try {
    const pms = await stripe.paymentMethods.list({ customer: customerId, type: "card", limit: 1 });
    if (pms.data.length > 0) return pms.data[0].id;
  } catch { /* fall through */ }
  return null;
}

export const PLANS = {
  pro: {
    name: "Credit 800",
    price: 0, // Free
    priceId: process.env["STRIPE_PRO_PRICE_ID"] || "",
    features: [
      "Unlimited dispute letters",
      "Escalation letters (Round 2/3)",
      "CFPB complaint generator",
      "Credit score simulator",
      "Document vault",
      "Debt payoff optimizer",
      "Card recommendations",
      "Score tracking & charts",
      "Smart notifications",
      "Mail disputes via USPS ($2/letter)",
    ],
  },
} as const;

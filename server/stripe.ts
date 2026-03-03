import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is required");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-02-25.clover" as any,
});

export const PLANS: Record<string, { name: string; priceEur: number; analysesLimit: number; nichesLimit: number }> = {
  starter: { name: "Starter", priceEur: 2900, analysesLimit: 20, nichesLimit: 1 },
  pro: { name: "Pro", priceEur: 6900, analysesLimit: 100, nichesLimit: 3 },
  studio: { name: "Studio", priceEur: 19900, analysesLimit: 300, nichesLimit: 999 },
};

let _priceCache: Record<string, string> = {};

export async function ensureStripePrices(): Promise<Record<string, string>> {
  if (Object.keys(_priceCache).length > 0) return _priceCache;

  for (const [planKey, plan] of Object.entries(PLANS)) {
    const products = await stripe.products.list({ limit: 100 });
    let product = products.data.find(p => p.metadata?.plan_key === planKey && p.active);

    if (!product) {
      product = await stripe.products.create({
        name: `Craflect ${plan.name}`,
        metadata: { plan_key: planKey },
      });
    }

    const prices = await stripe.prices.list({ product: product.id, active: true, limit: 10 });
    let price = prices.data.find(p =>
      p.unit_amount === plan.priceEur &&
      p.currency === "eur" &&
      p.recurring?.interval === "month" &&
      p.tax_behavior === "exclusive"
    );

    if (!price) {
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: plan.priceEur,
        currency: "eur",
        recurring: { interval: "month" },
        tax_behavior: "exclusive",
      });
    }

    _priceCache[planKey] = price.id;
  }

  return _priceCache;
}

export async function getOrCreateStripeCustomer(email: string, name: string, existingCustomerId?: string | null): Promise<string> {
  if (existingCustomerId) {
    try {
      const customer = await stripe.customers.retrieve(existingCustomerId);
      if (!customer.deleted) return existingCustomerId;
    } catch {}
  }

  const customer = await stripe.customers.create({
    email,
    name,
  });

  return customer.id;
}

export async function createCheckoutSession(
  customerId: string,
  planKey: string,
  successUrl: string,
  cancelUrl: string,
): Promise<string> {
  const prices = await ensureStripePrices();
  const priceId = prices[planKey];
  if (!priceId) throw new Error(`Unknown plan: ${planKey}`);

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    automatic_tax: { enabled: true },
  });

  return session.url!;
}

export async function createBillingPortalSession(customerId: string, returnUrl: string): Promise<string> {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session.url;
}

export async function listPaymentMethods(customerId: string) {
  const methods = await stripe.paymentMethods.list({
    customer: customerId,
    type: "card",
  });

  const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
  const defaultPaymentMethodId = typeof customer.invoice_settings?.default_payment_method === "string"
    ? customer.invoice_settings.default_payment_method
    : customer.invoice_settings?.default_payment_method?.id || null;

  return methods.data.map(pm => ({
    id: pm.id,
    brand: pm.card?.brand || "unknown",
    last4: pm.card?.last4 || "****",
    expMonth: pm.card?.exp_month || 0,
    expYear: pm.card?.exp_year || 0,
    isDefault: pm.id === defaultPaymentMethodId,
  }));
}

export async function createSetupIntent(customerId: string) {
  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ["card"],
  });
  return {
    clientSecret: setupIntent.client_secret,
  };
}

export async function detachPaymentMethod(paymentMethodId: string) {
  await stripe.paymentMethods.detach(paymentMethodId);
}

export async function setDefaultPaymentMethod(customerId: string, paymentMethodId: string) {
  await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });
}

export async function getCustomerInvoices(customerId: string): Promise<any[]> {
  const invoices = await stripe.invoices.list({
    customer: customerId,
    limit: 20,
  });

  return invoices.data.map(inv => ({
    id: inv.id,
    date: inv.created,
    amount_excluding_tax: inv.subtotal,
    tax: inv.tax ?? 0,
    total: inv.total,
    currency: inv.currency,
    status: inv.status,
    invoice_pdf: inv.invoice_pdf,
    hosted_invoice_url: inv.hosted_invoice_url,
  }));
}

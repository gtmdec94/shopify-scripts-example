import "@shopify/shopify-app-remix/adapters/node";
import { LATEST_API_VERSION } from "@shopify/shopify-app-remix/server";

// Shopify App configuration
// In production, this uses @shopify/shopify-app-remix to handle:
// - OAuth flow
// - Session storage (PostgreSQL via Prisma)
// - Webhook registration
// - API client creation

export const SHOPIFY_API_VERSION = LATEST_API_VERSION || "2024-10";

// Placeholder for the full Shopify app configuration
// In production, use shopifyApp() from @shopify/shopify-app-remix:
//
// import { shopifyApp } from "@shopify/shopify-app-remix/server";
// import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
//
// const shopify = shopifyApp({
//   apiKey: process.env.SHOPIFY_API_KEY!,
//   apiSecretKey: process.env.SHOPIFY_API_SECRET!,
//   scopes: process.env.SHOPIFY_SCOPES!.split(","),
//   appUrl: process.env.SHOPIFY_APP_URL!,
//   authPathPrefix: "/auth",
//   sessionStorage: new PrismaSessionStorage(prisma),
//   webhooks: {
//     ORDERS_CREATE: { deliveryMethod: DeliveryMethod.Http, callbackUrl: "/webhooks" },
//     APP_UNINSTALLED: { deliveryMethod: DeliveryMethod.Http, callbackUrl: "/webhooks" },
//   },
//   hooks: {
//     afterAuth: async ({ session }) => {
//       // Register metafield definitions
//       // Link store to B2B account
//     },
//   },
// });
//
// export default shopify;

export default {};

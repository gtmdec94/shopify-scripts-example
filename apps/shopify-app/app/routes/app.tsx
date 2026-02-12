import { Outlet } from "@remix-run/react";
import { AppProvider } from "@shopify/shopify-app-remix/react";

/**
 * App layout wrapper — wraps all embedded admin pages with Shopify App Bridge.
 */
export default function App() {
  return (
    <AppProvider isEmbeddedApp apiKey={process.env.SHOPIFY_API_KEY || ""}>
      <Outlet />
    </AppProvider>
  );
}

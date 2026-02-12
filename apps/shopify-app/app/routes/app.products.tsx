import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

/**
 * Embedded Shopify Admin page: shows products imported from B2B platform.
 * Displays sync status, manufacturer SKU, and last synced date.
 */
export const loader = async () => {
  // In production:
  // 1. Get current session from Shopify auth
  // 2. Look up ShopifyStore by session shop domain
  // 3. Fetch all ShopifyProductMappings for this store
  return json({
    products: [
      {
        id: "placeholder",
        title: "Sample Imported Product",
        manufacturerSku: "MUG-WHITE-11OZ",
        syncStatus: "SYNCED",
        lastSyncedAt: new Date().toISOString(),
        resellerPrice: "299.00",
      },
    ],
  });
};

export default function ProductsPage() {
  const { products } = useLoaderData<typeof loader>();

  return (
    <div style={{ padding: "20px" }}>
      <h1>Imported Products</h1>
      <p>Products imported from B2B Platform to your Shopify store.</p>

      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "20px" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #ddd", textAlign: "left" }}>
            <th style={{ padding: "12px" }}>Product</th>
            <th style={{ padding: "12px" }}>Manufacturer SKU</th>
            <th style={{ padding: "12px" }}>Your Price</th>
            <th style={{ padding: "12px" }}>Sync Status</th>
            <th style={{ padding: "12px" }}>Last Synced</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product: any) => (
            <tr key={product.id} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: "12px" }}>{product.title}</td>
              <td style={{ padding: "12px" }}><code>{product.manufacturerSku}</code></td>
              <td style={{ padding: "12px" }}>₹{product.resellerPrice}</td>
              <td style={{ padding: "12px" }}>
                <span style={{
                  padding: "4px 8px",
                  borderRadius: "4px",
                  fontSize: "12px",
                  background: product.syncStatus === "SYNCED" ? "#e6f4ea" : "#fce8e6",
                  color: product.syncStatus === "SYNCED" ? "#137333" : "#c5221f",
                }}>
                  {product.syncStatus}
                </span>
              </td>
              <td style={{ padding: "12px" }}>
                {new Date(product.lastSyncedAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

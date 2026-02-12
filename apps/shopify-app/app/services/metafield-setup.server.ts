/**
 * Register metafield definitions on Shopify store after app installation.
 *
 * Uses $app: reserved namespace so metafields are:
 * - Owned by this app
 * - Hidden from merchant UI by default
 * - Accessible only via API
 *
 * This is how the system maintains product identity even when resellers
 * edit product title/description/price on their store.
 */

export async function registerMetafieldDefinitions(shopDomain: string, accessToken: string) {
  const apiVersion = '2024-10';
  const graphqlUrl = `https://${shopDomain}/admin/api/${apiVersion}/graphql.json`;

  const definitions = [
    {
      name: 'Manufacturer SKU',
      namespace: '$app:b2b_reseller',
      key: 'manufacturer_sku',
      type: 'single_line_text_field',
      description: 'Internal manufacturer SKU for product identification',
      ownerType: 'PRODUCT',
    },
    {
      name: 'Print Config ID',
      namespace: '$app:b2b_reseller',
      key: 'print_config_id',
      type: 'single_line_text_field',
      description: 'Manufacturing print configuration identifier',
      ownerType: 'PRODUCT',
    },
    {
      name: 'Customization Schema',
      namespace: '$app:b2b_reseller',
      key: 'customization_schema',
      type: 'json',
      description: 'JSON schema defining customer customization fields',
      ownerType: 'PRODUCT',
    },
  ];

  for (const def of definitions) {
    const mutation = `
      mutation metafieldDefinitionCreate($definition: MetafieldDefinitionInput!) {
        metafieldDefinitionCreate(definition: $definition) {
          createdDefinition { id name namespace key }
          userErrors { field message }
        }
      }
    `;

    // In production, execute this GraphQL mutation:
    // const response = await fetch(graphqlUrl, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'X-Shopify-Access-Token': accessToken,
    //   },
    //   body: JSON.stringify({
    //     query: mutation,
    //     variables: { definition: def },
    //   }),
    // });

    console.log(`[Metafield Setup] Would register: ${def.namespace}.${def.key} on ${shopDomain}`);
  }
}

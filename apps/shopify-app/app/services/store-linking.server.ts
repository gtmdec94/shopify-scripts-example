/**
 * Links a Shopify store to a B2B Platform reseller account.
 *
 * Called after Shopify OAuth completes. The flow:
 * 1. Check if shopDomain already exists in ShopifyStore table
 * 2. If yes, reactivate if previously uninstalled
 * 3. If no, prompt reseller to log in with B2B credentials to link
 * 4. Create ShopifyStore record linking to the B2B user
 */

export interface StoreLinkingResult {
  isLinked: boolean;
  shopifyStoreId?: string;
  requiresLinking: boolean;
}

export async function checkStoreLink(
  shopDomain: string,
  accessToken: string,
): Promise<StoreLinkingResult> {
  // In production, query the NestJS API or Prisma directly:
  //
  // const store = await prisma.shopifyStore.findUnique({
  //   where: { shopDomain },
  // });
  //
  // if (store) {
  //   // Reactivate if previously uninstalled
  //   if (!store.isActive) {
  //     await prisma.shopifyStore.update({
  //       where: { id: store.id },
  //       data: { isActive: true, accessToken, uninstalledAt: null },
  //     });
  //   }
  //   return { isLinked: true, shopifyStoreId: store.id, requiresLinking: false };
  // }
  //
  // return { isLinked: false, requiresLinking: true };

  console.log(`[Store Linking] Check link for ${shopDomain}`);
  return { isLinked: false, requiresLinking: true };
}

export async function linkStore(
  shopDomain: string,
  accessToken: string,
  scopes: string,
  b2bEmail: string,
  b2bPassword: string,
): Promise<StoreLinkingResult> {
  // In production:
  // 1. Authenticate B2B user with email/password
  // 2. Create ShopifyStore record linked to user
  // 3. Register metafield definitions
  // 4. Register webhooks

  console.log(`[Store Linking] Linking ${shopDomain} to B2B account ${b2bEmail}`);
  return { isLinked: true, shopifyStoreId: 'placeholder', requiresLinking: false };
}

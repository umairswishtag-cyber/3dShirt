# Customer configurator accounts

## User journey

1. `/` is the customer entry point. A guest is sent to `/login`, and `/register` creates a customer account.
2. The customer signs in or creates a customer account. The original configurator URL is preserved.
3. The customer selects a published garment and customizes it.
4. **Save design** creates or updates an account-owned draft.
5. **Finish** saves the same document with `FINAL` status. This means the design is complete; checkout remains a separate future step.
6. `/account` lists the customer's drafts and finished designs. A design can be reopened or deleted.

Admin/shop identities and customer identities are deliberately separate. `users` remains the Shopify app/admin shop model; `customers` is the storefront identity model. A storefront registration can therefore never authenticate an admin route.

Administrator authentication is isolated under `/admin/login` and the other `/admin/*` authentication routes.

## GraphQL boundary

The browser uses one same-origin endpoint, `POST /graphql`, for all customer account and design operations:

- `customerRegister`, `customerLogin`, `customerLogout`
- `customerMe`
- `myDesigns`, `myDesign`
- `saveMyDesign`, `deleteMyDesign`

Page navigation still uses Laravel/Inertia routes. Business operations and customer data access go through GraphQL resolvers and the `CustomerAccountService` or `CustomerDesignService`. Every design lookup/update is scoped through the authenticated customer's relationship, not a client-supplied customer ID.

GraphQL uses the `customer` session guard, XHR-only requests, login throttling, and CSRF validation. Only Shopify authentication and webhook callback paths are excluded from CSRF validation.

## Saved design document

`customer_designs` stores a versioned configurator document plus product name/slug snapshots. `configurator_product_id` is optional so a customer's historical design survives if an admin product is removed. Status is `DRAFT` or `FINAL`.

The current configurator embeds uploaded artwork as data URLs. The GraphQL document is limited to 6 MB so it remains under typical PHP request limits. Before high-volume production, artwork should move to object storage through a signed-upload service and the design document should store asset IDs/URLs instead of base64 data.

## Shopify migration

The local customer record includes `auth_provider`, `provider_subject`, and `shopify_customer_gid`. When the storefront moves to Shopify:

1. Replace the local password adapter with Shopify Customer Account API OAuth/OIDC authentication.
2. Store the stable provider subject and Shopify customer GID on the local customer.
3. Keep saved configurator designs in this app, linked to that external identity.
4. Keep this app's GraphQL schema as the configurator service API; use a separate gateway/client for Shopify's GraphQL APIs.

Shopify references:

- Customer Account API overview: https://shopify.dev/docs/storefronts/headless/building-with-the-customer-account-api/index
- Customer Account API authentication: https://shopify.dev/docs/storefronts/headless/building-with-the-customer-account-api/getting-started
- Customer Account GraphQL API: https://shopify.dev/docs/api/customer

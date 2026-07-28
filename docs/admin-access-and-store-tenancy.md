# Admin access and Shopify store ownership

## Roles

The application has three separate identity types:

1. **Platform Super Admin** is an internal operator stored in `users` with
   `is_platform_admin = true`. This role can inspect products and customers
   across every connected Shopify store. It does not own storefront products.
2. **Store Admin** is the `users` record for one Shopify shop. Its `name` and
   `storefront_key` identify the permanent `*.myshopify.com` domain. Products
   created by this account belong to this store.
3. **Shopify Customer** is stored in `customers`. The app proxy automatically
   links the customer to the Store Admin using `customers.user_id`.

This ownership chain controls the catalog:

```text
Shopify shop / Store Admin (users.id)
├── configurator_products.user_id
└── customers.user_id
```

A customer sees only published products whose `user_id` matches the customer's
Store Admin.

## Signing in

## Recommended access surfaces

The two administrator roles should not share the same entry flow:

| Role | Entry point | Authentication |
| --- | --- | --- |
| Platform Super Admin | `https://umair.xoarhigh.info/admin/login` | Application email and password |
| Shopify Store Admin | **Shopify Admin > Apps > 3D Shirt Configurator** | Shopify OAuth and App Bridge session token |

The Store Admin should not be asked to create or remember another password. When
the merchant opens the app, Shopify identifies the shop and the backend
authenticates the existing `users` record for that permanent MyShopify domain.

The Store Admin's embedded App Home should provide:

- Dashboard
- Products
- Add product / upload GLB
- Patterns
- Customers
- Catalog options
- Storefront preview

The storefront configurator and the merchant administration are different
surfaces. The storefront remains mounted directly into the theme without an
iframe. Shopify App Home, however, normally hosts the merchant administration
inside Shopify Admin's managed iframe.

### Current implementation status

The application is currently configured as non-embedded:

```toml
embedded = false
```

and:

```dotenv
SHOPIFY_APPBRIDGE_ENABLED=0
```

Changing only those values is not sufficient. Before enabling embedded mode,
the merchant routes should be placed behind Shopify session-token verification
and separated from the Super Admin's password-authenticated routes. A clean URL
boundary is:

```text
/admin/login        Platform Super Admin login
/admin/*            Platform Super Admin workspace
/app/*              Shopify Store Admin embedded workspace
/authenticate       Shopify OAuth callback
```

Both workspaces can reuse the existing product controllers and React screens,
but `/app/*` must resolve the current Store Admin from the verified Shopify shop
session. This keeps GLB files, products, customers, and patterns assigned to the
correct shop.

### Store Admin

The preferred route is to open the app from:

**Shopify Admin > Apps > Tinker**

Shopify OAuth authenticates the existing shop record and redirects to `/admin`.
It is not necessary to create a second Store Admin.

The fallback local sign-in page is:

`https://umair.xoarhigh.info/admin/login`

If the Store Admin's local password is unknown, reset the credentials on the
existing shop record. Do not register a new user as a replacement, because the
new record will have a different `users.id` and will not own the shop's
customers or products.

### Platform Super Admin

The Super Admin signs in at the same page:

`https://umair.xoarhigh.info/admin/login`

The `is_platform_admin` flag determines the role after authentication. A
Platform Super Admin can be created or an existing user can be promoted with:

```powershell
php artisan app:make-platform-admin owner@example.com
```

When creating a new account, the command generates and prints a strong password.
Store that password securely. Do not assign storefront products to this account.

## Current local database state (2026-07-28)

- `superadmin@example.com` is already a Platform Super Admin.
- `shop@umair-kdfnaegu.myshopify.com` is already the Store Admin for
  `umair-kdfnaegu.myshopify.com`.
- The Shopify Store Admin currently has one linked Shopify customer but no
  configurator products.
- The old Test User currently owns 13 configurator products.

Before the live Shopify customer can see the existing catalog, the intended
products must be reassigned from the Test User to the existing Shopify Store
Admin. Confirm that all 13 test products are intended for this shop before
running the reassignment.

## Rules for adding another Shopify store

Do not manually create a Store Admin first. Install/authenticate the app from
the new store's Shopify Admin. The OAuth installation creates the shop record,
and that Store Admin then creates its own products.

Each shop must keep its own ownership:

- Store A customers see Store A published products.
- Store B customers see Store B published products.
- The Super Admin can inspect both stores but does not act as either store's
  product owner.

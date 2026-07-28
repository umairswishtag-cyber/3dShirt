# Local Shopify development

This Laravel application can run from a local machine during development, but
Shopify must reach it through a public HTTPS URL. The queue worker processes
background jobs; it does not expose the HTTP application.

## Store identity

Every installed Shopify shop is stored as a `users` row:

- `users.name`: the canonical `example.myshopify.com` domain supplied by Shopify.
- `users.storefront_key`: the public storefront route key (normally the same domain).
- `configurator_products.user_id`: product owner.
- `customers.user_id`: store where the customer registered.
- `customer_designs.customer_id`: customer owner; the selected product is also
  validated against that customer's store before saving.

Customer-facing routes are store-qualified:

```text
/store/{shop}.myshopify.com/register
/store/{shop}.myshopify.com/login
/store/{shop}.myshopify.com/configurator
/store/{shop}.myshopify.com/account
```

The selected store is kept in the Laravel session so the Lighthouse `/graphql`
endpoint applies the same tenant boundary.

## Start the local application

Build the frontend first so the HTTPS tunnel serves static production assets
without mixed-content problems:

```powershell
npm run build
php artisan storage:link
php artisan optimize:clear
```

Run these processes in separate terminals:

```powershell
# Terminal 1: HTTP application
php artisan serve --host=127.0.0.1 --port=8000

# Terminal 2: queued Shopify sync/webhook jobs
php artisan queue:work --tries=3 --timeout=120

# Terminal 3: public HTTPS tunnel
cloudflared tunnel --url http://127.0.0.1:8000
```

Copy the generated `https://...trycloudflare.com` URL into `APP_URL` in `.env`,
then clear cached configuration:

```powershell
php artisan optimize:clear
```

Keep all three processes running. Re-run `npm run build` after frontend changes.

## Shopify development app settings

In the Shopify Dev Dashboard, configure the development app with:

- App URL: the current HTTPS tunnel URL.
- Allowed redirect URL: `{tunnel-url}/authenticate`.
- Required Admin API scopes from `SHOPIFY_API_SCOPES`.
- API/webhook version: `2026-07`.

Open the installation URL:

```text
{tunnel-url}/authenticate?shop=your-dev-store.myshopify.com
```

The app uses Shopify's GraphQL Admin API for product and order synchronization.
The customer configurator uses the application's local Lighthouse GraphQL
endpoint; it does not expose another store's data.

## Tunnel alternatives

Shopify CLI 3.88 is installed locally, but this repository does not currently
contain a `shopify.app.toml`. Cloudflare Tunnel is therefore the direct option
for the existing Laravel/Osiset structure.

If the project is linked to a Shopify CLI configuration later, `shopify app dev`
can manage a tunnel and dev-store URL updates. Shopify's localhost mode is not
suitable when testing webhooks because Shopify cannot directly invoke localhost.

## Important checks

```powershell
php artisan migrate
php artisan queue:failed
php artisan route:list --path=store
php artisan test --filter=MultiStoreIsolationTest
```

The current project uses the stable named tunnel `umair`, whose public URL is:

```text
https://umair.xoarhigh.info
```

Restart it with `cloudflared tunnel run umair`. Its URL normally does not
change after a restart.

Only free Quick Tunnel URLs ending in `trycloudflare.com` change when
restarted. If a Quick Tunnel is used instead, update `APP_URL`, the Shopify app
URL, redirect URL, webhook subscriptions, and the theme block's
**Configurator app URL** after the hostname changes.

## Admin asset troubleshooting

### Browser requests `http://localhost:5173`

Laravel Vite uses `public/hot` as a development-server marker. If that file
contains `http://localhost:5173`, pages opened through the public Cloudflare
hostname try to load React from the visitor's localhost and the browser blocks
the requests with CORS errors.

For the stable Cloudflare hostname, use compiled assets:

```powershell
npm run build
```

Then make sure `public/hot` does not exist. Do not restart `npm run dev` while
testing through `https://umair.xoarhigh.info`, because it recreates the marker.
Rebuild after frontend changes instead.

The generated page should load scripts from:

```text
https://umair.xoarhigh.info/build/assets/
```

It must not contain `localhost:5173`.

## Publishing frontend changes

No files need to be copied manually while the named Cloudflare tunnel points to
this project. The public application files are served directly from
`public/build`.

The project has two frontend outputs:

```text
public/build/assets/*                     Laravel and Admin UI
public/build/shopify/configurator-embed.* Shopify storefront configurator
```

`npm run build` now builds both outputs in the correct order:

```powershell
npm run build
```

For Laravel/Admin-only changes, that command is sufficient. Reload the admin
page after the build.

For theme extension or storefront configurator changes:

1. Run `npm run build`.
2. Increase the cache version in the extension loader and Liquid stylesheet
   URLs.
3. Run `shopify app deploy --force`.
4. Hard-refresh the storefront or test in a private browser window.

`shopify app deploy` publishes `shopify.app.toml` and the files under
`extensions/`. It does not upload the Laravel application or
`public/build/shopify`; those files remain served through the Cloudflare
tunnel.

### Embedded mode requires more than the environment flag

`SHOPIFY_APPBRIDGE_ENABLED=1` does not update the app registered with Shopify.
Embedded App Home also requires:

- `embedded = true` in `shopify.app.toml` and a Shopify app configuration
  deployment.
- An application configuration key that reads
  `SHOPIFY_APPBRIDGE_ENABLED`.
- App Bridge in the embedded HTML shell.
- Shopify session-token verification on merchant routes.
- A route boundary between embedded Store Admin access and direct Platform
  Super Admin access.

The current `shopify.app.toml` still declares `embedded = false`. Treat the
environment-value change alone as incomplete.

# Native Shopify configurator and customer SSO

The configurator is mounted directly into the Shopify theme DOM. It does not
use an iframe.

The integration has two supported placement modes:

1. **3D Configurator App Block** — recommended when the merchant wants to move
   the configurator visually in the theme editor.
2. **Configurator loader App Embed** — useful when the theme already contains
   a stable element ID and the configurator should be appended to that element.

Both modes load the same responsive React application and use Shopify customer
login.

## Current URLs

- Store: `umair-kdfnaegu.myshopify.com`
- Page: `https://umair-kdfnaegu.myshopify.com/pages/configurator`
- App host: `https://umair.xoarhigh.info`
- App proxy root: `https://umair-kdfnaegu.myshopify.com/apps/configurator`
- Native bootstrap: `/apps/configurator/bootstrap`
- Native GraphQL API: `/apps/configurator/graphql`
- Protected configurator assets: `/apps/configurator/assets/...`
- Production bundle:
  `https://umair.xoarhigh.info/build/shopify/configurator-embed.js`

## Architecture

1. Shopify serves the page and the small theme-extension loader.
2. The loader finds either the App Block mount or the App Embed target ID.
3. It appends a Shadow DOM host and loads the responsive React configurator.
4. React requests `/apps/configurator/bootstrap` on the Shopify domain.
5. Shopify signs the proxy request and adds `logged_in_customer_id`.
6. Laravel verifies the HMAC and timestamp, resolves the store, and links the
   Shopify customer to the local design owner.
7. Catalog, model assets, GraphQL saves, and design loads use child routes under
   the same signed app proxy.

No third-party iframe cookie, Laravel login page, CORS workaround, or protected
Customer Admin API query is required. Shopify remains the identity and password
provider.

## Option A: App Block placement

1. Open **Online Store > Themes > Customize**.
2. Select **Pages > configurator**.
3. Add **3D Configurator** from the Apps section.
4. Make the containing theme section full width and remove unwanted padding.
5. Save.

The block generates its own safe mount ID:

```liquid
id="shirt-configurator-{{ block.id }}"
```

Do not paste that Liquid expression into a setting.

## Option B: App Embed placement by ID

First create a target in the configurator page template. A Custom Liquid
section is enough:

```html
<div id="shirt-configurator"></div>
```

Then:

1. Open **Online Store > Themes > Customize**.
2. Open **Theme settings > App embeds**.
3. Enable **Configurator loader**.
4. Set **Target element ID** to `shirt-configurator` without `#`.
5. Set **Page handle** to `configurator`.
6. Save.

Do not enable both placement modes for the same page unless two configurator
instances are intentionally required.

## Shopify configuration

`shopify.app.toml` contains:

```toml
[access_scopes]
scopes = "...write_app_proxy"

[app_proxy]
url = "/shopify/app-proxy/configurator"
prefix = "apps"
subpath = "configurator"
```

The installed store must approve `write_app_proxy`. Do not customize the proxy
prefix or subpath because the native bundle uses `/apps/configurator`.

## Build and deploy

Build the Laravel/Inertia application and the standalone Shopify bundle:

```powershell
cd D:\xampp\htdocs\3DShirt
npm run build
npm run build:shopify-embed
php artisan optimize:clear
shopify app build
shopify app deploy
```

The theme extension contains only a small loader so it satisfies Shopify's
theme performance check. The React/Three.js bundle is served from the stable
named Cloudflare app domain and is loaded only when the configurator mount is
present.

When the native bundle changes, increment the `?v=` cache key in:

- `extensions/configurator-block/assets/configurator-loader.js`
- `extensions/configurator-block/blocks/configurator.liquid`
- `extensions/configurator-block/blocks/configurator-embed.liquid`

## Local services

Keep the web application, queue, and named tunnel running:

```powershell
php artisan serve --host=127.0.0.1 --port=8000
php artisan queue:work --tries=3 --timeout=120
cloudflared tunnel run umair
```

Do not expose Vite's development URL to Shopify. If the browser requests
`localhost:5173`, stop Vite, remove `public/hot`, rebuild, and clear caches.

## Test

1. Open the live storefront, not only the theme-editor preview.
2. Unlock the development storefront if it is password protected.
3. Open `/pages/configurator`.
4. Sign in through Shopify customer login.
5. Confirm the configurator renders directly within the Shopify page.
6. Test desktop, tablet, and mobile widths.
7. Save a design, refresh, and load it again.
8. Confirm the browser DOM contains a Shadow Root and no configurator iframe.

The native storefront workspace includes these tabs:

- **Configurator** creates or edits a design.
- **Saved Designs** lists designs saved with `DRAFT` status.
- **Final Products** lists designs saved with `FINAL` status.

These records are app-owned data, so they appear inside the configurator
workspace rather than Shopify's standard customer-account page.

## Troubleshooting

### App Embed shows nothing

Confirm the target exists exactly as:

```html
<div id="shirt-configurator"></div>
```

The App Embed setting must contain `shirt-configurator`, without `#`, and its
page handle must be `configurator`.

### The customer is reported as signed out

Test on the live storefront. Shopify's app proxy must receive a non-empty
`logged_in_customer_id`; the theme-editor preview might not represent a
storefront customer session.

### `/apps/configurator/bootstrap` returns 404

Deploy the app configuration and approve `write_app_proxy`. Also confirm the
merchant has not customized the proxy URL in Shopify Admin.

### The bundle does not load

Open these URLs directly and confirm HTTP 200:

- `https://umair.xoarhigh.info/build/shopify/configurator-embed.js`
- `https://umair.xoarhigh.info/build/shopify/configurator-embed.css`

Then rebuild with `npm run build:shopify-embed` and increment the `?v=` cache
key before deploying the extension again.

### Model or pattern requests fail

Local configurator assets are intentionally rewritten to
`/apps/configurator/assets/...`. This keeps Three.js assets same-origin with
Shopify and protects them with the signed customer proxy.

### An uploaded logo disappears after saving or reopening a design

Customer logo files must use the Shopify app-proxy URL:

```text
/apps/configurator/assets/customer-designs/{customer-public-id}/{file}
```

Do not save `/storage/customer-designs/...` as the storefront image source.
That relative URL points to the Shopify store domain when the configurator is
embedded and the image will not load.

The storefront automatically converts older saved `/storage/customer-designs/`
sources when a design is reopened. New uploads are stored with the app-proxy
URL immediately. The proxy verifies the signed Shopify customer on every
request and only serves files from that customer's directory.

To verify the complete flow:

1. Sign in on the live Shopify storefront.
2. Upload and place a logo.
3. Select **Save design**.
4. Refresh the page and reopen the saved design.
5. Confirm the logo, position, and scale are restored.
6. In the Network panel, confirm the logo request starts with
   `/apps/configurator/assets/customer-designs/` and returns HTTP 200.

## Shopify references

- [Theme app extension configuration](https://shopify.dev/docs/apps/build/online-store/theme-app-extensions/configuration)
- [App proxies](https://shopify.dev/docs/apps/build/online-store/app-proxies)
- [Authenticate app proxies](https://shopify.dev/docs/apps/build/online-store/app-proxies/authenticate-app-proxies)
- [Customer sign-in links](https://shopify.dev/docs/storefronts/themes/sign-in)

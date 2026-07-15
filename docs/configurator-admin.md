# Configurator Admin Guide

The configurator catalog is database-driven. An authenticated administrator can upload a GLB, assign it to a gender and garment category, configure its editable surfaces, upload product-specific SVG patterns, and publish it without changing frontend source code.

## Setup

Run these commands once after deployment:

```bash
php artisan migrate --seed
php artisan storage:link
npm run build
```

The seeder imports the existing men’s basic shirt, second men’s shirt, women’s dress, and the current SVG patterns. Uploaded assets are stored on Laravel’s `public` disk under `storage/app/public/configurator`.

Admin dashboard: `/admin`

Product management: `/admin/configurator/products`

Storefront URL: `/configurator`

Published catalog API: `/api/configurator/catalog`

Successful login and registration redirect to `/admin`. All authenticated users currently have configurator-admin access because this project does not yet have roles. Add an admin authorization middleware or policy before allowing customer accounts into the application.

## Publishing workflow

1. Create a product and upload a `.glb` file.
2. Choose gender and a category key such as `shirts`, `dresses`, `pants`, or `jackets`.
3. Choose capabilities independently:
   - Solid colors
   - SVG patterns
   - Logo placement
4. Optionally upload the first SVG in the always-visible “Initial SVG pattern” section. Selecting a file automatically enables SVG patterns.
5. Choose “Publish product” when the storefront checklist is complete, or “Save draft” to keep unfinished work hidden. Both actions open the normal edit screen afterward.
6. Use the SVG patterns section to preview, add, reorder, activate, or remove patterns.
7. In Customer customization, choose customer color options and where patterns or logos may appear. Single-color products connect to the detected model parts automatically.
8. Use the storefront-status checklist to resolve any remaining blockers, then choose “Publish to storefront”. “Save draft” never publishes a product.

Draft products never appear in the storefront. A draft may contain an uploaded GLB and SVG patterns before its print-area bindings are complete. After creation, the administrator is redirected to the normal edit screen and full multi-pattern manager. Print-area bindings are enforced only when a product with patterns or logos is published. Publishing with patterns also requires an active pattern and a binding for every enabled pattern coverage area. Hidden patterns never appear in their product’s pattern gallery. Deleting a product also deletes its managed uploads and product-specific patterns.

The editor keeps publication separate from ordinary saving:

- “Save draft” persists incomplete work without storefront validation.
- “Publish to storefront” is available when the readiness checklist is complete.
- “Save live changes” updates an already-published product.
- “Unpublish” immediately removes the product from the catalog without deleting it.

An active pattern added to a published product with SVG patterns enabled appears in the storefront catalog immediately. A pattern added to a draft waits for publication; an inactive pattern or a pattern on a product with SVG patterns disabled remains hidden. These states are shown on every pattern card in the admin editor.

## Capability examples

| Required behavior | Colors | Patterns | Logos |
|---|---:|---:|---:|
| Completely static viewer | Off | Off | Off |
| Solid garment colors only | On | Off | Off |
| Static garment with customer logo | Off | Off | On |
| Colors and customer logo | On | Off | On |
| Full customizer | On | On | On |

Patterns and logos require at least one valid print-area binding. Solid colors require color zones and mesh-to-zone mappings.

The SVG upload and print-area binding serve different purposes: the SVG is the artwork, while the binding identifies the GLB mesh and UV region where the artwork is rendered.

## GLB mesh contract

The renderer uses the node/mesh names authored inside the GLB. Names are case-sensitive. The normal admin flow hides these details: single-color products are connected automatically, while multi-color products offer an optional model-part review. Exact mesh data remains in the collapsed developer settings because a GLB does not reliably identify “body,” “collar,” or “left sleeve.”

Mesh-to-color-zone example:

```json
{
  "Object_10": "body",
  "Object_18": "rightSleeve",
  "Object_20": "leftSleeve",
  "Object_6": "collar"
}
```

Color-zone example:

```json
[
  { "id": "body", "label": "Body", "defaultColor": "#F8FAFC" },
  { "id": "collar", "label": "Collar", "defaultColor": "#0F172A" }
]
```

Every mesh mapping must reference one of the configured color-zone IDs.

## Logo and pattern print areas

After a GLB is selected, the admin form checks where artwork can be placed and shows a simple model-part choice for the front, back, and sleeves. Choosing a part fills its technical placement data automatically. Parts that cannot display artwork are unavailable. If the model has no artwork-ready parts, it can still use solid colors, but patterns and logos must be disabled or the model must be re-exported with UV maps. Technical UV and JSON data is retained only in the collapsed developer settings.

The current storefront supports `front`, `back`, `leftSleeve`, and `rightSleeve`. Each enabled area needs a mesh name and the UV bounds used to map the 1024 × 1024 design canvas onto that mesh.

```json
{
  "front": {
    "meshName": "Object_10",
    "outwardNormalZ": null,
    "uvBounds": {
      "min": [-236.4516, -406.0020],
      "max": [236.4428, 297.2186]
    }
  }
}
```

An uploaded model should have stable mesh names and usable UV coordinates before patterns or logos are enabled. A model without UVs can still support solid material colors.

## SVG patterns and editable colors

Patterns are uploaded inside a product, so a pattern only appears for that GLB. Uploads are limited to 2 MB and must use the `.svg` extension.

On upload the server:

1. Parses the SVG without network access.
2. Removes scripts, event handlers, embedded HTML, and remote/data URL references.
3. Detects up to 12 unique hexadecimal colors.
4. Creates one editable storefront color slot for every detected color.

The admin can rename detected slots, update their source color, hide a pattern, and control pattern order. Use explicit six-digit colors such as `#123456` in source SVGs for predictable color detection.

## Service boundaries

- `ConfiguratorProductService` owns product and pattern mutations.
- `SvgPatternService` sanitizes SVG uploads and derives color slots.
- `ConfiguratorAssetStorageService` owns storage paths, URLs, and deletion.
- `ConfiguratorCatalogService` produces the public storefront definition.
- Admin controllers only validate HTTP input and call these services.
- The storefront consumes the same published definition through Inertia and the catalog JSON API.

Database tables:

- `configurator_products`
- `configurator_patterns`

This separation allows storage, GLB processing, thumbnail generation, or tenant scoping to be replaced later without rewriting the storefront UI.

## Upload limits and production notes

- GLB: 100 MB maximum.
- Thumbnail: 5 MB maximum, image formats accepted by Laravel.
- SVG pattern: 2 MB maximum.
- Keep uploaded model and texture licenses with the product’s internal asset records.
- Production should use an object-storage-backed `public` disk and CDN.
- GLB optimization, automatic mesh/UV inspection, malware scanning, immutable published versions, and background thumbnail generation should be queue-backed before operating at large catalog scale.

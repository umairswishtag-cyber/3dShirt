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
5. Create the product. New products always start as drafts and open directly in the edit screen.
6. Use the full pattern manager at the top of the edit screen to preview, add, reorder, activate, or remove SVG patterns.
7. Configure mesh/color and print-area bindings and test the model.
8. Enable “Published on storefront” from the edit screen when the product is ready.

Draft products never appear in the storefront. A draft may contain an uploaded GLB and SVG patterns before its print-area bindings are complete. After creation, the administrator is redirected to the normal edit screen and full multi-pattern manager. Print-area bindings are enforced only when a product with patterns or logos is published. Hidden patterns never appear in their product’s pattern gallery. Deleting a product also deletes its managed uploads and product-specific patterns.

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

The renderer uses the node/mesh names authored inside the GLB. Names are case-sensitive. The admin does not guess garment semantics because a GLB does not reliably identify “body,” “collar,” or “left sleeve.”

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

After a GLB is selected on the create or edit screen, the admin form inspects it and shows one mesh dropdown for each print area. Choosing a mesh copies its detected UV bounds into the binding automatically. Meshes without UV coordinates are shown as unavailable because patterns and logos cannot be mapped onto them. The advanced JSON editor is retained only as a fallback for unusual models or manual UV-bound overrides.

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

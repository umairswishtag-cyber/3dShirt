# Implementation Roadmap

This roadmap is deliberately gated. Complete, test, document, and obtain approval for one module before beginning the next. Estimates are relative and should be recalibrated after the first representative GLB and print specification are available.

## Delivery principles

- Each module ends in a usable vertical slice, tests, developer documentation, and acceptance evidence.
- Schema and API changes are additive within `/api/v1`; breaking changes require a new version or a documented migration.
- Use one representative shirt first, then validate the abstraction with a structurally different product such as a mug or cap before scaling the catalog.
- Performance, accessibility, security, and tenant isolation are acceptance criteria—not a final cleanup phase.
- Feature flags protect incomplete admin/product capabilities.

## Module 1 — Architecture and contracts (current)

**Deliverables**

- System/backend/frontend architecture and boundaries.
- Target folder structure and component tree.
- State and data-flow architecture.
- REST resource map and database design.
- Versioned product-definition and design-document JSON Schemas.
- Rendering pipeline, performance strategy, security findings, and module roadmap.

**Exit criteria**

- Stakeholders approve the product-definition concepts, physical coordinate system, modular monolith, and MVP order.
- A technical owner supplies one production GLB plus print-area/UV specifications for Module 4.

## Module 2 — Foundation, security, and toolchain

**Scope**

- Upgrade React 18 JSX to React 19 TypeScript and establish the Vite/Tailwind toolchain.
- Add React Router, R3F/Three/drei, Zustand, GSAP, query/validation/test libraries.
- Create frontend boundaries, aliases, lint/format/typecheck/test commands, CI quality gates, environment validation, and error handling.
- Register versioned API routes; restore CSRF protection; configure Sanctum SPA auth and CORS correctly.
- Introduce tenant foundations without breaking existing Shopify data.
- Establish API response/problem format and generated/shared contract workflow.

**Acceptance**

- `build`, typecheck, lint, unit tests, PHP tests, and architecture tests pass.
- Login/logout/session expiry work through Sanctum and CSRF.
- A protected `/api/v1/me` proves auth and tenant policy behavior.
- Existing Shopify jobs are isolated and regression-tested or explicitly disabled behind configuration.

## Module 3 — Design system and application shell

**Scope**

- Tokenized light/dark theme, accessible primitives, icon strategy, typography, motion rules.
- Responsive route shell, public/account/admin/configurator layouts.
- Internationalization with locale routing and RTL-ready tokens.
- Empty/loading/error/offline states and application error boundaries.

**Acceptance**

- Desktop/mobile shell matches approved UX wireframes.
- Keyboard navigation, focus behavior, contrast, reduced motion, and screen-reader labels pass checks.
- No MUI/Polaris styling leaks into the configurator design system.

## Module 4 — Catalog and product-definition pipeline

**Scope**

- Catalog migrations, models, policies, API resources, admin draft/publish workflow.
- Runtime JSON Schema plus semantic validation and definition fixtures.
- Product selector and lazy definition loading.
- Signed asset references and immutable cache headers.

**Acceptance**

- Admin can draft, validate, publish, and retire a product version.
- Published versions cannot mutate; old designs still resolve their version.
- Adding a valid product requires assets/configuration and admin publishing, not source-code changes.

## Module 5 — 3D viewer foundation

**Scope**

- R3F scene, GLB loader, cameras/presets, orbit/touch controls, zoom/pan/auto-rotate/fullscreen.
- Environment lighting, PBR material registry, shadows, loading progress, error recovery.
- Managed resource lifecycle, demand rendering, device-tier governor, LOD/Draco/KTX2 path.

**Acceptance**

- Representative shirt and second product class load from definitions only.
- Product switching does not leak GPU/heap resources.
- Supported mid-tier desktop hits 60 FPS target; mobile degrades within documented budgets.

## Module 6 — 2D print-area engine and 3D texture bridge

**Scope**

- Canvas engine spike and adapter selection.
- Independent lazy compositor per unlimited print area.
- Physical-coordinate transforms, boundary/safe/bleed clipping, active-area UI.
- Dirty-region/area updates into stable Three.js textures.
- Deterministic low-resolution preview and high-resolution export proof.

**Acceptance**

- Objects remain physically positioned through resize/save/reload.
- Front/back/sleeve edits update only their mapped surfaces.
- Boundary clipping agrees between editor, 3D preview, and reference export.

## Module 7 — Object editing tools

**Scope**

- Image, sanitized SVG/logo, text, QR, barcode, shape, icon, name, and number adapters.
- Selection, move, rotate, scale, flip, duplicate, delete, opacity, lock, order.
- Snapping, alignment, grouping/ungrouping, keyboard/touch controls, layer panel.
- Command transactions and deterministic undo/redo.

**Acceptance**

- Every supported operation round-trips through the design schema.
- One gesture creates one history entry; undo/redo restores exact document state.
- Boundary and capability restrictions are enforced in UI and domain commands.

## Module 8 — Typography and image effects

**Scope**

- Curated Google font ingestion, licensed custom upload, font metadata and loading.
- Spacing, line height, curved/arc text, outline, shadow, gradient, warp/effects capability set.
- Image crop, brightness, contrast, saturation, opacity, masks.
- Worker-based previews and server-side production parity tests.

**Acceptance**

- Font/effect layout is deterministic after reload/export.
- Missing or unlicensed fonts have an explicit fallback/remediation flow.
- Large uploads cannot block the main interaction loop.

## Module 9 — Color zones, materials, and patterns

**Scope**

- Unlimited definition-driven color zones and palettes.
- PBR presets for fabric, leather, metal, plastic, ceramic, gloss/matte.
- Normal/roughness/AO maps, pattern parameters, linked/independent zones.
- Accessible color input and calibrated color display disclaimer/workflow.

**Acceptance**

- Zones/materials work across both representative product classes without product-specific code.
- Material swaps do not duplicate/leak resources.
- Saved selections reproduce consistently on reload.

## Module 10 — Drafts, history, assets, and sharing

**Scope**

- Upload lifecycle and processing queues, asset library, quotas and cleanup.
- Autosave with revision conflicts, IndexedDB recovery, explicit versions, rename/duplicate/delete.
- Load/history/restore and revocable share links.

**Acceptance**

- Network loss and refresh do not lose acknowledged work.
- Conflict handling preserves both local and remote state.
- Tenant isolation and malicious upload tests pass.

## Module 11 — Pricing, export, and cart

**Scope**

- Price books/tier rules and authoritative quote API.
- Preview/production export jobs, progress, artifacts, retry/failure UX.
- Cart with frozen design version and quote snapshot; quantity/size variants.

**Acceptance**

- Client price cannot override server quote.
- Cart/order reproduction uses immutable artifacts and definition/design versions.
- Export has visual/physical-dimension regression fixtures.

## Module 12 — Scale, operations, and integrations

**Scope**

- Redis/Horizon queue topology, CDN/object storage, observability, backup/restore, load tests.
- Shopify adapter migration, then WooCommerce and print-provider contracts.
- Webhook receipts, external mappings, outbox, reconciliation and admin diagnostics.
- AI suggestion/background-removal adapters only after consent, cost, privacy, and moderation controls.

**Acceptance**

- Capacity and failure-mode tests meet agreed SLOs.
- Provider failures cannot corrupt core orders/designs.
- Reconciliation is idempotent and auditable.

## Suggested MVP cut

Modules 1–7, plus the basic portions of Modules 9–11: one shirt, front/back print areas, image/SVG/text objects, a small font set, color zones, save/load, PNG preview export, authoritative basic pricing, and cart. Curved/warped text, advanced masks, full production PDF, marketplace integrations, and AI follow after the core document/rendering fidelity is proven.


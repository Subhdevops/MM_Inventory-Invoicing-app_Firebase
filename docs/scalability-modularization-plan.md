# Scalability & Modular Productization Plan

This plan is tailored to the current codebase and your vision of selling a **vanilla core app + business-specific modules**.

## 1) Current-state assessment (from code)

### Strengths you already have
- You already have a useful domain baseline: inventory, invoices, events/tenants, vendor tracking, file management, dashboards, and barcode workflows. This is a strong "Core SKU" foundation.
- The app already scopes operational data under event documents (e.g., `events/{eventId}/products`, `invoices`, `savedFiles`, `vendors`), which gives a natural boundary for tenant/workspace partitioning.
- Feature boundaries are visible in UI components (`inventory-table`, `invoice-dialog`, `vendor-management`, `dashboard`) and hooks (`use-event-data`), which can be evolved into formal modules.

### Scalability blockers to address first
- `src/app/page.tsx` is currently acting as a large orchestrator for auth, data loading, business logic, analytics, and UI actions. This increases release risk as features grow.
- Firestore reads are client-heavy and real-time listeners are broad. As customer count and data size grow, this can increase both latency and cost.
- Role-based access currently distinguishes `admin` and `user`; for commercialization, you will likely need finer permissions (owner, manager, billing, cashier, auditor, etc.).
- Product type definitions are global; module-specific fields are not yet formalized. This will become hard to maintain once you support multiple business verticals.

## 2) Product strategy: Core + Module architecture

### Core app (always present)
Ship this as the baseline product every customer receives:
- Authentication + user profile + tenant/workspace selection.
- Product catalog + stock states.
- Invoice creation + export.
- Basic dashboard and reporting.
- File storage and backup/export utilities.

### Module packs (attach per business type)
Define business packs that can be turned on/off per tenant:
- **Retail module**: variants (size/color), returns/exchanges, promotions.
- **Wholesale module**: bulk pricing tiers, purchase orders, credit cycles.
- **Manufacturing/light production module**: BOM, raw material usage, production batches.
- **Service-business module**: job cards, labor/service line-items, appointments.

### Commercial packaging
- **Vanilla/Core plan**: minimal setup, low monthly subscription.
- **Core + 1 module**: verticalized plan.
- **Enterprise**: multi-location + advanced analytics + custom workflows.

## 3) Target technical architecture

### A. Split by domain modules in code
Refactor toward domain-driven folders:
- `src/modules/core/*`
- `src/modules/inventory/*`
- `src/modules/invoicing/*`
- `src/modules/vendors/*`
- `src/modules/<business-pack>/*`

Each module should own:
- Types/schemas
- Firestore repositories
- Business services (pricing, tax, discount, stock mutations)
- UI components/routes

### B. Introduce a module registry
Create a runtime registry to resolve enabled features for a tenant:
- `moduleRegistry`: module metadata, dependencies, nav entries, feature flags.
- Tenant config document: enabled modules + plan limits.
- UI and service layer should check registry instead of hard-coded branching.

### C. Move data mutations to server-side entry points
For correctness and scale:
- Keep UI reactive, but move sensitive writes/calculations to controlled server paths (Cloud Functions / server actions / API routes depending on your deployment path).
- Keep client-side listeners focused and paginated.
- Use aggregate documents for dashboard KPIs to reduce heavy on-the-fly calculations.

### D. Formalize schema versioning
Add per-document schema version fields and migration tooling:
- `schemaVersion` on domain entities.
- Lightweight migration scripts for module upgrades.
- Backward compatibility contracts for paid customers.

## 4) Firestore data model evolution

### Recommended tenancy model
Use one explicit tenant root and isolate everything under it:
- `tenants/{tenantId}/events/{eventId}/...`
- Keep users at `users/{uid}` with tenant memberships and roles.

### Module configuration
- `tenants/{tenantId}/settings/modules`: enabled modules, limits, billing plan.
- `tenants/{tenantId}/settings/workflows`: per-tenant toggles (GST settings, invoice format, numbering rules).

### Performance/cost controls
- Add indexes based on actual list/filter paths.
- Prefer summary collections (`dailySales`, `stockSummary`) for dashboards.
- Paginate inventory and invoice tables; avoid full collection listening for large tenants.

## 5) Security and role design for commercialization

### RBAC v2
Move from two roles to permission-based access:
- Roles: owner, admin, manager, operator/cashier, viewer.
- Permissions: `inventory.read`, `inventory.write`, `invoice.create`, `invoice.refund`, `vendor.manage`, etc.

### Firestore rules strategy
- Rules should validate tenant membership + permission claim.
- Avoid exposing cross-tenant data from client queries.
- Add tests for rules before each module release.

## 6) Delivery roadmap (practical phases)

### Phase 1 (2-4 weeks): Stabilize core for scale
- Break `page.tsx` into domain controllers/hooks.
- Add repository/service layers for products/invoices/vendors.
- Introduce module registry skeleton and tenant module config.
- Add baseline observability: error logging + usage metrics.

### Phase 2 (4-8 weeks): Multi-tenant + permissions
- Implement tenant model and role-permission matrix.
- Harden Firestore rules + rule tests.
- Add billing-plan aware module enablement.

### Phase 3 (4-8 weeks): First vertical module pack
- Launch one high-demand business module (e.g., Retail).
- Include onboarding templates + sample data.
- Add in-app upgrade prompts for module upsell.

### Phase 4 (ongoing): Scale operations
- Add migrations/versioning tooling.
- Build partner/reseller install flow.
- Add SLA playbook, backups, and customer-facing release notes.

## 7) Suggested immediate code actions in this repo

1. Create `src/modules` structure and move shared business logic out of `src/app/page.tsx`.
2. Add `Tenant`, `Role`, `Permission`, and `ModuleConfig` types in `src/lib/types.ts` (or split to domain type files).
3. Introduce `src/lib/module-registry.ts` for dynamic feature availability.
4. Add repository files for Firestore access (`inventory.repository.ts`, `invoice.repository.ts`) to decouple query details from UI.
5. Add a small `docs/module-catalog.md` describing each sellable module with feature matrix.

## 8) Success metrics to track

- Time to onboard a new business type (days/weeks).
- Cost per active tenant (Firestore reads/writes/storage).
- Feature adoption by module.
- Churn and expansion revenue from module upgrades.
- Mean time to deliver custom requirement in one tenant without breaking others.

---

If you execute this in order (core stabilization → tenancy/permissions → first module pack), you can turn the current app into a scalable product platform rather than a one-off project.

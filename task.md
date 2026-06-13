# Pandora v2 - Full Rebuild Task

## Stack
- Frontend: React + TypeScript + Vite (port 5173)
- Backend: Cloudflare Worker (src/index.ts)
- DB: Cloudflare D1 (pandora-db)
- Deploy: CF Pages (pandora-garments.pages.dev) + CF Worker

## Modules to Build
- [x] KPI Management (existing, keep)
- [ ] Dashboard (executive, charts, alerts)
- [ ] Customer Management
- [ ] Supplier Management
- [ ] Inventory Management
- [ ] Purchase Management
- [ ] Sales Management (POS + Quotations)
- [ ] Order Management (order sheets, calendar)
- [ ] Staff Management (teams, departments)
- [ ] Expense Management
- [ ] Settings (company, users, roles)
- [ ] Reports (all types)

## Auth
- Skip for now

## DB Plan
- Extend existing D1 (keep employees + evaluations tables)
- Add new tables for all modules

## Status
- [ ] D1 schema (new tables)
- [ ] Worker API routes
- [ ] Frontend pages
- [ ] Deploy

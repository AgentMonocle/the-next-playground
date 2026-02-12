# Stage 1: Core CRM Beta — Remaining Tasks

**Epic**: `the-next-playground-8jc` (in_progress)
**Progress**: 55/58 issues closed | 32/34 tasks complete

---

## Prerequisites (manual steps before testing)

Before running E2E tests, you need to:

1. **Provision SharePoint lists** — run `npx tsx TSS/scripts/provision.ts` against the SharePoint site to create all 7 lists (TSS_Country, TSS_Product, TSS_Company, TSS_Contact, TSS_InternalTeam, TSS_Opportunity, TSS_Sequence)
2. **Seed reference data** — run each seed script in order:
   - `npx tsx TSS/scripts/seed/seedCountries.ts` (146 countries)
   - `npx tsx TSS/scripts/seed/seedProducts.ts` (product catalog)
   - `npx tsx TSS/scripts/seed/seedCompanies.ts` (133 companies with parent/subsidiary links)
   - `npx tsx TSS/scripts/seed/seedContacts.ts` (36 contacts)
3. **Configure Generate-ID function** — ensure `SHAREPOINT_SITE_ID` environment variable is set in Azure SWA linked API settings (or local.settings.json for dev)

---

## Task 1.33 — End-to-end testing and bug fixes

- **Bead**: `the-next-playground-bes`
- **Status**: open (ready to work — blocker `3nw` is closed)
- **Priority**: P1
- **Blocks**: 1.34 (deploy)

### Test Script (15 steps)

- [ ] 1. Login with M365 account
- [ ] 2. Dashboard shows real counts (companies, contacts, opportunities)
- [ ] 3. Navigate to Companies → see seeded companies in DataGrid
- [ ] 4. Create a new company → verify it appears in the list
- [ ] 5. Edit the company → verify changes saved
- [ ] 6. Navigate to Contacts → see seeded contacts
- [ ] 7. Create a contact linked to the new company
- [ ] 8. Navigate to Opportunities → create opportunity for the company
- [ ] 9. Verify opportunity ID was auto-generated correctly (format: OPP-XXX-YYYY-MM-NNN)
- [ ] 10. Change opportunity stage → verify update in list
- [ ] 11. Pipeline view shows opportunity in correct column
- [ ] 12. Drag opportunity to different stage column → verify stage updated
- [ ] 13. Filter pipeline by product line / basin
- [ ] 14. Test all navigation links and back buttons
- [ ] 15. Test form validation (submit empty forms, invalid data)

### Additional checks

- [ ] Responsive layout at different screen widths
- [ ] Sidebar collapse/expand persists across page reloads
- [ ] Error states display correctly when API fails
- [ ] Loading spinners appear during data fetches

---

## Task 1.34 — Deploy beta to production

- **Bead**: `the-next-playground-rk6`
- **Status**: open (blocked by 1.33)
- **Priority**: P1

### Steps

- [ ] Ensure all changes committed on `youthful-herschel` branch
- [ ] Merge `youthful-herschel` → `master`
- [ ] GitHub Actions deploys to Azure SWA automatically
- [ ] Verify at https://salmon-glacier-05e6b7410.4.azurestaticapps.net
- [ ] Test login and basic navigation on production
- [ ] Run abbreviated smoke test (login → dashboard → create opportunity → pipeline)
- [ ] Close bead `rk6` and epic `8jc`

---

## Completed Tasks Summary

| # | Task | Bead | Status |
|---|------|------|--------|
| 1.1 | Provisioning script framework | `70l` | Closed |
| 1.2 | TSS_Country and TSS_Product lists | `uyy` | Closed |
| 1.3 | TSS_Company and TSS_Contact lists | `l58` | Closed |
| 1.4 | TSS_InternalTeam, TSS_Opportunity, TSS_Sequence | `mdq` | Closed |
| 1.5 | Seed country reference data | `90l` | Closed |
| 1.6 | Seed company reference data | `lqv` | Closed |
| 1.7 | Seed contact reference data | `3wp` | Closed |
| 1.8 | Seed product catalog | `1lz` | Closed |
| 1.9 | TypeScript types and Zod schemas | `0s8` | Closed |
| 1.10 | SharePoint list CRUD service | `6k8` | Closed |
| 1.11 | Company React Query hooks | `848` | Closed |
| 1.12 | Contact React Query hooks | `9bn` | Closed |
| 1.13 | Opportunity React Query hooks | `a0s` | Closed |
| 1.14 | Reference data hooks | `x47` | Closed |
| 1.15 | Zustand store for UI state | `fhs` | Closed |
| 1.16 | React Router setup | `4z0` | Closed |
| 1.17 | App shell with collapsible sidebar | `vdb` | Closed |
| 1.18 | Dashboard page | `chk` | Closed |
| 1.19 | Shared UI components | `6rk` | Closed |
| 1.20 | Company list page | `17h` | Closed |
| 1.21 | Company detail page | `vgs` | Closed |
| 1.22 | Company create/edit form | `ius` | Closed |
| 1.23 | Contact list page | `ej6` | Closed |
| 1.24 | Contact detail page | `a3t` | Closed |
| 1.25 | Contact create/edit form | `0fx` | Closed |
| 1.26 | Azure Function: generate-id | `nq4` | Closed |
| 1.27 | Opportunity list page | `kh3` | Closed |
| 1.28 | Opportunity detail page | `5ol` | Closed |
| 1.29 | Opportunity create/edit form | `3ml` | Closed |
| 1.30 | Pipeline Kanban board | `5qb` | Closed |
| 1.31 | Remove ConnectivityCheck | `b18` | Closed |
| 1.32 | Error handling and loading states | `3nw` | Closed |
| **1.33** | **E2E testing and bug fixes** | **`bes`** | **Open** |
| **1.34** | **Deploy beta to production** | **`rk6`** | **Open** |

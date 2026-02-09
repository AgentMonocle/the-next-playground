# TSS Development Plan — Update Report

This report documents modifications to the development plan and presents options for review before applying changes.

---

## 1. SharePoint Site URL Update

**Change**: Replace `/sites/TSS` with the existing sales organization site.

| Setting | Previous | Updated |
|---|---|---|
| **Site URL** | `/sites/TSS` | `https://tejasre.sharepoint.com/sites/sales` |
| **Site Name** | Tejas Sales System | *(existing site — no rename needed)* |

**Impact**: All Graph API calls reference this site. The `SHAREPOINT_SITE_ID` environment variable in Azure Key Vault will resolve to this site's ID. No schema or naming standard changes required — TSS_ prefixed lists will be created on the existing site alongside any other lists already there. The `TSS_` prefix ensures no naming collisions.

---

## 2. Reference Dataset Analysis

### 2.1 Countries.csv — Analysis

**Source**: SharePoint List export with schema XML
**Records**: 146 countries
**Columns**: Title (Country Name), Country Code (ISO 3166-1 alpha-2), Region, ID

**Schema Comparison — Existing Data vs. TSS_Country Plan**:

| Source Column | Source Data | TSS_Country Column | Status |
|---|---|---|---|
| `Title` | "United States", "China", etc. | `Title` (Country Name) | ✅ Direct match |
| `field_1` (Country Code) | "US", "CN", "GB", etc. | `tss_countryCode` | ✅ Direct match — ISO alpha-2 codes |
| `field_2` (Region) | "North America", "Asia", "Europe", etc. | `tss_region` | ✅ Direct match |
| `ID` | SharePoint auto-ID (1-146) | `Id` (auto) | ⚠ Will get new IDs in TSS site — cannot preserve |

**Regions Found**: Africa, Asia, Europe, Middle East, North America, Oceania, South America (7 regions)

**Incorporation Plan**:
- TSS_Country schema is already designed correctly. No changes needed.
- Seed data: Import all 146 countries as initial data during Stage 1.
- The `tss_region` Choice column values should include all 7 regions found in the data.
- SharePoint auto-IDs will be different — all lookups will use Title or CountryCode, not numeric ID.

---

### 2.2 Company Records.csv — Analysis

**Source**: SharePoint List export with schema XML
**Records**: 133 companies
**Columns**: ID, Company Name (Title), Company Code, Subsidiary (Boolean), Parent Company Name, Parent Company ID, Location Country

**Key Findings**:

**A. Company Code** — A 2-6 character abbreviation that uniquely identifies each company. Examples:
- `SLB` = Schlumberger
- `CVX` = Chevron Corporation
- `CNPC` = China National Petroleum Corporation
- `CNPCUS` = China National Petroleum Corporation - USA
- `TRE` = Tejas Research & Engineering, LLC

This is a user-defined, business-meaningful identifier not present in the current TSS_Company schema. **Must be added.**

**B. Parent/Subsidiary Hierarchy** — 21 of 133 companies are subsidiaries. The data uses:
- `Subsidiary` (Boolean): flags whether the company has a parent
- `Parent Company Name` (text): display name of the parent
- `Parent Company ID` (number): SharePoint ID of the parent record

**Subsidiary relationships found in the data**:

| Parent Company | Subsidiary | Country |
|---|---|---|
| Beer Masters LLC | Baby Beer Master | United States |
| Schlumberger | Cameron | United States |
| China National Petroleum Corporation | China National Petroleum Corporation - USA | United States |
| Crescent Energy Company | Contango Resources, LLC | United States |
| Helix Energy Solutions Group, Inc | Deepwater Abandonment Alternatives | United States |
| Schlumberger | Geoservices Equipments | France |
| Baker Hughes | GE Oil & Gas | United Kingdom |
| INPEX Corporation | INPEX Australia | Australia |
| ENi | Nigerian Agip Oil Company | Nigeria |
| Schlumberger | OneSubsea | Norway |
| Petrobras | Petroleo Brasileiro | Brazil |
| Shell International | Shell Brasil Petróleo Ltda. | Brazil |
| Superior Energy Services | Superior Completion Services | United States |
| FMC Technologies | TechnipFMC | India |
| Tejas Research & Engineering, LLC | TEJAS WELL TECHNOLOGIES & SERVICES LTDA | Brazil |
| TotalEnergies SE | TotalEnergies EP Danmark | Denmark |
| TotalEnergies SE | TotalEnergies EP Malaysia | Malaysia |
| Weatherford | Weatherford Brazil | Brazil |

This hierarchy enables "show me all opportunities for Schlumberger including Cameron, Geoservices, and OneSubsea."

**C. Current TSS_Company schema needs these additions**:

| New Column | Internal Name | Type | Source |
|---|---|---|---|
| Company Code | `tss_companyCode` | Single line text (2-6 chars, required, indexed) | `CompanyCode` from source |
| Is Subsidiary | `tss_isSubsidiary` | Yes/No | `Subsidiary` from source |
| Parent Company | `tss_parentCompanyId` | Lookup → TSS_Company (self-referential) | `Parent Company ID` from source |

**Lookup budget impact**: TSS_Company goes from 1 lookup (Country) to 2 lookups (Country + ParentCompany). Still 10 remaining of 12.

**D. Company Type Column** — The source data doesn't include a company type field, but the data reveals clear categories:
- **E&P Operators**: ADNOC, Chevron, ConocoPhillips, ExxonMobil, Hess, Occidental, Petrobras, Shell, TotalEnergies, etc.
- **Service Companies**: Baker Hughes, Halliburton, Schlumberger, Weatherford, Forum, Expro, etc.
- **Equipment/Technology**: Innovex, Eventure, Blackhawk, Smart Completions, etc.
- **Distributors**: Craig International, DistributionNOW, Sooner Pipe, etc.
- **Internal**: Tejas Research & Engineering (self-entry, plus Brazilian subsidiary)
- **Research**: Colorado School of Mines
- **National Oil Companies**: CNPC, ONGC, Petrobras, Romgaz, Sinopec, etc.

The existing `tss_companyType` Choice column already covers these — no change needed.

**E. Location Country** — The source uses country name as text (e.g., "United States"). TSS_Company uses a lookup to TSS_Country. During data migration, map text values to TSS_Country lookup IDs.

**Countries represented in company data**: United States (dominant), United Kingdom, Canada, China, Brazil, India, Japan, France, Malaysia, Nigeria, Australia, Denmark, Italy, Norway, Romania, Libya, Albania, Mexico, United Arab Emirates, Austria, Russia.

---

### 2.3 Client Records.csv — Analysis

**Source**: SharePoint List export with schema XML
**Records**: 36 contacts
**Columns**: ID, Company Name, Company ID, Full Name (Title), Preferred Name, Primary Phone, Primary Email

**Key Findings**:

**A. Preferred Name** — A field not in the current TSS_Contact schema. This is a nickname or preferred form of address. Examples:
- Sebastian Nienhuis → (none)
- Case Nienhuis → "Case Nienhuis" (same as full name)
- Henry Nienhuis → "Bubba"
- Bryan Nguyen → "Bryan Nguyen, P.E." (formal with credentials)
- Ngoc-Phung Tran → "Jim Yue" (westernized name)

This is important for a sales CRM — addressing contacts by their preferred name is critical for relationship building. **Must be added to TSS_Contact.**

**B. Single Phone & Email** — The source has one phone and one email per contact. The current TSS_Contact schema has Phone + Mobile (two phone fields) + Email. This is fine — the source data maps to `tss_phone` and `tss_email`. No change needed.

**C. Company linkage** — The source links contacts to companies via Company ID (numeric). TSS_Contact links via `tss_companyId` lookup to TSS_Company. Same pattern, different implementation.

**D. Contact-Company distribution**:
- Tejas RE: 4 contacts (internal — Case, Sebastian, Robert, Luis)
- Schlumberger: 3 contacts
- Most companies: 1 contact

**E. Missing fields from current TSS_Contact schema**:
- Job Title: Not in source data (but exists in TSS_Contact schema)
- Department: Not in source data
- Is Decision Maker: Not in source data
- Is Influencer: Not in source data
- Notes: Not in source data

These fields will be empty during initial migration but are available for enrichment.

**F. Current TSS_Contact schema needs this addition**:

| New Column | Internal Name | Type | Source |
|---|---|---|---|
| Preferred Name | `tss_preferredName` | Single line text | `PreferredName` from source |

---

### 2.4 Incorporation Summary

**Schema Changes Required**:

| List | Change | Reason |
|---|---|---|
| **TSS_Company** | Add `tss_companyCode` (Single line text, required, indexed, 2-6 chars) | Business-meaningful company abbreviation from source data |
| **TSS_Company** | Add `tss_isSubsidiary` (Yes/No) | Flags parent-child hierarchy from source data |
| **TSS_Company** | Add `tss_parentCompanyId` (Lookup → TSS_Company, self-referential) | Enables corporate hierarchy: "all opportunities for company + subsidiaries" |
| **TSS_Contact** | Add `tss_preferredName` (Single line text) | Preferred name / nickname for communications |

**Data Migration Plan** (Stage 1):

| Step | Action | Records |
|---|---|---|
| 1 | Seed TSS_Country from Countries.csv | 146 countries |
| 2 | Seed TSS_Company from Company Records.csv (parents first, then subsidiaries) | 133 companies |
| 3 | Map Location Country text → TSS_Country lookup IDs | — |
| 4 | Set `tss_parentCompanyId` lookups for 21 subsidiary companies | 21 relationships |
| 5 | Seed TSS_Contact from Client Records.csv | 36 contacts |
| 6 | Map Company ID → TSS_Company lookup IDs | — |

**Hierarchy Query Pattern**:
To show "all opportunities for Schlumberger and its subsidiaries":
1. Query TSS_Company where `Title` = "Schlumberger" → get ID
2. Query TSS_Company where `tss_parentCompanyId` = Schlumberger's ID → get Cameron, Geoservices, OneSubsea IDs
3. Query TSS_Opportunity where `tss_companyId` IN [Schlumberger, Cameron, Geoservices, OneSubsea]

This is a two-step query (SharePoint doesn't support recursive queries), but the hierarchy is typically only 1 level deep (parent → subsidiaries, no grandchildren in current data).

---

## 3. ID Generation Strategies

Seven strategies for generating Opportunity IDs and Quotation IDs. Each evaluated against:
- **Decodability**: Can humans read and extract meaning from the ID?
- **Privacy** (for external-facing Quotation IDs): Does it reveal business volume?
- **Collision safety**: Can two concurrent users generate the same ID?
- **Sortability**: Do IDs sort chronologically?
- **Implementation complexity**: How hard to build in Azure Functions + SharePoint?

### Current Plan (for reference)

```
Opportunity: TSS-OPP-2026-0001
Quotation:   TSS-QUO-2026-0001
```
Sequential counters, year-based reset, stored in TSS_Sequence list.

---

### Strategy 1: Year-Sequential (Current Plan)

**Format**:
- Opportunity: `TSS-OPP-YYYY-NNNN` → `TSS-OPP-2026-0042`
- Quotation: `TSS-QUO-YYYY-NNNN` → `TSS-QUO-2026-0015`

| Dimension | Assessment |
|---|---|
| **Decodability** | ✅ Excellent — entity type + year + sequence instantly readable |
| **Privacy (Quotation)** | ❌ Poor — client receiving `TSS-QUO-2026-0015` knows you've sent ~15 quotes this year |
| **Collision safety** | ✅ Good — Azure Function with ETag concurrency on sequence counter |
| **Sortability** | ✅ Excellent — sorts chronologically by year then sequence |
| **Implementation** | ✅ Simple — sequence list + atomic increment |

---

### Strategy 2: Year-Month-Sequential

**Format**:
- Opportunity: `OPP-YYMM-NNN` → `OPP-2603-007`
- Quotation: `QUO-YYMM-NNN` → `QUO-2603-012`

| Dimension | Assessment |
|---|---|
| **Decodability** | ✅ Excellent — entity type + year/month + sequence. Internally, staff can say "March's 7th opportunity" |
| **Privacy (Quotation)** | ❌ Poor — client sees monthly volume (`QUO-2603-012` = 12 quotes in March) |
| **Collision safety** | ✅ Good — same sequence mechanism, resets monthly |
| **Sortability** | ✅ Excellent — sorts by year-month then sequence |
| **Implementation** | ✅ Simple — same as Strategy 1, monthly reset instead of annual |

**Advantage over Strategy 1**: Finer-grained time context. Staff immediately know the month. Sequence numbers stay small (resets each month).

---

### Strategy 3: Company Code Embedded

**Format**:
- Opportunity: `OPP-[CompanyCode]-YYMM-NN` → `OPP-CVX-2603-02`
- Quotation: `QUO-[CompanyCode]-YYMM-NN` → `QUO-CVX-2603-01`

Uses the 2-6 character company code from the reference data (e.g., CVX=Chevron, SLB=Schlumberger, CNPC=CNPC).

| Dimension | Assessment |
|---|---|
| **Decodability** | ✅ Excellent — entity + customer + time + sequence. "OPP-CVX-2603-02" = second Chevron opportunity in March 2026 |
| **Privacy (Quotation)** | ⚠ Mixed — client sees per-company sequence (low numbers), not total volume. But company code reveals internal abbreviation |
| **Collision safety** | ✅ Good — sequence is per-company-per-month (very low concurrency risk) |
| **Sortability** | ⚠ Sorts by company code alphabetically, not chronologically. Need secondary sort by date |
| **Implementation** | ⚠ Medium — sequence per company per month. More counters to manage |

**Advantage**: Internally, IDs are self-documenting. "Pull up OPP-SLB-2603-01" — everyone knows it's the Schlumberger deal from March. No lookup needed.

---

### Strategy 4: Year-Sequential with Random Offset (Privacy-Preserving)

**Format**:
- Opportunity: `OPP-YYYY-NNNN` → `OPP-2026-0042` (standard sequential — internal only, no privacy concern)
- Quotation: `QUO-YYYY-RNNNN` → `QUO-2026-R4827` (random offset masks volume)

Quotation IDs use a random starting offset (e.g., start at 4800 instead of 0001) each year, and increment by a random step (1-3) instead of always 1.

| Dimension | Assessment |
|---|---|
| **Decodability** | ✅ Opportunity: clear. ⚠ Quotation: year visible, sequence obscured |
| **Privacy (Quotation)** | ✅ Good — client can't determine volume from `QUO-2026-R4827` |
| **Collision safety** | ✅ Good — sequential with random step |
| **Sortability** | ✅ Opportunity: excellent. ⚠ Quotation: sorts within year but gaps in sequence |
| **Implementation** | ⚠ Medium — random seed management adds complexity |

---

### Strategy 5: Product Line Encoded

**Format**:
- Opportunity: `OPP-[Line]-YYMM-NNN` → `OPP-WI-2603-007`
- Quotation: `QUO-YYMM-NNN` → `QUO-2603-015` (simple for external)

Product line prefixes:
- `WI` = Well Intervention
- `NC` = New Completions
- `GE` = Green Energy
- `ES` = Engineering Service
- `TS` = Testing Service

| Dimension | Assessment |
|---|---|
| **Decodability** | ✅ Excellent — instantly know product line + time + sequence. "OPP-GE-2603-002" = second Green Energy opportunity in March |
| **Privacy (Quotation)** | ✅ Good — quotation ID doesn't embed product line, keeps it simple for clients |
| **Collision safety** | ✅ Good — sequence per product line per month |
| **Sortability** | ⚠ Groups by product line, then chronological. Useful for product-focused views |
| **Implementation** | ⚠ Medium — sequence per product line per month. Must handle "product line unknown at creation" edge case |

**Advantage**: At a glance, leadership knows the portfolio mix. "We have OPP-WI-2603-042 but only OPP-GE-2603-003" — Well Intervention is 14x more active than Green Energy.

**Risk**: Opportunity product line may not be known at Lead stage, or may span multiple product lines.

---

### Strategy 6: Hash-Based Short Code (Fully Opaque)

**Format**:
- Opportunity: `OPP-A7K3M9` → 6-character alphanumeric hash
- Quotation: `QUO-B2X8P4` → 6-character alphanumeric hash

Generated from timestamp + random bytes, base-36 encoded.

| Dimension | Assessment |
|---|---|
| **Decodability** | ❌ Poor — no human-readable meaning. Must look up every time |
| **Privacy (Quotation)** | ✅ Excellent — reveals nothing about volume, timing, or customer |
| **Collision safety** | ✅ Excellent — cryptographic randomness |
| **Sortability** | ❌ Poor — no chronological ordering from ID alone |
| **Implementation** | ✅ Simple — generate random string, check for uniqueness |

**Disadvantage**: Nobody can glance at an ID and know anything about it. Poor for internal communication. "What's OPP-A7K3M9?" — meaningless without a database lookup.

---

### Strategy 7: Hierarchical with Quotation Chaining

**Format**:
- Opportunity: `OPP-YYYY-NNNN` → `OPP-2026-0042`
- Quotation: `OPP-2026-0042-Q1` → `OPP-2026-0042-Q2` → `OPP-2026-0042-Q3`

Quotation ID is derived from its parent Opportunity ID with a `-Q{version}` suffix.

| Dimension | Assessment |
|---|---|
| **Decodability** | ✅ Excellent — quotation ID immediately shows which opportunity it belongs to AND which revision. "OPP-2026-0042-Q3" = third quote on opportunity 42 |
| **Privacy (Quotation)** | ❌ Poor — client sees opportunity sequence number AND revision count. `OPP-2026-0042-Q3` reveals you've sent 3 quotes (negotiation friction) and have ~42 opportunities this year |
| **Collision safety** | ✅ Excellent — version number is deterministic from opportunity |
| **Sortability** | ✅ Excellent — sorts by opportunity then version |
| **Implementation** | ✅ Simple — quotation version incremented from opportunity context |

**Advantage**: No separate quotation sequence needed. Quotation and opportunity are tightly coupled — instantly shows relationship and version history.

**Risk**: Client sees revision count (Q3 = you've revised twice, may signal desperation or complexity).

---

### Strategy Comparison Matrix

| Strategy | Opp Decodability | Quo Decodability | Quo Privacy | Collision Safe | Sortable | Complexity |
|---|---|---|---|---|---|---|
| **1. Year-Sequential** | ✅✅ | ✅✅ | ❌ | ✅ | ✅✅ | Low |
| **2. Year-Month-Sequential** | ✅✅ | ✅✅ | ❌ | ✅ | ✅✅ | Low |
| **3. Company Code Embedded** | ✅✅✅ | ⚠ | ⚠ | ✅ | ⚠ | Medium |
| **4. Random Offset** | ✅✅ | ✅ | ✅ | ✅ | ✅ | Medium |
| **5. Product Line Encoded** | ✅✅✅ | ✅✅ | ✅ | ✅ | ⚠ | Medium |
| **6. Hash-Based** | ❌ | ❌ | ✅✅ | ✅✅ | ❌ | Low |
| **7. Hierarchical Chain** | ✅✅ | ✅✅✅ | ❌ | ✅✅ | ✅✅ | Low |

### Observations for Selection

**For Opportunity IDs** (internal only):
- Strategies 3 (Company Code) and 5 (Product Line) offer the richest internal decodability
- Strategy 3 is strongest if your team thinks in terms of customer accounts
- Strategy 5 is strongest if your team thinks in terms of product lines
- Strategies 1, 2, and 7 are simpler but carry less embedded information

**For Quotation IDs** (external facing):
- Strategy 7 (Hierarchical Chain) gives the best internal decodability but worst client privacy
- Strategy 4 (Random Offset) is the best balance of decodability + privacy
- Strategy 6 (Hash) gives maximum privacy but zero decodability
- Strategies 1-3 all expose your quoting volume to clients

**Note on your concern about clients decoding volume**: Any purely sequential quotation ID (Strategies 1, 2, 3, 5, 7) allows a sophisticated client to estimate how many quotes you generate per period. If this is a concern, Strategies 4 or 6 are the only options that prevent it. If it's acceptable, Strategy 7 gives the richest information.

**You can also mix strategies** — for example, use Strategy 3 for Opportunities (company-embedded, internal) and Strategy 4 for Quotations (privacy-preserving, external).

---

Please review this report and let me know:
1. **Schema changes** — Are the additions to TSS_Company and TSS_Contact correct?
2. **Company hierarchy** — Is single-level parent/subsidiary sufficient, or do you need multi-level (grandchild companies)?
3. **ID strategy** — Which strategy (or combination) would you like for Opportunities and Quotations?

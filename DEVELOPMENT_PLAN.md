# Tejas Sales System (TSS) — Development Plan

**System Name**: Tejas Sales System
**Abbreviation**: TSS
**Architecture**: React SPA + Azure Functions (TypeScript) + SharePoint Lists + JotForm Enterprise
**Authentication**: Microsoft Entra ID (Microsoft 365 login)

---

## Table of Contents

1. [Naming Standards](#1-naming-standards)
2. [SharePoint Objects & Schema](#2-sharepoint-objects--schema)
3. [Object Relationships](#3-object-relationships)
4. [Activity Tracking Strategy](#4-activity-tracking-strategy)
5. [Sales Process & Opportunity Lifecycle](#5-sales-process--opportunity-lifecycle)
6. [JotForm Enterprise Integration](#6-jotform-enterprise-integration)
7. [Document Management](#7-document-management)
8. [ID Generation Strategy](#8-id-generation-strategy)
9. [Dependencies & Configuration](#9-dependencies--configuration)
10. [Staged Development Plan](#10-staged-development-plan)
11. [Debugging, Monitoring & Alerting](#11-debugging-monitoring--alerting)

---

## 1. Naming Standards

### SharePoint Site

| Item | Value |
|---|---|
| **Site Name** | Sales (existing site) |
| **Site URL** | `https://tejasre.sharepoint.com/sites/sales` |

### SharePoint List Naming Convention

**Pattern**: `TSS_<EntityName>` (PascalCase, singular noun)

| Rule | Example | Rationale |
|---|---|---|
| Prefix all lists with `TSS_` | `TSS_Company`, `TSS_Contact` | Prevents collision with other SharePoint lists on the same site |
| Use singular nouns | `TSS_Opportunity` not `TSS_Opportunities` | Consistent with data modeling convention (each row IS one entity) |
| PascalCase | `TSS_OpportunityLineItem` | Readable without spaces; compatible with Graph API references |
| No abbreviations | `TSS_Opportunity` not `TSS_Opp` | Clarity over brevity |
| Junction lists use both names | `TSS_OpportunityContact` | Indicates many-to-many relationship |

### SharePoint Library Naming Convention

**Pattern**: `TSS_<Context>_Documents`

| Library | Purpose |
|---|---|
| `TSS_Opportunity_Documents` | Quotations, POs, proposals, technical docs tied to opportunities |

### SharePoint Column Naming Convention

**Pattern**: `tss_<fieldName>` (camelCase with `tss_` prefix for custom columns)

| Rule | Example | Rationale |
|---|---|---|
| Prefix custom columns with `tss_` | `tss_opportunityId`, `tss_stage` | Distinguishes TSS columns from SharePoint built-in columns (`Title`, `Created`, `Modified`, `Author`) |
| camelCase | `tss_closeDate`, `tss_bidDueDate` | Standard TypeScript naming; maps directly to Graph API field references |
| Lookup columns end with `Id` | `tss_companyId` (lookup to TSS_Company) | Clear that this is a foreign key reference |
| Boolean columns use `is` prefix | `tss_isPrimary`, `tss_isDecisionMaker` | Immediately recognizable as true/false |
| Date columns end with `Date` | `tss_closeDate`, `tss_deliveryDate` | Type-evident naming |
| Use SharePoint `Title` column | Map to display name (company name, contact name, etc.) | Required by SharePoint; always indexed |

### Built-in Columns (Do Not Rename)

These SharePoint columns exist on every list and should be used as-is:

| Column | Type | Use |
|---|---|---|
| `Title` | Single line text | Primary display name for the record |
| `Id` | Integer (auto) | SharePoint internal ID |
| `Created` | DateTime (auto) | Record creation timestamp |
| `Modified` | DateTime (auto) | Last modification timestamp |
| `Author` | Person (auto) | User who created the record |
| `Editor` | Person (auto) | User who last modified the record |

---

## 2. SharePoint Objects & Schema

### TSS_Country (Reference Data)

| Column | Internal Name | Type | Required | Indexed | Notes |
|---|---|---|---|---|---|
| Country Name | `Title` | Single line text | Yes | Yes | Built-in column |
| Country Code | `tss_countryCode` | Single line text | Yes | Yes | ISO 3166-1 alpha-2 (US, CA, MX, etc.) |
| Region | `tss_region` | Choice | Yes | Yes | North America, South America, Europe, Middle East, Asia, Africa, Oceania |

### TSS_Product (Product Catalog)

| Column | Internal Name | Type | Required | Indexed | Notes |
|---|---|---|---|---|---|
| Product Name | `Title` | Single line text | Yes | Yes | e.g., "FlowGARD Safety Valve" |
| Product Code | `tss_productCode` | Single line text | Yes | Yes | e.g., "FG-SCSSV" |
| Product Line | `tss_productLine` | Choice | Yes | Yes | Well Intervention, New Completions, Green Energy, Engineering Service, Testing Service, Training |
| Category | `tss_category` | Choice | No | No | Safety Valve, Packer, Anchor, Lock, Nipple, Cementing Tool, Frac Sleeve, Service |
| Is Active | `tss_isActive` | Yes/No | Yes | No | Controls visibility in product picker |
| Description | `tss_description` | Multiple lines | No | No | Product summary |
| Base Price | `tss_basePrice` | Currency | No | No | List price (if applicable) |
| Unit | `tss_unit` | Choice | No | No | Each, Set, Project, Day, Hour |

### TSS_Company (Customer Accounts)

| Column | Internal Name | Type | Required | Indexed | Notes |
|---|---|---|---|---|---|
| Company Name | `Title` | Single line text | Yes | Yes | Built-in column |
| Company Code | `tss_companyCode` | Single line text (2-6 chars) | Yes | Yes | Unique business abbreviation (e.g., SLB, CVX, CNPC, TRE) |
| Industry | `tss_industry` | Choice | No | Yes | Oil & Gas E&P, Oil & Gas Services, CCS/CCUS, Geothermal, Engineering, Government/Research, Other |
| Country | `tss_countryId` | Lookup → TSS_Country | No | No | Primary country of operations |
| Is Subsidiary | `tss_isSubsidiary` | Yes/No | No | No | True if this company has a parent company |
| Parent Company | `tss_parentCompanyId` | Lookup → TSS_Company | No | Yes | Self-referential: parent in corporate hierarchy (e.g., CNPC → CNPCUS) |
| Website | `tss_website` | Hyperlink | No | No | Company URL |
| Phone | `tss_phone` | Single line text | No | No | Main phone number |
| Address | `tss_address` | Multiple lines | No | No | Street, City, State/Province, ZIP |
| Owner | `tss_owner` | Person | No | Yes | Tejas account owner (sales rep) |
| Type | `tss_companyType` | Choice | No | Yes | Operator, Service Company, Engineering Client, Testing Client, Government/Research, Distributor |
| Basin/Region | `tss_basin` | Choice | No | Yes | Permian, Eagle Ford, DJ Basin, Bakken, GoM, Marcellus, International, Other |
| Notes | `tss_notes` | Multiple lines | No | No | General account notes |
| Is Active | `tss_isActive` | Yes/No | Yes | No | Soft delete flag |

**Lookup budget**: 2 of 12 used (tss_countryId, tss_parentCompanyId)

### Company Hierarchy (Parent/Subsidiary Chain)

The `tss_parentCompanyId` self-referential lookup supports multi-level corporate hierarchies. While most relationships are single-level (parent → subsidiary), the system can follow chains of any depth:

```
TotalEnergies SE (TTE)
├── TotalEnergies EP Danmark (TEPDK)
└── TotalEnergies EP Malaysia (TEPMY)

Schlumberger (SLB)
├── Cameron (CAM)
├── Geoservices Equipments (GEOSE)
└── OneSubsea (OSB)
```

**Hierarchy Traversal** (application-level, in TypeScript):

To find all companies in a hierarchy (e.g., "all entities under Schlumberger"):
1. Start with root company (Schlumberger, ID = X)
2. Query TSS_Company where `tss_parentCompanyId` = X → get children (Cameron, Geoservices, OneSubsea)
3. For each child, recursively query for their children → get grandchildren (if any)
4. Collect all IDs in the tree
5. Query TSS_Opportunity where `tss_companyId` IN [all collected IDs]

The application implements a recursive `getCompanyTree(companyId)` function that walks the hierarchy. Results are cached in React Query since corporate structures change infrequently.

**Example queries enabled by hierarchy**:
- "Show all opportunities for Schlumberger and its subsidiaries"
- "Total revenue across the TotalEnergies family"
- "Find the ultimate parent company for TotalEnergies EP Danmark"

**Seed data**: 133 companies from reference data, including 21 parent/subsidiary relationships.

### TSS_Contact (People at Customer Companies)

| Column | Internal Name | Type | Required | Indexed | Notes |
|---|---|---|---|---|---|
| Full Name | `Title` | Single line text | Yes | Yes | "First Last" format |
| Preferred Name | `tss_preferredName` | Single line text | No | No | Informal name the contact goes by (e.g., "Bubba", "Jim Yue", "Bryan Nguyen, P.E.") |
| Email | `tss_email` | Single line text | No | Yes | Primary email address |
| Phone | `tss_phone` | Single line text | No | No | Direct phone |
| Mobile | `tss_mobile` | Single line text | No | No | Mobile phone |
| Job Title | `tss_jobTitle` | Single line text | No | No | Role at company |
| Department | `tss_department` | Choice | No | No | Engineering, Operations, Procurement, Management, HSE, Other |
| Company | `tss_companyId` | Lookup → TSS_Company | Yes | Yes | Parent company |
| Is Decision Maker | `tss_isDecisionMaker` | Yes/No | No | No | Tags primary decision makers |
| Is Influencer | `tss_isInfluencer` | Yes/No | No | No | Tags additional company influencers |
| Is Active | `tss_isActive` | Yes/No | Yes | No | Soft delete flag |
| Notes | `tss_notes` | Multiple lines | No | No | Contact-specific notes |

**Lookup budget**: 1 of 12 used (tss_companyId)

### TSS_InternalTeam (Tejas Staff for Team Assignments)

| Column | Internal Name | Type | Required | Indexed | Notes |
|---|---|---|---|---|---|
| Team Member Name | `Title` | Single line text | Yes | Yes | Tejas employee name |
| Email | `tss_email` | Single line text | Yes | Yes | M365 email (for Graph API matching) |
| Role | `tss_role` | Choice | Yes | No | Sales, Engineering, Operations, Management, Testing, Finance |
| Is Active | `tss_isActive` | Yes/No | Yes | No | Current employee flag |

### TSS_Opportunity (Sales Opportunities / Deals)

| Column | Internal Name | Type | Required | Indexed | Notes |
|---|---|---|---|---|---|
| Opportunity Name | `Title` | Single line text | Yes | Yes | Descriptive name |
| Opportunity ID | `tss_opportunityId` | Single line text | Yes | Yes | Auto-generated: `OPP-[CompanyCode]-YYYY-MM-NNN` (e.g., `OPP-CVX-2026-03-001`) |
| Company | `tss_companyId` | Lookup → TSS_Company | Yes | Yes | Customer account |
| Primary Contact | `tss_primaryContactId` | Lookup → TSS_Contact | No | No | Main point of contact |
| Stage | `tss_stage` | Choice | Yes | Yes | Lead, Qualification, Quotation, Negotiation, Close, After Action |
| Close Status | `tss_closeStatus` | Choice | No | Yes | Won, Lost, Cancelled (only set when Stage = Close) |
| Close Reason | `tss_closeReason` | Multiple lines | No | No | Rationale for close decision |
| Probability | `tss_probability` | Number (%) | No | No | Win probability |
| Revenue | `tss_revenue` | Currency | No | No | Total potential revenue |
| Bid Due Date | `tss_bidDueDate` | DateTime | No | Yes | When bid/quote is due |
| Delivery Date | `tss_deliveryDate` | DateTime | No | No | Final requested delivery date |
| Close Date | `tss_closeDate` | DateTime | No | Yes | Actual or expected close date |
| Owner | `tss_owner` | Person | Yes | Yes | Primary Tejas sales rep |
| Product Line | `tss_productLine` | Choice | No | Yes | Well Intervention, New Completions, Green Energy, Engineering Service, Testing Service |
| Basin/Region | `tss_basin` | Choice | No | No | Permian, Eagle Ford, GoM, International, etc. |
| Is Related | `tss_isRelated` | Yes/No | No | No | Flag: related to other opportunities |
| Related Opportunity | `tss_relatedOpportunityId` | Lookup → TSS_Opportunity | No | No | Self-referential: linked opportunity |
| Pursuit Decision | `tss_pursuitDecision` | Choice | No | No | Pursue, No-Bid, Pending |
| Pursuit Rationale | `tss_pursuitRationale` | Multiple lines | No | No | Why we are/aren't pursuing |
| PO Number | `tss_poNumber` | Single line text | No | No | Customer PO (set on Won) |
| Tax Exempt | `tss_isTaxExempt` | Yes/No | No | No | Customer has tax exemption |
| Tax Document | `tss_taxDocumentLink` | Hyperlink | No | No | Link to tax exemption certificate in document library |
| Notes | `tss_notes` | Multiple lines | No | No | General opportunity notes |

**Lookup budget**: 4 of 12 used (companyId, primaryContactId, relatedOpportunityId + cascading)

### TSS_OpportunityContact (Junction: Many Contacts per Opportunity)

| Column | Internal Name | Type | Required | Indexed | Notes |
|---|---|---|---|---|---|
| Title | `Title` | Single line text | Yes | Yes | Auto-set: "OPP-Contact Link" |
| Opportunity | `tss_opportunityId` | Lookup → TSS_Opportunity | Yes | Yes | — |
| Contact | `tss_contactId` | Lookup → TSS_Contact | Yes | Yes | — |
| Role | `tss_contactRole` | Choice | No | No | Decision Maker, Influencer, Technical, Procurement, End User |

### TSS_OpportunityTeam (Junction: Internal Team Assignments per Opportunity)

| Column | Internal Name | Type | Required | Indexed | Notes |
|---|---|---|---|---|---|
| Title | `Title` | Single line text | Yes | Yes | Auto-set: "OPP-Team Link" |
| Opportunity | `tss_opportunityId` | Lookup → TSS_Opportunity | Yes | Yes | — |
| Team Member | `tss_teamMemberId` | Lookup → TSS_InternalTeam | Yes | Yes | — |
| Team Role | `tss_teamRole` | Choice | Yes | No | Sales Lead, Sales Support, Engineering Lead, Engineering Support, Operations, Management Sponsor |
| Is Primary | `tss_isPrimary` | Yes/No | No | No | Primary team member for this role |

### TSS_OpportunityLineItem (Products on an Opportunity)

| Column | Internal Name | Type | Required | Indexed | Notes |
|---|---|---|---|---|---|
| Title | `Title` | Single line text | Yes | Yes | Product name (copied from catalog) |
| Opportunity | `tss_opportunityId` | Lookup → TSS_Opportunity | Yes | Yes | Parent opportunity |
| Product | `tss_productId` | Lookup → TSS_Product | Yes | No | Product catalog reference |
| Quantity | `tss_quantity` | Number | Yes | No | Number of units |
| Unit Price | `tss_unitPrice` | Currency | No | No | Price per unit (may differ from catalog) |
| Line Total | `tss_lineTotal` | Currency | No | No | Quantity × Unit Price (app-computed) |
| Notes | `tss_notes` | Multiple lines | No | No | Product-specific notes, specifications, customizations |

### TSS_Quotation (Formal Quotes Sent to Customers)

| Column | Internal Name | Type | Required | Indexed | Notes |
|---|---|---|---|---|---|
| Quote Title | `Title` | Single line text | Yes | Yes | Descriptive name |
| Quote ID | `tss_quoteId` | Single line text | Yes | Yes | Auto-generated: Hash-based (see [Section 8](#8-id-generation-strategy) for format options) |
| Opportunity | `tss_opportunityId` | Lookup → TSS_Opportunity | Yes | Yes | Parent opportunity |
| Version | `tss_version` | Number | Yes | No | 1, 2, 3... increments with revisions |
| Status | `tss_status` | Choice | Yes | Yes | Draft, In Review, Approved, Sent, Revised, Superseded |
| Total Amount | `tss_totalAmount` | Currency | No | No | Quoted total |
| Valid Until | `tss_validUntilDate` | DateTime | No | No | Quotation expiry date |
| Sent Date | `tss_sentDate` | DateTime | No | No | When sent to customer |
| Approved By | `tss_approvedBy` | Person | No | No | Internal approver |
| Approval Date | `tss_approvalDate` | DateTime | No | No | When approved |
| Terms | `tss_terms` | Multiple lines | No | No | Standard T&Cs selected / customized |
| Document Link | `tss_documentLink` | Hyperlink | No | No | Link to quote PDF in document library |
| Notes | `tss_notes` | Multiple lines | No | No | Quote-specific notes |

### TSS_OpportunityQuotation (Junction: Links Opportunities to Quotations)

This list explicitly ties Opportunity IDs to Quotation IDs, enabling:
- Tracking all quotes generated for an opportunity across revisions
- Cross-referencing which quotation was the "winning" version
- Querying all quotations by opportunity without relying solely on the lookup on TSS_Quotation

| Column | Internal Name | Type | Required | Indexed | Notes |
|---|---|---|---|---|---|
| Title | `Title` | Single line text | Yes | Yes | Auto-set: `[OpportunityId] ↔ [QuoteId]` (e.g., "OPP-CVX-2026-03-001 ↔ Q-7K2M9X4P") |
| Opportunity | `tss_opportunityId` | Lookup → TSS_Opportunity | Yes | Yes | Parent opportunity |
| Quotation | `tss_quotationId` | Lookup → TSS_Quotation | Yes | Yes | Linked quotation |
| Is Active Version | `tss_isActiveVersion` | Yes/No | No | No | True for the current/latest version; False for superseded versions |
| Is Winning Quote | `tss_isWinningQuote` | Yes/No | No | No | True for the quotation that led to a Won close |
| Notes | `tss_notes` | Multiple lines | No | No | Context for the linkage |

**Lookup budget**: 2 of 12 used (tss_opportunityId, tss_quotationId)

**Use cases**:
- View all quotation versions for `OPP-CVX-2026-03-001` with their statuses
- Identify which quote version won the deal
- Dashboard: count of quotes per opportunity (revision depth)
- Cross-opportunity analysis: "What quotes are outstanding across all Chevron opportunities?"

### TSS_Activity (Customer Interactions & Internal Actions)

| Column | Internal Name | Type | Required | Indexed | Notes |
|---|---|---|---|---|---|
| Subject | `Title` | Single line text | Yes | Yes | Brief description |
| Type | `tss_activityType` | Choice | Yes | Yes | Email, Call, Meeting, Site Visit, Trade Show, Training, Internal Note, Quote Sent, PO Received, Shipment |
| Date | `tss_activityDate` | DateTime | Yes | Yes | When it occurred |
| Company | `tss_companyId` | Lookup → TSS_Company | No | Yes | Associated account |
| Contact | `tss_contactId` | Lookup → TSS_Contact | No | No | Associated contact |
| Opportunity | `tss_opportunityId` | Lookup → TSS_Opportunity | No | Yes | Associated opportunity |
| Owner | `tss_owner` | Person | Yes | Yes | Tejas user who performed/logged the activity |
| Direction | `tss_direction` | Choice | No | No | Inbound, Outbound, Internal |
| Duration (minutes) | `tss_duration` | Number | No | No | Call/meeting length |
| Description | `tss_description` | Multiple lines | No | No | Details, notes, outcomes |
| Source | `tss_source` | Choice | No | No | Manual, Email Auto-Link, JotForm, Calendar Sync |
| Is Auto-Created | `tss_isAutoCreated` | Yes/No | No | No | True if created by system (email webhook, etc.) |
| Email Message ID | `tss_emailMessageId` | Single line text | No | No | Graph API message ID (for email activities, prevents duplicates) |

**Lookup budget**: 3 of 12 used (companyId, contactId, opportunityId)

### TSS_ContractReview (PO / Contract Reviews on Won Opportunities)

| Column | Internal Name | Type | Required | Indexed | Notes |
|---|---|---|---|---|---|
| Title | `Title` | Single line text | Yes | Yes | "Contract Review - [Company] - [PO#]" |
| Opportunity | `tss_opportunityId` | Lookup → TSS_Opportunity | Yes | Yes | Parent opportunity |
| PO Number | `tss_poNumber` | Single line text | Yes | Yes | Customer PO number |
| PO Date | `tss_poDate` | DateTime | No | No | Date on PO |
| PO Document Link | `tss_poDocumentLink` | Hyperlink | No | No | Link to PO in document library |
| Terms Match Quote | `tss_termsMatchQuote` | Choice | No | No | Yes, No - Revision Required, Pending Review |
| Revision Needed | `tss_revisionNeeded` | Yes/No | No | No | Does the customer need to revise PO? |
| Revision Notes | `tss_revisionNotes` | Multiple lines | No | No | What needs to change |
| Review Status | `tss_reviewStatus` | Choice | Yes | Yes | Pending, In Review, Approved, Rejected, Revision Requested |
| Reviewed By | `tss_reviewedBy` | Person | No | No | Who performed the review |
| Review Date | `tss_reviewDate` | DateTime | No | No | When review was completed |
| Tax Status | `tss_taxStatus` | Choice | No | No | Taxable, Tax Exempt - Document on File, Tax Exempt - Document Needed |
| Notes | `tss_notes` | Multiple lines | No | No | Review notes |

---

## 3. Object Relationships

### Relationship Diagram

```
TSS_Country
    │
    │ (1:N)
    ▼
TSS_Company ◄──────────────────────────────┐
    │  ▲                                    │
    │  └── (self-ref: parent/subsidiary)    │ (lookup)
    │ (1:N)                                 │
    ▼                                       │
TSS_Contact ◄──── TSS_OpportunityContact ───┤
    │              (N:N junction)           │
    │                                       │
    │ (1:N via junction)                    │
    ▼                                       │
TSS_Opportunity ─── TSS_OpportunityTeam ──► TSS_InternalTeam
    │               (N:N junction)
    │
    ├── (1:N) TSS_OpportunityLineItem ──► TSS_Product
    │
    ├── (1:N) TSS_Quotation
    │          │
    │          └── TSS_OpportunityQuotation (N:N junction: Opportunity ↔ Quotation)
    │
    ├── (1:N) TSS_Activity
    │
    ├── (1:N) TSS_ContractReview
    │
    └── (self-ref) TSS_Opportunity (related opportunities)


TSS_Activity also links to:
    ├── TSS_Company (account-level activities)
    └── TSS_Contact (contact-level activities)
```

### Relationship Summary

| Parent | Child | Type | Junction List | Cascade Delete |
|---|---|---|---|---|
| TSS_Country | TSS_Company | 1:N | — | No (restrict) |
| TSS_Company | TSS_Company | Self-ref | — | No (parent/subsidiary hierarchy) |
| TSS_Company | TSS_Contact | 1:N | — | No (restrict) |
| TSS_Company | TSS_Opportunity | 1:N | — | No (restrict) |
| TSS_Company | TSS_Activity | 1:N | — | No (restrict) |
| TSS_Opportunity | TSS_OpportunityContact | 1:N | Yes (junction) | Yes |
| TSS_Contact | TSS_OpportunityContact | 1:N | Yes (junction) | Yes |
| TSS_Opportunity | TSS_OpportunityTeam | 1:N | Yes (junction) | Yes |
| TSS_InternalTeam | TSS_OpportunityTeam | 1:N | Yes (junction) | No (restrict) |
| TSS_Opportunity | TSS_OpportunityLineItem | 1:N | — | Yes |
| TSS_Product | TSS_OpportunityLineItem | 1:N | — | No (restrict) |
| TSS_Opportunity | TSS_Quotation | 1:N | — | No (restrict) |
| TSS_Opportunity | TSS_OpportunityQuotation | 1:N | Yes (junction) | Yes |
| TSS_Quotation | TSS_OpportunityQuotation | 1:N | Yes (junction) | Yes |
| TSS_Opportunity | TSS_Activity | 1:N | — | No (restrict) |
| TSS_Opportunity | TSS_ContractReview | 1:N | — | No (restrict) |
| TSS_Opportunity | TSS_Opportunity | Self-ref | — | No (related opportunities) |
| TSS_Contact | TSS_Activity | 1:N | — | No (restrict) |

### Lookup Budget Summary

| List | Lookups Used | Remaining (of 12) |
|---|---|---|
| TSS_Country | 0 | 12 |
| TSS_Product | 0 | 12 |
| TSS_Company | 2 (Country, ParentCompany) | 10 |
| TSS_Contact | 1 (Company) | 11 |
| TSS_InternalTeam | 0 | 12 |
| TSS_Opportunity | 4 (Company, PrimaryContact, RelatedOpp + cascading) | 8 |
| TSS_OpportunityContact | 2 (Opportunity, Contact) | 10 |
| TSS_OpportunityTeam | 2 (Opportunity, TeamMember) | 10 |
| TSS_OpportunityLineItem | 2 (Opportunity, Product) | 10 |
| TSS_Quotation | 1 (Opportunity) | 11 |
| TSS_OpportunityQuotation | 2 (Opportunity, Quotation) | 10 |
| TSS_Activity | 3 (Company, Contact, Opportunity) | 9 |
| TSS_ContractReview | 1 (Opportunity) | 11 |

All lists are well within the 12-lookup limit. Total lists: 13 (12 data lists + TSS_Sequence).

---

## 4. Activity Tracking Strategy

### Goal: Minimize Manual Data Entry

The biggest CRM adoption killer is asking salespeople to manually log every interaction. TSS uses a multi-channel approach to auto-capture activities wherever possible.

### Auto-Captured Activities (Zero Manual Effort)

| Source | Mechanism | What Gets Created |
|---|---|---|
| **Email (Inbound)** | Graph webhook → Azure Function detects email from known CRM contact → auto-creates Activity | Type: Email, Direction: Inbound, Contact auto-linked, Subject from email |
| **Email (Outbound)** | Graph webhook → Azure Function detects email TO known CRM contact → auto-creates Activity | Type: Email, Direction: Outbound, Contact auto-linked, Subject from email |
| **Calendar Meetings** | Graph webhook → Azure Function detects meetings with CRM contact attendees → auto-creates Activity | Type: Meeting, Contact auto-linked, Subject from meeting title |
| **Quote Sent** | TSS app marks quotation as "Sent" → auto-creates Activity | Type: Quote Sent, Opportunity auto-linked |
| **PO Received** | TSS app creates ContractReview → auto-creates Activity | Type: PO Received, Opportunity auto-linked |
| **Stage Changes** | TSS app changes opportunity stage → auto-creates Activity | Type: Internal Note, Description: "Stage changed from X to Y" |

### Quick-Entry Activities (Minimal Manual Effort)

| Method | Use Case | Fields Pre-Filled |
|---|---|---|
| **"Log Call" button** on Opportunity/Contact | Sales rep logs a phone call | Date (now), Owner (current user), Company, Contact, Opportunity (from context) — rep only types Subject + brief notes |
| **"Log Meeting" button** | Sales rep logs an in-person meeting | Same pre-fill — rep adds duration + notes |
| **"Log Site Visit" button** | Field visit to customer | Same pre-fill + GPS location (if mobile) |
| **JotForm Mobile Form** | Trade show lead capture, site visit reports | Pre-built form with dropdowns for Company/Contact (synced from TSS), minimal typing |

### JotForm for Structured Activity Capture

For recurring structured activities (trade show lead capture, site visit reports, customer feedback), JotForm Enterprise forms provide:
- **Mobile-friendly** — works on phone with offline capability
- **Pre-configured dropdowns** — product lines, activity types, team members
- **Conditional logic** — show/hide fields based on activity type
- **Photo capture** — attach images from site visits
- **Signature capture** — customer sign-offs
- **Power Automate integration** — JotForm submission triggers Power Automate flow → creates TSS_Activity record in SharePoint List

### Activity Source Tracking

Every activity records its `tss_source` (Manual, Email Auto-Link, JotForm, Calendar Sync) and `tss_isAutoCreated` flag. This enables:
- Measuring CRM adoption (what % of activities are manual vs auto-captured)
- Filtering auto-created activities if they're noisy
- Auditing which sync channels are working

---

## 5. Sales Process & Opportunity Lifecycle

### Phase 1: Lead

**Stage**: Lead — Initial inquiry or identified prospect

**System Actions**:
- Create TSS_Opportunity with Stage = "Lead"
- System generates unique Opportunity ID: `OPP-[CompanyCode]-YYYY-MM-NNN` (e.g., `OPP-CVX-2026-03-001`)
- Create or link TSS_Company record
- Create or link TSS_Contact records via TSS_OpportunityContact
  - Tag Decision Makers (`tss_contactRole` = "Decision Maker")
  - Tag Influencers (`tss_contactRole` = "Influencer")
- Assign internal team via TSS_OpportunityTeam
  - Primary Sales Lead
  - Sales Support members
  - Engineering Support (if technical opportunity)
  - Management Sponsor
- Define scope:
  - Set `tss_revenue` (potential revenue)
  - Link related opportunities via `tss_relatedOpportunityId`

### Phase 2: Qualification

**Stage**: Qualification — Does the opportunity align with company goals?

**System Actions**:
- Capture project technical information in `tss_notes` or structured fields
- Add products to TSS_OpportunityLineItem with technical requirements in line item notes
- Set `tss_bidDueDate` (when bid/quote is due to customer)
- Set `tss_deliveryDate` (final requested delivery date)
- Add delivery milestones to Activities (Type: Internal Note, subject: "Milestone: [item] due [date]")
- **Pursuit Decision**:
  - Set `tss_pursuitDecision` to Pursue, No-Bid, or Pending
  - Capture rationale in `tss_pursuitRationale`
  - If No-Bid → Stage moves to Close with `tss_closeStatus` = "Cancelled", `tss_closeReason` = pursuit rationale

### Phase 3: Quotation

**Stage**: Quotation — Details collected, reviewed, approved, and sent to client

**System Actions**:
- Create TSS_Quotation record linked to opportunity
  - System generates unique Quote ID (hash-based, see [Section 8](#8-id-generation-strategy))
  - Create TSS_OpportunityQuotation junction record linking opportunity ↔ quotation
  - Set `tss_isActiveVersion` = Yes on junction record
  - Version = 1
  - Status = "Draft"
- Pull products from TSS_OpportunityLineItem into quotation
- Pull/attach standard Terms & Conditions
- **Review & Approval Workflow**:
  - Status → "In Review"
  - Capture approver via `tss_approvedBy`
  - Capture approval date
  - Status → "Approved"
  - JotForm approval workflow or in-app approval flow
- **Send to Client**:
  - Upload final quotation PDF to TSS_Opportunity_Documents library
  - Set `tss_sentDate`, Status → "Sent"
  - Auto-create Activity (Type: "Quote Sent")

### Phase 4: Negotiation

**Stage**: Negotiation — Commercial terms being finalized

**System Actions**:
- Capture customer feedback/requested changes as Activities
- **Revise Quote**:
  - Create new TSS_Quotation with same Opportunity, Version = N+1
  - Create new TSS_OpportunityQuotation junction record; set `tss_isActiveVersion` = Yes
  - Set previous junction record's `tss_isActiveVersion` = No
  - Previous quotation Status → "Superseded"
  - New version goes through Draft → In Review → Approved → Sent cycle
- Track all versions — full history maintained in TSS_Quotation + TSS_OpportunityQuotation lists
- Each send creates an Activity (Type: "Quote Sent", notes include version number)

### Phase 5: Close

**Stage**: Close — End of opportunity

**System Actions**:
- Set `tss_closeStatus`:
  - **Won**: Order received
  - **Lost**: Lost to competitor or customer cancelled
  - **Cancelled**: Tejas decision not to pursue (different from No-Bid in Qualification)
- Set `tss_closeReason` — mandatory text explaining outcome
- **If Won**:
  - Set `tss_poNumber`
  - Mark winning quotation: set `tss_isWinningQuote` = Yes on the active TSS_OpportunityQuotation junction record
  - Create TSS_ContractReview record
  - Upload PO to TSS_Opportunity_Documents
  - **Contract Review Process**:
    - Compare PO terms against quoted terms (`tss_termsMatchQuote`)
    - If terms don't match → `tss_revisionNeeded` = Yes → Activity created to request revised PO from customer
    - If terms match → Review approval workflow
    - Capture `tss_reviewedBy`, `tss_reviewDate`
  - **Tax Documentation**:
    - Set `tss_taxStatus` on ContractReview
    - If tax exempt → customer must provide attestation
    - Link tax exempt document via `tss_taxDocumentLink` on Opportunity

### Phase 6: After Action

**Stage**: After Action — Post-close customer follow-up

**System Actions**:
- Continue logging Activities (calls, emails, meetings) against the opportunity
- Track through delivery/execution:
  - Activity (Type: "Shipment") when product ships
  - Follow up for shipping manifests
- Customer feedback captured as Activities
- Opportunity remains in "After Action" until fully completed, then can be archived

### Opportunity Stage Flow

```
Lead → Qualification → Quotation → Negotiation → Close → After Action
                ↓                                    ↓
            (No-Bid)                          (Won / Lost / Cancelled)
                ↓
            Close (Cancelled)
```

---

## 6. JotForm Enterprise Integration

### How JotForm Fits the Architecture

JotForm Enterprise serves as a **structured data capture and approval workflow** layer alongside the React SPA. It does NOT replace the SPA — it complements it for specific use cases where forms, approvals, and mobile capture are superior to a traditional CRM UI.

### Architecture

```
                    ┌─────────────────────┐
                    │  JotForm Enterprise  │
                    │  (SSO via Entra ID)  │
                    └──────────┬──────────┘
                               │
                    JotForm Submission
                               │
                    ┌──────────▼──────────┐
                    │  Power Automate     │
                    │  (Trigger: JotForm  │
                    │   New Submission)    │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  SharePoint Lists   │
                    │  (TSS_Activity,     │
                    │   TSS_Opportunity)  │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  TSS React SPA      │
                    │  (displays data)    │
                    └─────────────────────┘
```

### JotForm Use Cases

| Use Case | Form | Output | Why JotForm over SPA |
|---|---|---|---|
| **Trade show lead capture** | Contact + company + interest fields | TSS_Activity + TSS_Contact (if new) | Mobile offline, fast capture, no CRM login needed |
| **Site visit report** | Pre-filled customer, products discussed, outcomes, photos | TSS_Activity with description | Structured template, photo capture, offline |
| **Customer call log (mobile)** | Pre-filled dropdown of recent contacts, subject, notes | TSS_Activity | Quick mobile entry without opening full CRM |
| **Quote approval** | Quote summary → multi-step approval routing | TSS_Quotation status update | Built-in approval workflow engine |
| **Contract review** | PO terms checklist → reviewer approval | TSS_ContractReview status update | Structured checklist + approval routing |
| **New customer intake** | Company details, contacts, initial interest | TSS_Company + TSS_Contact | Clean structured onboarding form |

### JotForm Enterprise Configuration

| Setting | Value |
|---|---|
| **SSO** | Microsoft Entra ID (SAML) — same M365 credentials as TSS |
| **Data Residency** | Match organization's compliance requirements |
| **White Label** | Custom domain (e.g., forms.tejasre.com) |
| **Branding** | Tejas logos, colors, remove JotForm branding |
| **API** | REST API for programmatic form creation/submission retrieval |

### Power Automate Flows (JotForm → SharePoint)

| Flow | Trigger | Action |
|---|---|---|
| `TSS-JF-LeadCapture` | JotForm: new submission on Lead Capture form | Create TSS_Activity + conditionally create TSS_Contact |
| `TSS-JF-SiteVisit` | JotForm: new submission on Site Visit form | Create TSS_Activity with photos as attachments |
| `TSS-JF-CallLog` | JotForm: new submission on Call Log form | Create TSS_Activity |
| `TSS-JF-QuoteApproval` | JotForm: approval completed | Update TSS_Quotation status + create TSS_Activity |
| `TSS-JF-ContractReview` | JotForm: review completed | Update TSS_ContractReview status + create TSS_Activity |

### Limitation: JotForm Cannot Read SharePoint Lists

JotForm does **not** have native ability to dynamically populate dropdowns from SharePoint Lists. This means:
- Product catalog dropdowns must be manually maintained in JotForm (or synced periodically via API/Power Automate)
- Company/Contact dropdowns need periodic sync
- **Mitigation**: Power Automate scheduled flow that exports key SharePoint List data (company names, contact names, product codes) and updates JotForm form fields via JotForm API on a daily basis

---

## 7. Document Management

### SharePoint Document Library

**Library**: `TSS_Opportunity_Documents`

**Folder Structure**: Organized by Opportunity ID

```
TSS_Opportunity_Documents/
├── OPP-CVX-2026-03-001/
│   ├── Quotations/
│   │   ├── Q-7K2M9X4P-v1.pdf
│   │   ├── Q-7K2M9X4P-v2.pdf
│   │   └── Q-7K2M9X4P-v3.pdf
│   ├── Purchase Orders/
│   │   └── PO-12345.pdf
│   ├── Technical/
│   │   ├── Well-Data-Sheet.xlsx
│   │   └── Product-Spec-FlowGARD.pdf
│   ├── Tax Documents/
│   │   └── Tax-Exempt-Certificate.pdf
│   └── Shipping/
│       └── Shipping-Manifest-2026-03-15.pdf
├── OPP-SLB-2026-03-001/
│   └── ...
```

> **Note**: The quotation filenames above use Option A (`Q-7K2M9X4P`) as an example. Actual format depends on the selected hash option (see [Section 8](#8-id-generation-strategy)).

### Document Library Metadata Columns

| Column | Type | Purpose |
|---|---|---|
| `tss_opportunityId` | Single line text | Links document to opportunity |
| `tss_documentType` | Choice | Quotation, Purchase Order, Technical, Tax Document, Shipping, Contract, Correspondence, Other |
| `tss_quoteId` | Single line text | Links to specific quotation (if applicable) |

### Graph API for Document Operations

- **Upload**: `PUT /sites/{siteId}/drive/root:/{folderPath}/{fileName}:/content`
- **List files**: `GET /sites/{siteId}/drive/root:/{folderPath}:/children`
- **Download**: `GET /sites/{siteId}/drive/items/{itemId}/content`
- Permission: `Files.ReadWrite` (delegated)

---

## 8. ID Generation Strategy

### Opportunity IDs (Internal — Strategy 2+3)

**Format**: `OPP-[CompanyCode]-YYYY-MM-NNN`

| Segment | Description | Example |
|---|---|---|
| `OPP` | Entity type prefix | `OPP` |
| `[CompanyCode]` | 2-6 character company abbreviation from TSS_Company | `CVX`, `SLB`, `CNPC` |
| `YYYY` | Year of creation | `2026` |
| `MM` | Month of creation (zero-padded) | `03` |
| `NNN` | Sequential number within company+month, zero-padded | `001` |

**Examples**:
- `OPP-CVX-2026-03-001` — First Chevron opportunity in March 2026
- `OPP-SLB-2026-03-001` — First Schlumberger opportunity in March 2026
- `OPP-CVX-2026-03-002` — Second Chevron opportunity in March 2026
- `OPP-TRE-2026-12-001` — First internal (Tejas) opportunity in December 2026
- `OPP-CNPC-2027-01-001` — First CNPC opportunity in January 2027

**Why This Format**:
- **Instantly decodable** — sales reps see the customer, timing, and sequence at a glance
- **Sortable** — sorts naturally by company, then chronologically
- **No volume leakage** — counters are per-company-per-month, so competitors can't infer total deal count
- **Collision-free** — company code + year + month + sequence is unique

### Quotation IDs (External-Facing — Hash-Based)

Quotation IDs appear on documents sent to customers. A sequential format (QUO-0001, QUO-0002) reveals business volume to clients. Hash-based IDs provide opaque, professional identifiers.

**⚠️ Decision Required**: Choose one of the following 4 options:

#### Option A: Short Alphanumeric Hash

**Format**: `Q-[8 chars]`

Generated from: `SHA-256(opportunityId + version + timestamp)`, take first 8 characters (base36: 0-9, A-Z).

| Example | Notes |
|---|---|
| `Q-7K2M9X4P` | 8 chars = 2.8 trillion combinations (base36^8) |
| `Q-B3N5R8W1` | Short enough for verbal reference ("Quote Q-B3N5R8W1") |
| `Q-F9D2L6T4` | No dashes within hash portion — clean appearance |

**Pros**: Very short, easy to reference verbally, fits well on documents.
**Cons**: Smallest collision space of the 4 options (still astronomically unlikely at CRM scale).
**Collision probability**: < 1 in 1 billion at 10,000 quotes.

#### Option B: UUID-Style Segmented Hash

**Format**: `QUO-[XXXX]-[XXXX]`

Generated from: `SHA-256(opportunityId + version + timestamp)`, formatted as two 4-character hex segments.

| Example | Notes |
|---|---|
| `QUO-A3F7-9C2E` | Looks like a professional reference number |
| `QUO-7B1D-4E8A` | Segments make it easier to read/dictate |
| `QUO-D5F2-1A9C` | 8 hex chars = 4.3 billion combinations |

**Pros**: Professional appearance, segmented for readability, familiar format.
**Cons**: Slightly longer than Option A; hex characters only (0-9, A-F) vs full alphanumeric.
**Collision probability**: < 1 in 100 million at 10,000 quotes.

#### Option C: Year-Prefixed Hash

**Format**: `Q-YYYY-[XXXXXX]`

Generated from: `SHA-256(opportunityId + version + timestamp)`, take 6 alphanumeric characters, prefixed with creation year.

| Example | Notes |
|---|---|
| `Q-2026-K7M3P9` | Year provides temporal context without revealing volume |
| `Q-2026-B2N8W5` | Customer knows roughly when quote was generated |
| `Q-2027-R4D6F1` | 6 chars = 2.2 billion combinations (base36^6) per year |

**Pros**: Year gives useful context (for filing, aging), hash prevents volume inference, resets collision space annually.
**Cons**: Longer format; year is somewhat redundant if the quote document is dated.
**Collision probability**: < 1 in 100 million at 10,000 quotes/year.

#### Option D: Checksum-Verified Hash

**Format**: `Q-[6 chars]-[2 char check]`

Generated from: `SHA-256(opportunityId + version + timestamp)`, take first 6 characters (base36), append 2-character Luhn-mod-36 checksum.

| Example | Notes |
|---|---|
| `Q-7K2M9X-P4` | 6 hash + 2 check = data entry error detection |
| `Q-B3N5R8-W1` | If customer misquotes one character, system detects it |
| `Q-F9D2L6-T4` | Checksum validated on lookup — "Did you mean Q-F9D2L6-T4?" |

**Pros**: Built-in error detection for manual entry (phone/email), professional appearance, catches typos.
**Cons**: More complex generation logic; 2 extra characters; customers may not understand the dash-separated check digits.
**Collision probability**: < 1 in 100 million at 10,000 quotes (6-char hash space).

#### Quotation ID Comparison

| Aspect | Option A | Option B | Option C | Option D |
|---|---|---|---|---|
| **Format** | `Q-7K2M9X4P` | `QUO-A3F7-9C2E` | `Q-2026-K7M3P9` | `Q-7K2M9X-P4` |
| **Length** | 10 chars | 13 chars | 13 chars | 12 chars |
| **Character set** | Base36 (0-9,A-Z) | Hex (0-9,A-F) | Base36 (0-9,A-Z) | Base36 (0-9,A-Z) |
| **Temporal context** | None | None | Year visible | None |
| **Error detection** | None | None | None | Luhn checksum |
| **Verbal readability** | Good | Good (segmented) | Good | Good (segmented) |
| **Volume privacy** | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| **Complexity** | Low | Low | Low | Medium |

### How IDs are Generated

SharePoint Lists don't have auto-increment custom columns. Strategy:

1. **TSS_Sequence** list — stores current counters per scope:

| Column | Internal Name | Type | Required | Notes |
|---|---|---|---|---|
| Scope Key | `Title` | Single line text | Yes | Unique key: `OPP-CVX-2026-03` (entity-company-year-month) |
| Counter | `tss_counter` | Number | Yes | Current sequence value |

**Scope key examples**:
- `OPP-CVX-2026-03` → counter for Chevron opportunities in March 2026
- `OPP-SLB-2026-03` → counter for Schlumberger opportunities in March 2026
- `QUO` → single global counter for quotation hash seed (if needed for uniqueness)

2. **Azure Function** (`generate-id`) handles Opportunity ID generation:
   - Receive company code + entity type
   - Compute scope key: `OPP-[companyCode]-YYYY-MM`
   - Read current counter for scope key (or create with counter = 0 if new month/company)
   - Increment counter
   - Update SharePoint item (with ETag for optimistic concurrency)
   - Return formatted ID: `OPP-[companyCode]-YYYY-MM-[counter padded to 3]`

3. **Azure Function** (`generate-quote-id`) handles Quotation ID generation:
   - Receive opportunity ID + version number
   - Compute `SHA-256(opportunityId + version + Date.now())`
   - Format per selected option (A, B, C, or D)
   - Verify uniqueness against TSS_Quotation (query for existing `tss_quoteId`)
   - If collision (astronomically unlikely), re-hash with additional entropy
   - Return formatted quote ID

4. **Concurrency**: ETag-based optimistic locking ensures no two concurrent requests get the same sequence number. If ETag conflict, retry (up to 3 attempts).

---

## 9. Dependencies & Configuration

### 9.1 Microsoft Entra ID App Registration

**Purpose**: Authenticates TSS users and authorizes the application to access Microsoft 365 services on their behalf.

**Supports**: All TSS functionality — login, SharePoint data access, email, calendar, Teams, document management.

| Setting | Value |
|---|---|
| **App Name** | Tejas Sales System (TSS) |
| **Platform** | Single-page application (SPA) |
| **Redirect URI** | `https://<tss-domain>.azurestaticapps.net/auth/callback` |
| **Auth flow** | Authorization Code with PKCE |
| **Account type** | Single tenant (Tejas organization only) |

### 9.2 Microsoft Graph API Permissions

**Delegated Permissions** (user-context, requested by the React SPA):

| Permission | Type | Supports |
|---|---|---|
| `User.Read` | Delegated | Login, display current user profile |
| `Sites.ReadWrite.All` | Delegated | All SharePoint List CRUD (TSS_Company, TSS_Opportunity, etc.) |
| `Mail.Read` | Delegated | Read user's email for CRM email panel, auto-link activities |
| `Mail.Send` | Delegated | Send email from CRM on behalf of user |
| `Calendars.ReadWrite` | Delegated | Read meetings, create meetings with Teams links |
| `Files.ReadWrite` | Delegated | Upload/download documents to TSS_Opportunity_Documents library |

**Application Permissions** (background, used by Azure Functions via Managed Identity):

| Permission | Type | Supports |
|---|---|---|
| `Sites.ReadWrite.All` | Application | Background processing: email webhook creates Activities in SharePoint |
| `Mail.Read` | Application | Email webhook: detect new emails from CRM contacts for all users |
| `ChannelMessage.Send` | Application | Teams notifications: deal stage changes, daily digest, alerts |

**Admin Consent**: Application permissions require **Entra ID Global Admin or Application Admin** to grant consent. Delegated permissions require user consent (or admin pre-consent for the organization).

### 9.3 Azure Static Web Apps

**Purpose**: Hosts the React SPA (frontend) and Azure Functions (API backend) in a single deployment.

**Supports**: TSS web application hosting, SSL, CDN, API routing.

| Setting | Value |
|---|---|
| **Plan** | Standard ($9/month) or Free (development) |
| **Region** | South Central US (closest to The Woodlands, TX) |
| **Build** | GitHub Actions (auto-deploy on push) |
| **Custom domain** | `tss.tejasre.com` (optional) |

### 9.4 Azure Functions Configuration

**Purpose**: Serverless backend for background processing, webhooks, and API proxy.

**Supports**: Email monitoring, subscription renewal, Teams notifications, ID generation, data validation.

| Setting | Value |
|---|---|
| **Runtime** | Node.js 20 |
| **Model** | Isolated worker (v4 programming model) |
| **Plan** | Consumption (pay-per-execution) |
| **Managed Identity** | System-assigned (for Graph API application permissions) |

**Environment Variables** (stored in Azure Key Vault):

| Variable | Purpose |
|---|---|
| `AZURE_TENANT_ID` | Entra ID tenant identifier |
| `AZURE_CLIENT_ID` | App registration client ID |
| `SHAREPOINT_SITE_ID` | TSS SharePoint site ID |
| `GRAPH_WEBHOOK_SECRET` | Shared secret for validating Graph webhook notifications |
| `TEAMS_CHANNEL_ID` | Target Teams channel for notifications |
| `TEAMS_TEAM_ID` | Target Teams team for notifications |

### 9.5 Azure Key Vault

**Purpose**: Securely store secrets and configuration values. Azure Functions access secrets via Managed Identity — no secrets in code.

**Supports**: Secure configuration for all Azure Functions.

### 9.6 SharePoint Online Site

**Purpose**: Hosts all TSS data (lists) and documents (library).

**Supports**: CRM data storage, document management, Power BI connectivity.

| Setting | Value |
|---|---|
| **Site URL** | `https://tejasre.sharepoint.com/sites/sales` (existing site) |
| **Site Template** | Existing team site |
| **Permissions** | TSS users added to site Members group |

### 9.7 Power Automate

**Purpose**: Bridges JotForm Enterprise submissions to SharePoint Lists.

**Supports**: JotForm → SharePoint data flow for activity capture, approvals, lead intake.

| Setting | Value |
|---|---|
| **License** | Included with Microsoft 365 E3/E5 (standard connectors) |
| **Flows** | 5-8 flows connecting JotForm triggers to SharePoint actions |
| **Premium connectors** | Not required (SharePoint and JotForm are standard connectors) |

### 9.8 JotForm Enterprise

**Purpose**: Structured data capture (forms), approval workflows, mobile activity logging, and PDF generation for quotations.

**Supports**: Trade show lead capture, site visit reports, call logging, quote approvals, contract reviews.

| Setting | Value |
|---|---|
| **SSO** | Microsoft Entra ID (SAML) |
| **Custom Domain** | `forms.tejasre.com` (optional) |
| **White Label** | Tejas branding |
| **API Key** | For Power Automate and React SPA integration |

### 9.9 Dependency Summary

```
┌────────────────────────────────────────────────────────────────────┐
│                     Entra ID App Registration                      │
│  (Central identity — authenticates users, authorizes all services) │
└──────┬───────────────┬───────────────┬───────────────┬────────────┘
       │               │               │               │
       ▼               ▼               ▼               ▼
  React SPA      Azure Functions   SharePoint Site   JotForm SSO
  (MSAL Browser)  (Managed ID)     (/sites/sales)   (SAML)
       │               │               │               │
       └───────┬───────┘               │               │
               │                       │               │
               ▼                       ▼               ▼
         Graph API ──────────► SharePoint Lists  Power Automate
         (Delegated +          & Document Library  (JotForm → SP)
          Application)
               │
               ▼
         Key Vault
         (Secrets)
```

---

## 10. Staged Development Plan

### Philosophy

Start with a **minimal working system** and add features incrementally. Each stage delivers a usable product. Don't build the quotation workflow before you can track a company.

### Stage 0: Foundation (Weeks 1-2)

**Goal**: Project scaffolding, authentication, and deployment pipeline working.

| Task | Description |
|---|---|
| Project scaffold | React 18 + Vite + TypeScript + TailwindCSS + Fluent UI v9 |
| MSAL integration | Login with Microsoft 365, acquire Graph API tokens |
| Azure Static Web Apps | Deploy pipeline via GitHub Actions |
| Azure Functions project | Isolated worker model, co-deployed with SPA |
| SharePoint site | Configure existing `https://tejasre.sharepoint.com/sites/sales` site, verify Graph API connectivity |
| Environment config | Azure Key Vault, environment variables, Managed Identity |

**Deliverable**: User can log in with M365 credentials and see a blank dashboard. Deployment pipeline pushes on every commit.

### Stage 1: Core CRM — Beta (Weeks 3-6)

**Goal**: Basic CRUD for companies, contacts, and opportunities. Usable as a minimum viable CRM.

| Task | Description |
|---|---|
| SharePoint Lists | Create TSS_Country, TSS_Product, TSS_Company, TSS_Contact, TSS_InternalTeam, TSS_Opportunity + seed reference data (146 countries, 133 companies, 36 contacts) |
| Naming standards | Apply `TSS_` prefix, `tss_` column naming, indexing strategy |
| Company CRUD | List, create, edit, view companies with search/filter |
| Contact CRUD | List, create, edit, view contacts linked to companies |
| Opportunity CRUD | Create opportunities, assign stage, link to company/contact |
| Product catalog | Seed TSS_Product with Tejas product line |
| ID generation | TSS_Sequence list + Azure Function for `OPP-[CompanyCode]-YYYY-MM-NNN` |
| Pipeline view | Basic Kanban board showing opportunities by stage |
| Navigation | App shell with sidebar navigation |

**Deliverable**: Sales team can create companies, contacts, and opportunities. Pipeline board shows all opportunities by stage. **This is the beta — deploy to users for feedback.**

### Stage 2: Activities & Email (Weeks 7-10)

**Goal**: Activity tracking with auto-capture from email and calendar.

| Task | Description |
|---|---|
| TSS_Activity list | Create with schema, CRUD UI |
| Manual activity entry | "Log Call", "Log Meeting", "Log Site Visit" quick-entry buttons |
| Email panel | Read email history for a contact (Graph API `/me/messages`) |
| Send email | Compose and send from CRM (Graph API `/me/sendMail`) |
| Email auto-link | Graph webhook + Azure Function: auto-create Activities from emails to/from CRM contacts |
| Subscription renewal | Timer-triggered Function: renew email webhooks every 48h |
| Calendar view | Show meetings from user's calendar linked to CRM contacts |
| Activity timeline | Chronological activity feed on Company, Contact, and Opportunity views |

**Deliverable**: Activities auto-capture from email. Sales team sees full interaction history per contact and opportunity.

### Stage 3: Team & Relationships (Weeks 11-13)

**Goal**: Internal team assignments, multi-contact opportunities, and related opportunities.

| Task | Description |
|---|---|
| TSS_OpportunityContact | Junction list + UI for assigning multiple contacts with roles |
| TSS_OpportunityTeam | Junction list + UI for assigning internal team with roles |
| Decision maker tags | Tag contacts as Decision Maker / Influencer on opportunity |
| Team role assignment | Sales Lead, Engineering Support, Management Sponsor, etc. |
| Related opportunities | Link opportunities to each other (self-referential lookup) |
| Contact role on opp | Distinguish roles per opportunity (same contact, different role) |

**Deliverable**: Opportunities show full team (internal + customer) with roles. Related opportunities are linked.

### Stage 4: Quotation & Line Items (Weeks 14-18)

**Goal**: Product configuration, quotation generation, version tracking.

| Task | Description |
|---|---|
| TSS_OpportunityLineItem | Line items with product, quantity, price, notes |
| Product picker | Search/browse TSS_Product catalog, add to opportunity |
| TSS_Quotation | Quote lifecycle: Draft → In Review → Approved → Sent |
| TSS_OpportunityQuotation | Junction list linking opportunities ↔ quotations with version tracking |
| Quote ID generation | Hash-based quote ID via `generate-quote-id` Azure Function |
| Quote versioning | Create new version, mark previous as Superseded; update junction active/winning flags |
| Document library | TSS_Opportunity_Documents with folder structure per opportunity |
| Quote PDF | Generate PDF from quotation data (React PDF or server-side) |
| Upload/download | Upload documents to library, view attached docs |
| Terms & Conditions | Configurable T&C templates attached to quotations |

**Deliverable**: Full quotation workflow from product configuration through versioned quote generation and document storage.

### Stage 5: Close & Contract Review (Weeks 19-21)

**Goal**: Won/Lost/Cancelled close process, PO handling, contract review.

| Task | Description |
|---|---|
| Close workflow | Won/Lost/Cancelled with mandatory close reason |
| TSS_ContractReview | PO receipt, terms comparison, revision tracking |
| Contract review UI | Checklist-style review with approval capture |
| Tax documentation | Tax exempt flag, document upload, attestation tracking |
| PO storage | Upload PO to document library, link to opportunity |
| After Action stage | Post-close activity tracking, shipping follow-up |

**Deliverable**: Complete opportunity lifecycle from Lead through After Action.

### Stage 6: JotForm Integration (Weeks 22-24)

**Goal**: JotForm Enterprise forms for mobile capture and approval workflows.

| Task | Description |
|---|---|
| JotForm SSO | Configure Entra ID SAML authentication |
| Lead capture form | Trade show / event lead intake form |
| Site visit report form | Structured field report with photo capture |
| Quick call log form | Mobile-friendly call logging |
| Power Automate flows | JotForm → SharePoint for all form types |
| Quote approval workflow | JotForm approval flow for quote review/sign-off |
| Contract review workflow | JotForm approval flow for PO review |
| Data sync | Scheduled flow to push company/contact/product data to JotForm dropdowns |

**Deliverable**: Mobile-friendly data capture, approval workflows operational.

### Stage 7: Notifications & Dashboards (Weeks 25-27)

**Goal**: Teams notifications, pipeline dashboards, and KPIs.

| Task | Description |
|---|---|
| Teams notifications | Deal stage changes → Teams channel via Adaptive Cards |
| Daily digest | Automated pipeline summary to Teams channel |
| Stale deal alerts | Flag opportunities with no activity in 14+ days |
| Pipeline dashboard | Total revenue by stage, product line, basin |
| Win rate metrics | Won / (Won + Lost) by time period |
| Activity metrics | Activity volume per rep, per week |
| Forecast view | Weighted pipeline (Revenue × Probability) |
| Power BI connector | Verify SharePoint list connector, build Power BI report |

**Deliverable**: Automated notifications, dashboard with key sales KPIs.

### Stage Summary

| Stage | Weeks | What Ships |
|---|---|---|
| **0: Foundation** | 1-2 | Auth, deploy pipeline, empty shell |
| **1: Core CRM (Beta)** | 3-6 | Companies, Contacts, Opportunities, Pipeline board |
| **2: Activities & Email** | 7-10 | Activity tracking, email auto-link, email panel |
| **3: Teams & Relationships** | 11-13 | Multi-contact, internal teams, related opportunities |
| **4: Quotation & Line Items** | 14-18 | Product config, quotes, versioning, documents |
| **5: Close & Contract Review** | 19-21 | Won/Lost, PO handling, contract review, tax docs |
| **6: JotForm Integration** | 22-24 | Mobile capture, approval workflows |
| **7: Notifications & Dashboards** | 25-27 | Teams alerts, pipeline dashboard, KPIs, Power BI |

**Total estimated timeline**: ~27 weeks (with flexibility — stages can overlap).

**Deploy after Stage 1** — get the beta in front of users as early as possible.

---

## 11. Debugging, Monitoring & Alerting

### Development Debugging

| Tool | Purpose | When |
|---|---|---|
| **Browser DevTools** | Network tab for Graph API calls, Console for errors, React DevTools for component state | Daily development |
| **React Query DevTools** | Inspect cache state, query status, refetch behavior | Debugging data fetch issues |
| **Azure Functions Core Tools** | Local function execution, breakpoints, log streaming | Developing Azure Functions locally |
| **Graph Explorer** (developer.microsoft.com/graph/graph-explorer) | Test Graph API queries interactively before writing code | Building new Graph API integrations |
| **MSAL logging** | `loggerOptions` in MSAL config — logs auth flow, token acquisition, silent refresh | Debugging authentication issues |

### Production Monitoring

| Service | Purpose | Cost |
|---|---|---|
| **Azure Application Insights** | Telemetry for the React SPA and Azure Functions: request rates, response times, failure rates, dependency tracking, custom events | Free tier: 5GB/month included |
| **Azure Functions Monitor** | Built-in execution logs, success/failure counts, execution duration | Included with Functions |
| **Azure Static Web Apps diagnostics** | Deployment logs, request metrics | Included |

### Application Insights Integration

| Component | What's Tracked |
|---|---|
| **React SPA** | Page views, API call duration, JavaScript errors, custom events (stage changes, quote sent, etc.) |
| **Azure Functions** | Execution count, duration, success/failure, dependency calls (Graph API latency) |
| **Graph API calls** | Response times, HTTP status codes, throttling (429) events |

**Setup**: Add `@microsoft/applicationinsights-web` to React SPA, `applicationinsights` to Azure Functions. Both use the same Application Insights resource for unified telemetry.

### Alerting Rules

| Alert | Condition | Action | Priority |
|---|---|---|---|
| **Function failure rate** | >5% failure rate over 15 minutes | Email to CIO + Teams notification | High |
| **Graph API throttling** | >10 HTTP 429 responses in 5 minutes | Email to CIO | Medium |
| **Email webhook failure** | `email-webhook` function fails 3 consecutive times | Email to CIO + Teams notification | High |
| **Subscription renewal failure** | `renew-subscriptions` function fails | Email to CIO (email auto-link will stop working in <24h) | Critical |
| **High response time** | Average API response >3 seconds over 5 minutes | Log for investigation | Low |
| **SPA JavaScript errors** | >20 unhandled JS errors in 1 hour | Log for investigation | Medium |

### Health Check Endpoint

Azure Function HTTP trigger at `/api/health` that verifies:
- Graph API connectivity (test call to `/sites/{siteId}`)
- SharePoint list accessibility (test read from TSS_Company)
- Managed Identity token acquisition

Returns `200 OK` with component status, or `503 Service Unavailable` with details on what's failing.

### Log Retention

| Log Type | Retention | Location |
|---|---|---|
| Application Insights telemetry | 90 days (default) | Azure Application Insights |
| Azure Functions execution logs | 30 days | Azure Monitor Logs |
| SharePoint audit logs | 90 days (M365 E3) / 1 year (E5) | Microsoft 365 Compliance Center |
| Git deployment logs | Indefinite | GitHub Actions |

### Debugging Playbook (Common Issues)

| Symptom | Likely Cause | First Step |
|---|---|---|
| "Access denied" on Graph API call | Token missing required scope, or admin consent not granted | Check MSAL scopes in browser DevTools Network tab |
| Email auto-link stopped working | Graph webhook subscription expired (3-day lifecycle) | Check `renew-subscriptions` function logs in Azure portal |
| SharePoint query returns empty despite data existing | Querying unindexed column on list with >5K items | Verify column is indexed in SharePoint site settings |
| Login redirect loop | MSAL redirect URI mismatch with app registration | Compare Azure portal redirect URI vs SPA config |
| Azure Function returns 500 | Unhandled exception in function code | Check Application Insights for exception details |
| Data shows stale in SPA | React Query serving cached data | Check `staleTime` configuration; manually invalidate query |
| JotForm submission not appearing in SharePoint | Power Automate flow failed or disabled | Check Power Automate flow run history |

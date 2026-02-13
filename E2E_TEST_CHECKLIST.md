# E2E Test Checklist

> **Bead**: `the-next-playground-2lc` (parent)
> Sub-task beads: `eny`, `73y`, `w8i`, `zpc`, `zdw`, `edg`, `0iv`, `p6x`, `s5e`, `12n`

---

## Pre-Test Setup

- [ ] SWA deployed and healthy (`/api/health` returns 200)
- [ ] Daemon Functions deployed and healthy (`/api/health` returns 200)
- [ ] MSAL login working (redirect flow)
- [ ] SharePoint lists seeded with test data (companies, contacts, countries, products)
- [ ] At least one email monitoring subscription active
- [ ] Browser DevTools open to catch console errors

---

## 1. Auth & Layout (`eny`)

### Login Flow
- [ ] Unauthenticated user sees "Sign in with Microsoft" button
- [ ] Click sign-in redirects to Microsoft login
- [ ] After login, redirects back to dashboard
- [ ] User name + avatar badge display in top-right header

### Sidebar Navigation
- [ ] All 8 nav items render: Dashboard, Companies, Contacts, Opportunities, Activities, Pipeline, Basin/Regions
- [ ] Settings nav pinned to bottom with separator
- [ ] Active route is highlighted (blue background, filled icon)
- [ ] Clicking each nav item navigates to correct route
- [ ] Collapse button toggles sidebar width (56px vs 224px)
- [ ] Collapsed state shows icons only with tooltips

### Sign-Out
- [ ] "Sign out" button visible in header
- [ ] Click sign-out clears session
- [ ] Redirects to unauthenticated state

### Catch-All Route
- [ ] Navigate to `/nonexistent` redirects to `/`

---

## 2. Dashboard (`73y`)

### Stat Cards
- [ ] Total Companies count matches actual data
- [ ] Total Contacts count matches actual data
- [ ] Total Opportunities count matches actual data
- [ ] "By Stage" card shows stage breakdown in subtitle

### Recent Opportunities
- [ ] Shows last 5 modified opportunities
- [ ] Each row displays: Title, Company name, Stage badge (colored), Revenue (formatted)
- [ ] Click row navigates to `/opportunities/:id`
- [ ] "View all opportunities" link navigates to `/opportunities`
- [ ] Empty state: "No opportunities yet" message + link

### Pipeline Summary
- [ ] Shows cards for all stages (Lead through After Action)
- [ ] Each card: stage badge, count, total revenue, progress bar
- [ ] Progress bars scale relative to highest-revenue stage
- [ ] "View Pipeline" button navigates to `/pipeline`

### Recent Activity
- [ ] Shows last 8 activities
- [ ] Each row: type icon, title, type badge (colored), company, owner, date
- [ ] Click row navigates to `/activities/:id`
- [ ] "View all activities" link navigates to `/activities`
- [ ] Empty state message when no activities

### Calendar Widget
- [ ] Displays current week range
- [ ] Previous/Today/Next week buttons work
- [ ] Events grouped by day
- [ ] Each event shows: subject, time range, location
- [ ] Online meeting icon (video) vs in-person icon (people)
- [ ] CRM contact badges highlighted when email matches a contact
- [ ] "Log" button navigates to `/activities/new` with pre-filled subject + type=Meeting
- [ ] Empty week: "No meetings this week."
- [ ] Error state: "Failed to load calendar..." message

### Navigation Buttons
- [ ] "New Opportunity" button navigates to `/opportunities/new`

### Error Handling
- [ ] Loading spinner shows while fetching
- [ ] Error state shows error message + "Retry" button
- [ ] Retry successfully refetches data

---

## 3. Companies (`w8i`)

### Company List (`/companies`)
- [ ] Shows correct count in subtitle ("{N} companies")
- [ ] DataGrid columns: Name, Code, Industry, Type, Country, Basin, Status
- [ ] Search by name filters results
- [ ] Search by code filters results
- [ ] Industry dropdown filters
- [ ] Type dropdown filters
- [ ] Basin dropdown filters
- [ ] Multiple filters work together
- [ ] Column sorting works (click headers)
- [ ] Active badge (green) / Inactive badge (red) display correctly
- [ ] Click row navigates to `/companies/:id`
- [ ] "New Company" button navigates to `/companies/new`
- [ ] Empty state: "No companies found" + "New Company" link

### Company Detail (`/companies/:id`)
- [ ] Header: Company name, code, Active/Inactive badge
- [ ] General Info: Industry, Type, Country (resolved from lookup ID)
- [ ] Contact Info: Phone, Website (clickable link), Address
- [ ] Basin/Regions picker shows selected basins
- [ ] Add basin via picker creates junction record
- [ ] Remove basin via picker deletes junction record
- [ ] Refresh page: basin changes persist
- [ ] Parent Company link navigates to parent (if subsidiary)
- [ ] Subsidiaries list with clickable links
- [ ] Active Opportunities section: title, ID, product line, revenue, stage badge
- [ ] Past Opportunities (collapsible): chevron toggles visibility
- [ ] Each opportunity link navigates to `/opportunities/:id`
- [ ] "New Opportunity" button navigates with `?companyId=` param
- [ ] Contacts section: name, job title, email, DM/Influencer badges
- [ ] "Add Contact" button navigates with `?companyId=` param
- [ ] Each contact link navigates to `/contacts/:id`
- [ ] QuickActions: Log Call, Meeting, Site Visit, Add Note (each pre-fills params)
- [ ] Activity Timeline loads and displays activities
- [ ] Timeline "Log Activity" button pre-fills companyId
- [ ] Each timeline activity navigates to `/activities/:id`
- [ ] Notes section displays (if present)
- [ ] "Edit" button navigates to `/companies/:id/edit`
- [ ] "Deactivate" opens confirmation dialog
- [ ] Confirm deactivation sets inactive and navigates to `/companies`

### Company Form (`/companies/new`)
- [ ] Title: "New Company"
- [ ] Company Name field (required, shows error if blank on submit)
- [ ] Company Code field (required, auto-uppercases, max 6 chars)
- [ ] Industry dropdown (clearable)
- [ ] Company Type dropdown (clearable)
- [ ] Country combobox (searchable, clearable)
- [ ] "Is Subsidiary" switch
- [ ] Parent Company combobox appears when subsidiary checked
- [ ] Website, Phone, Address fields
- [ ] Notes textarea
- [ ] Submit with valid data: saves and navigates to detail page
- [ ] Cancel navigates back to `/companies`
- [ ] "Saving..." button state during submission

### Company Form (`/companies/:id/edit`)
- [ ] Title: "Edit Company"
- [ ] All fields pre-populated with existing data
- [ ] Update saves changes and navigates to detail
- [ ] Cancel navigates back to `/companies/:id`

---

## 4. Contacts (`zpc`)

### Contact List (`/contacts`)
- [ ] Shows correct count ("{N} contacts")
- [ ] DataGrid columns: Full Name, Email, Phone, Company, Job Title, DM, Status
- [ ] Search by name filters results
- [ ] Search by email filters results
- [ ] Department dropdown filters
- [ ] DM (Decision Maker) badge displays on flagged contacts
- [ ] Click row navigates to `/contacts/:id`
- [ ] "New Contact" button navigates to `/contacts/new`
- [ ] Empty state with "New Contact" link

### Contact Detail (`/contacts/:id`)
- [ ] Header: Contact name, Company name subtitle, Active/Inactive badge
- [ ] Contact Info: Email, Phone, Mobile
- [ ] Role: Job Title, Department, Preferred Name
- [ ] Flags: Decision Maker and/or Influencer badges
- [ ] Basin picker works (add/remove)
- [ ] Company link navigates to `/companies/:id`
- [ ] QuickActions pre-fill contactId AND companyId
- [ ] Activity Timeline loads correctly
- [ ] "Edit" navigates to edit form
- [ ] "Deactivate" opens confirm dialog, deactivates on confirm

### Email Panel (on Contact Detail)
- [ ] Shows "No email address on file" if contact has no email
- [ ] Loads emails from Graph API when contact has email
- [ ] Email rows show: sender, subject, preview, date
- [ ] Sent badge vs Received badge
- [ ] Unread emails have blue background
- [ ] Attachment icon displays when present
- [ ] Click row to expand/collapse email content
- [ ] Error state: "Failed to load emails..." message

### Compose Email
- [ ] "Compose" button opens ComposeDialog
- [ ] "To" field pre-filled and disabled
- [ ] Subject field (required)
- [ ] Message textarea (required)
- [ ] Cancel closes dialog without sending
- [ ] Send: "Sending..." state, email sent via Graph API
- [ ] After send: dialog closes, activity auto-created, email list refreshes
- [ ] Send error: error banner in dialog

### Contact Form (`/contacts/new`)
- [ ] Full Name (required)
- [ ] Email (email validation)
- [ ] Phone, Mobile, Preferred Name, Job Title
- [ ] Department dropdown
- [ ] Company combobox (required, searchable)
- [ ] `?companyId=` pre-selects company
- [ ] Decision Maker + Influencer switches
- [ ] Notes textarea
- [ ] Submit saves and navigates to detail
- [ ] Cancel navigates to `/contacts`

### Contact Form (`/contacts/:id/edit`)
- [ ] All fields pre-populated
- [ ] Update saves and navigates to detail
- [ ] Cancel navigates to `/contacts/:id`

---

## 5. Opportunities (`zdw`)

### Opportunity List (`/opportunities`)
- [ ] Shows correct count
- [ ] DataGrid: Opportunity ID, Name, Company, Stage (colored badge), Revenue, Product Line, Close Date
- [ ] Search by ID or name filters
- [ ] Stage dropdown filters
- [ ] Product Line dropdown filters
- [ ] Basin dropdown filters
- [ ] Multiple filters combine correctly
- [ ] Click row navigates to `/opportunities/:id`
- [ ] "New Opportunity" button navigates to `/opportunities/new`

### Opportunity Detail (`/opportunities/:id`)
- [ ] Header: Opportunity name, ID (monospace), Stage badge
- [ ] Stage dropdown in header changes stage on selection (mutation)
- [ ] Deal Info: Revenue, Probability (%), Product Line, PO Number, Tax Exempt
- [ ] Basin picker works
- [ ] Key Dates: Bid Due, Delivery, Close
- [ ] Pursuit section: Decision badge (Pursue/No-Bid/Pending), Rationale
- [ ] Close Info (conditional): Close Status badge (Won/Lost/Cancelled), Close Reason
- [ ] Related: Company link, Primary Contact link, Related Opportunity link, Owner
- [ ] QuickActions pre-fill opportunityId AND companyId
- [ ] Activity Timeline loads correctly
- [ ] "Edit" navigates to edit form

### Opportunity Form (`/opportunities/new`)
- [ ] Name (required), Company combobox (required)
- [ ] Primary Contact dropdown: disabled until company selected, filtered by company
- [ ] Company change resets Primary Contact
- [ ] Stage dropdown (default "Lead")
- [ ] Product Line dropdown, Pursuit Decision dropdown
- [ ] Revenue, Probability (0-100), PO Number, Tax Exempt
- [ ] Date pickers: Bid Due, Delivery, Close
- [ ] Close Information section appears when stage=Close or closeStatus set
- [ ] Notes + Pursuit Rationale textareas
- [ ] Submit calls generateId API, saves, navigates to detail
- [ ] Generated ID format: `{COMPANY_CODE}-YYYYMMDD-NNNNN`
- [ ] Cancel navigates to `/opportunities`

### Opportunity Form (`/opportunities/:id/edit`)
- [ ] Opportunity ID displayed (read-only)
- [ ] All fields pre-populated
- [ ] Update saves and navigates to detail

---

## 6. Pipeline (`edg`)

### Pipeline Board (`/pipeline`)
- [ ] 8 stage columns render: Lead through After Action
- [ ] Each column header: Stage badge, count, total revenue
- [ ] Opportunity cards show: ID, Title, Company, Revenue, Product Line
- [ ] Subtitle shows total opportunities and total revenue
- [ ] Product Line filter reduces displayed cards
- [ ] Basin filter reduces displayed cards
- [ ] "Clear Filters" button appears when filters active, resets both
- [ ] "New Opportunity" navigates to `/opportunities/new`
- [ ] Click card navigates to `/opportunities/:id`

### Drag-and-Drop
- [ ] Drag card from one column to another
- [ ] Drop updates opportunity stage via mutation
- [ ] Card appears in new column
- [ ] Refresh page: stage change persists
- [ ] Cannot drag to invalid position (same column = no-op)

---

## 7. Activities (`0iv`)

### Activity List (`/activities`)
- [ ] Shows correct count
- [ ] DataGrid: Date, Subject, Type (colored badge), Company, Contact, Owner, Direction
- [ ] Search by subject filters
- [ ] Activity Type dropdown filters
- [ ] Direction column shows Inbound/Outbound or "—"
- [ ] Click row navigates to `/activities/:id`
- [ ] "Log Activity" navigates to `/activities/new`

### Activity Detail (`/activities/:id`)
- [ ] Header: Subject, formatted date
- [ ] Badges: Type (colored), Direction, "Auto" (if auto-created)
- [ ] Details: Owner, Duration (if present), Source, Created, Modified
- [ ] Description section (if present)
- [ ] Linked Records: Company/Contact/Opportunity links (or "No linked records")
- [ ] "Edit" navigates to edit form
- [ ] "Delete" opens confirm dialog
- [ ] Confirm delete removes activity, navigates to `/activities`

### Activity Form (`/activities/new`)
- [ ] Subject (required), Type dropdown (required, default "Call")
- [ ] Date (required, default now), Direction dropdown
- [ ] Duration field: shown only for Call/Meeting types
- [ ] Owner (required, default current user name)
- [ ] Company combobox (searchable)
- [ ] Contact combobox: disabled until company selected, filtered by company
- [ ] Opportunity combobox: disabled until company selected, filtered by company
- [ ] Company change resets Contact and Opportunity
- [ ] Description textarea

### URL Param Pre-fill
- [ ] `?type=Call` pre-selects type
- [ ] `?type=Meeting` pre-selects type + shows Duration field
- [ ] `?companyId=X` pre-selects company
- [ ] `?contactId=X` pre-selects contact
- [ ] `?opportunityId=X` pre-selects opportunity
- [ ] `?Title=Subject` pre-fills subject (from calendar Log button)
- [ ] Multiple params combined (e.g., from QuickActions)

### Form Actions
- [ ] Submit saves and navigates to detail
- [ ] Cancel navigates to `/activities`
- [ ] Edit mode: all fields pre-populated, save updates

---

## 8. Basin/Regions (`p6x`)

### Basin/Region List (`/basin-regions`)
- [ ] Shows correct count
- [ ] DataGrid: Basin/Region, Code, Description, Status
- [ ] Search by name or code filters
- [ ] Active/Inactive badge
- [ ] Click row navigates to `/basin-regions/:id`
- [ ] "New Basin/Region" navigates to `/basin-regions/new`

### Basin/Region Detail (`/basin-regions/:id`)
- [ ] Header: Name, Code, Active/Inactive badge
- [ ] Basin info: Name, Code, Description
- [ ] CountryPicker: multi-select dropdown showing selected countries
- [ ] Add country creates junction record
- [ ] Remove country deletes junction record
- [ ] Refresh: changes persist
- [ ] "Edit" navigates to edit form
- [ ] "Deactivate" opens confirm dialog, deactivates on confirm

### Basin/Region Form (`/basin-regions/new`)
- [ ] Name (required), Code (required, auto-uppercase, max 6)
- [ ] Description textarea
- [ ] Info message: "Countries can be added from detail page after creation"
- [ ] Submit saves, navigates to detail
- [ ] Cancel navigates to `/basin-regions`

### Basin/Region Form (`/basin-regions/:id/edit`)
- [ ] All fields pre-populated
- [ ] Update saves, navigates to detail

---

## 9. Settings & Email Monitoring (`s5e`)

### Settings Page Display
- [ ] Account card shows "Signed in as {user name}"
- [ ] Email Monitoring card renders
- [ ] Info text explains feature (privacy note about email content not stored)

### Status Check
- [ ] Loading: spinner next to switch
- [ ] Active: "Active" badge (green), switch ON, expiration date shown
- [ ] Off: "Off" badge (gray), switch OFF, no expiration shown
- [ ] Error: red MessageBar "Unable to check monitoring status..."

### Enable Monitoring
- [ ] Click switch (OFF state) opens Enable dialog
- [ ] Dialog title: "Enable Email Monitoring?"
- [ ] Dialog explains: only CRM contacts tracked, body not stored, can disable anytime
- [ ] Cancel closes dialog, switch stays OFF, no API call
- [ ] "Enable Monitoring" button calls `POST /api/subscriptions`
- [ ] "Enabling..." state in button
- [ ] Success: dialog closes, switch ON, "Active" badge, expiration shown
- [ ] Error: dialog closes, error MessageBar shown, switch stays OFF

### Disable Monitoring
- [ ] Click switch (ON state) opens Disable dialog
- [ ] Dialog warns about stopping auto-logging
- [ ] Cancel closes dialog, switch stays ON
- [ ] "Disable Monitoring" calls `DELETE /api/subscriptions/user/{userId}`
- [ ] "Disabling..." state in button
- [ ] Success: dialog closes, switch OFF, "Off" badge
- [ ] 404 (no subscription found) treated as success (switch goes OFF)

### Daemon API Integration
- [ ] `GET /api/subscriptions/status/{userId}` returns correct monitoring state
- [ ] `POST /api/subscriptions` with user's Entra GUID creates subscription
- [ ] `DELETE /api/subscriptions/user/{userId}` removes subscription
- [ ] CORS allows requests from SWA origin

---

## 10. Edge Cases & Error Handling (`12n`)

### Empty States
- [ ] No companies: empty state with "New Company" link
- [ ] No contacts: empty state with "New Contact" link
- [ ] No opportunities: empty state with "New Opportunity" link
- [ ] No activities: empty state with "Log Activity" link
- [ ] No basin/regions: empty state with "New Basin/Region" link
- [ ] No search results: "No {entity} found" message
- [ ] No filtered results: empty grid with filter active
- [ ] No linked records on activity detail: "No linked records" text

### Form Validation
- [ ] Submit without required fields shows inline errors
- [ ] Fill required field clears its error
- [ ] Company Code auto-uppercases and enforces max length 6
- [ ] Basin Code auto-uppercases and enforces max length 6
- [ ] Probability validates 0-100 range
- [ ] Email field validates email format
- [ ] Cancel doesn't save partial data

### Error Handling
- [ ] Network error on list page: error message + "Retry" button
- [ ] Network error on detail page: error message + "Retry"
- [ ] Network error on form submit: error banner, form stays editable
- [ ] 404 on detail page: "Not found" message
- [ ] Retry button successfully refetches data

### Lookup Resolution
- [ ] Company names resolve from lookup IDs on opportunity/contact/activity
- [ ] Contact names resolve from lookup IDs on activity
- [ ] Country names resolve from lookup IDs on company
- [ ] Basin names resolve from lookup IDs on company/contact/opportunity
- [ ] Orphaned lookups (deleted parent) handled gracefully (show ID or "Unknown")

### Data Integrity
- [ ] Create company then create contact linked to it: lookup resolves
- [ ] Create opportunity with company + contact: both lookups resolve
- [ ] Deactivate company: company still shows in existing opportunities
- [ ] Basin junction records: add 3, remove 1, verify 2 remain
- [ ] Activity auto-creation (email send): creates with correct links

### Concurrent Operations
- [ ] Rapid filter changes don't cause stale data display
- [ ] Multiple quick navigation doesn't cause render errors
- [ ] Generate ID under concurrent load returns unique IDs

---

## Integration Test Scenarios

### Scenario A: Full CRM Workflow
1. Create new company (Name: "E2E Test Corp", Code: "E2ET")
2. Add basin "Permian" to company via picker
3. Create contact linked to company (Email: known test email)
4. Create opportunity linked to company + contact
5. Verify generated Opportunity ID format
6. Log a Call activity from opportunity QuickActions
7. Verify activity appears in opportunity timeline
8. Verify activity appears in company timeline
9. Change opportunity stage via pipeline drag-drop
10. Verify stage change reflects on opportunity detail

### Scenario B: Email Integration
1. Navigate to Settings, enable email monitoring
2. Verify subscription created (Active badge, expiration shown)
3. Send test email to/from a CRM contact
4. Wait for webhook processing (~30 seconds)
5. Check Activities list for auto-created email activity
6. Verify activity has correct type=Email, direction, contact link, company link
7. Navigate to contact detail, verify email appears in EmailPanel
8. Compose reply from EmailPanel
9. Verify sent email activity auto-created
10. Disable monitoring from Settings
11. Verify subscription removed (Off badge)

### Scenario C: Calendar to Activity
1. Ensure test calendar has a meeting with a CRM contact attendee
2. Navigate to Dashboard
3. Calendar widget shows the meeting
4. CRM contact badge highlighted on the event
5. Click "Log" button
6. Verify ActivityForm pre-fills subject, type=Meeting
7. Complete and save activity
8. Verify activity linked correctly

---

## API Endpoint Tests

### SWA API — `/api/health`
- [ ] GET returns 200 with `{ status: "ok" }`

### SWA API — `/api/generate-id`
- [ ] POST with `{ entityType, companyCode }` returns generated ID
- [ ] Sequential calls return incrementing counter
- [ ] Different company codes get independent counters
- [ ] Missing body returns 400
- [ ] Missing entityType or companyCode returns 400

### Daemon API — `/api/health`
- [ ] GET returns 200 with `{ status: "ok", service: "tss-daemon-func" }`

### Daemon API — `/api/subscriptions`
- [ ] POST with userId creates subscription (201)
- [ ] GET lists all active subscriptions (200)
- [ ] Missing userId returns 400

### Daemon API — `/api/subscriptions/status/{userId}`
- [ ] Returns `{ monitoring: true, subscriptionId, expirationDateTime }` when active
- [ ] Returns `{ monitoring: false }` when no subscription

### Daemon API — `/api/subscriptions/user/{userId}`
- [ ] DELETE removes user's subscription (204)
- [ ] Returns 404 if no subscription exists

### Daemon API — `/api/email-webhook`
- [ ] Validation handshake: echoes `validationToken` as text/plain
- [ ] Valid notification with CRM contact match creates activity
- [ ] Valid notification with no match skips silently
- [ ] Duplicate messageId skips (deduplication)
- [ ] Invalid clientState rejects notification

### Daemon API — Renewal Timer
- [ ] Subscriptions nearing expiration (<24h) are renewed
- [ ] Expired subscriptions are recreated
- [ ] Healthy subscriptions are left untouched

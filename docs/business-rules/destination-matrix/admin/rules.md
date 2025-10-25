# Destination Matrix Module - Admin Rules

## Access Control & Permissions

### What Admins Can Do
- [x] View destination matrix for all events with all available resources across all categories
- [x] Access destination matrix via event listing (similar to callout availability link)
- [x] **Access "Utility Shared Report" list page showing all utilities with shared reports**
- [x] **Navigate from Utility Shared Report list to Destination Matrix by clicking destination name**
- [x] View available resources sorted by ETA (ascending or descending)
- [x] **Default sorting: Team Max ETA (highest ETA within each team displayed first)**
- [x] Filter destination matrix by:
  - Category (DA, WD, LC, VG)
  - Team Lead
  - Job titles
  - Departing location/city/state
  - ETA intervals (0-2 hrs, 2-4 hrs, 4-6 hrs, 6-8 hrs, 8+ hrs)
  - ETA hours (min/max range)
  - Miles (min/max range)
  - Equipment availability (for LC/VG)
  - Geographic region/polygon
- [x] View statistics dashboard showing resource counts by ETA intervals
- [x] View map visualization with:
  - Departing location markers
  - Destination utility marker
  - Routes from each departing location to destination
  - Polygon/region overlay for filtering
- [x] Share availability reports to utility companies via secure token link
- [x] Regenerate utility share tokens (revokes old tokens)
- [x] **Select resources (team/individual/all) for adding to roster**
- [x] **Add selected resources to roster via "Add to Roster" or "View Roster" buttons**
- [x] **Automatically navigate to roster screen with pre-selected resources**
- [x] Export destination matrix reports (CSV, Excel, PDF formats)
- [x] Export utility dashboard reports (CSV, Excel, PDF formats)
- [x] Select specific resources/teams/subcontractors for export
- [x] Customize export columns and format
- [x] View utility dashboard (token-based access for utilities, but admins can preview)

### What Admins Cannot Do
- [ ] Modify resource availability from destination matrix (must go back to Callout module)
- [ ] Delete EventResource entries from destination matrix
- [ ] Manually override ETA calculations (system-calculated only)
- [ ] Access destination matrix for events without any available resources
- [ ] Share matrix to utilities without creating DestinationMatrix record first
- [ ] **Edit or perform actions on resources marked "On a Roster" (locked status)**
- [ ] **Add same resource to roster twice (removed from destination matrix after first add)**

## Core Business Logic & Constraints

### Destination Matrix Creation
**Rules:**
- Destination matrix is accessible via "Destination Matrix" link from event listing
- Only available resources (status = "Available" from Callout module) are displayed
- Matrix requires destination utility with valid address and coordinates
- ETA calculated from each resource's departing location to destination utility location
- Resources without departing location coordinates are excluded or shown without ETA

**Validations:**
- Event must exist and be active
- Destination utility must have valid latitude/longitude coordinates
- At least one resource must have "Available" status to display matrix
- Departing locations must have valid latitude/longitude for ETA calculation

**Process:**
1. Admin accesses event listing
2. Admin clicks "Destination Matrix" link for event
3. System checks if DestinationMatrix record exists for event
4. System fetches all available resources from EventResource (status = "Available")
5. System calculates ETA for each resource based on departing location
6. System displays resources sorted by ETA (default ascending order)

### ETA Calculation Process
**Rules:**
- **Same Location Check**: If departing city/state matches destination city/state:
  - ETA = 2 hours
  - Miles = "< 80"
  - No external API call needed
- **Different Location**: 
  - Check TravelTimeInfo cache for existing calculation with same coordinates
  - If cached: Use cached distance and hours
  - If not cached: Call external mapping API (Google Maps, etc.), cache result
  - Calculate ETA interval bucket based on hours
  - Convert kilometers to miles for display
- **Line Crew (LC) Special Logic**:
  - ETA calculated based on miles driven rather than time
  - Different interval thresholds than DA/WD resources
- **Fallback**: If API fails or coordinates invalid:
  - Resource shown without ETA/miles data
  - Sorted to bottom of listing

**Validations:**
- Departing latitude/longitude must be valid decimal coordinates
- Destination latitude/longitude must be valid decimal coordinates
- External API response must contain distance and duration data
- Cached TravelTimeInfo records must not be stale (optional expiry check)

### Default Sorting and Filtering

**Default Sorting: Team Max ETA**
- Destination Matrix loads with resources sorted by Team Max ETA by default
- **Team Max ETA**: The highest (maximum) ETA value among all resources within each team
- Teams with highest Max ETA displayed first (descending order)
- Within each team, resources sorted by individual ETA (ascending)
- **Example**:
  - Team A: Resources with ETAs 2, 4, 6 hours → Max ETA = 6 hours
  - Team B: Resources with ETAs 3, 5, 8 hours → Max ETA = 8 hours
  - Team C: Resources with ETAs 1, 3, 4 hours → Max ETA = 4 hours
  - **Display Order**: Team B (Max 8) → Team A (Max 6) → Team C (Max 4)

**Filter Options:**
- **Departing Location**: Dropdown or autocomplete with all unique locations
- **ETA Hours**: Slider or min/max input (0-24+ hours)
- **Miles**: Slider or min/max input (0-2000+ miles)
- **Job Titles**: Multi-select dropdown
- **Team Lead**: Dropdown (DA category only)
- **Equipment**: Multi-select for LC/VG (diggers, buckets, special equipment)
- **Region/Polygon**: Draw or select on map

**Filter Behavior:**
- Filters applied in real-time (live filtering)
- Statistics dashboard updates to reflect filtered data
- Map markers update to show only filtered resources
- "X resources match filters" message displayed
- Clear all filters button available

### Resource Grouping Logic

#### DA Resources
**Rules:**
- Group by Team Lead
- Each group shows:
  - Team Lead name (or "Unassigned Resources" if no Team Lead)
  - Team Lead color code
  - List of all resources under that Team Lead with their individual ETAs
- Within each group, resources sorted by ETA (ascending by default)
- Each resource displays:
  - Name, phone, email
  - Job titles
  - Departing location (city, state, address)
  - ETA hours
  - Miles
  - Additional details (driver/assessor flags)

**Endpoints:**
- `GET /api/v1/matrix/get-fte-matrix-info/:id?categoryId=1` - DA matrix listing
- `POST /api/v1/matrix/get-fte-teamlead-listing-matrix-info` - DA Team Lead groups
- `POST /api/v1/matrix/get-fte-teamlead-group-listing-matrix-info` - Specific Team Lead group resources

#### WD Resources
**Rules:**
- Group by unique departing locations
- Each group shows:
  - Departing location (city, state, coordinates)
  - Total FTE count at that location
  - ETA from that location to destination
  - Miles
- No individual resource details (WD resources treated as collective FTE)
- Sorted by ETA ascending

**Endpoints:**
- `GET /api/v1/matrix/get-fte-matrix-info/:id?categoryId=2` - WD matrix listing
- `POST /api/v1/matrix/get-fte-statistic-matrix-info` - WD statistics by ETA intervals

#### LC/VG Subcontractors
**Rules:**
- Group by subcontractor company
- Each subcontractor entry shows:
  - Company name, contact person, phone, email
  - Departing location(s) - can have multiple entries with different locations
  - FTE count, digger count, bucket count, special equipment counts
  - ETA hours, miles for each departing location entry
- If multiple departing locations: Show separate entries for each location with respective ETAs
- Sorted by ETA ascending (lowest ETA among multiple locations)

**Endpoints:**
- `POST /api/v1/matrix/get-subcontractor-matrix-info/:id` - LC/VG matrix listing
- `POST /api/v1/matrix/get-subcontractor-statistic-matrix-info/:id` - LC/VG statistics

### Statistics Dashboard
**Rules:**
- Display resource counts bucketed into ETA intervals:
  - 0-2 hours
  - 2-4 hours
  - 4-6 hours
  - 6-8 hours
  - 8+ hours
- For DA resources:
  - Total available FTE count per interval
  - Total driver count, total assessor count
  - Max ETA value
- For WD resources:
  - Total available FTE count per interval
  - Group by unique departing locations
- For LC/VG subcontractors:
  - Total subcontractor count
  - Total FTE, total diggers, total buckets, total special equipment per interval
  - List of unique equipment types with counts

**Calculations:**
- ETA interval determined by `getETAInterval(hours)` service method
- DA/WD: Interval based on hours
- LC: Interval based on miles (different thresholds)
- Resources without ETA shown in "Unknown" or excluded from statistics

### Map Visualization
**Rules:**
- Display Google Maps (or similar) with:
  - Destination marker (red pin at utility location)
  - Departing location markers (blue pins at each unique departing location)
  - Routes drawn from each departing location to destination
  - Polygon/region overlay if region filter applied
- Clicking departing location marker shows resource details tooltip
- Routes color-coded or styled by ETA interval (optional enhancement)
- If all resources departing from same location as destination: Don't draw routes
- Regional filtering: Only show markers for resources within selected polygon

**Endpoints:**
- `POST /api/v1/matrix/get-subcontractor-matrix-map-info/:id` - LC/VG map data
- `POST /api/v1/matrix/get-fte-matrix-wd-map-info` - WD map data
- `POST /api/v1/matrix/get-fte-matrix-da-map-info` - DA map data

**Validations:**
- Map bounds must encompass all departing locations and destination
- Polygon coordinates must be valid GeoJSON format
- Point-in-polygon calculation for regional filtering

## Key Workflows & Processes

### Workflow: Accessing Destination Matrix
**Steps:**
1. Admin views event listing
2. Admin identifies event with available resources
3. Admin clicks "Destination Matrix" link (or similar action)
4. System verifies event exists and has destination utility configured
5. System fetches all EventResource records with status = "Available"
6. System calculates ETA for each resource:
   - Check if same city/state as destination → ETA = 2 hrs, Miles = "< 80"
   - Else: Check TravelTimeInfo cache
   - If not cached: Call external mapping API, cache result
   - Calculate ETA interval bucket
7. System groups resources by category type (DA, WD, LC, VG)
8. System sorts resources by ETA ascending
9. Display destination matrix with filters and statistics dashboard

### Workflow: Filtering Destination Matrix
**Steps:**
1. Admin views destination matrix
2. Admin applies filters:
   - **Category**: Select DA, WD, LC, or VG
   - **Team Lead**: Select specific Team Lead (DA only)
   - **Job Titles**: Select specific job titles to include
   - **Departing Location**: Filter by city, state, or specific location
   - **ETA Interval**: Select one or more ETA buckets (0-2 hrs, 2-4 hrs, etc.)
   - **Equipment**: Filter LC/VG by equipment availability
   - **Region/Polygon**: Draw or select polygon on map to filter by geographic area
3. System applies filters to available resource set
4. System recalculates statistics based on filtered data
5. Display filtered results with updated counts

### Workflow: Sharing Availability to Utility
**Steps:**
1. Admin views destination matrix with available resources
2. Admin verifies resource data and ETAs are correct
3. Admin clicks "Share Availability to Utility" button
4. System checks if UtilityShareToken exists for this event:
   - If exists: Option to reuse existing token or regenerate new token
   - If not exists: Generate new secure token
5. Admin confirms utility contact details
6. System generates utility dashboard URL with token: `https://{domain}/utility-dashboard?token={token}`
7. System sends email/SMS to utility with dashboard link
8. Utility accesses dashboard via token link (no authentication required)
9. Communication log records utility share action with timestamp

**Token Generation Rules:**
- Token must be cryptographically secure (UUID or JWT)
- Token is event-specific and tied to DestinationMatrix record
- Token expiry: Optional (e.g., valid for 30 days or until event ends)
- Token can be regenerated to revoke old access

### Workflow: Regenerating Utility Share Token
**Steps:**
1. Admin accesses destination matrix
2. Admin clicks "Regenerate Token" or "Share Availability" again
3. System displays confirmation: "This will revoke the previous token. Continue?"
4. Admin confirms
5. System:
   - Invalidates old token (mark as revoked or delete)
   - Generates new secure token
   - Creates new UtilityShareToken record
6. System provides new dashboard URL
7. Admin sends new URL to utility (old URL no longer works)

### Workflow: Exporting Destination Matrix Report
**Steps:**
1. Admin views destination matrix
2. Admin applies desired filters (optional)
3. Admin selects resources/teams/subcontractors to export (or "Export All")
4. Admin clicks "Export" button
5. Admin selects export format: CSV, Excel, or PDF
6. Admin customizes columns to include (optional):
   - Resource name, phone, email
   - Job titles
   - Departing location
   - ETA hours, miles
   - Equipment details (for LC/VG)
   - Team Lead (for DA)
7. Admin clicks "Download"
8. System:
   - Fetches filtered data
   - Formats data according to selected format
   - Generates file
   - If PDF: Upload to S3, return signed URL
   - If CSV/Excel: Stream file directly
9. Browser downloads report file
10. Admin shares report with stakeholders

**Export File Naming:**
- Format: `Destination-Matrix_{EventName}_{CategoryName}_{YYYY-MM-DD}.{format}`
- Example: `Destination-Matrix_Hurricane Ian_Damage Assessors_2025-10-07.pdf`

### Workflow: Utility Dashboard Access (External)
**Steps:**
1. Utility receives email/SMS with dashboard link
2. Utility clicks link: `https://{domain}/utility-dashboard?token={token}`
3. System validates token:
   - Token exists and not revoked
   - Event not ended
   - Token not expired (if expiry configured)
4. System displays utility dashboard with:
   - Event details (name, date, destination utility)
   - Statistics dashboard (resource counts by ETA intervals)
   - Resource listing (filtered, sorted by ETA)
   - Map view with departing locations and routes
   - Export functionality (CSV, Excel, PDF)
5. Utility can:
   - View all available resources
   - Apply filters
   - View map visualization
   - Export reports for internal use
6. System logs dashboard access (optional analytics)

**Token Validation Endpoint:**
- `GET /api/v1/matrix/utility-share-token-verification?token={token}`

### Workflow: Accessing Utility Shared Report List
**Steps:**
1. Admin navigates to Callout module and shares availability to one or more utilities
2. Admin clicks "Utility Shared Report" button (visible in event listing or callout page)
3. System navigates to Utility Shared Report List page
4. System fetches all utilities that have been shared reports for this event
5. Display list showing:
   - Utility company name
   - Destination name (clickable link)
   - Date/time shared
   - Communication logs (email/SMS sent, token generated)
   - Share status (active, revoked, expired)
   - Actions: Regenerate token, Revoke access, View dashboard
6. Admin can:
   - View communication history per utility
   - Click destination name to access Destination Matrix
   - Regenerate tokens
   - Revoke access
   - Preview utility dashboard

**Note:** This page serves as navigation hub between Callout and Destination Matrix.

### Workflow: Navigating from Utility List to Destination Matrix
**Steps:**
1. Admin views Utility Shared Report List page
2. Admin identifies utility/destination to view
3. Admin clicks on destination name (e.g., "Chicago, Illinois")
4. System validates:
   - DestinationMatrix record exists for this event and destination
   - Event is active
   - Admin has access to event
5. System navigates to Destination Matrix page with parameters:
   - `eventId={eventId}`
   - `destinationId={destinationId}` or `matrixId={matrixId}`
   - `utilityId={utilityId}` (optional, for filtering)
6. Destination Matrix loads with:
   - Available resources for this specific destination
   - Default sorting: Team Max ETA
   - All filtering options available
   - Map showing routes to this destination
7. Admin can proceed with filtering, viewing, or adding to roster

**URL Pattern:**
- From Utility List: `/utility-shared-reports/{eventId}`
- To Destination Matrix: `/destination-matrix/{matrixId}?eventId={eventId}`

### Workflow: Adding Resources to Roster from Destination Matrix
**Steps:**
1. Admin views Destination Matrix with available resources
2. Admin applies filters (optional): departing location, ETA hours, miles, job titles
3. Admin selects resources:
   - **Option A**: Check individual resource checkboxes
   - **Option B**: Check team-level checkbox (selects all in team)
   - **Option C**: Click "Select All" button (selects all visible filtered resources)
4. System highlights selected resources (X resources selected)
5. Admin clicks "Add to Roster" or "View Roster" button
6. System validates:
   - At least one resource selected
   - Selected resources have status "Available" (not already "On a Roster")
   - Resources belong to valid category and team
7. System performs transaction:
   - Update EventResource status: "Available" → "On a Roster"
   - Create RosterEntry records for selected resources (or prepare for roster creation)
   - Log action: "Resources added to roster from Destination Matrix"
   - Trigger SSE update to Callout module
8. System navigates to Roster screen with:
   - Pre-selected resources passed as query params or session state
   - Roster creation form open (if new roster)
   - OR existing roster with resources added (if adding to existing roster)
9. Destination Matrix updates:
   - Selected resources removed from available listing
   - Resource count updated
   - Statistics dashboard refreshed
10. Callout module updates (via SSE or background job):
    - EventResource status changed to "On a Roster"
    - Resource row marked with "On a Roster" badge
    - Inline edit disabled for these resources
    - Bulk actions disabled for these resources

**Important Notes:**
- Once resource status is "On a Roster", it cannot be edited or acted upon in Callout
- Resource removed from Destination Matrix (no longer available for other rosters)
- To remove resource from roster and make available again, must go to Roster module and remove resource
- When resource removed from roster, status reverts to "Available" and reappears in Destination Matrix

**Validation Rules:**
- Cannot add resource to roster if already "On a Roster"
- Cannot add resource to roster if status changed to "Not Available" after initial "Available"
- Must have at least one resource selected
- Admin must have permission to create/edit rosters

**API Endpoints:**
- `POST /api/v1/roster/add-from-destination-matrix` - Add selected resources to roster
- `PUT /api/v1/events/:eventId/callout/bulk-update-status` - Update status to "On a Roster"

### Workflow: Removing Resources from Roster (Return to Destination Matrix)
**Steps:**
1. Admin navigates to Roster module
2. Admin removes resource from roster (delete or unassign action)
3. System performs transaction:
   - Remove RosterEntry record
   - Update EventResource status: "On a Roster" → "Available"
   - Log action: "Resource removed from roster, returned to available"
   - Trigger SSE update to Destination Matrix and Callout
4. Destination Matrix updates:
   - Resource reappears in available listing
   - Resource count updated
   - Statistics refreshed
5. Callout module updates:
   - EventResource status changed back to "Available"
   - Inline edit re-enabled
   - Bulk actions re-enabled

**Note:** This workflow completes the round-trip: Callout → Destination Matrix → Roster → back to Destination Matrix/Callout.

## Data Relationships & Dependencies

### Primary Entities
- **Event**: Parent event entity
- **DestinationMatrix**: Matrix record with destination utility coordinates
- **EventResource**: Available resources (status = "Available" from Callout)
- **ResourceDetails**: Departing location, equipment details
- **TravelTimeInfo**: Cached ETA calculations
- **UtilityShareToken**: Secure tokens for utility dashboard access

### Related Entities
- **Resource**: Base resource from Resource module
- **Category**: Resource categorization (DA, WD, LC, VG)
- **Utility**: Destination utility company
- **User**: Team Leads for DA resource grouping

### Dependencies
- **Callout module**: Source of available resources (EventResource with status = "Available")
- **Event module**: Parent event and destination utility configuration
- **External Mapping API**: Google Maps or similar for distance/time calculations
- **TravelTimeInfo cache**: Reduces redundant API calls
- **S3/AWS**: PDF report storage and signed URL generation
- **Email/SMS service**: Sending utility dashboard links
- **SSE service**: Real-time updates when availability changes (optional)

## Validation Rules

### Input Validations
| Field | Rule | Error Message |
|-------|------|---------------|
| `matrixId` | Must be valid integer > 0 | "Invalid matrix ID" |
| `eventId` | Must be valid integer > 0 | "Invalid event ID" |
| `categoryId` | Must be 1 (DA), 2 (WD), 3 (LC), or 4 (VG) | "Invalid category ID" |
| `destinationLatitude` | Must be valid decimal (-90 to 90) | "Invalid destination latitude" |
| `destinationLongitude` | Must be valid decimal (-180 to 180) | "Invalid destination longitude" |
| `departLatitude` | Must be valid decimal (-90 to 90) | "Invalid departing latitude" |
| `departLongitude` | Must be valid decimal (-180 to 180) | "Invalid departing longitude" |
| `orderBy` | Must be "asc" or "desc" | "Invalid order by value" |
| `format` | Must be "csv", "excel", or "pdf" | "Invalid export format" |
| `filterData` | Must be valid JSON object | "Invalid filter data" |
| `regionCoordinates` | Must be valid polygon GeoJSON | "Invalid region coordinates" |
| `token` | Must be valid UUID or JWT format | "Invalid token format" |

### Business Rule Validations
| Rule | Condition | Action |
|------|-----------|--------|
| Available resources only | EventResource status != "Available" | Exclude from destination matrix |
| **On a Roster exclusion** | **EventResource status == "On a Roster"** | **Exclude from destination matrix, show in roster instead** |
| Valid departing location | departLatitude or departLongitude is null/invalid | Exclude resource or show without ETA |
| Valid destination | destinationLatitude or destinationLongitude is null/invalid | Return error "Destination coordinates required" |
| ETA calculation failure | External API fails or times out | Show resource without ETA, log error |
| Same location optimization | departCity == destinationCity && departState == destinationState | ETA = 2 hrs, Miles = "< 80", skip API call |
| Token expiry | Token creation date > configured expiry days | Return error "Token expired, request new link" |
| Token revocation | Token marked as revoked | Return error "Token revoked, request new link" |
| Event ended | Event end date < current date | Return warning "Event has ended" but still allow access |
| Region filtering | Departing location outside polygon | Exclude from filtered results |
| Export selection | No resources selected and not "Export All" | Return error "No resources selected for export" |
| **Add to roster validation** | **No resources selected or all selected already "On a Roster"** | **Return error "Please select available resources to add to roster"** |
| **Duplicate roster add** | **Attempting to add resource with status "On a Roster"** | **Return error "Resource already on a roster. Remove from existing roster first."** |

## Special Cases & Edge Cases

### Resources Without Departing Location
**Scenario:**
Resource marked as "Available" in Callout but no departing location provided (coordinates missing).

**Rules:**
- Exclude resource from destination matrix listing (cannot calculate ETA)
- OR: Show resource at bottom of listing with "ETA: Unknown" and "Miles: Unknown"
- Log warning for admin to review and update departing location in Callout module
- Statistics dashboard excludes resources without ETA

### Same Location as Destination
**Scenario:**
Resource departing from same city/state as destination utility.

**Rules:**
- Skip external mapping API call
- Set ETA = 2 hours (default assumption)
- Set Miles = "< 80" (within local area)
- Grouped into 0-2 hours ETA interval
- If regionId provided: Still check if departing coordinates are inside polygon

### External Mapping API Failure
**Scenario:**
External mapping API (Google Maps, etc.) fails, times out, or returns error.

**Rules:**
- Check TravelTimeInfo cache first (may have old cached data)
- If no cache: Show resource without ETA/miles data
- Log error for admin review
- Optionally: Queue for retry via background job
- Resource sorted to bottom of listing (no ETA = lowest priority)

### Token Regeneration with Active Utility Access
**Scenario:**
Admin regenerates token while utility is actively viewing dashboard with old token.

**Rules:**
- Old token immediately invalidated
- Utility's current session continues until page refresh
- On next request or page refresh: Old token returns "Token revoked" error
- Utility must request new link from admin
- Communication log tracks token regeneration and reason (optional)

### LC/VG Multiple Departing Locations
**Scenario:**
Subcontractor provides multiple departing locations (e.g., equipment at different yards).

**Rules:**
- Calculate ETA for each departing location separately
- Show subcontractor multiple times in listing (one entry per departing location)
- OR: Show single entry with multiple location rows, each with its own ETA
- Sorting: Use lowest ETA among all locations for that subcontractor
- Statistics: Count subcontractor only once, but sum all FTE/equipment from all locations
- Export: Include all departing location entries

### Regional/Polygon Filtering Edge Cases
**Scenario:**
Admin selects polygon region but some resources have coordinates exactly on polygon boundary.

**Rules:**
- Use point-in-polygon algorithm (ray casting or winding number)
- Boundary points: Include if on or inside polygon (inclusive check)
- If polygon is malformed or has < 3 points: Ignore filter, show all resources
- If no resources inside polygon after filtering: Display message "No resources found in selected region"

### Event End Date Handling
**Scenario:**
Event ended but utility still has active dashboard token.

**Rules:**
- Allow dashboard access even after event ended (historical data)
- Display banner/warning: "This event has ended"
- Matrix data remains accessible in read-only mode
- Admin can optionally revoke token manually if needed

### ETA Calculation for Line Crew (LC)
**Scenario:**
Line crew ETA calculated differently than DA/WD (based on miles rather than time).

**Rules:**
- LC resources: Calculate miles first, then determine ETA interval based on mile thresholds
- Different interval logic: `getETAIntervalForLineCrew(miles)` instead of `getETAInterval(hours)`
- Example thresholds (configurable):
  - 0-100 miles: 0-2 hrs interval
  - 100-200 miles: 2-4 hrs interval
  - 200-300 miles: 4-6 hrs interval
  - 300+ miles: 6-8+ hrs intervals
- VG resources: May use same logic as LC or standard logic (clarify with business)

### Cached TravelTimeInfo Staleness
**Scenario:**
Cached ETA calculation is outdated due to road closures, traffic changes, etc.

**Rules:**
- Optional: Implement cache expiry (e.g., 7 days)
- Check cache timestamp: If older than expiry, recalculate and update cache
- Admin can optionally trigger "Recalculate All ETAs" action to refresh cache
- Background job: Periodically refresh TravelTimeInfo for active events

### Resources Marked "On a Roster"
**Scenario:**
Admin adds resources to roster from Destination Matrix. Resources now have status "On a Roster".

**Rules:**
- Resources with status "On a Roster" are removed from Destination Matrix listing
- These resources no longer appear in available count or statistics
- In Callout module: Resources displayed with "On a Roster" badge/status
- In Callout module: Inline edit disabled for "On a Roster" resources
- In Callout module: Bulk actions (send request, change status, move category) disabled
- Admin cannot re-add "On a Roster" resource to another roster from Destination Matrix
- To make resource available again: Must remove from roster in Roster module
- Status transition: "On a Roster" → "Available" only via roster removal

**Database Status:**
- EventResource.status field values:
  - "Not Sent" (initial)
  - "Pending" (request sent)
  - "Available" (can be in Destination Matrix)
  - "Not Available" (declined)
  - **"On a Roster"** (added to roster, locked)

**UI Indicators:**
- Callout: Badge or label "On a Roster" with roster link (optional)
- Callout: Grayed out row with disabled actions
- Destination Matrix: Resource completely removed (not shown with disabled state)
- Roster: Resource shown in roster with ability to remove

### Adding Same Resource to Multiple Rosters
**Scenario:**
Admin tries to add resource that's already on a roster to another roster.

**Rules:**
- System prevents adding resource with status "On a Roster" to another roster
- Validation error: "Resource already assigned to a roster. Remove from existing roster first."
- Admin must go to Roster module, remove resource, then return to Destination Matrix
- Once removed from roster, resource status reverts to "Available"
- Resource reappears in Destination Matrix and can be added to new roster

### Filtering After Resources Added to Roster
**Scenario:**
Admin filters Destination Matrix, selects resources, adds to roster. Then applies different filters.

**Rules:**
- After adding resources to roster, those resources immediately removed from listing
- If admin changes filters, removed resources don't reappear (status changed to "On a Roster")
- Resource count and statistics update to exclude "On a Roster" resources
- If all visible resources added to roster, display message: "All available resources have been added to rosters"

### Utility Shared Report List with No Destinations
**Scenario:**
Admin clicks "Utility Shared Report" but no utilities have been shared reports yet.

**Rules:**
- Display empty state message: "No availability reports have been shared yet"
- Provide button: "Back to Callout" or "Share Availability Report"
- Optionally show instructions for sharing reports

## API Endpoints

### Endpoints Available to Admin

#### FTE (DA/WD) Endpoints
- `GET /api/v1/matrix/get-fte-matrix-info/:id?categoryId={categoryId}` - Get FTE matrix listing
- `POST /api/v1/matrix/get-fte-teamlead-listing-matrix-info` - Get DA Team Lead groups listing
- `POST /api/v1/matrix/get-fte-teamlead-group-listing-matrix-info` - Get specific Team Lead group resources
- `GET /api/v1/matrix/get-fte-filter-info/:id?categoryId={categoryId}&isDashboard={bool}` - Get filter options (Team Leads, job titles, locations)
- `POST /api/v1/matrix/get-fte-statistic-matrix-info` - Get FTE statistics by ETA intervals
- `POST /api/v1/matrix/get-fte-matrix-wd-map-info` - Get WD map visualization data
- `POST /api/v1/matrix/get-fte-matrix-da-map-info` - Get DA map visualization data
- `POST /api/v1/matrix/export-fte-destination-matrix` - Export FTE destination matrix report

#### Subcontractor (LC/VG) Endpoints
- `POST /api/v1/matrix/get-subcontractor-matrix-info/:id` - Get subcontractor matrix listing
- `POST /api/v1/matrix/get-subcontractor-matrix-map-info/:id` - Get subcontractor map visualization data
- `POST /api/v1/matrix/get-subcontractor-statistic-matrix-info/:id` - Get subcontractor statistics
- `POST /api/v1/matrix/export-subcontractor-destination-matrix` - Export subcontractor destination matrix report

#### Utility Dashboard Endpoints (Token-Based)
- `GET /api/v1/matrix/utility-share-token-verification?token={token}` - Verify utility share token
- `POST /api/v1/matrix/dashboard-get-fte-matrix-info` - Get FTE matrix for utility dashboard
- `POST /api/v1/matrix/dashboard-get-fte-statistic-matrix-info` - Get FTE statistics for utility dashboard
- `POST /api/v1/matrix/dashboard-get-subcontractor-matrix-info/:id` - Get subcontractor matrix for utility dashboard
- `POST /api/v1/matrix/dashboard-get-subcontractor-statistic-matrix-info/:id` - Get subcontractor statistics for utility dashboard
- `POST /api/v1/matrix/export-fte-dashboard-destination-matrix` - Export FTE dashboard report
- `POST /api/v1/matrix/export-subcontractor-dashboard-destination-matrix` - Export subcontractor dashboard report

#### Utility Shared Report List Endpoints
- `GET /api/v1/events/:eventId/utility-shared-reports` - Get list of all utilities with shared reports for event
- `GET /api/v1/events/:eventId/utility-shared-reports/:utilityId` - Get specific utility shared report details
- `POST /api/v1/events/:eventId/utility-shared-reports/:utilityId/regenerate-token` - Regenerate token for utility
- `DELETE /api/v1/events/:eventId/utility-shared-reports/:utilityId/revoke-access` - Revoke utility access

#### Roster Integration Endpoints
- `POST /api/v1/roster/add-from-destination-matrix` - Add selected resources from destination matrix to roster
  - **Request Body**: `{ eventId, matrixId, categoryId, resourceIds: [], teamLeadIds: [], addAll: boolean }`
  - **Response**: `{ rosterId, addedResourceCount, redirectUrl }`
- `PUT /api/v1/events/:eventId/callout/bulk-update-status` - Update resource status to "On a Roster"
  - **Request Body**: `{ resourceIds: [], status: "On a Roster" }`
- `PUT /api/v1/roster/:rosterId/remove-resource/:resourceId` - Remove resource from roster (returns to "Available")
- `GET /api/v1/events/:eventId/destination-matrix/available-resources` - Get available resources (excludes "On a Roster")

### Permission Requirements
All admin endpoints require:
```typescript
auth()
verifyAccess([{ module: Modules.Callout, action: Actions.ShareAvailabilityReport }])
validateCategoryAccess.validateCategoryAccess(Modules.Callout)
```

**Note:** Destination Matrix uses Callout module permissions (no separate Matrix module enum). The `ShareAvailabilityReport` action covers both sharing to utilities and viewing destination matrix.

## Notes & Considerations

### Performance Optimization
- **TravelTimeInfo Caching**: Critical for performance; avoid redundant API calls for same coordinates
- **Bulk ETA Calculations**: When displaying matrix with hundreds of resources, calculate ETAs in parallel or batch
- **Map Rendering**: Limit number of route lines drawn simultaneously; use clustering for many departing locations
- **Export Large Datasets**: Queue export jobs via PgBoss for large resource sets (>500 resources)
- **Indexing**: Ensure database indexes on EventResource (eventId, status), TravelTimeInfo (coordinates)

### External API Integration
- **Rate Limiting**: Respect Google Maps API rate limits; implement retry logic with exponential backoff
- **Cost Management**: Cache aggressively to minimize API calls (each call costs money)
- **Fallback**: If mapping API unavailable, display resources without ETA but don't fail entire matrix
- **Alternative Providers**: Support multiple mapping providers (Google Maps, Mapbox, OpenStreetMap) via configuration

### Security Considerations
- **Token Security**: Use cryptographically secure tokens (UUID v4 or JWT with signing)
- **Token Expiry**: Implement expiry to limit exposure window
- **Token Revocation**: Provide mechanism for admins to revoke tokens immediately
- **Dashboard Access Logging**: Log all utility dashboard accesses with IP, timestamp for audit trail
- **CORS**: Utility dashboard endpoints may need CORS configuration if hosted on different domain

### Data Consistency
- **Real-time Sync**: When resource availability changes in Callout, destination matrix should reflect immediately via SSE
- **Stale Data**: If EventResource status changes from "Available" to "Not Available", remove from matrix
- **Departing Location Updates**: If departing location updated in Callout, invalidate cached TravelTimeInfo and recalculate

### Export Considerations
- **Column Customization**: Allow admins to select which columns to include in export
- **Sensitive Data**: Ensure exported reports don't include sensitive data if shared externally
- **File Size**: For large exports, use streaming to avoid memory issues
- **PDF Generation**: PDF exports require HTML template rendering; ensure templates are maintainable
- **S3 Upload**: PDF files uploaded to S3 with signed URLs; implement cleanup job for old reports

### Utility Dashboard UX
- **No Authentication Required**: Dashboard accessible via token only (no login)
- **Read-Only**: Utility cannot modify data, only view and export
- **Responsive Design**: Dashboard should work on mobile devices for field access
- **Refresh Data**: Provide button to refresh data if availability updates during event
- **Branding**: Optionally customize dashboard branding per utility or tenant

### Resource Status Management
- **Critical**: Maintain accurate resource status transitions to prevent data inconsistencies
- **Status Flow**: "Available" → "On a Roster" → "Available" (via roster removal)
- **Real-time Sync**: Use SSE to update Callout, Destination Matrix, and Roster modules simultaneously
- **Transaction Safety**: Wrap status changes and roster additions in database transactions
- **Audit Trail**: Log all status changes with timestamps, user, and reason

### Utility Shared Report List
- **Navigation Hub**: This page is the central point for accessing Destination Matrix
- **Communication Logs**: Maintain complete history of all shares, regenerations, revocations
- **Multiple Utilities**: Event can have multiple utilities, each with separate destination matrix
- **Token Management**: Easy access to regenerate or revoke tokens per utility

### Adding to Roster Integration
- **Seamless UX**: Resource selection → Add to Roster → Auto-navigate to Roster screen
- **Pre-selection**: Selected resources passed to Roster module via query params or session
- **Immediate Removal**: Resources removed from Destination Matrix instantly (no delay)
- **Roster Link**: Callout module should show roster link for "On a Roster" resources (optional)

### Default Sorting Rationale
- **Team Max ETA**: Helps identify teams with longest travel times first
- **Priority Planning**: Teams with highest Max ETA may need earlier notification or deployment
- **Operational Need**: Utilities want to know which teams take longest to arrive
- **Alternative Sorting**: Allow admin to toggle between Max ETA and Average ETA sorting

### Future Enhancements
- **Weather Integration**: Overlay weather data on map to show conditions affecting ETAs
- **Traffic Data**: Integrate real-time traffic to provide dynamic ETA updates
- **Resource Availability**: Allow utilities to "request" specific resources (notify admin via notification)
- **Historical Analysis**: Track historical ETA accuracy for improving estimates
- **Route Optimization**: Suggest optimal resource deployment order based on ETAs
- **Roster Preview**: Show roster assignment preview before confirming "Add to Roster"
- **Batch Roster Creation**: Create multiple rosters from Destination Matrix in one action
- **Resource Recommendations**: AI-suggested resource combinations based on ETA and skills


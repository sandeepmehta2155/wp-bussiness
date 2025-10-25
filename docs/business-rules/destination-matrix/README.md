# Destination Matrix Module - Business Rules

## Module Overview

The Destination Matrix Module displays available resources from callout responses with calculated ETAs (Estimated Time of Arrival) and manages sharing of availability reports with utility companies. It serves as the bridge between the Callout Module (resource availability collection) and Roster Module (resource scheduling/deployment).

## Key Concepts

- **Destination Matrix**: A sorted listing of available resources grouped by departing location with calculated ETA based on distance to destination utility
- **ETA Calculation**: Distance and time calculations from resource departing location to event destination utility using external mapping services
- **Utility Dashboard**: External-facing dashboard where availability reports are shared with utility companies via secure token links
- **Resource Grouping**: 
  - **DA Resources**: Grouped by Team Lead with individual resource listings showing ETA, departing location, job titles
  - **WD Resources**: Grouped by departing location showing unique locations with ETA intervals
  - **LC/VG Subcontractors**: Grouped by subcontractor company with departing locations, FTE counts, equipment details, and ETA
- **ETA Intervals**: Resources categorized into time buckets (0-2 hrs, 2-4 hrs, 4-6 hrs, 6-8 hrs, 8+ hrs) for quick analysis
- **Map Integration**: Visual representation of departing locations, routes to destination, and polygon/region filtering

## Cross-Role Rules

### General Constraints
- Only resources with "Available" status from Callout module appear in destination matrix
- ETA calculations require valid departing locations with latitude/longitude coordinates
- Destination matrix data is read-only; availability changes must be made in Callout module
- Utility dashboard access requires secure token generated from share availability action
- Dashboard tokens are event-specific and can be revoked or regenerated
- Regional/polygon filtering allows focusing on resources within specific geographic boundaries
- Export functionality supports CSV, Excel, and PDF formats for both internal destination matrix and utility dashboard

### Data Model

**Primary Entities:**
- **DestinationMatrix**: Matrix record linking event to destination utility with coordinates
- **EventResource**: Available resources from Callout module (status = "Available")
- **ResourceDetails**: Departing location, equipment details from callout responses
- **UtilityShareToken**: Secure tokens for utility dashboard access
- **TravelTimeInfo**: Cached distance/time calculations to avoid redundant API calls

**Key Relationships:**
- Event → DestinationMatrix (1:1 or 1:many if multiple utilities)
- DestinationMatrix → EventResource (via eventId, filtered by status = "Available")
- EventResource → ResourceDetails (1:1)
- DestinationMatrix → UtilityShareToken (1:1)
- TravelTimeInfo caches calculations by (departLat, departLng, destLat, destLng)

**Special Fields for ETA Calculation:**
- **DA/WD**: `departLatitude`, `departLongitude`, `destinationLatitude`, `destinationLongitude`, calculated `etaHours`, `miles`
- **LC/VG**: Same as DA/WD plus `fteCount`, `diggerCount`, `bucketCount`, `specialEquipment[]`
- **ETA Intervals**: Resources bucketed into time ranges for statistics display

### Status Workflow
```
Callout Module: Available Resources 
        ↓
Share Availability to Utility (generate token, send email/SMS)
        ↓
Admin clicks "Utility Shared Report" button
        ↓
Utility Shared Report List Page (shows all utilities with communication logs)
        ↓
Click on Destination Name
        ↓
Destination Matrix: Display with ETA, sorted by Max ETA
        ↓
Filter by: Departing Location, ETA Hours, Miles
        ↓
Select Team/Individual/All Resources
        ↓
Click "Add to Roster" or "View Roster"
        ↓
Roster Module: Resources added, opens roster screen
        ↓
Destination Matrix: Selected resources removed from listing
        ↓
Callout Module: Resource status changed to "On a Roster" (locked, no edits allowed)
```

### ETA Calculation Logic
- **Same City/State**: If departing location city and state match destination city and state → ETA = 2 hours, Miles = "< 80"
- **Different Location**: Use external mapping API (Google Maps, etc.) to calculate distance and time
- **Line Crew (LC) Special Logic**: ETA calculated based on miles driven (different formula than DA/WD)
- **Cached Results**: TravelTimeInfo table caches calculations by coordinates to reduce API calls
- **Fallback**: If API fails or coordinates missing, resource shown without ETA/miles data

### Regional/Polygon Filtering
- Admin can define geographic regions/polygons on map
- Filter resources to show only those with departing locations inside the polygon
- Used for focusing on specific coverage areas or utility service territories

## Role-Specific Rules

- `admin/` - Administrator rules and capabilities (full access to destination matrix, share to utilities, export reports)
- `team-lead/` - Team Lead rules and capabilities (view own team resources in matrix)
- `secondary-team-lead/` - Secondary Team Lead rules and capabilities (view own team resources in matrix)
- `access-based-user/` - Access-Based User rules and capabilities (limited or no access depending on permissions)

## Integration with Other Modules

### Callout Module (Upstream)
- Destination Matrix displays only resources with "Available" status from Callout
- Uses departing location data collected during callout response
- Real-time updates: When resource availability changes in Callout, matrix auto-updates via SSE
- **Status Update**: When resources added to roster from Destination Matrix, Callout status changes to "On a Roster"
- **Resource Locking**: Resources marked "On a Roster" are locked in Callout (no edits or actions allowed)

### Roster Module (Downstream)
- Resources from Destination Matrix can be added to rosters via "Add to Roster" or "View Roster" actions
- ETA information helps with resource scheduling and deployment planning
- Selected resources (team/individual/all) are moved from Destination Matrix to Roster
- Resources removed from Destination Matrix once added to roster
- Roster screen opens automatically with pre-selected resources

### Utility Shared Report List
- Intermediate page between Callout and Destination Matrix
- Shows all utilities that have been shared availability reports
- Lists utility company names with destination names
- Displays communication logs for each utility share action
- Clicking destination name navigates to Destination Matrix for that specific utility/event

### Utility Dashboard
- External-facing dashboard for utility companies to view shared availability
- Accessed via secure token links (no authentication required)
- Token-based access ensures security and audit trail
- Utilities can view statistics, resource listings, map view, and export reports
- Token can be regenerated to revoke old access and provide new link


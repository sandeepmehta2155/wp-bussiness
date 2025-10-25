# Resource Module - Admin Rules

## Overview

The Resource Module is the central system for managing all resources (personnel and subcontractors) across categories (DA - Damage Assessment, WD - Wiredown, LC - Linecrew, VG - Vegetation). It provides comprehensive CRUD operations, advanced UI features, location tracking, and seamless integration with Form Generator for dynamic field management.

### Key Features Summary

1. **Dynamic Form Management** (via Form Generator Integration)
   - Default fields + dynamic fields configured through Settings → Form Generator
   - Category-specific forms (DA, WD, LC, VG)
   - Field validation rules, placeholders, max length, required status
   - Applies to create, edit, inline editing, and import operations

2. **Multiple Editing Modes**
   - Standard form-based editing with full validation
   - AG Grid inline editing for quick field updates
   - Bulk import via CSV/Excel with row-by-row validation

3. **Google Maps Integration**
   - Address autocomplete as you type
   - Auto-population of street, city, state, zip code
   - Latitude/longitude extraction and storage
   - PostGIS geometry for spatial queries

4. **Location & Mapping**
   - Resource location tracking in separate table (PostGIS)
   - Map view with clustering (shows resource counts by area)
   - Draw tools for bulk selection (rectangle, circle, polygon)
   - Team color-coded markers
   - Info windows with quick actions

5. **Advanced Filtering**
   - Column visibility customization (per-user preferences)
   - Dynamic filter builder (field/operator/value)
   - Multiple filter rules with AND logic
   - Saved filter presets (per-user)
   - Filters apply to both table and map views

6. **Import/Export**
   - CSV/Excel import with Form Generator validation
   - Row-by-row error reporting with specific error codes
   - CSV/Excel export respecting filters and column visibility
   - Async processing for large datasets

7. **Team Color Coding**
   - Seven color palette for team identification
   - Colors applied to: table rows, map markers, clusters, reports
   - Dynamic assignment and management

8. **Resource Ordering & Movement**
   - Drag-and-drop reordering within teams (AG Grid)
   - Cross-team movement with Team Lead reassignment
   - Respects DA/WD Team Lead rules during moves
   - Sequential ordering for display

9. **Team Lead Management**
   - DA resources REQUIRE Team Lead (mandatory)
   - WD resources OPTIONAL Team Lead ("Unassigned" group available)
   - Team Lead assignment/reassignment with validation
   - Color coding per team

10. **Event-Specific Resource Handling**
    - Master resources copied to event context
    - Event-specific flags (`wasOriginCategory`, `isDestinationCategory`)
    - Cross-category resource movement for events
    - Helper functions for reordering event resources

11. **Multi-Contact Subcontractor Management**
    - Callout, Owner, and Billing contact groups
    - Union status, ISNet, Avetta certification tracking
    - Regional manager assignment
    - EIN uniqueness validation

12. **Audit & Compliance**
    - All operations logged (create, edit, delete, import, export)
    - Soft delete for resources with event associations
    - Field-level change tracking
    - User action attribution

## Access Control & Permissions

### What Admins Can Do
- [x] Create internal resources (DA, WD) with all fields (default + dynamic from Form Generator)
- [x] Create subcontractors (LC, VG) with company and contact information
- [x] Edit all resources across all categories (via form or inline editing)
- [x] Delete resources (soft or hard based on associations)
- [x] Assign/reassign Team Leads to DA/WD resources
- [x] Create resources without Team Lead for WD (goes to "Unassigned")
- [x] Move resources between categories for event-specific assignments
- [x] Swap resources within teams for sequential ordering
- [x] Move resources from one team to another (respecting Team Lead rules)
- [x] View all resource data across all categories and Team Leads
- [x] Export resource data as CSV/Excel
- [x] Import resources via CSV/Excel with validation
- [x] Configure resource templates via Form Generator (Settings → Form Generator)
- [x] Manage subcontractor contacts (Callout, Owner, Billing)
- [x] Set union status, ISNet, Avetta certifications for subcontractors
- [x] Assign regional managers to subcontractors
- [x] Copy resources to event context for callouts
- [x] View and manage event-specific resource copies
- [x] Access "Unassigned" WD resources
- [x] Bulk import/export resources
- [x] View audit logs for all resource operations
- [x] Override validation rules (with proper justification/audit)
- [x] Filter and customize column visibility in resource listings
- [x] View resources on map with clustering and location-based grouping
- [x] Apply dynamic filters with operators (contains, equals) and save per-user preferences
- [x] Inline edit resources directly in AG Grid table
- [x] Use Google Maps API for address lookup and auto-population

### What Admins Cannot Do
- [ ] Create DA resources without Team Lead (system enforces this rule)
- [ ] Delete resources with active event associations (soft delete only)
- [ ] Delete Team Lead users without reassigning their DA resources
- [ ] Change resource type after creation (internal ↔ subcontractor)
- [ ] Bypass email/phone normalization (system-enforced)
- [ ] Access resources from other tenants (multi-tenant isolation)
- [ ] Delete subcontractors with pending invoices (if billing integration exists)

## Core Business Logic & Constraints

### Form Generator Integration

**Overview:**
The Resource module integrates with the Form Generator module to support dynamic field management. Admins configure resource forms through Settings → Form Generator → Select Category.

**How It Works:**
1. **Default Fields**: Core fields are always present (firstName, lastName, jobTitle, phone, email, etc.)
2. **Dynamic Fields**: Additional fields can be dragged and dropped in Form Generator
3. **Field Configuration**: Each field can have:
   - Required/Optional status
   - Placeholder text
   - Max length constraints
   - Input type (text, number, dropdown, multi-select, checkbox, date, etc.)
4. **Form Generation**: Dynamic fields are populated in:
   - Add Resource form
   - Edit Resource form
   - Resource listing columns (if enabled)
   - Inline editing interface (AG Grid)
5. **Validation**: Form Generator rules are enforced during:
   - Resource creation
   - Resource editing (form-based)
   - Inline editing (AG Grid)
   - CSV/Excel import

**Rules:**
- Form configuration is category-specific (DA, WD, LC, VG each have their own form templates)
- Default fields cannot be removed, only dynamic fields can be added/removed
- Field validation rules from Form Generator are enforced at API level
- Changes to Form Generator configuration apply immediately to all resource forms
- Dynamic fields are stored in resource record and retrieved for display/editing

**Navigation:**
Settings → Form Generator → Select Category (DA/WD/LC/VG) → Configure Fields

### Resource Creation

#### For Internal Resources (DA & WD Categories)

**Rules:**
1. All default fields must be provided: firstName, lastName, jobTitle, phone, email
2. Email must be normalized using `cleanEmail()` and unique within tenant
3. Phone must be normalized to 10 digits
4. **DA Category**: Team Lead assignment is **MANDATORY** - cannot create DA resource without Team Lead
5. **WD Category**: Team Lead assignment is **OPTIONAL** - if not provided, resource goes to "Unassigned" category
6. `isTeamLead` flag determines if the resource is designated as a Team Lead
7. Team Lead (if assigned) must belong to the same category as the resource
8. Gender and state address are optional but recommended

**Validations:**
- Email: Valid format, normalized with `cleanEmail()`, unique per tenant
- Phone: Must be 10 digits after normalization
- First Name: Required, 1-100 characters
- Last Name: Required, 1-100 characters
- Job Title: Required, 1-100 characters
- Category: Must be either "DA" or "WD" for internal resources
- Team Lead ID: If provided, must reference valid User with Team Lead role in same category
- **DA Specific**: Team Lead ID must not be null/empty

**Process:**
1. Receive resource data from request body
2. Determine category (DA or WD)
3. Normalize email using `cleanEmail(email)`
4. Normalize phone to 10 digits
5. Validate all required fields based on category
6. **If DA category**: Validate Team Lead is provided
7. **If WD category and no Team Lead**: Mark as "Unassigned" category
8. Check for duplicate email in tenant
9. Verify category exists and is active
10. If Team Lead assigned, verify they belong to same category
11. Create resource record in database
12. Create audit log entry
13. Send welcome notification (email/SMS) if configured
14. Return created resource

#### For Third-Party Resources (LC & VG Categories - Subcontractors)

**Rules:**
1. Must provide subcontractor company name and EIN number
2. At least ONE contact type must be fully completed (Callout, Owner, or Billing)
3. If Avetta = "Yes", then Avetta ID is required
4. Union Status must be one of: "Union", "Non-Union", or "Both"
5. EIN number must be unique within tenant (one subcontractor company)
6. Team Lead assignment is NOT applicable for subcontractors
7. Street address should be provided for logistics

**Validations:**
- Subcontractor Name: Required, 1-200 characters
- EIN Number: Required, valid format (XX-XXXXXXX), unique per tenant
- Contact Emails: Valid format, normalized with `cleanEmail()`
- Contact Phones: Must be 10 digits after normalization
- Union Status: Must be "Union", "Non-Union", or "Both"
- ISNet: Must be "Yes" or "No"
- Avetta: Must be "Yes" or "No"
- Avetta ID: Required if Avetta = "Yes", alphanumeric, 1-50 characters
- At least one complete contact group (all fields in Callout OR Owner OR Billing)

**Process:**
1. Receive subcontractor data from request body
2. Determine category (LC or VG)
3. Normalize all contact emails using `cleanEmail()`
4. Normalize all contact phones to 10 digits
5. Validate EIN format and uniqueness
6. Validate at least one complete contact group exists
7. Validate union status value
8. If Avetta = "Yes", validate Avetta ID is provided
9. Create subcontractor record in database
10. Create audit log entry
11. Optionally notify regional manager
12. Return created subcontractor 

### Resource Editing

**Rules:**
1. Admins can edit any resource across all categories
2. Category-specific field requirements must still be met after edit
3. **DA resources**: Cannot remove Team Lead (mandatory)
4. **WD resources**: Can remove Team Lead (will go to "Unassigned")
5. **Subcontractors**: Cannot change EIN if already referenced in events/rosters
6. Email changes require re-validation for uniqueness
7. Changing category requires re-validation of category-specific rules

**Validations:**
- Same validations as creation apply
- If changing email, check uniqueness
- If changing Team Lead, verify new Team Lead is in same category
- If changing category from DA to WD or vice versa, re-validate Team Lead rules
- Cannot change resource type (internal ↔ subcontractor) after creation

**Process:**
1. Receive resource ID and update data
2. Fetch existing resource from database
3. Determine what fields are being changed
4. If email changed, normalize with `cleanEmail()` and check uniqueness
5. If phone changed, normalize to 10 digits
6. If Team Lead changed, validate against category rules
7. If category changed, validate all category-specific rules
8. Update resource record
9. Create audit log entry with field changes
10. If critical fields changed (email, phone), send notification
11. Return updated resource

### Inline Editing (AG Grid)

**Overview:**
Resources can be edited directly within the table listing using AG Grid inline editing, providing a faster workflow for bulk updates.

**Rules:**
1. All validation rules that apply to form-based editing also apply to inline editing
2. Default fields and dynamic fields (from Form Generator) are editable inline
3. Different input types are supported:
   - Text fields: Standard input
   - Dropdowns: Single-select dropdowns
   - Multi-select: Checkbox-based multi-select
   - Date fields: Date picker
   - Number fields: Numeric input with validation
4. Team Lead dropdown filtered by category (shows only same-category Team Leads)
5. Email and phone fields validate and normalize on blur/save
6. Changes are saved per-field or per-row depending on configuration
7. Validation errors displayed inline next to the field

**Validations:**
- Same as form-based editing validations
- Real-time validation feedback as user types
- Cannot save invalid data
- Cannot bypass required field rules
- Cannot violate uniqueness constraints (email, EIN)

**Process:**
1. User clicks on editable cell in AG Grid
2. Cell enters edit mode with appropriate input control
3. User makes changes
4. On blur or Enter key, validation runs
5. If valid, API call updates the field
6. If invalid, inline error message displayed
7. Grid refreshes to show updated data
8. Audit log entry created for the change

**AG Grid Features Used:**
- Cell editing with custom editors
- Validation on cell value change
- Dropdown editors for select fields
- Multi-select editors for checkbox fields
- Row dragging for swapping/reordering (see Resource Swapping section)

### Resource Deletion

**Rules:**
1. Resources associated with active events cannot be deleted (only soft-deleted)
2. If resource is a Team Lead with assigned resources, must handle reassignment first
3. Soft delete preferred over hard delete for audit trail
4. Deletion creates audit log entry
5. Subcontractors with pending invoices cannot be deleted

**Validations:**
- Resource exists
- Check for active event associations
- If Team Lead, check for assigned resources
- Check for pending rosters
- Check for pending callout responses

**Process:**
1. Receive resource ID to delete
2. Validate resource exists
3. Check if resource is Team Lead with assigned resources
4. If yes, prompt for reassignment or block deletion
5. Check for active event associations
6. Check for pending rosters/callouts
7. If associations exist, perform soft delete (set deletedAt)
8. If no associations, can perform hard delete
9. Create audit log entry
10. Notify affected Team Leads or related users
11. Return success response

### Resource Assignment (Team Lead Assignment)

**Rules:**
1. Only applies to internal resources (DA & WD)
2. **DA Category**: Team Lead is mandatory, cannot unassign
3. **WD Category**: Team Lead is optional, can unassign → goes to "Unassigned"
4. Team Lead must be a User with Team Lead role
5. Team Lead must belong to the same category as the resource
6. One Team Lead can have multiple resources assigned
7. When Team Lead user is deleted, their assigned resources must be reassigned

**Validations:**
- Resource is internal (DA or WD category)
- Team Lead ID references valid User with Team Lead role
- Team Lead's category matches resource's category
- If DA resource, Team Lead ID cannot be null
- If unassigning WD resource, confirm "Unassigned" handling

**Process:**
1. Receive resource ID and Team Lead ID
2. Validate resource exists and is internal (DA/WD)
3. Validate Team Lead user exists with proper role
4. Verify category match
5. If DA resource, ensure Team Lead ID is not null
6. Update resource.teamLeadId
7. If unassigning WD resource, mark as "Unassigned" category
8. Create audit log entry
9. Notify old and new Team Leads
10. Return updated resource

## Advanced Features & UI Components

### Resource Import/Export

#### Import Resources (CSV/Excel)

**Overview:**
Bulk import resources from CSV or Excel files with dynamic validation based on Form Generator configuration.

**Rules:**
1. Import file must match template format (derived from Form Generator fields)
2. All default required fields must be present in import file
3. Dynamic required fields (from Form Generator) must also be present
4. Validation runs per-row based on Form Generator rules:
   - Required field checks
   - Max length validation
   - Data type validation
   - Email format and uniqueness
   - Phone normalization
   - EIN uniqueness (for subcontractors)
5. Import results:
   - Successfully imported resources added to system
   - Failed records logged with specific error codes
   - Error report generated with row-by-row validation failures
6. Team Lead assignment rules enforced (DA requires Team Lead, WD optional)

**Process:**
1. Admin clicks "Import" button
2. Selects file format (CSV or Excel)
3. Uploads file
4. System validates file structure against Form Generator template
5. System processes each row:
   - Normalize email with `cleanEmail()`
   - Normalize phone to 10 digits
   - Validate against Form Generator rules
   - Check uniqueness constraints
   - If valid: Create resource record
   - If invalid: Add to error report with specific error code
6. Display import summary:
   - Total rows processed
   - Successfully imported count
   - Failed count with downloadable error report
7. Create audit log entry for import operation
8. Notify admin of completion

**Validation Error Codes:**
- `MISSING_REQUIRED_FIELD`: Required field from Form Generator is empty
- `INVALID_EMAIL_FORMAT`: Email format validation failed
- `DUPLICATE_EMAIL`: Email already exists in tenant
- `DUPLICATE_EIN`: EIN already exists for subcontractor
- `INVALID_PHONE`: Phone normalization failed
- `MAX_LENGTH_EXCEEDED`: Field exceeds max length from Form Generator
- `INVALID_TEAM_LEAD`: Team Lead ID not found or category mismatch
- `DA_REQUIRES_TEAM_LEAD`: DA resource missing Team Lead assignment
- `INVALID_CATEGORY`: Category not found or invalid for resource type

#### Export Resources (CSV/Excel)

**Rules:**
1. Export includes all default fields
2. Export includes all dynamic fields from Form Generator for the category
3. Export respects current filters applied by user
4. Export can be full dataset or filtered subset
5. Column visibility settings from user preferences apply to export
6. Large exports processed asynchronously (background job)

**Process:**
1. Admin applies filters (optional)
2. Clicks "Export" button
3. Selects format (CSV or Excel)
4. System generates export file:
   - Fetch resources based on current filters
   - Include all visible columns
   - Include dynamic fields from Form Generator
   - Format data for export
5. Download link provided or file sent via email for large exports
6. Create audit log entry for export operation

### Google Maps API Integration

**Overview:**
Address lookup and auto-population using Google Maps API to ensure accurate location data and enable geocoding.

**How It Works:**
1. User starts typing street address in the address field
2. Google Maps Autocomplete API suggests addresses in real-time
3. User selects an address from suggestions
4. System auto-populates:
   - Street Address (full formatted address)
   - State
   - City
   - Zip Code
5. System extracts latitude and longitude from Google Maps response
6. Latitude and longitude stored in `ResourceLocation` table
7. Geometry data stored using PostGIS extension (see Resource Location section)

**Rules:**
- Google Maps API key required and configured in environment
- Address must be selected from autocomplete suggestions for geocoding
- Manual address entry allowed but won't have lat/long until validated
- Lat/long enables map view and clustering features
- State, city, zip code can be manually edited after auto-population

**Process:**
1. User focuses on Street Address field
2. Types address (e.g., "123 Main")
3. Google Maps Autocomplete API returns suggestions
4. User selects address from dropdown
5. System calls Google Maps Geocoding API for full details
6. System parses response:
   - Extract street_address component → Street Address field
   - Extract administrative_area_level_1 → State field
   - Extract locality → City field
   - Extract postal_code → Zip Code field
   - Extract lat/lng → Store in ResourceLocation table
7. Fields auto-populated in form
8. User can edit if needed before saving

### Resource Location & PostGIS

**Overview:**
Resource locations are tracked in a separate `ResourceLocation` table with PostGIS geometry support for spatial queries and mapping.

**Database Schema:**
- **ResourceLocation Table:**
  - `id`: UUID primary key
  - `resourceId`: Foreign key to Resource
  - `latitude`: Decimal (lat from Google Maps)
  - `longitude`: Decimal (lng from Google Maps)
  - `geometry`: PostGIS POINT geometry (for spatial queries)
  - `createdAt`, `updatedAt`: Timestamps

**Rules:**
1. Location stored only when lat/long available (from Google Maps API)
2. PostGIS extension used for geometry column
3. Geometry column enables:
   - Distance calculations
   - Proximity searches
   - Map clustering
   - Spatial indexing for performance
4. Location updates when address changes and geocoded
5. One location record per resource (1:1 relationship)

**PostGIS Usage:**
```sql
-- Example: Find resources within radius
SELECT r.* FROM resources r
JOIN resource_locations rl ON r.id = rl.resource_id
WHERE ST_DWithin(
  rl.geometry,
  ST_MakePoint(longitude, latitude)::geography,
  radius_in_meters
);
```

**Benefits:**
- Fast spatial queries for map view
- Efficient clustering for large datasets
- Distance-based resource assignment for events
- Proximity-based callouts

### Team Color Coding

**Overview:**
Each team (Team Lead group) is assigned a unique color code for visual identification in UI, maps, and reports.

**Rules:**
1. Color codes stored in `ColorCode` table
2. Seven color shades available as a palette
3. Colors dynamically assigned to teams
4. Colors used in:
   - Resource listing (team row colors)
   - Map markers/clusters
   - Calendar/roster views
   - Reports and exports
5. Colors can be reassigned by admin
6. Unused colors returned to pool when team deleted

**Color Code Table:**
- `id`: UUID primary key
- `teamLeadId`: Foreign key to User (Team Lead)
- `colorHex`: String (e.g., "#FF5733")
- `colorName`: String (e.g., "Red", "Blue")
- `shadeIndex`: Integer (1-7 for shade variations)

**Color Assignment Logic:**
1. When Team Lead created, system assigns next available color
2. Color assigned from predefined palette of 7 shades
3. If all 7 colors in use, cycle back to first color (with visual distinction)
4. Team Lead can optionally choose custom color
5. Color persists across sessions and applies to all team resources

**Shade Palette Example:**
1. Red (#FF5733)
2. Blue (#3498DB)
3. Green (#2ECC71)
4. Orange (#F39C12)
5. Purple (#9B59B6)
6. Teal (#1ABC9C)
7. Pink (#E91E63)

### Column Filtering & Visibility

**Overview:**
Admins can customize which columns are visible in the resource listing table, with settings saved per-user.

**Rules:**
1. Column visibility preferences saved per user (not global)
2. Default columns always include: Name, Job Title, Phone, Email
3. Dynamic columns from Form Generator can be shown/hidden
4. Column order can be customized
5. Filter settings persist across sessions
6. Toggle controls for quick show/hide
7. "Reset to Default" option available

**Process:**
1. Admin clicks "Columns" button in resource listing
2. Column visibility panel opens
3. Toggles shown for each available column:
   - Default fields (can hide except core fields)
   - Dynamic fields from Form Generator
4. Admin toggles columns on/off
5. Admin drags to reorder columns (optional)
6. Clicks "Apply"
7. Table refreshes with new column configuration
8. Settings saved to user preferences in database
9. On next login, same column configuration loaded

**Column Filter API:**
- `GET /api/v1/user-preferences/resource-columns` - Get user's column preferences
- `PUT /api/v1/user-preferences/resource-columns` - Update user's column preferences
- Stored as JSON in UserPreferences table

### Map View with Clustering

**Overview:**
Resources can be viewed on a map with location-based clustering, showing how many resources are in each geographic area.

**Rules:**
1. Only resources with lat/long (from Google Maps) appear on map
2. Clustering groups nearby resources (within proximity threshold)
3. Cluster markers show count of resources in that area
4. Clicking cluster zooms in or expands to show individual resources
5. Individual resource markers color-coded by team
6. Map view and table view toggleable
7. Filters applied in table view also apply to map view

**Features:**
1. **Clustering**: Groups resources in close proximity
   - Zoom out: More clustering
   - Zoom in: Individual markers
   - Cluster size indicates resource count
2. **Draw Mode**: Admin can draw shapes on map
   - Rectangle, circle, polygon selection
   - Select all resources within drawn area
   - Bulk actions on selected resources
3. **Info Windows**: Click marker to see resource details
   - Name, Job Title, Phone, Email
   - Team Lead assignment
   - Quick action buttons (Edit, View, Delete)
4. **Map Controls**:
   - Zoom in/out
   - Pan
   - Toggle clustering on/off
   - Reset view
   - Switch map type (roadmap, satellite, terrain)

**Draw Feature:**
- Admin clicks "Draw" button
- Selects shape tool (rectangle, circle, polygon)
- Draws shape on map
- All resources within shape automatically selected
- Can perform bulk actions:
  - Export selected resources
  - Move to different Team Lead
  - Assign to event
  - Send bulk notification

**Process:**
1. Admin toggles "Map" view
2. Resources with locations render on map
3. Clustering algorithm groups nearby resources
4. Admin can:
   - Click cluster to zoom in
   - Click individual marker to see details
   - Use draw tool to select multiple resources
   - Apply filters (filter panel still visible)
5. Map updates in real-time as filters change

**Technical Implementation:**
- Google Maps JavaScript API
- Marker clustering library
- PostGIS for efficient location queries
- WebSocket updates for real-time changes (if applicable)

### Dynamic Filtering

**Overview:**
Advanced filtering system allowing admins to create complex filter rules using field names, operators, and values. Filters saved per user.

**Filter Structure:**
- **Field**: Select any column (default or dynamic from Form Generator)
- **Operator**: Select comparison type
  - `Contains`: Partial text match (case-insensitive)
  - `Equals`: Exact match
  - `Not Equals`: Exclusion
  - `Greater Than`: Numeric/date comparison
  - `Less Than`: Numeric/date comparison
  - `In`: Value is in a list (multi-value)
  - `Not In`: Value not in a list
  - `Is Empty`: Field is null/empty
  - `Is Not Empty`: Field has value
- **Value**: Enter single value or multiple values (comma-separated for `In`/`Not In`)

**Rules:**
1. Multiple filter rules can be combined (AND logic)
2. Filters apply to table view and map view simultaneously
3. Filters saved per user automatically
4. Admin can create named filter presets
5. Filters respect data types (text, number, date)
6. Email filtering uses normalized email (cleanEmail applied)
7. Can filter on Team Lead, Category, status fields

**Process:**
1. Admin clicks "Filter" button
2. Filter panel opens
3. Clicks "+ New Rule"
4. Selects field from dropdown (shows all columns including dynamic)
5. Selects operator based on field type
6. Enters value(s)
7. Optionally adds more rules
8. Clicks "Apply"
9. Table and map views update with filtered results
10. Filter settings auto-saved to user preferences
11. On next login, last filter configuration loaded

**Example Filter:**
```
If [Last Name] [Contains] "Smith"
AND [Job Title] [Equals] "Driver"
AND [State] [In] "California, Texas, Florida"
```

**Saved Filter Management:**
- Admin can save current filter as named preset
- Presets stored per user
- Quick access to frequently used filters
- Share filter presets with other admins (optional feature)

**API Endpoints:**
- `POST /api/v1/resources/filter` - Apply filter and get results
- `GET /api/v1/user-preferences/resource-filters` - Get user's saved filters
- `POST /api/v1/user-preferences/resource-filters` - Save new filter preset
- `DELETE /api/v1/user-preferences/resource-filters/:id` - Delete filter preset

### Resource Swapping & Reordering

**Overview:**
Resources can be reordered within a team for sequential display and moved between teams using AG Grid drag-and-drop functionality.

**Rules:**
1. Resources can be swapped within the same team
2. Drag-and-drop reordering changes display sequence
3. Resources can be moved from one team to another (Team Lead reassignment)
4. DA resources moved between teams must have new Team Lead assigned
5. WD resources can be moved to "Unassigned" or another team
6. Team Lead assignment rules still enforced during moves
7. Reordering updates `displayOrder` or `sequence` field in database
8. When resources added/removed from team, use `renumberEventResourcesAfterMasterResourceAdd()` function

**Features:**
1. **Within-Team Reordering**:
   - Drag resource row up or down within team group
   - Drop between other resources
   - Display order updated automatically
   - Used for priority sorting or alphabetical arrangement

2. **Cross-Team Movement**:
   - Drag resource from one Team Lead group to another
   - System validates Team Lead assignment rules
   - If valid, resource.teamLeadId updated
   - Resource appears under new Team Lead group
   - Audit log created for reassignment

**Process (Within-Team Swap):**
1. Admin views resources grouped by Team Lead
2. Clicks and holds on drag handle icon
3. Drags resource up or down within team section
4. Drops between two other resources
5. System calculates new sequence number
6. API call updates resource.displayOrder
7. Grid refreshes to show new order
8. Audit log entry created

**Process (Cross-Team Move):**
1. Admin drags resource from Team A section
2. Drops resource into Team B section
3. System validates:
   - If DA resource, Team B must be DA Team Lead
   - If WD resource, Team B can be WD Team Lead or "Unassigned"
   - Category match enforced
4. If valid:
   - Update resource.teamLeadId = Team B ID
   - Update resource.displayOrder (append to end of Team B list)
   - Create audit log entry
   - Notify old and new Team Leads
5. If invalid:
   - Show inline error message
   - Revert drag operation
   - Resource stays in original team

**AG Grid Configuration:**
```typescript
// Row dragging enabled
rowDragManaged: true,
animateRows: true,
onRowDragEnd: (event) => {
  // Handle reordering or cross-team move
  handleResourceMove(event.node.data, event.overNode.data);
}
```

**Event-Specific Reordering:**
When resources are added/removed within a Team Lead's group (especially for event-specific contexts), use the helper function:

```typescript
await renumberEventResourcesAfterMasterResourceAdd(
  prisma as PrismaClient,
  categoryId,
  teamLeadId
);
```

This ensures event-specific resources maintain correct ordering.

## Key Workflows & Processes

### Workflow 1: Creating a DA Resource with Team Lead

**Description:**
Admin creates a new Damage Assessment resource and assigns them to a Team Lead.

**Steps:**
1. Admin navigates to Resources → Add New Resource
2. Selects category "DA" (Damage Assessment)
3. Fills in required fields: firstName, lastName, jobTitle, phone, email
4. Fills in optional fields: gender, stateAddress
5. **MUST select a Team Lead** from dropdown (shows only DA Team Leads)
6. Sets "Is Team Lead" flag (Yes/No)
7. Submits form
8. System validates all fields (especially Team Lead presence)
9. System normalizes email and phone
10. System creates resource record
11. Resource appears under selected Team Lead's group
12. Welcome notification sent (if configured)

**Decision Points:**
- If "Is Team Lead" = Yes, this resource can be assigned as Team Lead to others
- If Team Lead dropdown is empty, must create a Team Lead user first

**Outcomes:**
- Success: Resource created and grouped under Team Lead
- Failure: If Team Lead not selected, validation error "Team Lead is required for DA resources"

### Workflow 2: Creating a WD Resource without Team Lead (Unassigned)

**Description:**
Admin creates a Wiredown resource without assigning a Team Lead, resulting in "Unassigned" grouping.

**Steps:**
1. Admin navigates to Resources → Add New Resource
2. Selects category "WD" (Wiredown)
3. Fills in required fields: firstName, lastName, jobTitle, phone, email
4. **Leaves Team Lead dropdown empty** (optional for WD)
5. Sets "Is Team Lead" flag if needed
6. Submits form
7. System validates all fields (Team Lead not required for WD)
8. System normalizes email and phone
9. System creates resource record
10. Resource appears under "Unassigned" group in WD category
11. Welcome notification sent (if configured)

**Decision Points:**
- Admin can choose to assign Team Lead later
- "Unassigned" resources are still valid and can be used in events

**Outcomes:**
- Success: Resource created in "Unassigned" group
- Can be reassigned to a Team Lead later via edit

### Workflow 3: Creating a Subcontractor (LC/VG)

**Description:**
Admin onboards a new Linecrew or Vegetation subcontractor company with contact details.

**Steps:**
1. Admin navigates to Resources → Add Subcontractor
2. Selects category "LC" (Linecrew) or "VG" (Vegetation)
3. Fills in company info: Subcontractor Name, EIN Number
4. Fills in Callout Contact details (name, phone, email, job title)
5. Optionally fills Owner Contact and Billing Contact
6. Fills street address
7. Selects Union Status: Union / Non-Union / Both
8. Sets ISNet: Yes / No
9. Sets Avetta: Yes / No
10. If Avetta = Yes, provides Avetta ID
11. Selects Regional Manager
12. Submits form
13. System validates EIN uniqueness
14. System validates at least one complete contact group
15. System normalizes all contact emails and phones
16. System creates subcontractor record
17. Regional Manager notified (if configured)

**Decision Points:**
- If Avetta = Yes, must provide Avetta ID
- At least one contact type must be complete

**Outcomes:**
- Success: Subcontractor created and available for callouts
- Failure: If EIN duplicate, error "Subcontractor with this EIN already exists"

### Workflow 4: Resource to Event Flow (Utilization Journey)

**Description:**
How resources flow from master list to event-specific callouts.

**Steps:**
1. **Master Resources exist** in Resource Module (DA, WD, LC, VG)
2. **Admin creates an Event** (e.g., "Storm Response - Hurricane")
3. **System copies resources** from master list to event context
4. **Callout Module activated** for the event
5. **Callout sent** to resources asking availability
6. **Resources respond** with status:
   - Available
   - Not Available
   - Available with conditions
   - No response (pending)
7. **Status mapped** in Callout Module for tracking
8. **Available resources** can be assigned to rosters
9. **Roster Module** uses available resources for scheduling
10. **Master resources remain unchanged** (copies used for event)

**Decision Points:**
- Which categories to include in callout (DA, WD, LC, VG, or specific)
- How to handle "No response" - auto-followup or manual
- Whether to allow roster assignment before callout responses

**Outcomes:**
- Master resource data integrity maintained
- Event-specific availability tracked separately
- Clear audit trail from resource → callout → roster 

## Data Relationships & Dependencies

### Primary Entities

**Resource (Internal - DA/WD)**
- Fields: id, firstName, lastName, jobTitle, phone, email, gender, stateAddress, categoryId, teamLeadId, isTeamLead, createdAt, updatedAt, deletedAt
- Relationships:
  - belongsTo: Category (DA or WD)
  - belongsTo: User (Team Lead)
  - hasMany: CalloutResponse
  - hasMany: RosterAssignment
  - hasMany: ResourceMoveEvent (for event-specific copies)

**Subcontractor (Third-Party - LC/VG)**
- Fields: id, name, einNumber, streetAddress, unionStatus, isNet, avetta, avettaId, regionalManagerId, categoryId, createdAt, updatedAt, deletedAt
- Contact Groups: calloutContact{Name,Phone,Email,JobTitle}, ownerContact{Name,Phone,Email,JobTitle}, billingContact{Name,Phone,Email,Operators}
- Relationships:
  - belongsTo: Category (LC or VG)
  - belongsTo: User (Regional Manager)
  - hasMany: CalloutResponse
  - hasMany: RosterAssignment

### Related Entities

- **Category**: DA, WD, LC, VG (defines resource grouping and field requirements)
- **User (Team Lead)**: User with Team Lead role, assigned to DA/WD resources
- **User (Regional Manager)**: User managing LC/VG subcontractors
- **Event**: Triggers resource copying for callouts
- **CalloutResponse**: Tracks resource availability for events
- **RosterAssignment**: Assigns resources to specific rosters/shifts
- **ResourceMoveEvent**: Tracks event-specific resource movements (see workspace rules)

### Dependencies

- **Category must exist** before creating resource
- **Team Lead user must exist** before assigning to DA resource
- **DA resources cannot be created** without Team Lead
- **Team Lead deletion** requires resource reassignment
- **Event creation** triggers resource copying to callout context
- **Subcontractor EIN** must be unique within tenant
- **Avetta ID** depends on Avetta flag being "Yes"

### Cascade Behaviors

- **On Category delete**: Block if resources exist; require resource deletion/reassignment first
- **On Team Lead user delete**: 
  - DA resources: Must reassign to another Team Lead (cannot be null)
  - WD resources: Set teamLeadId to null, mark as "Unassigned"
- **On Resource soft delete**: Set deletedAt, keep in database for audit
- **On Resource hard delete**: Cascade delete CalloutResponses, RosterAssignments (if no active events)
- **On Event delete**: Delete event-specific resource copies, keep master resources intact 

## Validation Rules

### Input Validations (Internal Resources - DA/WD)

| Field | Rule | Error Message | HTTP Status |
|-------|------|---------------|-------------|
| firstName | Required, 1-100 chars | "First name is required" | 400 |
| lastName | Required, 1-100 chars | "Last name is required" | 400 |
| jobTitle | Required, 1-100 chars | "Job title is required" | 400 |
| phone | Required, 10 digits after normalization | "Phone must be 10 digits" | 400 |
| email | Required, valid format, normalized | "Invalid email format" | 400 |
| email | Unique within tenant | "Email already exists" | 409 |
| categoryId | Must be valid UUID | "Invalid category ID" | 400 |
| categoryId | Category must exist | "Category not found" | 404 |
| categoryId | Must be DA or WD | "Invalid category for internal resource" | 400 |
| teamLeadId | Required if category = DA | "Team Lead is required for DA resources" | 400 |
| teamLeadId | Must reference valid Team Lead user | "Invalid Team Lead" | 400 |
| teamLeadId | Team Lead must be in same category | "Team Lead must belong to same category" | 400 |
| gender | Optional, valid enum value | "Invalid gender value" | 400 |
| stateAddress | Optional, 2-100 chars | "Invalid state address" | 400 |
| isTeamLead | Boolean (true/false) | "isTeamLead must be boolean" | 400 |

### Input Validations (Subcontractors - LC/VG)

| Field | Rule | Error Message | HTTP Status |
|-------|------|---------------|-------------|
| name | Required, 1-200 chars | "Subcontractor name is required" | 400 |
| einNumber | Required, format XX-XXXXXXX | "Invalid EIN format" | 400 |
| einNumber | Unique within tenant | "Subcontractor with this EIN already exists" | 409 |
| categoryId | Must be LC or VG | "Invalid category for subcontractor" | 400 |
| unionStatus | Required, one of: Union/Non-Union/Both | "Invalid union status" | 400 |
| isNet | Required, Yes or No | "ISNet field is required" | 400 |
| avetta | Required, Yes or No | "Avetta field is required" | 400 |
| avettaId | Required if avetta=Yes, 1-50 chars | "Avetta ID is required when Avetta is Yes" | 400 |
| calloutContactEmail | If provided, valid format, normalized | "Invalid callout contact email" | 400 |
| ownerContactEmail | If provided, valid format, normalized | "Invalid owner contact email" | 400 |
| billingContactEmail | If provided, valid format, normalized | "Invalid billing contact email" | 400 |
| streetAddress | Recommended, 1-200 chars | "Street address should be provided" | 400 |
| Contact Groups | At least one complete contact group | "At least one complete contact group required" | 400 |

### Business Rule Validations

| Rule | Condition | Action | HTTP Status |
|------|-----------|--------|-------------|
| DA Team Lead Required | categoryId = DA AND teamLeadId is null | Reject creation/update | 400 |
| Team Lead Category Match | teamLeadId category ≠ resource category | Reject creation/update | 400 |
| Unique Email | Email exists in tenant (after cleanEmail) | Reject creation/update | 409 |
| Unique EIN | EIN exists for another subcontractor | Reject creation | 409 |
| Avetta ID Required | avetta = Yes AND avettaId is null | Reject creation/update | 400 |
| Complete Contact Group | Contact has partial fields (e.g., email but no name) | Warn or require completion | 400 |
| Cannot Change Type | Attempting to change internal ↔ subcontractor | Reject update | 400 |
| Active Event Association | Deleting resource with active events | Soft delete only | 400 |
| Team Lead Has Resources | Deleting Team Lead user with assigned resources | Require reassignment first | 400 |

## Special Cases & Edge Cases

### Event-Specific Resources

**Scenario:**
When an event is created (e.g., Hurricane Response), the system needs to copy master resources to event context for availability tracking without modifying master records.

**Rules:**
1. Master resources in Resource Module remain unchanged
2. Event creation triggers resource copying to event-specific context
3. Event-specific copies are referenced in Callout Module
4. Availability status is tracked on event copies, not master resources
5. After event ends, event-specific copies can be archived/deleted
6. Master resources can be used across multiple events simultaneously
7. Use `ResourceMoveEvent` table to track event-specific resource movements (see workspace rules for `wasOriginCategory` and `isDestinationCategory` flags)

**Implementation:**
```typescript
// On event creation
await createEventSpecificResourceCopies({
  eventId: event.id,
  categoryIds: [DA, WD, LC, VG], // or specific categories
  prisma
});

// This creates copies in callout context
// Master resources remain in Resource Module unchanged
```

**Key Points:**
- Event-specific resource logic uses flags: `wasOriginCategory` and `isDestinationCategory`
- These flags are mutually exclusive (database constraint enforces this)
- Use helper function `renumberEventResourcesAfterMasterResourceAdd()` when resources are added/removed within Team Lead

### WD "Unassigned" Resources

**Scenario:**
Wiredown category allows resources without Team Lead assignment, creating an "Unassigned" group for organizational purposes.

**Rules:**
1. WD resources can have teamLeadId = null
2. System automatically groups these under "Unassigned" label in UI
3. "Unassigned" resources are fully functional and can be used in events
4. Admin can assign Team Lead to "Unassigned" resource at any time
5. Unassigning a WD resource from Team Lead moves it back to "Unassigned"
6. "Unassigned" is NOT a separate category - it's a UI grouping within WD

**Implementation:**
```typescript
// Creating WD resource without Team Lead
const wdResource = await prisma.resource.create({
  data: {
    firstName: "John",
    lastName: "Doe",
    categoryId: WD_CATEGORY_ID,
    teamLeadId: null, // Valid for WD
    // ... other fields
  }
});

// UI displays this under "WD > Unassigned" group
```

**Key Points:**
- Only applies to WD category, not DA
- Can transition from Unassigned → Assigned and back
- Full event/callout/roster functionality regardless of assignment status

### DA Mandatory Team Lead

**Scenario:**
Damage Assessment resources MUST have a Team Lead assigned at all times due to operational/compliance requirements.

**Rules:**
1. Cannot create DA resource without teamLeadId
2. Cannot update DA resource to remove teamLeadId (set to null)
3. If Team Lead user is being deleted, system must block or require reassignment first
4. No "Unassigned" concept exists for DA category
5. Validation enforced at API level and database level

**Implementation:**
```typescript
// Validation in service
if (categoryId === DA_CATEGORY_ID && !teamLeadId) {
  throw new ApiError(
    httpStatus.BAD_REQUEST,
    "Team Lead is required for DA resources"
  );
}

// On Team Lead user deletion
const assignedDAResources = await prisma.resource.findMany({
  where: { teamLeadId: userIdToDelete, categoryId: DA_CATEGORY_ID }
});

if (assignedDAResources.length > 0) {
  throw new ApiError(
    httpStatus.BAD_REQUEST,
    "Cannot delete Team Lead with assigned DA resources. Reassign resources first."
  );
}
```

### Resource Moving Between Categories (Cross-Category Event Assignment)

**Scenario:**
During large events, a resource from one category (e.g., DA - Fire) needs to temporarily assist another category (e.g., WD - Medical) without permanent transfer.

**Rules:**
1. Original resource remains in source category with flags: `wasOriginCategory=true`, `isDestinationCategory=false`
2. New event-specific resource created in destination category with: `wasOriginCategory=false`, `isDestinationCategory=true`
3. Entry created in `ResourceMoveEvent` table linking original resource, moved resource, and event
4. Database constraint ensures `wasOriginCategory` and `isDestinationCategory` cannot both be true
5. After event ends, event-specific resource is deleted/archived
6. Original resource remains unchanged in source category
7. When any resource within Team Lead is added/removed, use `renumberEventResourcesAfterMasterResourceAdd(prisma, categoryId, teamLeadId)` to reorder

**Implementation:**
See workspace rules section on "Event specific users" for detailed implementation guidance.

### Subcontractor Multi-Contact Management

**Scenario:**
Subcontractors (LC/VG) have multiple contact types (Callout, Owner, Billing) and not all may be available during onboarding.

**Rules:**
1. At least ONE complete contact group must be provided at creation
2. Contact groups can be added/updated later
3. Callout Contact is typically the primary contact for event responses
4. Billing Contact is used for invoicing and payment
5. Owner Contact is for contractual/legal matters
6. Each contact group is independent - same person can appear in multiple roles

**Implementation:**
```typescript
// Validation: at least one complete contact
const hasCompleteCallout = calloutContactName && calloutContactPhone && calloutContactEmail;
const hasCompleteOwner = ownerContactName && ownerContactPhone && ownerContactEmail;
const hasCompleteBilling = billingContactName && billingContactPhone && billingContactEmail;

if (!hasCompleteCallout && !hasCompleteOwner && !hasCompleteBilling) {
  throw new ApiError(
    httpStatus.BAD_REQUEST,
    "At least one complete contact group (Callout, Owner, or Billing) is required"
  );
}
```

### Team Lead User Deletion Impact

**Scenario:**
A Team Lead user is being removed from the system, but has resources assigned to them.

**Rules:**
1. System must check for assigned resources before allowing deletion
2. **DA resources**: MUST be reassigned to another Team Lead (cannot be null)
3. **WD resources**: Can be set to null and moved to "Unassigned" OR reassigned
4. Use `userService.removeUser()` for proper handling (see User Access Management module)
5. Audit log must track the reassignment
6. Affected resources must be notified of Team Lead change

**Implementation:**
Handled by `userService.removeUser(id, subdomain, currentUser)` which includes Team Lead logic.
See User Access Management Module > Admin Rules for detailed user deletion workflow.


## API Endpoints

### Endpoints Available to Admin

#### Internal Resources (DA/WD)
- `POST /api/v1/resources` - Create new internal resource (DA or WD) with default and dynamic fields
- `GET /api/v1/resources` - List all resources (supports filtering by category, Team Lead, pagination)
- `GET /api/v1/resources/:id` - Get single resource details
- `PUT /api/v1/resources/:id` - Update resource information (form-based)
- `PATCH /api/v1/resources/:id/field` - Update single field (inline editing)
- `DELETE /api/v1/resources/:id` - Delete resource (soft or hard based on associations)
- `GET /api/v1/resources/by-category/:categoryId` - Get resources by category
- `GET /api/v1/resources/by-teamlead/:teamLeadId` - Get resources assigned to specific Team Lead
- `GET /api/v1/resources/unassigned` - Get WD resources without Team Lead
- `PUT /api/v1/resources/:id/assign-teamlead` - Assign or reassign Team Lead
- `PUT /api/v1/resources/:id/swap-order` - Swap resource order within team
- `PUT /api/v1/resources/:id/move-team` - Move resource to different team (with validation)
- `GET /api/v1/resources/export` - Export resources as CSV/Excel (respects filters)
- `POST /api/v1/resources/import` - Import resources from CSV/Excel with validation
- `POST /api/v1/resources/filter` - Apply dynamic filter and get results
- `GET /api/v1/resources/map` - Get resources with location data for map view

#### Subcontractors (LC/VG)
- `POST /api/v1/subcontractors` - Create new subcontractor (LC or VG) with dynamic fields
- `GET /api/v1/subcontractors` - List all subcontractors (supports filtering)
- `GET /api/v1/subcontractors/:id` - Get single subcontractor details
- `PUT /api/v1/subcontractors/:id` - Update subcontractor information
- `PATCH /api/v1/subcontractors/:id/field` - Update single field (inline editing)
- `DELETE /api/v1/subcontractors/:id` - Delete subcontractor
- `GET /api/v1/subcontractors/by-category/:categoryId` - Get subcontractors by category (LC or VG)
- `GET /api/v1/subcontractors/by-union-status/:status` - Filter by union status
- `GET /api/v1/subcontractors/avetta` - Get subcontractors with Avetta certification
- `GET /api/v1/subcontractors/export` - Export subcontractors as CSV/Excel (respects filters)
- `POST /api/v1/subcontractors/import` - Import subcontractors from CSV/Excel with validation
- `POST /api/v1/subcontractors/filter` - Apply dynamic filter and get results
- `GET /api/v1/subcontractors/map` - Get subcontractors with location data for map view

#### Location & Geocoding
- `POST /api/v1/resources/:id/geocode` - Geocode address and store location
- `GET /api/v1/resources/:id/location` - Get resource location (lat/lng)
- `PUT /api/v1/resources/:id/location` - Update resource location
- `POST /api/v1/geocoding/autocomplete` - Google Maps autocomplete suggestions
- `POST /api/v1/geocoding/details` - Get full address details from Google Maps

#### User Preferences
- `GET /api/v1/user-preferences/resource-columns` - Get user's column visibility preferences
- `PUT /api/v1/user-preferences/resource-columns` - Update user's column visibility preferences
- `GET /api/v1/user-preferences/resource-filters` - Get user's saved filter presets
- `POST /api/v1/user-preferences/resource-filters` - Save new filter preset
- `PUT /api/v1/user-preferences/resource-filters/:id` - Update filter preset
- `DELETE /api/v1/user-preferences/resource-filters/:id` - Delete filter preset

#### Event-Specific Operations
- `POST /api/v1/events/:eventId/copy-resources` - Copy master resources to event context
- `GET /api/v1/events/:eventId/resources` - Get event-specific resource copies
- `PUT /api/v1/events/:eventId/resources/:resourceId/move` - Move resource between categories for event

**Note:** All endpoints require:
- Authentication via `auth()` middleware
- Permission check via `verifyAccess([{ module: Modules.RESOURCE, action: Actions.* }])`
- Tenant header for multi-tenant support

## Integration Points

### External Systems
- **SMS Service (Twilio)**: Sending notifications to resources (phone normalization required)
- **Email Service (SES)**: Sending welcome emails and notifications (email normalization required)
- **Google Maps API**: 
  - Autocomplete API for address suggestions
  - Geocoding API for lat/lng extraction
  - Maps JavaScript API for map view and clustering
- **Export Services**: Generating CSV/Excel exports of resource data
- **Import Services**: Processing CSV/Excel imports with validation
- **Airtable** (if integrated): Syncing subcontractor data

### Internal Services
- **Form Generator Module**: Dynamic field configuration for resource forms
  - Navigation: Settings → Form Generator → Select Category
  - Provides field definitions, validation rules, input types
  - Category-specific templates (DA, WD, LC, VG)
- **Callout Module**: Resources copied to callout context during events
- **Roster Module**: Resources assigned to rosters based on availability
- **User Service**: Team Lead and Regional Manager user management
  - `userService.removeUser()` for Team Lead deletion handling
- **Dashboard Service**: Email normalization via `cleanEmail()`
- **Log Service**: Audit logging for all resource operations
- **Event Module**: Event creation triggers resource copying
- **Category Service**: Validating category assignments
- **User Preferences Service**: Storing per-user column visibility and filter presets

### Database Services
- **Prisma Client**: Obtained via `tenant.get(subdomain)` for multi-tenant support
- **PostGIS Extension**: Spatial queries for location-based features
  - `ResourceLocation` table with geometry column
  - Spatial indexing for map clustering
  - Distance calculations for proximity searches
- **ResourceMoveEvent Tracking**: For event-specific resource movements
- **ColorCode Table**: Team color assignment and management
- **UserPreferences Table**: Column visibility and filter presets
- **Audit Logging**: All CRUD operations logged

## Notes & Considerations

### Critical Business Rules
1. **DA Category**: Team Lead is MANDATORY - enforce at all levels (API, service, database)
2. **WD Category**: Team Lead is OPTIONAL - "Unassigned" is a valid state
3. **Email Normalization**: ALWAYS use `cleanEmail()` before storage/comparison to prevent duplicates
4. **Phone Normalization**: ALWAYS normalize to 10 digits for SMS delivery
5. **Event-Specific Copies**: Never modify master resources during events - use copies
6. **Subcontractor Uniqueness**: EIN number is the unique identifier, not company name

### Data Integrity
- Soft delete preferred over hard delete for audit trail and compliance
- Resources with active event associations cannot be hard deleted
- Team Lead deletion requires resource reassignment for DA category
- Email uniqueness enforced after normalization (prevents User@example.com vs user@example.com)

### Performance Considerations
- **Resource Listing**:
  - Support pagination (large datasets expected)
  - Filtering by Team Lead should be optimized (common query pattern)
  - AG Grid virtual scrolling for large datasets
  - Column visibility changes should not trigger full data reload
- **Map View & Clustering**:
  - PostGIS spatial indexing for fast location queries
  - Clustering algorithm optimized for large datasets (thousands of resources)
  - Lazy loading of marker details (load on click, not on initial render)
  - Map bounds-based queries to load only visible resources
- **Import/Export**:
  - Imports processed row-by-row with progress tracking
  - Large imports (>1000 rows) should use background job (PgBoss)
  - Export operations asynchronous for large result sets (>5000 rows)
  - Export file generated and emailed rather than direct download for large datasets
- **Inline Editing**:
  - Debounce validation API calls during typing
  - Batch updates when multiple fields changed in quick succession
  - Optimistic UI updates with rollback on error
- **Filtering**:
  - Index frequently filtered columns (category, teamLeadId, email)
  - Complex filters with multiple conditions should use database-level WHERE clauses
  - Filter results cached per user session
- **Event Resource Copying**:
  - Bulk operation - consider background job for large datasets (>1000 resources)
  - Progress tracking via Server-Sent Events (SSE)

### Security Considerations
- **Authentication & Authorization**:
  - All endpoints require authentication and permission checks
  - Multi-tenant isolation via subdomain header - never cross-tenant access
  - Sensitive subcontractor data (EIN, contact info) should have access logging
  - Resource deletion should be role-restricted and audited
- **Import/Export**:
  - Validate file types and sizes before processing (prevent malicious uploads)
  - Sanitize file contents to prevent CSV injection attacks
  - Export files should not contain sensitive data unless explicitly authorized
  - Audit log all import/export operations with user ID and timestamp
- **Google Maps API**:
  - API key should be restricted to specific domains (prevent unauthorized usage)
  - Rate limiting on geocoding requests (prevent abuse)
  - Do not expose API key in client-side code (use server-side proxy)
- **User Preferences**:
  - User preferences isolated per user (cannot access other users' preferences)
  - Filter presets cannot contain SQL injection or XSS payloads
  - Validate and sanitize all filter values before database queries
- **Inline Editing**:
  - Same validation rules as form-based editing
  - Rate limiting on rapid update requests (prevent abuse)
  - Audit log field-level changes for compliance

### UI/UX Implications
- **Form Generator Integration**:
  - Dynamic fields render based on Form Generator configuration
  - Field validation messages come from Form Generator rules
  - Field types (text, dropdown, multi-select, date) determine input controls
  - Required field indicators based on Form Generator settings

- **Inline Editing**:
  - AG Grid provides editable cells with real-time validation
  - Different input controls for different field types
  - Validation errors shown inline next to cell
  - Changes saved per-field with instant feedback

- **Import/Export**:
  - Import template generated from Form Generator configuration
  - Import errors displayed row-by-row with specific error codes
  - Export respects current filters and column visibility settings- 

- **Google Maps Integration**:
  - Address field shows autocomplete dropdown as user types
  - Selecting address auto-populates state, city, zip code
  - Manual entry allowed but recommended to use autocomplete for geocoding

- **Map View**:
  - Toggle between table and map view
  - Clustering shows resource counts in geographic areas
  - Team color-coded markers for easy identification
  - Draw tools for bulk selection
  - Info windows with quick actions

- **Filtering**:
  - Column visibility toggle in header
  - Dynamic filter panel with field/operator/value triplets
  - Filter presets for quick access to common filters
  - Filter badges show active filters

- **Resource Management**:
  - DA resources MUST show Team Lead dropdown as required field
  - WD resources show Team Lead as optional with "Unassigned" option
  - Subcontractor forms have complex multi-contact layout
  - Avetta ID field appears conditionally when Avetta = Yes
  - Team Lead dropdown should filter by category (show only same-category TLs)
  - "Unassigned" group appears only in WD category view
  - Drag handles for resource reordering within teams
  - Visual feedback during drag-and-drop operations
  - Team color coding applied to rows, markers, and clusters

### Future Considerations
- **Core Features**:
  - May need to support temporary Team Lead assignment (vacation coverage)
  - May need resource skill/certification tracking
  - May need resource availability calendar (integration with Roster module)
  - May need automated resource matching for callouts based on skills/location
  - May need subcontractor performance rating system

- **Form Generator Enhancements**:
  - Conditional field visibility (show field X only if field Y has value Z)
  - Field-level permissions (some users can edit, others view-only)
  - Multi-language support for field labels and placeholders
  - Formula fields (calculated based on other fields)

- **Map & Location Features**:
  - Heat maps showing resource density
  - Route optimization for multi-resource assignments
  - Geofencing for automatic availability updates
  - Integration with real-time traffic data
  - Custom map styles and overlays

- **Import/Export**:
  - Support for more file formats (JSON, XML)
  - Template builder UI for custom export formats
  - Scheduled/recurring exports (daily, weekly)
  - Import from external APIs (Airtable, Google Sheets)

- **Filtering & Search**:
  - Full-text search across all resource fields
  - Advanced filter logic (OR conditions, nested groups)
  - Smart filters based on recent activity
  - AI-powered resource recommendations

- **Collaboration**:
  - Share filter presets with other admins/teams
  - Collaborative editing with real-time updates (WebSocket)
  - Comments and notes on resources
  - Resource assignment approval workflows

### Related Documentation
- See **Callout Module** for how resources are used in availability tracking
- See **Roster Module** for how resources are scheduled
- See **User Access Management Module** for Team Lead user management
- See **Form Generator Module** for dynamic field configuration (Settings → Form Generator)
- See **Workspace Rules** for `renumberEventResourcesAfterMasterResourceAdd()` usage
- See **Workspace Rules** for event-specific resource flags (`wasOriginCategory`, `isDestinationCategory`)
- See **Workspace Rules** for multi-tenant Prisma usage via `tenant.get(subdomain)`
- See **Workspace Rules** for email normalization via `cleanEmail()` from Dashboard Service 

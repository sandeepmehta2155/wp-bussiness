# Roster Module - Admin Rules

## Role Overview

**Admin** users have full access to all rosters across all categories and events. They can perform all roster operations without category or team restrictions.

## Access Permissions

### Scope
- **Category Access**: All categories
- **Event Access**: All events
- **Roster Access**: All rosters for all utilities
- **Resource Access**: All resources across all teams

### Required Permissions
```typescript
{ module: Modules.ROSTER, action: Actions.VIEW }   // View rosters
{ module: Modules.ROSTER, action: Actions.CREATE } // Create rosters
{ module: Modules.ROSTER, action: Actions.UPDATE } // Update rosters
{ module: Modules.ROSTER, action: Actions.DELETE } // Delete rosters
{ module: Modules.ROSTER, action: Actions.EXPORT } // Export roster data
```

## Core Business Rules

### 1. Roster Creation

#### Rule: Create New Roster
- **Permission**: `ROSTER.CREATE`
- **Can**: Create rosters for any utility and event
- **Must**:
  - Specify event and utility
  - Assign at least one team lead
  - Set roster name
- **Can Optionally**:
  - Add admin users to roster
  - Configure utility-specific format
  - Add resources during creation

#### Rule: Create Roster from Callout
- **Permission**: `ROSTER.CREATE`, `CALLOUT.VIEW`
- **Can**: Select available resources from callout module
- **Must**:
  - Ensure resources are marked as "Available" in callout
  - Choose existing roster or create new one
  - Assign resources to appropriate team lead
- **System Action**:
  - Update resource status
  - Create roster-resource associations
  - Log action in RosterHistory

#### Rule: Create Roster from Destination Matrix
- **Permission**: `ROSTER.CREATE`, `MATRIX.VIEW`
- **Can**: Add available resources directly from destination matrix
- **Must**:
  - Select from available resources only
  - Assign to roster with team lead structure
- **System Action**:
  - Create roster-resource associations
  - Update resource status
  - Log action in RosterHistory

### 2. Resource Management

#### Rule: Add Resources to Roster
- **Permission**: `ROSTER.UPDATE`
- **Can**: 
  - Add resources from any team
  - Add resources from callout, destination matrix, or roster screen
  - Add multiple resources at once
- **Must**:
  - Ensure resources are available for the event
  - Assign resources to a team lead or secondary team lead
- **Validation**:
  - Resource must be in "Available" status (when adding from callout/matrix)
  - Resource must belong to a team lead
  - No duplicate assignments to same roster
- **System Action**:
  - Create RosterResource entry
  - Update Resource table (set rosterId, rosterName)
  - Update EventResource status if applicable
  - Log action in RosterHistory

#### Rule: Remove Individual Resource
- **Permission**: `ROSTER.UPDATE`
- **Can**: Remove any resource from any roster
- **System Action** (must execute in transaction):
  1. **For Current Event**:
     - Mark resource as "Available" in callout module
     - Set departing location = utility's destination location
  2. **For Other Events**:
     - Delete eventResource entries (status becomes "Not Sent")
  3. **Update Resource Table**:
     - Remove rosterId
     - Remove rosterName
  4. **Restore Team Lead**:
     - Resource returns to original team lead
  5. **Log Action**:
     - Record in RosterHistory with details

#### Rule: Bulk Remove Resources
- **Permission**: `ROSTER.UPDATE`
- **Can**: 
  - Select multiple resources and remove
  - Remove all resources from roster
- **Must**:
  - Execute same logic as individual remove for each resource
  - Handle in transaction for consistency
- **System Action**:
  - Apply individual remove logic to each resource
  - Log bulk action in RosterHistory
  - Maintain data integrity across all affected tables

### 3. Team Lead Management

#### Rule: Change Team Lead (Roster-Specific)
- **Permission**: `ROSTER.UPDATE`
- **Can**: 
  - Reassign resources to different team lead within roster
  - Designate any resource as Secondary Team Lead for the roster
- **Scope**: Roster-only (no impact on callout or resource modules)
- **Must**:
  - Select target team lead or resource to become secondary team lead
  - Update roster-resource associations
- **System Action**:
  - Update RosterResource entries with new team lead
  - Mark reassigned resource as "Secondary Team Lead" if applicable
  - Log action in RosterHistory
- **Important**: This change does NOT affect:
  - Resource module team lead structure
  - Callout module team assignments
  - Base category relationships

### 4. Admin Users Management

#### Rule: Add Admin Users to Roster
- **Permission**: `ROSTER.UPDATE`
- **Can**: Add any admin user to roster for resource contact purposes
- **Must**:
  - Select users with admin role
  - Specify contact purpose/responsibility
- **System Action**:
  - Create RosterAdminUser association
  - Make admin users visible to resources in roster
  - Log action in RosterHistory

#### Rule: Remove Admin Users from Roster
- **Permission**: `ROSTER.UPDATE`
- **Can**: Remove admin users from roster
- **System Action**:
  - Delete RosterAdminUser association
  - Log action in RosterHistory

### 5. Roster Formats

#### Rule: Apply Default Format
- **Permission**: `ROSTER.VIEW`
- **Default Columns**:
  - Gender
  - First Name
  - Last Name
  - Phone
  - Email
  - Job Titles
  - Departing Location
- **Can**: View roster in default format at any time

#### Rule: Apply Utility-Specific Format
- **Permission**: `ROSTER.VIEW`, `UTILITY_MASTER.VIEW`
- **Can**: 
  - Select utility format from dropdown
  - Configure new utility formats via Utility Master module
- **Must**:
  - Utility format must be pre-configured in Utility Master
- **System Action**:
  - Retrieve format configuration
  - Transform roster data to match utility format
  - Display formatted roster

### 6. Roster History

#### Rule: View Roster History
- **Permission**: `ROSTER.VIEW`
- **Can**: 
  - View complete history for any roster
  - Filter history by action type, date, user
- **Tracked Actions**:
  - Resource added (with source: callout/matrix/roster)
  - Resource removed (individual or bulk)
  - Team lead changed
  - Admin user added/removed
  - Roster created
  - Roster updated
  - Format changed
- **History Entry Must Include**:
  - Action type
  - Timestamp
  - User who performed action
  - Affected resource(s)
  - Before/after state (where applicable)

### 7. Export & Reporting

#### Rule: Export Roster Data
- **Permission**: `ROSTER.EXPORT`
- **Can**: 
  - Export to Excel
  - Export to CSV
  - Export with default or utility-specific format
- **Must**:
  - Include all visible columns
  - Respect applied format (default or utility-specific)
  - Include roster metadata (event, utility, date)
- **Can Optionally**:
  - Filter by team lead
  - Filter by status
  - Include/exclude admin users section

### 8. Roster Deletion

#### Rule: Delete Roster
- **Permission**: `ROSTER.DELETE`
- **Can**: Delete any roster
- **Must**:
  - Confirm deletion (destructive action)
  - Handle associated resources appropriately
- **System Action** (in transaction):
  1. Remove all roster-resource associations
  2. Update Resource table (clear rosterId, rosterName)
  3. Update EventResource status for affected resources
  4. Delete RosterAdminUser associations
  5. Archive RosterHistory entries (do not delete)
  6. Delete Roster record
- **Validation**:
  - Cannot delete roster if event is currently active (optional constraint)

## Data Validation Rules

### Resource Addition Validation
```typescript
- Resource must exist and be active
- Resource must not already be on the roster
- Resource must be in valid status for addition (Available)
- Team lead must exist in system
- Event must be active or future
```

### Resource Removal Validation
```typescript
- Resource must exist on the roster
- Roster must be in editable state
```

### Team Lead Change Validation
```typescript
- Target team lead must exist
- Resources being moved must exist on roster
- Secondary team lead designation must be valid
```

### Admin User Addition Validation
```typescript
- User must have admin role
- User must not already be on roster
- User must be active
```

## System Actions & Side Effects

### When Adding Resource from Callout
1. Validate resource availability
2. Create RosterResource entry
3. Update Resource.rosterId and Resource.rosterName
4. Update EventResource status (if exists)
5. Log to RosterHistory

### When Removing Resource
1. **Current Event**:
   - Set EventResource.status = "Available"
   - Set EventResource.departingLocation = utility.destinationLocation
2. **Other Events**:
   - Delete EventResource entries
3. **Resource Table**:
   - Clear Resource.rosterId
   - Clear Resource.rosterName
4. **Roster Table**:
   - Remove RosterResource entry
5. **Log**:
   - Record in RosterHistory

### When Changing Team Lead (Roster-Specific)
1. Update RosterResource.teamLeadId
2. If resource becomes team lead: Set RosterResource.isSecondaryTeamLead = true
3. Log to RosterHistory
4. **DO NOT update**:
   - Resource.teamLeadId (base resource module)
   - EventResource.teamLeadId (callout module)

## Edge Cases & Special Scenarios

### Scenario: Resource Removed from Roster, Event Still Active
- Resource becomes "Available" immediately for current event
- Resource can be re-added to same or different roster
- Departing location updated to utility destination

### Scenario: Bulk Remove All Resources
- All resources returned to original team leads
- All event-specific statuses updated
- Single bulk action logged (with list of affected resources)

### Scenario: Team Lead Changed, Then Resource Removed
- Resource returns to **original** team lead (from Resource module)
- Roster-specific team lead change does not persist after removal

### Scenario: Secondary Team Lead Removed from Roster
- Loses secondary team lead designation
- Resources under secondary team lead must be reassigned
- Returns to original team lead structure

### Scenario: Export with Utility Format Not Configured
- Fall back to default format
- Log warning (optional)
- Notify user of missing configuration

## Implementation Checklist

### Controllers
- [ ] Wrap with `catchAsync`
- [ ] Use `auth()` middleware
- [ ] Apply `verifyAccess([{ module: Modules.ROSTER, action: Actions.X }])`
- [ ] Validate event exists and is accessible
- [ ] Get `prisma` via `tenant.get(subdomain)`
- [ ] Destructure request params
- [ ] Delegate to service layer

### Services
- [ ] Accept object params `{ prisma, userId, rosterId, resourceIds, ... }`
- [ ] Use transactions for multi-table operations (especially remove)
- [ ] Throw `ApiError` with appropriate `httpStatus` codes
- [ ] Log all actions to RosterHistory via `logService`
- [ ] Return typed results

### Transactions Required
- [ ] Resource removal (updates multiple tables)
- [ ] Bulk operations
- [ ] Roster deletion

### Logging Required
- [ ] Resource added
- [ ] Resource removed
- [ ] Team lead changed
- [ ] Admin user added/removed
- [ ] Roster created/deleted

## API Endpoints

### Admin Roster Endpoints
```
POST   /api/v1/roster                      # Create roster
GET    /api/v1/roster                      # List all rosters
GET    /api/v1/roster/:id                  # Get roster details
PUT    /api/v1/roster/:id                  # Update roster
DELETE /api/v1/roster/:id                  # Delete roster

POST   /api/v1/roster/:id/resources        # Add resources
DELETE /api/v1/roster/:id/resources/:resId # Remove resource
POST   /api/v1/roster/:id/resources/bulk   # Bulk add resources
DELETE /api/v1/roster/:id/resources/bulk   # Bulk remove resources

PUT    /api/v1/roster/:id/team-lead        # Change team lead (roster-specific)

POST   /api/v1/roster/:id/admin-users      # Add admin user
DELETE /api/v1/roster/:id/admin-users/:userId # Remove admin user

GET    /api/v1/roster/:id/history          # Get roster history

GET    /api/v1/roster/:id/export           # Export (Excel/CSV)
```

## Testing Considerations

### Test Cases
- Create roster from callout with available resources
- Create roster from destination matrix
- Add resource from roster screen (only when available)
- Remove resource and verify status changes across modules
- Bulk remove resources and verify transaction consistency
- Change team lead and verify isolation from other modules
- Add/remove admin users
- Apply utility format and verify data transformation
- Export roster in different formats
- View roster history with all action types
- Delete roster and verify cleanup

### Mock Data Requirements
- Multiple events with different statuses
- Resources with different team leads
- Utility master configurations
- Available resources in callout/matrix

### Negative Test Cases
- Add unavailable resource (should fail)
- Remove resource not on roster (should fail)
- Change team lead without permission (should fail)
- Export with invalid format (should fall back to default)

---

**Last Updated**: October 8, 2025
**Version**: 1.0

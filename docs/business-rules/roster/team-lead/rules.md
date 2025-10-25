# Roster Module - Team Lead Rules

## Role Overview

**Team Lead** users can manage rosters for their own team and resources within their assigned category. They have full roster management capabilities but are scoped to their team only - they cannot view or interact with other team leads' rosters or resources.

## Access Permissions

### Scope
- **Category Access**: Own assigned category only
- **Event Access**: Events within assigned category
- **Roster Access**: Rosters containing their team resources only
- **Resource Access**: Own team resources only

### Required Permissions
```typescript
{ module: Modules.ROSTER, action: Actions.VIEW }   // View own team rosters
{ module: Modules.ROSTER, action: Actions.CREATE } // Create rosters for own team
{ module: Modules.ROSTER, action: Actions.UPDATE } // Update own team rosters
{ module: Modules.ROSTER, action: Actions.EXPORT } // Export own roster data
```

### Access Restrictions
- **Cannot** view rosters of other team leads
- **Cannot** add resources from other teams
- **Cannot** access events outside assigned category
- **Cannot** delete rosters (admin-only operation)

## Core Business Rules

### 1. Roster Visibility

#### Rule: View Own Team Rosters Only
- **Permission**: `ROSTER.VIEW`
- **Can**: View rosters containing own team resources
- **Cannot**: View rosters of other team leads
- **Filter**:
  ```typescript
  where: {
    categoryId: teamLead.categoryId,
    teamLeadId: teamLead.userId,
    OR: [
      { RosterResource: { some: { teamLeadId: teamLead.userId } } },
      { RosterResource: { some: { Resource: { teamLeadId: teamLead.userId } } } }
    ]
  }
  ```
- **UI Behavior**: Only show own team's rosters in listing

### 2. Roster Creation

#### Rule: Create New Roster for Own Team
- **Permission**: `ROSTER.CREATE`
- **Can**: Create rosters for events in assigned category
- **Must**:
  - Event must be in team lead's category
  - Assign resources from own team only
  - Set roster name
- **Cannot**:
  - Create rosters with resources from other teams
  - Create rosters for events in other categories
- **System Action**:
  - Set categoryId = teamLead.categoryId
  - Set primaryTeamLeadId = teamLead.userId
  - Log action in RosterHistory

#### Rule: Create Roster from Callout (Own Resources)
- **Permission**: `ROSTER.CREATE`, `CALLOUT.VIEW`
- **Can**: 
  - Select available resources from own team in callout module
  - Add to existing roster or create new roster
- **Must**:
  - Resources must be marked as "Available" in callout
  - Resources must belong to team lead's team
  - Event must be in assigned category
- **Cannot**:
  - Select resources from other teams
- **System Action**:
  - Create roster-resource associations for selected resources
  - Update resource status
  - Log action in RosterHistory

#### Rule: Create Roster from Destination Matrix (Own Resources)
- **Permission**: `ROSTER.CREATE`, `MATRIX.VIEW`
- **Can**: Add available resources from own team in destination matrix
- **Must**:
  - Select from own team's available resources only
- **Filter**: Show only own team resources in destination matrix
- **System Action**:
  - Create roster-resource associations
  - Update resource status
  - Log action in RosterHistory

### 3. Resource Management

#### Rule: Add Resources to Roster
- **Permission**: `ROSTER.UPDATE`
- **Can**: 
  - Add resources from own team only
  - Add resources from callout, destination matrix, or roster screen
  - "Add Resource" button appears only when own team resources are available
- **Must**:
  - Resource must be available for the event
  - Resource must belong to team lead's team
  - Roster must belong to team lead
- **Validation**:
  ```typescript
  - Resource.teamLeadId === currentUser.userId
  - Resource.status === "Available" (for callout/matrix)
  - Resource.categoryId === currentUser.categoryId
  - Roster.teamLeadId === currentUser.userId
  ```
- **System Action**:
  - Create RosterResource entry
  - Update Resource.rosterId and Resource.rosterName
  - Update EventResource status if applicable
  - Log action in RosterHistory

#### Rule: Remove Individual Resource
- **Permission**: `ROSTER.UPDATE`
- **Can**: Remove resources from own team rosters
- **Cannot**: Remove resources from other team leads' rosters
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
     - Resource returns to original team lead (self)
  5. **Log Action**:
     - Record in RosterHistory with details

#### Rule: Bulk Remove Resources
- **Permission**: `ROSTER.UPDATE`
- **Can**: 
  - Select multiple own team resources and remove
  - Remove all resources from own roster
- **Must**:
  - All resources must belong to team lead's team
  - Execute in transaction for consistency
- **System Action**:
  - Apply individual remove logic to each resource
  - Log bulk action in RosterHistory
  - Maintain data integrity across all affected tables

### 4. Team Lead Management (Roster-Specific)

#### Rule: Change Team Lead Within Own Team
- **Permission**: `ROSTER.UPDATE`
- **Can**: 
  - Reassign own team resources to different grouping within roster
  - Designate one of own resources as Secondary Team Lead for the roster
- **Scope**: Roster-only (no impact on callout or resource modules)
- **Must**:
  - Target team lead or secondary team lead must be from own team
  - All resources being reassigned must be from own team
- **Cannot**:
  - Assign resources to team leads from other teams
  - Create secondary team lead from other teams' resources
- **System Action**:
  - Update RosterResource entries with new team lead assignment
  - Mark resource as "Secondary Team Lead" if applicable
  - Log action in RosterHistory
- **Important**: This change does NOT affect:
  - Resource module team lead structure
  - Callout module team assignments
  - Base category relationships

### 5. Admin Users Management

#### Rule: Add Admin Users to Own Rosters
- **Permission**: `ROSTER.UPDATE`
- **Can**: Add admin users to own team rosters for resource contact purposes
- **Must**:
  - Roster must belong to team lead
  - Admin user must be active
- **Purpose**: Provide additional contact points for resources in case of miscommunication with team lead
- **System Action**:
  - Create RosterAdminUser association
  - Make admin users visible to resources in roster
  - Log action in RosterHistory

#### Rule: Remove Admin Users from Own Rosters
- **Permission**: `ROSTER.UPDATE`
- **Can**: Remove admin users from own team rosters
- **System Action**:
  - Delete RosterAdminUser association
  - Log action in RosterHistory

### 6. Roster Formats

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
- **Can**: View own team roster in default format

#### Rule: Apply Utility-Specific Format
- **Permission**: `ROSTER.VIEW`
- **Can**: 
  - Select utility format from dropdown for own rosters
  - View roster data formatted according to utility requirements
- **Must**:
  - Utility format must be pre-configured (by admin)
- **System Action**:
  - Retrieve format configuration
  - Transform own team roster data to match utility format
  - Display formatted roster

### 7. Roster History

#### Rule: View Own Roster History
- **Permission**: `ROSTER.VIEW`
- **Can**: 
  - View complete history for own team rosters
  - Filter history by action type, date, resource
- **Cannot**: View history of other team leads' rosters
- **Tracked Actions**:
  - Resource added (with source: callout/matrix/roster)
  - Resource removed (individual or bulk)
  - Team lead changed (roster-specific)
  - Admin user added/removed
  - Roster created
  - Roster updated
  - Format changed
- **History Entry Includes**:
  - Action type
  - Timestamp
  - User who performed action
  - Affected resource(s)
  - Before/after state (where applicable)

### 8. Export & Reporting

#### Rule: Export Own Roster Data
- **Permission**: `ROSTER.EXPORT`
- **Can**: 
  - Export own team rosters to Excel
  - Export own team rosters to CSV
  - Export with default or utility-specific format
- **Must**:
  - Include all visible columns
  - Respect applied format (default or utility-specific)
  - Include roster metadata (event, utility, date)
  - Only export own team resources
- **Can Optionally**:
  - Filter by secondary team lead
  - Filter by status
  - Include/exclude admin users section

## Data Validation Rules

### Resource Addition Validation
```typescript
- Resource.teamLeadId === currentUser.userId (own team only)
- Resource.categoryId === currentUser.categoryId
- Resource must exist and be active
- Resource must not already be on the roster
- Resource must be in valid status for addition (Available)
- Event must be in team lead's category
```

### Resource Removal Validation
```typescript
- Resource must exist on the roster
- Resource must belong to team lead's team
- Roster must belong to team lead
- Roster must be in editable state
```

### Team Lead Change Validation
```typescript
- All resources must belong to team lead's team
- Target team lead/secondary team lead must be from own team
- Resources being moved must exist on roster
- Secondary team lead designation must be from own team
```

### Admin User Addition Validation
```typescript
- User must have admin role
- User must not already be on roster
- User must be active
- Roster must belong to team lead
```

## System Actions & Side Effects

### When Adding Resource from Callout
1. Validate resource belongs to team lead
2. Validate resource availability
3. Create RosterResource entry
4. Update Resource.rosterId and Resource.rosterName
5. Update EventResource status (if exists)
6. Log to RosterHistory

### When Removing Resource
1. **Current Event**:
   - Set EventResource.status = "Available"
   - Set EventResource.departingLocation = utility.destinationLocation
2. **Other Events**:
   - Delete EventResource entries (mark as "Not Sent")
3. **Resource Table**:
   - Clear Resource.rosterId
   - Clear Resource.rosterName
4. **Roster Table**:
   - Remove RosterResource entry
5. **Team Lead**:
   - Resource returns to team lead (self)
6. **Log**:
   - Record in RosterHistory

### When Changing Team Lead (Roster-Specific)
1. Validate all resources and target team lead belong to own team
2. Update RosterResource.teamLeadId (or assign secondaryTeamLeadId)
3. If resource becomes team lead: Set RosterResource.isSecondaryTeamLead = true
4. Log to RosterHistory
5. **DO NOT update**:
   - Resource.teamLeadId (base resource module)
   - EventResource.teamLeadId (callout module)

## UI/UX Considerations

### Roster Listing Page
- Show only own team rosters
- Display team lead name at top of each roster table
- List resources under team lead
- Indicate secondary team leads with badge/icon

### Add Resource Button
- Show "Add Resource" button only when:
  - Own team has available resources for the event
  - User has ROSTER.UPDATE permission
- Disable if no available resources

### Bulk Actions
- Show checkboxes for own team resources
- Enable bulk actions:
  - Remove selected
  - Remove all
  - Change team lead (roster-specific)

### Team Lead Scope Indicator
- Display current team lead name/category in UI
- Show "My Team" label on rosters
- Hide other team leads' rosters from navigation

## Edge Cases & Special Scenarios

### Scenario: Resource Removed, Event Still Active
- Resource becomes "Available" immediately for current event in team lead's callout view
- Resource can be re-added to same or different roster
- Departing location updated to utility destination
- Resource visible in team lead's destination matrix (if applicable)

### Scenario: Bulk Remove All Resources from Roster
- All resources returned to team lead (self)
- All event-specific statuses updated
- Single bulk action logged (with list of affected resources)
- Roster may become empty (still exists)

### Scenario: Team Lead Changed, Then Resource Removed
- Resource returns to original team lead (self)
- Roster-specific team lead change does not persist after removal
- Secondary team lead designation lost

### Scenario: Secondary Team Lead Removed from Roster
- Loses secondary team lead designation for that roster
- Resources under secondary team lead must be reassigned before removal (validation)
- Returns to regular resource status under primary team lead

### Scenario: Team Lead Tries to View Another Team's Roster
- Roster not shown in listing
- Direct URL access returns 403 Forbidden
- Error message: "You can only view rosters for your team"

### Scenario: Team Lead Tries to Add Resource from Another Team
- Resource not shown in available resources list
- API validation prevents addition
- Error message: "You can only add resources from your team"

### Scenario: Export with Utility Format Not Configured
- Fall back to default format
- Show notification: "Utility format not available, using default"

### Scenario: Add Resource Button Not Visible
- No available resources from own team for the event
- Check callout module for resource availability
- Message: "No available resources to add"

## Implementation Checklist

### Controllers
- [ ] Wrap with `catchAsync`
- [ ] Use `auth()` middleware
- [ ] Apply `verifyAccess([{ module: Modules.ROSTER, action: Actions.X }])`
- [ ] Validate category access (team lead scope)
- [ ] Filter by `teamLeadId = req.user.userId`
- [ ] Get `prisma` via `tenant.get(subdomain)`
- [ ] Destructure request params
- [ ] Delegate to service layer

### Services
- [ ] Accept object params `{ prisma, userId, categoryId, rosterId, resourceIds, ... }`
- [ ] Filter by team lead: `teamLeadId = userId`
- [ ] Filter by category: `categoryId = user.categoryId`
- [ ] Use transactions for multi-table operations
- [ ] Throw `ApiError` with appropriate `httpStatus` codes
- [ ] Log all actions to RosterHistory via `logService`
- [ ] Return typed results

### Validation
- [ ] Validate resource belongs to team lead
- [ ] Validate category access
- [ ] Validate roster ownership
- [ ] Validate event belongs to category

### Transactions Required
- [ ] Resource removal (updates multiple tables)
- [ ] Bulk operations
- [ ] Team lead change with multiple resources

### Logging Required
- [ ] Resource added
- [ ] Resource removed
- [ ] Team lead changed
- [ ] Admin user added/removed
- [ ] Roster created

## API Endpoints

### Team Lead Roster Endpoints
```
POST   /api/v1/roster                      # Create roster (own team)
GET    /api/v1/roster                      # List own team rosters
GET    /api/v1/roster/:id                  # Get own roster details
PUT    /api/v1/roster/:id                  # Update own roster

POST   /api/v1/roster/:id/resources        # Add own team resources
DELETE /api/v1/roster/:id/resources/:resId # Remove own team resource
POST   /api/v1/roster/:id/resources/bulk   # Bulk add own team resources
DELETE /api/v1/roster/:id/resources/bulk   # Bulk remove own team resources

PUT    /api/v1/roster/:id/team-lead        # Change team lead (roster-specific, own team)

POST   /api/v1/roster/:id/admin-users      # Add admin user to own roster
DELETE /api/v1/roster/:id/admin-users/:userId # Remove admin user from own roster

GET    /api/v1/roster/:id/history          # Get own roster history

GET    /api/v1/roster/:id/export           # Export own roster (Excel/CSV)
```

### Scoping Middleware
All endpoints must include:
```typescript
router.use(validateCategoryAccess({ requireTeamLead: true }));
```

## Testing Considerations

### Test Cases
- Create roster with own team resources
- Try to create roster with other team's resources (should fail)
- Add resource from callout (own team available resources)
- Try to add resource from another team (should fail)
- Remove resource and verify status changes
- Bulk remove resources
- Change team lead within own team
- Try to change team lead to another team (should fail)
- Add/remove admin users
- View roster history (own team only)
- Export roster in different formats
- Try to view another team's roster (should fail)

### Mock Data Requirements
- Multiple team leads with separate teams
- Resources belonging to different teams
- Events in different categories
- Available resources for each team

### Negative Test Cases
- Add resource from another team (should return 403)
- View roster of another team (should return 403)
- Remove resource from another team's roster (should return 403)
- Change team lead to another team (should return 400)
- Access event in another category (should return 403)

---

**Last Updated**: October 8, 2025
**Version**: 1.0

# Roster Module - Secondary Team Lead Rules

## Role Overview

**Secondary Team Lead** is a roster-specific designation where a resource is assigned as a team lead for a particular roster. This role provides limited management capabilities scoped to the specific roster they are assigned to. Secondary team leads have viewing access and can perform basic actions but cannot perform structural changes to the roster.

## Key Concept

**Secondary Team Lead is NOT a system-wide role**. It is a roster-specific assignment where:
- A resource from the team is designated as "team lead" for a specific roster
- This designation exists ONLY within that roster context
- It does NOT affect the resource's role in other modules (Callout, Resource, etc.)
- They are essentially resources with elevated viewing permissions for their roster

## Access Permissions

### Scope
- **Category Access**: Same as their base team lead's category
- **Event Access**: Only the event(s) for which they are designated as secondary team lead
- **Roster Access**: Only roster(s) where they are designated as secondary team lead
- **Resource Access**: Only resources within their assigned roster

### Required Permissions
```typescript
{ module: Modules.ROSTER, action: Actions.VIEW }   // View assigned roster
{ module: Modules.ROSTER, action: Actions.EXPORT } // Export assigned roster data
```

### Access Restrictions
- **Cannot** view rosters where they are not designated as secondary team lead
- **Cannot** view other team leads' rosters
- **Cannot** create new rosters
- **Cannot** delete rosters
- **Cannot** add new resources to roster
- **Cannot** perform bulk operations
- **Cannot** change team lead assignments
- **Cannot** add/remove admin users
- **Limited** remove capabilities (if permitted by configuration)

## Core Business Rules

### 1. Roster Visibility

#### Rule: View Only Assigned Rosters
- **Permission**: `ROSTER.VIEW`
- **Can**: View rosters where designated as secondary team lead
- **Cannot**: 
  - View primary team lead's other rosters
  - View rosters of other team leads
  - View rosters where they are a regular resource
- **Filter**:
  ```typescript
  where: {
    RosterResource: {
      some: {
        resourceId: currentUser.resourceId,
        isSecondaryTeamLead: true
      }
    }
  }
  ```
- **UI Behavior**: Only show rosters where user is secondary team lead

#### Rule: Navigation from Event Listing
- **Can**: Access roster from event listing page
- **Flow**:
  1. User sees events in event listing
  2. User clicks on roster for an event
  3. System checks if user is secondary team lead for that roster
  4. If yes: Show roster with resources
  5. If no: Show access denied
- **Display**: Show only their roster resources, not other rosters for same event

### 2. Roster Viewing

#### Rule: View Roster Resources
- **Permission**: `ROSTER.VIEW`
- **Can**: 
  - View all resources in assigned roster
  - See team lead name at top of roster table
  - View resource details (name, phone, email, job titles, location)
  - See own secondary team lead designation
- **Display Structure**:
  - Primary team lead name at top
  - Secondary team lead (self) indicated with badge
  - Resources under secondary team lead
  - Admin users section

#### Rule: View Roster Formats
- **Permission**: `ROSTER.VIEW`
- **Default Columns**:
  - Gender
  - First Name
  - Last Name
  - Phone
  - Email
  - Job Titles
  - Departing Location
- **Can**: 
  - View roster in default format
  - Select utility-specific format if available
- **Cannot**: Configure or create new formats

### 3. Limited Resource Management

#### Rule: Remove Resource (Optional/Configurable)
- **Permission**: `ROSTER.UPDATE` (if granted)
- **Can**: Remove resources from assigned roster (if configuration allows)
- **Scope**: Only from roster where they are secondary team lead
- **Validation**:
  - Must be secondary team lead for the roster
  - Resource must be in the same roster
  - Cannot remove primary team lead
  - Cannot remove self if resources are still under them
- **System Action** (if permitted):
  1. **For Current Event**:
     - Mark resource as "Available" in callout module
     - Set departing location = utility's destination location
  2. **For Other Events**:
     - Delete eventResource entries
  3. **Update Resource Table**:
     - Remove rosterId
     - Remove rosterName
  4. **Roster Table**:
     - Remove RosterResource entry
  5. **Log Action**:
     - Record in RosterHistory with secondary team lead as actor

**Note**: This permission may be restricted by configuration. By default, secondary team leads have view-only access.

### 4. Roster History

#### Rule: View Assigned Roster History
- **Permission**: `ROSTER.VIEW`
- **Can**: 
  - View history for assigned roster only
  - Filter history by action type, date
- **Cannot**: View history of other rosters
- **Tracked Actions Visible**:
  - Resource added
  - Resource removed
  - Team lead changed
  - Admin user added/removed
  - Own designation as secondary team lead
- **Purpose**: Understand roster changes and maintain awareness

### 5. Export & Reporting

#### Rule: Export Assigned Roster Data
- **Permission**: `ROSTER.EXPORT`
- **Can**: 
  - Export assigned roster to Excel
  - Export assigned roster to CSV
  - Export with default or utility-specific format
- **Must**:
  - Only export roster where user is secondary team lead
  - Include all visible columns
  - Respect applied format
  - Include roster metadata
- **Cannot**: 
  - Export other rosters
  - Configure export format

### 6. Restrictions

#### Rule: Cannot Create Rosters
- **Restriction**: Secondary team leads cannot create new rosters
- **Reason**: Roster creation is reserved for admins and primary team leads
- **UI**: "Create Roster" button not visible

#### Rule: Cannot Add Resources
- **Restriction**: Secondary team leads cannot add resources to roster
- **Reason**: Resource management is reserved for admins and primary team leads
- **UI**: "Add Resource" button not visible

#### Rule: Cannot Perform Bulk Operations
- **Restriction**: Cannot perform bulk actions like:
  - Bulk remove resources
  - Remove all resources
  - Change team lead for multiple resources
- **Reason**: Structural roster changes reserved for admins and primary team leads
- **UI**: Bulk action checkboxes not visible or disabled

#### Rule: Cannot Change Team Lead Assignments
- **Restriction**: Cannot reassign resources to different team leads (even roster-specific)
- **Reason**: Team structure management reserved for admins and primary team leads
- **UI**: "Change Team Lead" option not visible

#### Rule: Cannot Manage Admin Users
- **Restriction**: Cannot add or remove admin users from roster
- **Can**: View admin users section for contact purposes
- **Reason**: Admin user management reserved for admins and primary team leads

### 7. Communication & Coordination

#### Rule: Contact Admin Users
- **Can**: 
  - View admin users assigned to roster
  - Contact admin users if miscommunication occurs with primary team lead
  - Use admin users as escalation point
- **Purpose**: Provide backup communication channel for roster operations

#### Rule: Handle Actions for Resources
- **Can**: 
  - Coordinate with resources in roster
  - Communicate roster assignments
  - Address resource questions
  - Report issues to primary team lead or admin users
- **Cannot**: Make system changes without permission

## Data Validation Rules

### Roster Access Validation
```typescript
- User must be designated as secondary team lead for the roster
- RosterResource.resourceId === currentUser.resourceId
- RosterResource.isSecondaryTeamLead === true
- Roster must be active
```

### Resource Removal Validation (if permitted)
```typescript
- User must be secondary team lead for roster
- Resource must exist on the roster
- Resource must not be primary team lead
- Resource must not be self (if other resources under them)
- Roster must be in editable state
```

### Export Validation
```typescript
- User must be secondary team lead for roster
- Roster must be accessible to user
- Format must be valid (default or configured utility format)
```

## System Actions & Side Effects

### When Designated as Secondary Team Lead
1. RosterResource entry created/updated:
   - resourceId = user's resource ID
   - isSecondaryTeamLead = true
2. User gains view access to specific roster
3. Logged in RosterHistory

### When Removed as Secondary Team Lead
1. RosterResource entry updated:
   - isSecondaryTeamLead = false
   OR entry removed from roster
2. User loses view access to specific roster
3. Resources under secondary team lead reassigned to primary team lead
4. Logged in RosterHistory

### When Secondary Team Lead Removes Resource (if permitted)
1. Same system actions as primary team lead removal
2. Actor logged as secondary team lead user
3. Notification may be sent to primary team lead (optional)

## UI/UX Considerations

### Dashboard/Navigation
- Event listing shows only events where user is secondary team lead
- Roster link appears only for events with secondary team lead assignment
- Clear indicator of "Secondary Team Lead" role in UI

### Roster Viewing Page
- Display primary team lead name at top
- Show secondary team lead (self) with distinctive badge/indicator
- List resources under secondary team lead
- Admin users section visible for contact
- Limited action buttons (view-focused interface)

### What Secondary Team Leads See
```
Roster: [Utility Name] - [Event Name]
Primary Team Lead: [Name]

Secondary Team Lead: [Your Name] ⭐

Resources:
- Resource 1 (details)
- Resource 2 (details)
- Resource 3 (details)

Admin Users:
- Admin 1 (contact info)
- Admin 2 (contact info)

Actions Available:
- Export to Excel
- Export to CSV
- View History
- [Remove Resource] (if permitted)
```

### What Secondary Team Leads Don't See
- Other rosters for the same event
- Resources from other team leads
- Create/Add resource buttons
- Bulk action checkboxes
- Change team lead options
- Admin user management

### Mobile/Responsive Considerations
- Simplified view for secondary team leads
- Quick access to contact information (admin users, primary team lead)
- Easy export for sharing with resources

## Edge Cases & Special Scenarios

### Scenario: Secondary Team Lead Tries to Access Another Roster
- Roster not shown in listing
- Direct URL access returns 403 Forbidden
- Error message: "You can only view rosters where you are designated as secondary team lead"

### Scenario: Secondary Team Lead Removed from Roster
- Immediate loss of access to that roster
- Resources under secondary team lead reassigned to primary team lead
- User redirected to accessible rosters or home page
- Notification: "You have been removed as secondary team lead from [Roster Name]"

### Scenario: Secondary Team Lead for Multiple Rosters
- Can be designated as secondary team lead for multiple rosters (even different events)
- Dashboard shows all rosters where they have secondary team lead designation
- Each roster viewed independently

### Scenario: Resource Becomes Secondary Team Lead
- Resource maintains all existing resource capabilities in other modules
- Gains additional roster viewing access for specific roster(s)
- Roster module shows secondary team lead interface
- Other modules (Callout, Matrix) show regular resource interface

### Scenario: Secondary Team Lead Logs In from Event Listing
- User clicks on event in event listing
- System detects secondary team lead designation
- User directed to roster view (not callout or other views)
- Sees only resources in their roster

### Scenario: Primary Team Lead Changes Secondary Team Lead
- User loses secondary team lead designation
- Access to roster removed immediately
- Redirected if currently viewing the roster
- Notification of change

### Scenario: Export with Utility Format Not Configured
- Fall back to default format
- Show notification: "Utility format not available, using default"

## Implementation Checklist

### Controllers
- [ ] Wrap with `catchAsync`
- [ ] Use `auth()` middleware
- [ ] Apply `verifyAccess([{ module: Modules.ROSTER, action: Actions.VIEW }])`
- [ ] Validate secondary team lead designation
- [ ] Filter by `RosterResource.resourceId = req.user.resourceId AND isSecondaryTeamLead = true`
- [ ] Get `prisma` via `tenant.get(subdomain)`
- [ ] Throw 403 if not secondary team lead for requested roster
- [ ] Delegate to service layer

### Services
- [ ] Accept object params `{ prisma, userId, resourceId, rosterId, ... }`
- [ ] Filter by secondary team lead: `RosterResource.resourceId = resourceId AND isSecondaryTeamLead = true`
- [ ] Validate roster access before operations
- [ ] Throw `ApiError` with appropriate `httpStatus` codes
- [ ] Log actions to RosterHistory with secondary team lead as actor
- [ ] Return typed results

### Validation
- [ ] Validate secondary team lead designation
- [ ] Validate roster accessibility
- [ ] Restrict create/add/bulk operations
- [ ] Allow view and export operations
- [ ] Conditionally allow remove operation (based on configuration)

### UI/UX
- [ ] Show secondary team lead badge/indicator
- [ ] Hide create/add/bulk action buttons
- [ ] Display admin users for contact
- [ ] Simplify interface (view-focused)
- [ ] Show only accessible rosters in listing

### Logging Required
- [ ] Resource removed (if permitted)
- [ ] Roster exported
- [ ] History viewed

## API Endpoints

### Secondary Team Lead Roster Endpoints
```
GET    /api/v1/roster                      # List rosters with secondary team lead designation
GET    /api/v1/roster/:id                  # Get roster details (if secondary team lead)

DELETE /api/v1/roster/:id/resources/:resId # Remove resource (if permitted and configured)

GET    /api/v1/roster/:id/history          # Get roster history

GET    /api/v1/roster/:id/export           # Export roster (Excel/CSV)
```

### Scoping Middleware
All endpoints must include:
```typescript
router.use(validateSecondaryTeamLeadAccess());
```

### Forbidden Endpoints for Secondary Team Leads
```
POST   /api/v1/roster                      # Cannot create
PUT    /api/v1/roster/:id                  # Cannot update roster settings
DELETE /api/v1/roster/:id                  # Cannot delete
POST   /api/v1/roster/:id/resources        # Cannot add resources
POST   /api/v1/roster/:id/resources/bulk   # Cannot bulk add
DELETE /api/v1/roster/:id/resources/bulk   # Cannot bulk remove
PUT    /api/v1/roster/:id/team-lead        # Cannot change team lead
POST   /api/v1/roster/:id/admin-users      # Cannot add admin users
DELETE /api/v1/roster/:id/admin-users/:userId # Cannot remove admin users
```

## Testing Considerations

### Test Cases
- Designate resource as secondary team lead
- View roster as secondary team lead
- Try to view another roster (should fail)
- Remove resource as secondary team lead (if permitted)
- Try to add resource (should fail)
- Try to perform bulk operations (should fail)
- Export roster in different formats
- View roster history
- Try to change team lead (should fail)
- Try to add admin user (should fail)
- Access roster from event listing page
- Multiple secondary team lead designations for same user

### Mock Data Requirements
- Primary team lead with resources
- Resource designated as secondary team lead
- Multiple rosters with different secondary team leads
- Events with rosters

### Negative Test Cases
- Access roster without secondary team lead designation (should return 403)
- Try to create roster (should return 403)
- Try to add resource (should return 403)
- Try to change team lead (should return 403)
- Try to manage admin users (should return 403)
- Try to perform bulk operations (should return 403)

---

**Last Updated**: October 8, 2025
**Version**: 1.0

# Roster Module - Access-Based User Rules

## Role Overview

**Access-Based User** is the most restrictive role in the system. These users operate on a strict permission-based access model where they can only perform actions explicitly granted through module-action permissions. In the context of the Roster module, access-based users typically have very limited or no access, as roster management is primarily a responsibility of admins and team leads.

## Key Concept

Access-based users require **explicit permission grants** for every operation. Without specific permissions, they cannot perform any roster-related actions.

## Access Permissions

### Scope
- **Category Access**: Limited to own assignments (if any)
- **Event Access**: Limited to events they are personally involved in
- **Roster Access**: Only rosters where they are assigned as a resource (if view permission granted)
- **Resource Access**: Own profile/information only

### Potential Permissions (Must be Explicitly Granted)
```typescript
{ module: Modules.ROSTER, action: Actions.VIEW }   // View own roster assignments (rarely granted)
{ module: Modules.ROSTER, action: Actions.EXPORT } // Export own roster info (rarely granted)
```

### Default State
- **By default**: Access-based users have **NO** roster permissions
- **Cannot**: Perform any roster operations without explicit grants
- **Primary Use**: Self-service profile management in User module

## Core Business Rules

### 1. Roster Visibility

#### Rule: No Roster Access by Default
- **Default State**: Cannot view any rosters
- **Cannot**: 
  - View roster listings
  - Access roster details
  - See other resources on rosters
  - View team lead information
- **Reason**: Roster management is administrative function

#### Rule: View Own Roster Assignment (If Permission Granted)
- **Permission**: `ROSTER.VIEW` (must be explicitly granted)
- **Can**: View roster where they are assigned as a resource
- **Scope**: Only rosters containing self as resource
- **Filter**:
  ```typescript
  where: {
    RosterResource: {
      some: {
        resourceId: currentUser.resourceId
      }
    }
  }
  ```
- **Display**: 
  - Own information only
  - Team lead name for contact
  - Admin users for escalation
  - Event and utility information
- **Cannot**: View other resources on the same roster (privacy)

### 2. Own Information Viewing

#### Rule: View Own Roster Details
- **Permission**: `ROSTER.VIEW` (if granted)
- **Can**: 
  - See which roster they are assigned to
  - View event name and date
  - View utility company name
  - See team lead contact information
  - See admin users for questions
  - View own departing location
  - View own job title assignment
- **Cannot**:
  - See other resources on roster
  - View full roster structure
  - Access roster history
  - See roster creation/modification details

### 3. Export Own Information

#### Rule: Export Own Roster Assignment
- **Permission**: `ROSTER.EXPORT` (if granted)
- **Can**: Export own roster assignment details to Excel/CSV
- **Included Information**:
  - Own name, contact, job title
  - Event name and date
  - Utility company name
  - Departing location
  - Team lead contact
  - Admin users contact
- **Cannot**: 
  - Export other resources' information
  - Export full roster
  - Export multiple rosters

### 4. Restrictions

#### Rule: Cannot Create Rosters
- **Restriction**: Access-based users can never create rosters
- **Reason**: Roster creation is administrative function
- **No Permission**: `ROSTER.CREATE` never granted to access-based users

#### Rule: Cannot Modify Rosters
- **Restriction**: Access-based users can never modify rosters
- **Cannot**:
  - Add resources
  - Remove resources (even self)
  - Change team lead assignments
  - Modify roster settings
  - Add/remove admin users
- **Reason**: Roster management is administrative function
- **No Permission**: `ROSTER.UPDATE` never granted to access-based users

#### Rule: Cannot Delete Rosters
- **Restriction**: Access-based users can never delete rosters
- **Reason**: Roster deletion is administrative function
- **No Permission**: `ROSTER.DELETE` never granted to access-based users

#### Rule: Cannot View Roster History
- **Restriction**: Access-based users cannot view roster history
- **Reason**: History contains information about other resources and administrative actions
- **Privacy**: Protects other users' information

#### Rule: Cannot Access Team-Wide Information
- **Restriction**: Cannot view:
  - Other resources on roster
  - Team structure
  - Resource assignments
  - Full roster listing
- **Reason**: Privacy and need-to-know principle

### 5. Self-Service Profile Management

#### Rule: Update Own Profile
- **Primary Function**: Access-based users focus on self-service operations
- **Can**: 
  - Update own contact information (in User module)
  - Update availability (in Callout module, if granted)
  - View own assignments
- **Note**: Profile updates may affect roster displays if user is assigned to roster

### 6. Communication

#### Rule: Contact Team Lead
- **Can**: View team lead contact information if assigned to roster
- **Purpose**: Ask questions about roster assignment
- **Method**: Phone, email displayed in roster view (if view permission granted)

#### Rule: Contact Admin Users
- **Can**: View admin users assigned to roster if applicable
- **Purpose**: Escalation point for questions or issues
- **Method**: Contact information displayed in roster view (if view permission granted)

## Data Validation Rules

### View Own Roster Validation
```typescript
- User must have ROSTER.VIEW permission (explicitly granted)
- RosterResource.resourceId === currentUser.resourceId
- User must be active
- Roster must be active
- Event must be accessible to user
```

### Export Own Information Validation
```typescript
- User must have ROSTER.EXPORT permission (explicitly granted)
- RosterResource.resourceId === currentUser.resourceId
- Only own information included in export
```

## System Actions & Side Effects

### When Access-Based User Views Own Roster
1. Validate ROSTER.VIEW permission
2. Validate user is assigned to roster
3. Fetch roster details
4. Filter to show only own information + contacts
5. Display limited view

### When Access-Based User Exports Own Information
1. Validate ROSTER.EXPORT permission
2. Validate user is assigned to roster
3. Fetch own roster assignment details
4. Generate export file with limited information
5. Exclude other resources' information

### When Access-Based User Assigned to Roster
- System action performed by admin or team lead
- Access-based user notified (optional)
- If ROSTER.VIEW permission granted, user can view assignment
- If no permission, user has no awareness of roster assignment

## UI/UX Considerations

### Default State (No Roster Permissions)
- No roster navigation/menu items
- No access to roster pages
- Focus on other modules (profile, availability)

### With ROSTER.VIEW Permission
- Limited "My Assignment" view
- Single card or panel showing:
  - "You are assigned to: [Roster Name]"
  - Event: [Event Name]
  - Utility: [Utility Name]
  - Date: [Event Date]
  - Team Lead: [Name, Phone, Email]
  - Your Job Title: [Title]
  - Your Departing Location: [Location]
  - Admin Contacts: [List]
- No navigation to other rosters
- No action buttons (view-only)

### What Access-Based Users See (If Granted View Permission)
```
My Roster Assignment

Event: Storm Response - October 2025
Utility: ABC Electric Cooperative
Status: Active

Your Assignment:
- Job Title: Lineman
- Departing Location: Warehouse A, Dallas, TX
- Report Time: Oct 10, 2025 6:00 AM

Team Lead Contact:
- Name: John Doe
- Phone: (555) 123-4567
- Email: john.doe@example.com

Admin Support:
- Name: Jane Smith
- Phone: (555) 987-6543
- Email: jane.smith@example.com

[Export My Info] (if export permission granted)
```

### What Access-Based Users Don't See
- Other resources on roster
- Full roster structure
- Team hierarchy
- Roster history
- Other rosters
- Administrative actions
- Bulk operations
- Create/edit/delete options

## Edge Cases & Special Scenarios

### Scenario: Access-Based User Tries to Access Roster Without Permission
- No roster menu items visible
- Direct URL access returns 403 Forbidden
- Error message: "You do not have permission to view rosters"

### Scenario: Access-Based User Assigned to Multiple Rosters
- Rare scenario (if view permission granted)
- Show list of own assignments
- Each assignment displayed separately
- Cannot see relationship between rosters

### Scenario: Access-Based User Removed from Roster
- If view permission granted: Roster assignment no longer visible
- Notification (optional): "Your roster assignment has been updated"
- No access to historical roster information

### Scenario: Access-Based User Granted View Permission Mid-Event
- User gains ability to see own roster assignment
- No historical data shown
- Current assignment only

### Scenario: Team Lead Contact Information Changes
- Access-based user sees updated contact information
- No notification of change (system update)

### Scenario: Access-Based User Tries to Export Without Permission
- Export button not visible
- API request returns 403 Forbidden
- Error message: "You do not have permission to export roster information"

### Scenario: Access-Based User Requests Roster Change
- Must contact team lead or admin users
- Cannot self-remove from roster
- Cannot request assignment through system
- Out-of-system communication required

## Implementation Checklist

### Controllers
- [ ] Wrap with `catchAsync`
- [ ] Use `auth()` middleware
- [ ] Apply `verifyAccess([{ module: Modules.ROSTER, action: Actions.VIEW }])`
- [ ] Validate user has explicit permission
- [ ] Filter by `RosterResource.resourceId = req.user.resourceId`
- [ ] Return only own information
- [ ] Get `prisma` via `tenant.get(subdomain)`
- [ ] Throw 403 for unauthorized access
- [ ] Delegate to service layer

### Services
- [ ] Accept object params `{ prisma, userId, resourceId, rosterId }`
- [ ] Filter by resource: `RosterResource.resourceId = resourceId`
- [ ] Return only own information
- [ ] Exclude other resources' information
- [ ] Throw `ApiError` with appropriate `httpStatus` codes
- [ ] Return typed results

### Validation
- [ ] Validate ROSTER.VIEW or ROSTER.EXPORT permission explicitly granted
- [ ] Validate user is assigned to roster
- [ ] Validate user is active
- [ ] Reject if no permission
- [ ] Filter to own information only

### UI/UX
- [ ] Hide roster navigation by default
- [ ] Show limited "My Assignment" view if permission granted
- [ ] Display team lead and admin contacts
- [ ] Hide other resources
- [ ] Hide all action buttons except view/export (if permitted)
- [ ] Simple, read-only interface

### Security
- [ ] Never expose other resources' information
- [ ] Never allow modification operations
- [ ] Strict permission checks
- [ ] Privacy-first approach

## API Endpoints

### Access-Based User Roster Endpoints (If Permissions Granted)
```
GET    /api/v1/roster/my-assignment        # View own roster assignment
GET    /api/v1/roster/my-assignment/export # Export own information
```

### Forbidden Endpoints for Access-Based Users
```
POST   /api/v1/roster                      # Cannot create
GET    /api/v1/roster                      # Cannot list all rosters
GET    /api/v1/roster/:id                  # Cannot view full roster
PUT    /api/v1/roster/:id                  # Cannot update
DELETE /api/v1/roster/:id                  # Cannot delete
POST   /api/v1/roster/:id/resources        # Cannot add resources
DELETE /api/v1/roster/:id/resources/:resId # Cannot remove resources
POST   /api/v1/roster/:id/resources/bulk   # Cannot bulk operations
DELETE /api/v1/roster/:id/resources/bulk   # Cannot bulk operations
PUT    /api/v1/roster/:id/team-lead        # Cannot change team lead
POST   /api/v1/roster/:id/admin-users      # Cannot add admin users
DELETE /api/v1/roster/:id/admin-users/:userId # Cannot remove admin users
GET    /api/v1/roster/:id/history          # Cannot view history
```

### Special Scoping Middleware
```typescript
router.use('/roster/my-assignment', 
  auth(), 
  verifyAccess([{ module: Modules.ROSTER, action: Actions.VIEW }]),
  filterToSelfOnly()
);
```

## Testing Considerations

### Test Cases
- Try to access roster without permission (should fail)
- Grant VIEW permission and view own assignment
- Try to view full roster (should fail)
- Try to view other resources (should fail)
- Export own information (if export permission granted)
- Try to create/update/delete roster (should fail)
- View team lead contact information
- View admin users contact information
- Try to access roster history (should fail)

### Mock Data Requirements
- Access-based user with no roster permissions (default)
- Access-based user with ROSTER.VIEW permission
- Access-based user with ROSTER.EXPORT permission
- Roster with access-based user assigned as resource

### Negative Test Cases
- Access roster without permission (should return 403)
- Try to view other resources (should return 403 or filter them out)
- Try to create roster (should return 403)
- Try to modify roster (should return 403)
- Try to delete roster (should return 403)
- Try to add/remove resources (should return 403)
- Try to view roster history (should return 403)

### Permission Testing
- Grant ROSTER.VIEW permission → verify view access
- Revoke ROSTER.VIEW permission → verify access removed
- Grant ROSTER.EXPORT permission → verify export access
- Test permission inheritance (should not inherit team lead permissions)

---

**Last Updated**: October 8, 2025
**Version**: 1.0

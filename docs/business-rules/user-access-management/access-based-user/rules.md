# User Access Management Module - Access-Based User Rules

## Access Control & Permissions

### What Access-Based Users Can Do
- [ ] View their own profile
- [ ] Update their own profile (limited fields)
- [ ] Change their own password
- [ ] View resources/data based on assigned permissions

### What Access-Based Users Cannot Do
- [ ] View other users
- [ ] Create users
- [ ] Edit other users
- [ ] Delete users
- [ ] Manage permissions
- [ ] Access admin features

### Permission Matrix

Access is determined by module-action permissions assigned to the user.

| Module | Action | Determines |
|--------|--------|------------|
| RESOURCE | VIEW | Can view resources |
| RESOURCE | CREATE | Can create resources |
| CALLOUT | VIEW | Can view callouts |
| ROSTER | VIEW | Can view rosters |
| [Add more] | [Add more] | [Add more] |

## Core Business Logic & Constraints

### Self-Service Operations
**Rules:**
- Users can only access their own profile
- 

**Allowed Profile Updates:**
- Name
- Phone number
- Notification preferences
- Password
- [Add more]

**Restricted Profile Fields:**
- Email (requires admin)
- Role
- Permissions
- Category assignment

### Permission-Based Access
**Rules:**
- Every protected endpoint checks module-action permissions
- Use `verifyAccess()` middleware
- Permissions defined at user level

**Implementation:**
```typescript
router.get(
  "/resources",
  auth(),
  verifyAccess([{ module: Modules.RESOURCE, action: Actions.VIEW }]),
  controller.getResources
);
```

## Key Workflows & Processes

### Workflow: Updating Own Profile
**Steps:**
1. User authenticates
2. Requests profile update
3. System validates user is updating own profile
4. Validates allowed fields
5. Updates profile
6. Returns updated profile

### Workflow: Accessing Protected Resource
**Steps:**
1. User authenticates
2. Requests resource
3. System checks module-action permission
4. If permitted, returns resource
5. If not, returns 403 Forbidden

## Data Relationships & Dependencies

### Self-Reference Model
- User can only reference their own user ID
- Cannot traverse to other users

### Permission Scope
- Permissions are explicit (no inheritance)
- Defined per user
- Checked on every request

## Validation Rules

### Access Validations
| Operation | Required Check | Error Response |
|-----------|----------------|----------------|
| View own profile | User ID matches token | 403 Forbidden |
| Update own profile | User ID matches token | 403 Forbidden |
| View resource | Has VIEW permission for module | 403 Forbidden |
| Create resource | Has CREATE permission for module | 403 Forbidden |

## Special Cases & Edge Cases

### Cross-Module Permissions
**Scenario:** User needs access to multiple modules

**Rules:**
- Permissions are independent per module
- Must be explicitly granted for each module-action pair

### Temporary Permission Elevation
**Scenario:** User needs temporary elevated access

**Rules:**
- Not supported at user level
- Requires admin intervention
- [Define if temporary roles exist]

## API Endpoints

### Endpoints Available to Access-Based User
- `GET /api/v1/users/me` - Get own profile
- `PUT /api/v1/users/me` - Update own profile (limited fields)
- `POST /api/v1/users/me/change-password` - Change password
- Other endpoints based on assigned permissions

## Implementation Guidelines

### Permission Checking
```typescript
// In controller
const hasPermission = await checkUserPermission(
  userId,
  Modules.RESOURCE,
  Actions.CREATE
);

if (!hasPermission) {
  throw new ApiError(httpStatus.FORBIDDEN, "Insufficient permissions");
}
```

### Self-Reference Validation
```typescript
// Ensure user can only access their own data
if (req.user.id !== parseInt(req.params.id)) {
  throw new ApiError(httpStatus.FORBIDDEN, "Cannot access other user data");
}
```

## Security Considerations

### Horizontal Privilege Escalation
- Always validate user ID from token matches resource owner
- Never trust user ID from request parameters alone

### Permission Bypass
- Never skip `verifyAccess()` middleware
- Always use enums, never magic strings

## Notes & Considerations
- Most restrictive role
- Requires explicit permission grants
- Cannot self-elevate permissions
- Ideal for external or limited users

# User Access Management Module - Business Rules

## Module Overview

The User Access Management Module controls user authentication, authorization, roles, permissions, and access policies across the entire Stratik Backend application.

## Key Concepts

- **User Roles**: Admin, Team Lead, Secondary Team Lead, Access-Based User
- **Permissions**: Module-Action based permissions (from `src/types/enums.ts`)
- **Access Control**: Category-based and permission-based access
- **Authentication**: Login, token management (JWT), session handling
- **Authorization**: Role-based and permission-based authorization

## User Role Types

### 1. Admin
- **Scope**: System-wide, all categories, all modules
- **Capabilities**: Full CRUD on all resources, user management, system configuration
- **Category Access**: All categories (DA, WD, LC, VG)
- **Primary Use**: System administrators, operations managers

### 2. Team Lead (TL)
- **Scope**: Category-specific (assigned category only)
- **Capabilities**: Manage resources within category, create rosters, send callouts
- **Category Access**: Single category (either DA or WD)
- **Primary Use**: Team supervisors, crew chiefs

### 3. Secondary Team Lead (STL)
- **Scope**: Category-specific (same as their Team Lead)
- **Capabilities**: View and monitor team data, limited write access
- **Category Access**: Single category (inherited from TL)
- **Primary Use**: Assistant supervisors, backup team leads

### 4. Access-Based User
- **Scope**: Permission-based (explicit module-action grants)
- **Capabilities**: Only actions explicitly permitted via permissions
- **Category Access**: May be category-restricted based on permissions
- **Primary Use**: External users, limited-access staff, reporting users

## Cross-Role Rules

### Authentication Rules
- All users authenticate via email + password
- JWT tokens issued on successful login
- Tokens expire after configurable period (default: 24 hours)
- Refresh tokens supported for extended sessions
- Multi-tenant: subdomain passed in header for tenant isolation

### Authorization Rules
- Every protected endpoint checks permissions via `verifyAccess()` middleware
- Permissions defined as `{ module: Modules.X, action: Actions.Y }`
- Category-scoped users (TL, STL) have automatic category filtering
- Access-based users require explicit permission grants

### Email Handling
- **ALWAYS** normalize emails using `cleanEmail()` from `dashboard.service`
- Prevents duplicate accounts (user@example.com vs User@Example.com)
- Applied at account creation, login, and any email comparison

### User Deletion Rules
- **NEVER** use `prisma.user.delete()` directly
- For category-tied users: `userService.deleteUser({ email, prisma, categoryId })`
- For admin-initiated by ID: `userService.removeUser(id, subdomain, currentUser)`
- Handles Team Lead/STL logic and audit rows automatically

### Multi-Tenant Rules
- Prisma obtained via `tenant.get(subdomain)` only
- Subdomain from `req.headers["tenant"]`
- Users belong to single tenant, cannot cross-tenant access
- Tenant validation required on all requests

## Category-Based Access

### Team Lead (TL) Category Assignment
- TL assigned to exactly ONE category (DA or WD)
- Can only manage resources/rosters in their category
- All queries auto-filtered by category
- Cannot view or modify other categories

### Secondary Team Lead (STL) Delegation
- STL designated by TL
- Inherits same category scope as TL
- More restricted permissions than TL
- One TL can have one STL (1:1 relationship)

### Category Boundaries
- DA Team Lead cannot access WD resources
- WD Team Lead cannot access DA resources
- Subcontractors (LC/VG) have separate access patterns
- Only Admins have cross-category access

## Permission System

### Module-Action Model
Permissions defined as combinations of:
- **Module**: RESOURCE, CALLOUT, ROSTER, FORM, USER, etc. (from `Modules` enum)
- **Action**: CREATE, READ, UPDATE, DELETE, EXPORT, etc. (from `Actions` enum)

Example:
```typescript
{ module: Modules.RESOURCE, action: Actions.CREATE }
{ module: Modules.CALLOUT, action: Actions.VIEW }
{ module: Modules.ROSTER, action: Actions.UPDATE }
```

### Permission Checking
```typescript
// In route definition
router.post(
  "/resource",
  auth(),
  verifyAccess([{ module: Modules.RESOURCE, action: Actions.CREATE }]),
  controller.createResource
);
```

### Permission Inheritance
- **Admin**: Has ALL permissions by default (superuser)
- **Team Lead**: Has category-scoped permissions for RESOURCE, CALLOUT, ROSTER modules
- **Secondary Team Lead**: Has READ permissions within category, limited WRITE
- **Access-Based User**: No permissions by default, must be explicitly granted

## Data Relationships

### User Entity
- Fields: id, email, password, firstName, lastName, role, categoryId, isTeamLead, isSecondaryTeamLead, createdAt, updatedAt, deletedAt
- Relationships:
  - belongsTo: Category (if TL or STL)
  - hasMany: Resource (as Team Lead)
  - hasMany: AuditLog (actions performed)
  - hasMany: UserPermission (for access-based users)

### Role Hierarchy
```
Admin (highest)
  ├─ Full system access
  └─ Can manage all users

Team Lead
  ├─ Category-scoped access
  ├─ Can manage own team
  └─ Can designate STL

Secondary Team Lead
  ├─ Inherits TL category
  ├─ Read-mostly access
  └─ Cannot designate STL

Access-Based User (lowest)
  └─ Explicit permissions only
```

## Security Considerations

### Password Management
- Passwords hashed using bcrypt
- Minimum 8 characters, complexity requirements
- Password reset via email verification
- Old passwords stored (prevent reuse)

### Token Management
- JWT signed with secret key
- Tokens contain: userId, role, categoryId, permissions
- Validate token on every request
- Revocation via token blacklist (if implemented)

### Session Management
- Configurable session timeout
- Logout invalidates token
- Concurrent session handling (allow/prevent)

### Audit Logging
- All user creation/update/deletion logged
- Permission changes logged
- Login attempts logged (success and failure)
- Critical actions logged with user context

## Role-Specific Rules

Detailed rules for each role are documented in their respective subdirectories:

- `admin/` - Administrator rules and capabilities
- `team-lead/` - Team Lead rules and capabilities
- `secondary-team-lead/` - Secondary Team Lead rules and capabilities
- `access-based-user/` - Access-Based User rules and capabilities

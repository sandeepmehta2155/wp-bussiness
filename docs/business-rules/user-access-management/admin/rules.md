# User Access Management Module - Admin Rules

## Access Control & Permissions

### What Admins Can Do
- [ ] Create users
- [ ] Edit all users
- [ ] Delete users (via userService.removeUser)
- [ ] Assign roles to users
- [ ] Configure permissions
- [ ] Manage categories
- [ ] View all user data
- [ ] Reset user passwords
- [ ] Configure access policies
- [ ] Manage multi-tenant settings
- [ ] View audit logs

### What Admins Cannot Do
- [ ] [List restrictions]

## Core Business Logic & Constraints

### User Creation
**Rules:**
- Email must be normalized using `cleanEmail()` before storage
- 

**Validations:**
- Email format
- Phone number format
- Required fields
- Unique constraints

**Process:**
1. Validate input data
2. Normalize email with `cleanEmail()`
3. Hash password
4. Create user record
5. Assign default role
6. Create audit log
7. Send welcome email

### User Deletion
**Important:** NEVER use `prisma.user.delete()` directly

**Rules:**
- For category-tied users: use `userService.deleteUser({ email, prisma, categoryId })`
- For admin-initiated removals by id: use `userService.removeUser(id, subdomain, currentUser)`
- Handles Team Lead/Secondary Team Lead logic
- Creates audit rows
- Cascades related data appropriately

**Process:**
1. Validate permissions
2. Check if user is Team Lead (requires special handling)
3. Route to appropriate service method
4. Log deletion in audit trail
5. Clean up related records

### Role Assignment
**Rules:**
- 

**Available Roles:**
- Admin
- Team Lead
- Secondary Team Lead
- Access-Based User (with specific permissions)

**Validations:**
- 

### Permission Configuration
**Rules:**
- Permissions are module-action based
- Use enums from `src/types/enums.ts`

**Permission Structure:**
```typescript
{
  module: Modules.RESOURCE, // Use enum
  action: Actions.CREATE     // Use enum
}
```

### Category Management
**Rules:**
- 

**Access Control:**
- 

## Key Workflows & Processes

### Workflow: Creating a New User
**Steps:**
1. Receive user data
2. Normalize email with `cleanEmail(email)`
3. Validate all fields
4. Check for duplicate email
5. Hash password
6. Create user record
7. Assign role
8. Assign category (if applicable)
9. Configure permissions
10. Send welcome notification
11. Log in audit trail

### Workflow: Assigning Permissions
**Steps:**
1. 
2. 
3. 

### Workflow: Managing Category Access
**Steps:**
1. 
2. 
3. 

### Workflow: Removing a User
**Steps:**
1. Validate requester has permission
2. Check if user is Team Lead or has special role
3. Call `userService.removeUser(id, subdomain, currentUser)`
4. Service handles TL/STL logic
5. Creates audit trail
6. Cascades related data
7. Returns success/error

## Data Relationships & Dependencies

### Primary Entities
- User
- Role
- Permission
- Category
- UserCategoryAccess

### Related Entities
- Module (from enums)
- Action (from enums)
- AuditLog

### Dependencies
- Multi-tenant (subdomain-based)
- Email normalization (`cleanEmail()`)
- Token management (JWT)

## Validation Rules

### Input Validations
| Field | Rule | Error Message |
|-------|------|---------------|
| email | Valid format + cleanEmail() | Invalid email format |
| password | Min 8 chars, complexity rules | Password too weak |
| phone | Valid format | Invalid phone number |
| role | Must be valid enum value | Invalid role |

### Business Rule Validations
| Rule | Condition | Action |
|------|-----------|--------|
| Unique email | Email already exists | Reject with error |
| Category assignment | User must belong to valid category | Validate category exists |
| Team Lead limit | Only one TL per category | Validate before assignment |

## Special Cases & Edge Cases

### Team Lead Deletion
**Scenario:** When deleting a Team Lead who has team members

**Rules:**
- Must reassign team members first OR
- Must promote Secondary Team Lead OR
- Handle via `userService.deleteUser()` which manages this

**Implementation:**
- Service checks for team members
- Provides options to reassign
- Logs all changes

### Email Normalization
**Scenario:** Comparing or storing email addresses

**Rules:**
- ALWAYS use `cleanEmail()` from `src/services/dashboard.service.ts`
- Never use `String.prototype.toLowerCase()` or `trim()` directly
- Apply at boundary (controller/service input)

**Implementation:**
```typescript
import { cleanEmail } from "../services/dashboard.service";

const normalizedEmail = cleanEmail(userEmail);
// Use normalizedEmail for all operations
```

### Multi-Tenant User Access
**Scenario:** User accessing resources across tenants

**Rules:**
- Prisma client obtained via `tenant.get(subdomain)`
- Subdomain from `req.headers["tenant"]`
- Never instantiate new Prisma client in controllers

**Implementation:**
```typescript
const subdomain = req.headers["tenant"] as string;
const prisma = await tenant.get(subdomain);
// Pass prisma to service
```

### Permission-Based Access Control
**Scenario:** Checking if user can perform action

**Rules:**
- Use `verifyAccess([{ module, action }])` middleware
- Never use magic strings
- Import from `src/types/enums.ts`

**Implementation:**
```typescript
import { Modules, Actions } from "../types/enums";

router.post(
  "/resource",
  auth(),
  verifyAccess([{ module: Modules.RESOURCE, action: Actions.CREATE }]),
  controller.createResource
);
```

## API Endpoints

### Endpoints Available to Admin
- `POST /api/v1/users` - Create user
- `GET /api/v1/users` - List users
- `GET /api/v1/users/:id` - Get user details
- `PUT /api/v1/users/:id` - Update user
- `DELETE /api/v1/users/:id` - Delete user (via userService.removeUser)
- `POST /api/v1/users/:id/assign-role` - Assign role
- `POST /api/v1/users/:id/permissions` - Configure permissions
- `GET /api/v1/users/:id/audit-logs` - View audit logs

## Integration Points

### External Systems
- Email service (SES)
- SMS service (Twilio)
- Authentication service (JWT)

### Internal Services
- `userService.deleteUser()` - For category-tied deletions
- `userService.removeUser()` - For admin-initiated deletions
- `cleanEmail()` - For email normalization
- `logService` - For audit logging

## Implementation Guidelines

### Controller Pattern
```typescript
import userService from "../services/user.service";
import { cleanEmail } from "../services/dashboard.service";
import httpStatus from "http-status";

const createUser = catchAsync(async (req, res) => {
  const subdomain = req.headers["tenant"] as string;
  const prisma = await tenant.get(subdomain);
  
  const { email, ...userData } = req.body;
  const normalizedEmail = cleanEmail(email);
  
  const user = await userService.createUser({
    prisma,
    email: normalizedEmail,
    ...userData
  });
  
  res.status(httpStatus.CREATED).send(user);
});
```

### Service Pattern
```typescript
import type { PrismaClient } from "@prisma/client";

async function createUser({
  prisma,
  email,
  ...userData
}: {
  prisma: PrismaClient;
  email: string;
  [key: string]: any;
}) {
  // Service logic
  // email is already normalized by controller
}
```

## Security Considerations

### Password Management
- 

### Token Management
- 

### Session Handling
- 

### Rate Limiting
- 

## Notes & Considerations
- Always normalize emails at the boundary
- Never delete users directly via Prisma
- Always pass prisma as parameter to services
- Use enums instead of magic strings
- Maintain audit trail for all sensitive operations
- Validate tenant header on all requests

# Template Filling Guide

## Purpose

This guide explains how to fill in the business rules templates created in this directory.

## General Instructions

1. **Don't delete template sections** - Even if a section doesn't apply, mark it as "N/A" or "Not applicable" rather than removing it
2. **Be specific** - Replace placeholder text with concrete, actionable rules
3. **Use examples** - Where helpful, provide code examples or scenarios
4. **Keep updated** - Update rules when business logic changes
5. **Be consistent** - Use the same terminology across all modules

## Section-by-Section Guide

### Access Control & Permissions

#### What [Role] Can Do
- List specific capabilities using checkboxes `- [ ]`
- Be exhaustive - list every operation the role can perform
- Use active verbs: "Create", "Edit", "View", "Delete", "Export", "Assign"
- Include conditional permissions: "Create resources (if senior user)"

**Example:**
```markdown
### What Admins Can Do
- [x] Create resources in any category
- [x] Edit all resources across all categories
- [x] Delete resources (with audit logging)
- [x] Move resources between categories
- [x] Export all resource data
- [x] Configure resource templates
```

#### What [Role] Cannot Do
- List explicit restrictions
- Clarify boundaries
- Explain why if it helps understanding

**Example:**
```markdown
### What Team Leads Cannot Do
- [ ] Delete resources (requires admin approval)
- [ ] Access resources in other categories
- [ ] Modify system-wide resource settings
```

### Core Business Logic & Constraints

For each major operation (Create, Edit, Delete, etc.):

#### Rules
- State the business rules clearly
- Use "must", "should", "cannot" appropriately
- Number multi-part rules

**Example:**
```markdown
**Rules:**
1. Resource email must be unique within the tenant
2. Resource must be assigned to exactly one category
3. Team Lead can only create resources in their own category
4. Resource phone number must be normalized to 10 digits
5. First name and last name are required fields
```

#### Validations
- List all validation checks
- Include field-level and cross-field validations
- Specify error messages or codes

**Example:**
```markdown
**Validations:**
- Email: Must be valid format, normalized with `cleanEmail()`, unique per tenant
- Phone: Must be 10 digits after normalization
- Category: Must exist and be active
- Team Lead assignment: If specified, must be valid Team Lead in the category
- Event-specific flag: Cannot be true without event reference
```

#### Process
- Step-by-step workflow
- Include system actions and side effects
- Mention audit logging, notifications

**Example:**
```markdown
**Process:**
1. Receive resource data from request body
2. Normalize email using `cleanEmail(email)`
3. Normalize phone to 10 digits
4. Validate all required fields
5. Check for duplicate email in tenant
6. Verify category exists and is active
7. Create resource record in database
8. If Team Lead assigned, link to category
9. Create audit log entry
10. Send welcome email/SMS if configured
11. Emit SSE event for real-time update
12. Return created resource
```

### Key Workflows & Processes

For each major workflow:

**Example:**
```markdown
### Workflow: Moving a Resource Between Categories

**Description:**
When an admin needs to reassign a resource from one category to another, typically for organizational restructuring or event-specific assignments.

**Steps:**
1. Admin selects resource to move
2. Admin selects destination category
3. System validates:
   - Admin has permission
   - Destination category exists and is active
   - Resource is not assigned to active event (or confirm override)
4. System creates audit trail of move
5. System updates resource.categoryId
6. System removes old Team Lead assignment
7. System optionally assigns new Team Lead from destination
8. System reorders event-specific resources if applicable using `renumberEventResourcesAfterMasterResourceAdd()`
9. System notifies old and new Team Leads
10. System returns updated resource

**Decision Points:**
- If resource is on active roster: Require confirmation
- If event-specific: Handle `wasOriginCategory` and `isDestinationCategory` flags
- If resource has pending callouts: Warn or block

**Outcomes:**
- Success: Resource moved, audit logged, notifications sent
- Failure: Resource unchanged, error returned with reason
```

### Data Relationships & Dependencies

**Example:**
```markdown
### Primary Entities
- `Resource` (main entity)
  - Fields: id, firstName, lastName, email, phone, categoryId, teamLeadId, isEventSpecific, wasOriginCategory, isDestinationCategory

### Related Entities
- `Category` (one-to-many: Category has many Resources)
- `User` (Team Lead relationship)
- `Event` (for event-specific resources)
- `RosterAssignment` (resource assignments)
- `CalloutResponse` (callout interactions)

### Dependencies
- Cannot delete Resource if assigned to active Roster
- Cannot delete Resource if has pending CalloutResponse
- Deleting Category requires reassigning all Resources first
- Changing Team Lead requires category validation

### Cascade Behaviors
- On Category delete: Block if has Resources
- On Team Lead user delete: Nullify Resource.teamLeadId
- On Event delete: Remove event-specific flags from Resources
```

### Validation Rules

Use tables for clarity:

**Example:**
```markdown
### Input Validations
| Field | Rule | Error Message | Error Code |
|-------|------|---------------|------------|
| email | Valid format + cleanEmail() | "Invalid email format" | 400 |
| phone | 10 digits after normalization | "Phone must be 10 digits" | 400 |
| firstName | Required, 1-100 chars | "First name is required" | 400 |
| categoryId | Must be valid UUID | "Invalid category ID" | 400 |
| categoryId | Category must exist | "Category not found" | 404 |

### Business Rule Validations
| Rule | Condition | Action | HTTP Status |
|------|-----------|--------|-------------|
| Unique email | Email exists in tenant | Reject with error | 409 |
| Category active | Category.isActive = false | Reject with error | 400 |
| Team Lead match | TL not in same category | Reject with error | 400 |
| Event flag constraint | wasOrigin & isDest both true | Reject (DB will also block) | 400 |
```

### Special Cases & Edge Cases

For each special case:

**Example:**
```markdown
### Event-Specific Resources

**Scenario:** 
During a large event (e.g., Super Bowl), some resources from Category A (Fire) need to temporarily work in Category B (Medical) without permanently transferring.

**Rules:**
1. Original resource in Category A gets flags: `wasOriginCategory=true`, `isDestinationCategory=false`
2. New resource record created in Category B with: `wasOriginCategory=false`, `isDestinationCategory=true`
3. Entry created in `ResourceMoveEvent` table linking original, moved resource, and event
4. Database constraint ensures wasOriginCategory and isDestinationCategory cannot both be true
5. After event ends, moved resource is deleted or flags are reset
6. Original resource remains in Category A

**Implementation:**
```typescript
// When moving resource for event
const movedResource = await createEventSpecificResource({
  originalResourceId: resource.id,
  destinationCategoryId: eventCategory.id,
  eventId: event.id,
  prisma
});

// This creates the moved resource and ResourceMoveEvent entry
// Original resource is NOT modified except flags
```

**Testing:**
- Verify flags are mutually exclusive
- Verify ResourceMoveEvent is created
- Verify both resources can be queried
- Verify cleanup after event ends
```

### API Endpoints

List with brief descriptions:

**Example:**
```markdown
### Endpoints Available to Admin
- `POST /api/v1/resources` - Create a new resource
- `GET /api/v1/resources` - List all resources (supports filtering, pagination)
- `GET /api/v1/resources/:id` - Get single resource by ID
- `PUT /api/v1/resources/:id` - Update resource
- `DELETE /api/v1/resources/:id` - Delete resource (soft delete)
- `POST /api/v1/resources/:id/move` - Move resource to different category
- `GET /api/v1/resources/export` - Export resources as CSV/Excel
- `POST /api/v1/resources/import` - Import resources from CSV/Excel
```

### Notes & Considerations

Add any additional context:

**Example:**
```markdown
## Notes & Considerations
- Resource deletion is soft delete (sets deletedAt timestamp)
- Email normalization is critical for preventing duplicates (user@example.com vs User@Example.com)
- Phone normalization ensures consistent format for SMS delivery
- Category scoping for Team Leads is enforced at database query level
- Event-specific resource logic is complex; always use helper functions
- Audit logging is required for compliance (HIPAA, etc.)
- Be cautious with bulk operations; they can trigger many side effects
```

## Tips for Writing Good Rules

### Be Specific
❌ "Users should have valid emails"
✅ "Email must match RFC 5322 format, be normalized using `cleanEmail()` function from dashboard.service, and be unique within the tenant"

### Include Examples
❌ "Handle edge cases"
✅ "Edge case: If a Team Lead is deleted, their assigned resources must either be reassigned to another TL or have their teamLeadId set to null"

### Specify Error Handling
❌ "Validate the input"
✅ "Validate categoryId exists in database; if not, return 404 with message 'Category not found'"

### Document Why, Not Just What
❌ "Resource email must be unique"
✅ "Resource email must be unique within tenant to prevent duplicate accounts and ensure proper authentication (each email = one login)"

### Cross-Reference Related Rules
"See User Access Management > Admin > User Deletion for related rules on cascading deletes"

## Filling Order Recommendation

1. Start with **Access Control & Permissions** - defines scope
2. Fill **Core Business Logic** - defines operations
3. Document **Key Workflows** - shows how operations connect
4. Map **Data Relationships** - shows structure
5. Define **Validation Rules** - enforces correctness
6. Cover **Special Cases** - handles complexity
7. List **API Endpoints** - defines interface
8. Add **Notes** - captures context

## Review Checklist

Before considering a rules document complete:

- [ ] All placeholders replaced with real content
- [ ] Examples provided where helpful
- [ ] Validation rules are specific and complete
- [ ] Special cases are documented with scenarios
- [ ] Cross-references to related modules/roles included
- [ ] Code examples use correct syntax and imports
- [ ] Error messages and HTTP status codes specified
- [ ] Workflows include decision points and outcomes
- [ ] Database constraints documented
- [ ] Multi-tenant considerations addressed
- [ ] Audit logging requirements specified
- [ ] Notification triggers documented

## Getting Help

If unsure about a rule:
1. Check existing implementation in `src/` codebase
2. Review test cases in `tests/` directory
3. Check API documentation in `final-swagger.json`
4. Ask domain experts or product owners
5. Review git history for context on why rules exist

## Maintenance

- Update rules BEFORE implementing changes
- Link git commits to rule changes
- Review rules quarterly for accuracy
- Archive outdated rules rather than deleting them (for history)

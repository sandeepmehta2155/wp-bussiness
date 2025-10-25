# Quick Start Guide - Business Rules Documentation

## What Was Created

A comprehensive, structured documentation system for all business rules in the Stratik Backend application.

## Folder Structure

```
docs/business-rules/
│
├── README.md                    # Main overview and guidelines
├── QUICK_START.md              # This file - how to get started
├── TEMPLATE_GUIDE.md           # Detailed guide on filling templates
│
├── resource/                    # Resource Module
│   ├── README.md               # Module overview
│   ├── admin/rules.md          # Rules for Admin role
│   ├── team-lead/rules.md      # Rules for Team Lead role
│   ├── secondary-team-lead/rules.md  # Rules for STL role
│   └── access-based-user/rules.md    # Rules for access-based users
│
├── callout/                     # Callout Module (same structure)
├── roster/                      # Roster Module (same structure)
├── form-generator/              # Form Generator Module (same structure)
└── user-access-management/      # User Access Management (same structure)
```

## Integration with Cursor

A Cursor rule file has been created at:
- `.cursor/rules/business-rules.mdc`

This ensures Cursor AI is aware of the business rules when generating code.

## Your Next Steps

### Phase 1: Fill in User Access Management Rules (Start Here)

This module is most complete and serves as a good example. Review and enhance:

1. **Admin rules**: `docs/business-rules/user-access-management/admin/rules.md`
   - Already has good content for user deletion rules
   - Already has email normalization rules
   - Add any missing authentication/authorization details

2. **Other roles**: Fill in team-lead, secondary-team-lead, access-based-user
   - Follow the template structure
   - Refer to `TEMPLATE_GUIDE.md` for examples

### Phase 2: Document Resource Module

1. **Start with**: `docs/business-rules/resource/README.md`
   - Define what a "resource" is in your system
   - List resource types
   - Document resource states/lifecycle

2. **Admin rules**: `docs/business-rules/resource/admin/rules.md`
   - Resource CRUD operations
   - Category assignment rules
   - Event-specific resource rules (already partially documented in workspace rules)
   - Team Lead assignment

3. **Team Lead rules**: `docs/business-rules/resource/team-lead/rules.md`
   - Category scoping
   - What they can/cannot do with resources

4. **Other roles**: STL and access-based user rules

### Phase 3: Document Callout Module

1. **Module overview**: `docs/business-rules/callout/README.md`
2. **Admin rules**: All callout operations
3. **Team Lead rules**: Category-scoped callouts
4. **Other roles**: Viewing and responding permissions

### Phase 4: Document Roster Module

1. **Module overview**: `docs/business-rules/roster/README.md`
2. **Admin rules**: 
   - Roster creation and scheduling
   - Running availability (referenced in v2 code)
   - Import/export functionality
3. **Team Lead rules**: Team roster management
4. **Other roles**: Viewing permissions

### Phase 5: Document Form Generator Module

1. **Module overview**: `docs/business-rules/form-generator/README.md`
2. **Admin rules**: Template creation, field configuration
3. **Team Lead rules**: Team-specific forms
4. **Other roles**: Form submission and viewing

## How to Fill Templates

### Option 1: Interview Approach
For each module/role:
1. Open the rules.md file
2. Go through each section systematically
3. Ask yourself or domain experts the questions in the template
4. Fill in answers

### Option 2: Code-First Approach
1. Review existing implementation in `src/` directory
2. Look at controllers, services, middlewares
3. Check validation schemas
4. Extract rules from code
5. Document what you find

### Option 3: API-First Approach
1. Review `final-swagger.json`
2. List all endpoints for the module
3. Document what each role can do with each endpoint
4. Extract rules from endpoint logic

### Option 4: Test-First Approach
1. Review test cases in `tests/` directory
2. Tests often reveal business rules
3. Document the rules being tested

## Tips for Success

### 1. Start Small
Don't try to fill everything at once. Pick one module and one role, complete it fully, then move to the next.

### 2. Use Examples
The `TEMPLATE_GUIDE.md` has extensive examples. Copy the structure.

### 3. Be Consistent
Use the same terminology across all modules:
- "Category" not sometimes "Team" or "Group"
- "Resource" not sometimes "User" or "Member"
- Consistent field names

### 4. Cross-Reference
If a rule in one module affects another module, add cross-references:
```markdown
**Note:** When a resource is deleted, see [Callout Module - Resource Cleanup] for callout handling rules.
```

### 5. Update as You Go
Don't wait for perfection. Fill in what you know, mark unclear areas with `TODO`, and refine over time.

### 6. Involve the Team
Different team members know different parts:
- Backend developers: Implementation details
- Product managers: Business logic
- QA team: Edge cases
- DevOps: System constraints

## Validation Checklist

For each rules.md file you complete, verify:

- [ ] All template placeholders removed or filled
- [ ] "What Can Do" section is comprehensive
- [ ] "What Cannot Do" section clarifies boundaries
- [ ] At least 2-3 workflows documented
- [ ] Validation rules include error messages
- [ ] At least 1-2 special cases documented
- [ ] API endpoints listed
- [ ] Cross-references to related modules added
- [ ] Code examples use correct imports and syntax

## Maintenance Plan

### Weekly
- Update rules when implementing new features
- Add edge cases discovered during development

### Monthly
- Review and refine existing rules
- Ensure consistency across modules

### Quarterly
- Major review with stakeholders
- Archive outdated rules
- Validate rules match implementation

## Getting Value Immediately

Even partially filled documentation is valuable. Cursor AI can use:
- The structure itself (knowing modules and roles exist)
- Any rules you've filled in
- Cross-references to existing workspace rules

Start with the most critical module for your current work and expand from there.

## Need Help?

### Understanding Templates
Read: `TEMPLATE_GUIDE.md` - comprehensive guide with examples

### Understanding Overall Structure
Read: `README.md` - overview of the system

### Understanding Cursor Integration
Read: `.cursor/rules/business-rules.mdc` - how rules are used in code generation

### Finding Existing Implementation
- Controllers: `src/controllers/`
- Services: `src/services/`
- Validation: `src/validations/`
- Types/Enums: `src/types/enums.ts`
- Tests: `tests/`
- API Docs: `final-swagger.json`

## Example: Filling One Complete Section

Let's say you want to document "Resource Creation" for "Admin":

1. **Open**: `docs/business-rules/resource/admin/rules.md`
2. **Find the section**: "Resource Creation" under "Core Business Logic & Constraints"
3. **Check the code**: `src/controllers/newResource.controller.ts` or similar
4. **Extract rules**: What validations exist? What fields are required?
5. **Document step-by-step**: Follow the template structure
6. **Add examples**: Show code snippets if helpful
7. **Cross-reference**: Link to email normalization rules if relevant

## Summary

You now have:
- ✅ Complete folder structure for all 5 modules × 4 roles = 20 rule documents
- ✅ Template structure in each document ready to fill
- ✅ Comprehensive guide on how to fill templates (`TEMPLATE_GUIDE.md`)
- ✅ Integration with Cursor AI (`.cursor/rules/business-rules.mdc`)
- ✅ This quick start guide

**Start with one module/role pair, fill it completely using the guide, then replicate for others.**


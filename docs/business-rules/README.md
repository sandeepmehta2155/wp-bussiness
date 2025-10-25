# Business Rules Documentation

This directory contains comprehensive business rules for all major modules in the Stratik Backend application, organized by user role for efficient code generation and implementation.

## Module Overview

The application consists of six major modules:

1. **Resource Module** - Resource management and operations
2. **Callout Module** - Callout handling and processing
3. **Destination Matrix Module** - ETA calculations and utility dashboard for available resources
4. **Roster Module** - Roster creation and management
5. **Form Generator Module** - Dynamic form creation and management
6. **User Access Management Module** - User permissions and access control

## User Roles

Business rules are documented for four primary user types:

- **Admin** - Full system access and configuration
- **Team Lead** - Primary team management and oversight
- **Secondary Team Lead** - Assistant team management with delegated permissions
- **Access-Based User** - Role-based limited access users

## Documentation Structure

Each module contains four subdirectories, one per user role:

```
docs/business-rules/
├── resource/
│   ├── admin/
│   ├── team-lead/
│   ├── secondary-team-lead/
│   └── access-based-user/
├── callout/
│   ├── admin/
│   ├── team-lead/
│   ├── secondary-team-lead/
│   └── access-based-user/
├── destination-matrix/
│   ├── admin/
│   ├── team-lead/
│   ├── secondary-team-lead/
│   └── access-based-user/
├── roster/
│   ├── admin/
│   ├── team-lead/
│   ├── secondary-team-lead/
│   └── access-based-user/
├── form-generator/
│   ├── admin/
│   ├── team-lead/
│   ├── secondary-team-lead/
│   └── access-based-user/
└── user-access-management/
    ├── admin/
    ├── team-lead/
    ├── secondary-team-lead/
    └── access-based-user/
```

## How to Document Business Rules

For each module and user role combination, document the following aspects:

### 1. Core Business Logic & Constraints
- What are the fundamental rules that govern this module?
- What constraints must always be enforced?
- What business validations are required?

### 2. Key Workflows & Processes
- What are the main user workflows?
- What steps must be followed?
- What are the decision points?

### 3. Data Relationships & Dependencies
- What data entities are involved?
- How do they relate to each other?
- What dependencies must be maintained?

### 4. Access Control & Permissions
- What actions can this user role perform?
- What data can they view/edit/delete?
- What are the permission boundaries?

### 5. Validation Rules
- What input validations are required?
- What business rule validations must pass?
- What error states are possible?

### 6. Special Cases & Edge Cases
- What are the exceptions to normal rules?
- How should edge cases be handled?
- What special scenarios exist?

## Usage for Code Generation

These business rules are referenced by:
- Cursor AI for context-aware code generation
- Development team for implementation guidance
- QA team for test case creation
- New team members for onboarding

## Maintenance

- Update business rules when new features are added
- Document rule changes in git commits
- Review rules during sprint planning
- Validate rules with stakeholders quarterly

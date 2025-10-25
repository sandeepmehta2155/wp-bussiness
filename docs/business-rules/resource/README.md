# Resource Module - Business Rules

## Module Overview

The Resource Module is the **master module** where all resources (both internal and third-party) are listed and managed. This module serves as the foundation for resource utilization across the system, particularly feeding into the Callout and Roster modules.

## Key Concepts

### What is a Resource?

A **Resource** is either:
1. **Internal Resource** - An employee or staff member belonging to DA (Damage Assessment) or WD (Wiredown) categories
2. **Third-Party Resource (Subcontractor)** - External contractors from LC (Linecrew) or VG (Vegetation) categories

### Resource Categories

The system has **four primary categories**:

1. **DA (Damage Assessment)** - Internal resources
2. **WD (Wiredown)** - Internal resources  
3. **LC (Linecrew)** - Third-party subcontractors
4. **VG (Vegetation)** - Third-party subcontractors

### Resource Grouping

- **DA and WD resources** are grouped by Team Lead
- **LC and VG resources** are managed as subcontractor companies (not grouped by Team Lead)

### Resource States
- Active
- Inactive
- Available (during events - managed in Callout module)
- Assigned (to rosters/events)

## Resource Field Structures

### Internal Resources (DA & WD Categories)

**Default Fields:**
- First Name (required)
- Last Name (required)
- Job Title (required)
- Phone (required)
- Email (required)
- Gender
- State Address
- Team Lead (User reference)
- Is Team Lead (Yes/No flag)

**Team Lead Assignment Rules:**
- **DA Category**: Team Lead assignment is **mandatory**
- **WD Category**: Team Lead assignment is **optional**
  - If no Team Lead selected → Resource goes under "Unassigned" category

### Third-Party Resources (LC & VG Categories - Subcontractors)

**Company Information:**
- Subcontractor Name (required)
- EIN Number (required)

**Contact Types** (Three separate contact groups):

1. **Callout Contact:**
   - Callout Contact Name
   - Callout Contact Phone
   - Callout Contact Email
   - Callout Contact Job Titles

2. **Owner Contact:**
   - Owner Contact Name
   - Owner Contact Phone
   - Owner Contact Email
   - Owner Contact Job Titles

3. **Billing Contact:**
   - Billing Contact Name
   - Billing Contact Phone
   - Billing Contact Email
   - Billing Contact Operators

**Additional Fields:**
- Street Address
- Union Status (Union / Non-Union / Both)
- ISNet (Yes/No)
- Avetta (Yes/No)
- Avetta ID (required if Avetta = Yes)
- Regional Manager (selection)

## Resource Utilization Journey

### Event Creation Flow

1. **Master Resources** exist in Resource Module
2. **Event is Created** in Event Module
3. **Resource Copies** are created and referenced in **Callout Module**
4. **Availability Check** - Resources are asked if they're available for the event
5. **Status Assignment** - Different availability statuses are mapped in the Callout Module
6. **Roster Assignment** - Available resources can be assigned to rosters

This flow ensures master resource data remains intact while event-specific copies track availability and assignment.

## Cross-Role Rules

### General Constraints
- DA and WD resources must have complete personal information
- LC and VG resources must have valid EIN and at least one contact type
- Team Lead must belong to the same category as their resources
- Resources cannot be permanently deleted if associated with active events

### Data Model
- Resource (master entity)
- Category (DA, WD, LC, VG)
- Team Lead (User with special role)
- Event-Specific Resource Copy (for callouts)

### Business Workflows
- Resource creation → Category assignment → Team Lead assignment (if applicable)
- Event creation → Resource copying → Availability callout → Roster assignment

## Role-Specific Rules

Detailed rules for each role are documented in their respective subdirectories:

- `admin/` - Administrator rules and capabilities
- `team-lead/` - Team Lead rules and capabilities
- `secondary-team-lead/` - Secondary Team Lead rules and capabilities
- `access-based-user/` - Access-Based User rules and capabilities

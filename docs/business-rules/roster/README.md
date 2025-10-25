# Roster Module

## Overview

The Roster Module manages the assignment and organization of resources for specific utilities and events. It provides functionality for creating rosters, assigning resources, tracking changes, and managing team structures in the context of utility events.

## Purpose

- Organize resources into rosters for utility companies
- Track resource assignments and movements
- Maintain roster history and audit trail
- Enable flexible resource management across events
- Support multiple data formats for different utility requirements

## Key Concepts

### Roster
A roster is a collection of resources assigned to a specific utility for an event. It includes:
- Team Lead and their resources
- Secondary Team Leads (roster-specific assignments)
- Admin users for contact purposes
- Departing locations and job assignments

### Team Lead vs Secondary Team Lead
- **Team Lead**: The original team lead from the category/resource structure
- **Secondary Team Lead**: A resource designated as team lead specifically for a roster (roster-scoped role)

### Resource Addition Sources
Resources can be added to rosters from three modules:
1. **Callout Module**: Available resources can be selected and added to existing or new rosters
2. **Destination Matrix Module**: Available resources displayed by ETA can be added directly
3. **Roster Module**: Resources already under a team lead can be added when available

## Core Features

### Roster Creation & Management
- Create new rosters for utilities
- Add resources from multiple sources
- Assign team leads and secondary team leads
- Configure admin users for resource contact

### Resource Management
- Add individual resources
- Remove individual resources
- Bulk operations (remove multiple, remove all, change team lead)
- Resource status synchronization across modules

### Roster Formats
- **Default Format**: Gender, First Name, Last Name, Phone, Email, Job Titles, Departing Location
- **Utility-Specific Format**: Custom formats configured via Utility Master module

### Roster History
- Track all roster operations
- Record resource additions, removals, and modifications
- Provide audit trail for compliance and review

### Export & Sharing
- Export to Excel
- Export to CSV
- Share formatted roster data with utility companies

## Data Flow

### Adding Resources to Roster
```
[Callout/Matrix/Roster] → Select Resources → Choose/Create Roster → Assign to Team Lead → Update Status
```

### Removing Resources from Roster
```
Remove from Roster → Mark "Available" in Callout (for current event) → Mark "Not Sent" in other events → Update departing location to utility destination
```

### Changing Team Lead (Roster-Specific)
```
Select Resources → Bulk Action: Change Team Lead → Assign new Secondary Team Lead → Roster-only impact (no effect on Callout/Resource modules)
```

## Integration Points

### With Callout Module
- Reads: Resource availability status
- Writes: Updates status to "Available" when removed from roster
- Updates departing location when resources are removed

### With Destination Matrix Module
- Reads: Available resources with ETA calculations
- Writes: Resource roster assignments

### With Resource Module
- Reads: Team lead relationships, resource details
- Writes: Roster-specific assignments (secondary team leads)
- Note: Roster team lead changes do NOT affect base resource module

### With Event Module
- Manages event-specific resource entries
- Deletes eventResource entries when resources removed from roster (for other events)

### With Utility Master Module
- Reads: Utility-specific format configurations
- Applies custom formats to roster display

## Access Control by Role

| Role | View Own Team | View All | Add Resources | Remove Resources | Change Team Lead | Manage Admins | Export |
|------|--------------|----------|---------------|------------------|------------------|---------------|--------|
| **Admin** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Team Lead** | ✓ | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Secondary Team Lead** | ✓ | ✗ | Limited | Limited | ✗ | ✗ | ✓ |
| **Access-Based User** | Permission-based | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |

## Business Rules by Role

Detailed rules for each role are documented separately:

- **[Admin Rules](./admin/rules.md)**: Full roster management capabilities
- **[Team Lead Rules](./team-lead/rules.md)**: Team-scoped roster management
- **[Secondary Team Lead Rules](./secondary-team-lead/rules.md)**: Roster-specific team lead role
- **[Access-Based User Rules](./access-based-user/rules.md)**: Limited, permission-based access

## Key Constraints

1. **Team Lead Scope**: Team leads can only view and manage resources under their team
2. **Roster-Specific Changes**: Team lead changes in roster do NOT affect callout or resource modules
3. **Status Synchronization**: Resource removal must update status across all relevant modules
4. **Departing Location**: When removed, resource's departing location becomes utility's destination location
5. **Event Isolation**: Roster changes for one event affect other events (mark as "Not Sent")

## Database Tables Involved

- `Roster`: Roster records
- `RosterResource`: Resource-to-roster assignments
- `RosterHistory`: Audit trail of roster operations
- `EventResource`: Event-specific resource status
- `Resource`: Base resource records
- `User`: Admin users, team leads, resources
- `Category`: Team lead categories
- `UtilityMaster`: Utility format configurations

## Common Workflows

### Workflow 1: Add Resources from Callout
1. User marks resources as "Available" in callout
2. User selects available resources
3. User clicks "Add to Roster"
4. User selects existing roster or creates new one
5. System assigns resources to roster under team lead
6. System updates resource status

### Workflow 2: Remove Resource from Roster
1. User selects resource in roster
2. User clicks "Remove" action
3. System marks resource as "Available" in callout for current event
4. System deletes eventResource entries for other events (status: "Not Sent")
5. System removes rosterId and rosterName from Resource table
6. System sets departing location to utility's destination location
7. System logs action in RosterHistory

### Workflow 3: Change Team Lead (Roster-Specific)
1. User selects multiple resources
2. User opens bulk actions
3. User selects "Change Team Lead"
4. User chooses new team lead (becomes Secondary Team Lead)
5. System updates roster assignments
6. System logs action in RosterHistory
7. Note: No impact on callout or resource modules

### Workflow 4: View Roster with Utility Format
1. User navigates to roster
2. User selects utility format from dropdown
3. System retrieves format configuration from Utility Master
4. System transforms roster data according to format
5. System displays formatted roster

## Implementation Notes

- Always log roster operations to RosterHistory
- Ensure transactional consistency when removing resources (update multiple tables)
- Validate team lead permissions before roster operations
- Cache utility format configurations for performance
- Use bulk operations for efficiency when handling multiple resources
- Maintain referential integrity across eventResource, Resource, and Roster tables

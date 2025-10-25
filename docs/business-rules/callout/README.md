# Callout Module - Business Rules

## Module Overview

The Callout Module manages event-based resource availability collection, notifications, responses, and tracking. It enables administrators to send availability requests to resources via email/SMS, collect their responses, track communication logs, and ultimately share availability reports with utilities.

## Key Concepts

- **Callout**: An event-driven process to collect resource availability by sending requests via email/SMS and gathering responses about their availability, departing locations, and equipment details.
- **Callout Lifecycle**: Event Creation → Availability Link Access → Send Requests → Collect Responses → Share Availability → Destination Matrix → Add to Roster
- **Callout States**: 
  - **Not Sent**: Default state; resource details referenced from Resource module
  - **Pending**: Request sent via email/SMS; awaiting response
  - **Available**: Resource confirmed availability with departing location and equipment details
  - **Not Available**: Resource declined the request
  - **On a Roster**: Resource added to roster from Destination Matrix (locked, no edits allowed)
- **Response Management**: Token-based system where resources click secure links to submit availability, departing locations, and equipment details
- **Resource Types**:
  - **DA/WD Resources**: Require departing location for ETA calculation
  - **LC/VG Subcontractors**: Require departing location(s) + FTEs + Diggers + Buckets + special equipment counts (can have multiple departing locations)

## Cross-Role Rules

### General Constraints
- All callouts are event-specific; accessed via availability link from event listing
- Resources must be in event before sending callout requests
- Default status for all resources is "Not Sent" (references Resource module data)
- **Inline editing restriction**: Resources in "Not Sent" status cannot be inline edited because no EventResource entry exists yet; inline editing is only available after status changes to Pending/Available/Not Available
- Token-based authentication for availability submission
- Communication logs must be recorded for all email/SMS/phone interactions
- ETA calculations are performed based on departing location and destination utility
- Subcontractors can provide multiple entries with different departing locations
- Real-time updates via SSE when resources mark availability
- Frequency settings auto-resend requests to "Pending" resources until max occurrences reached

### Data Model

**Primary Entities:**
- **Event**: Parent event for callout
- **EventResource**: Resource entries created when requests are sent
- **ResourceDetails**: Detailed availability data (departing location, equipment, etc.)
- **CommunicationLog**: Tracks all email/SMS/phone communications with timestamps
- **AvailabilityToken**: Secure tokens for resource availability submission

**Key Relationships:**
- Event → EventResource (1:many)
- EventResource → ResourceDetails (1:1)
- EventResource → CommunicationLog (1:many)
- Resource → EventResource (1:many across events)

**Special Fields:**
- DA/WD: `departingLocation`, calculated `eta`
- LC/VG: `departingLocation`, `fteCount`, `diggerCount`, `bucketCount`, `specialEquipment[]`

### Status Workflow
```
Not Sent → Pending → Available/Not Available → On a Roster
   ↓          ↓              ↓                      ↓
(Resource) (EventResource) (ResourceDetails)    (RosterEntry)
                              ↓
                    Destination Matrix
                    (ETA Calculation)
                              ↓
                      Add to Roster
                              ↓
                    Status: On a Roster
                    (Locked in Callout)
```

## Role-Specific Rules

- `admin/` - Administrator rules and capabilities (full CRUD, bulk operations, inline editing)
- `team-lead/` - Team Lead rules and capabilities
- `secondary-team-lead/` - Secondary Team Lead rules and capabilities
- `access-based-user/` - Access-Based User rules and capabilities

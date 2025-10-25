# Callout Module - Admin Rules

## Access Control & Permissions

### What Admins Can Do
- [x] Create events and access callout module via availability link
- [x] View all resources in callout listing (all categories)
- [x] Send availability requests via email/SMS to selected resources
- [x] View all callout responses in real-time (SSE integration)
- [x] Mark resource availability inline within callout listing page
- [x] Filter resources by status, team lead, location, job titles, departing location, movement status
- [x] Perform bulk operations: send requests, share availability, send SMS, change status, move categories, revert categories
- [x] Configure frequency settings for auto-resending requests to pending resources
- [x] Share availability reports to specific utilities
- [x] View destination matrix with ETA-sorted available resources
- [x] Access communication logs for all sent emails/SMS/phone calls
- [x] Move resources between categories during event
- [x] Revert resources back to original category

### What Admins Cannot Do
- [ ] Delete EventResource entries once created (audit trail requirement)
- [ ] Modify resource responses after submission (integrity requirement)
- [ ] Send requests to resources not in the event
- [ ] Bypass token authentication for resource availability submission
- [ ] Inline edit resources in "Not Sent" status (no EventResource entry exists; must send request first)
- [ ] **Inline edit or perform bulk actions on resources with status "On a Roster" (locked status)**
- [ ] **Change status of resources marked "On a Roster" (must remove from roster first)**

## Core Business Logic & Constraints

### Callout Creation
**Rules:**
- Callouts are event-specific; must be accessed via availability link from event listing
- All resources start in "Not Sent" status by default
- "Not Sent" resources reference data directly from Resource module (no EventResource entry yet)
- EventResource and ResourceDetails entries are created only when request is sent (status → Pending)

**Validations:**
- Event must exist and be active
- Resources must belong to categories associated with the event
- Email and phone must be valid for communication

**Process:**
1. Admin creates event in Events module
2. Admin clicks "Availability Link" from event listing
3. Callout listing page displays all resources in "Not Sent" status
4. Admin selects resources and initiates "Send Request"

### Resource Status Transitions
**Status Flow:**
```
Not Sent → Pending → Available/Not Available
                          ↓
                  (Added to Roster from Destination Matrix)
                          ↓
                    On a Roster (LOCKED)
```

**Status Rules:**
- **Not Sent**: Default, can send request
- **Pending**: Awaiting response, can inline edit or resend
- **Available**: Responded positively, can inline edit, appears in Destination Matrix
- **Not Available**: Responded negatively, can inline edit to change
- **On a Roster**: Added to roster from Destination Matrix, **LOCKED** (no edits, no bulk actions)

**"On a Roster" Restrictions:**
- Inline edit disabled
- Bulk operations disabled (send request, change status, move category, etc.)
- Cannot be included in new availability requests
- Badge/label displayed: "On a Roster"
- Row styling: Grayed out or distinctive indicator
- Optional: Show roster link next to status
- To unlock: Must remove resource from roster in Roster module

### Callout Response Tracking
**Rules:**
- Every request sent creates EventResource entry with status "Pending"
- Generate unique token for each resource request
- Token is embedded in email/SMS links for secure availability submission
- Resources click link → submit availability → status changes to "Available" or "Not Available"
- Communication logs record every email/SMS/phone interaction with timestamps
- Real-time SSE updates broadcast availability changes to admin dashboard

**Validations:**
- Token must be valid and not expired
- Resource can only respond once per request (subsequent responses update existing)
- Departing location is required for DA/WD resources when marking available
- FTE count, equipment counts required for LC/VG subcontractors when marking available

### Callout Notifications
**Rules:**
- Communication channels: Email and SMS (phone also tracked in logs)
- Token-based URLs sent via email/SMS for secure availability submission
- Frequency settings allow auto-resend to "Pending" resources
- Frequency configuration: interval unit + interval value + max occurrences
- System checks at specified intervals; resends if status still "Pending" and max occurrences not reached

**Channels:**
- **SMS**: Short message with token link, tracked in CommunicationLog
- **Email**: Formatted email with token link and event details, tracked in CommunicationLog
- **Phone**: Manual calls tracked in CommunicationLog (admin-initiated)

## Key Workflows & Processes

### Workflow: Creating and Sending a Callout
**Steps:**
1. **Event Creation**: Admin creates event in Events module
2. **Access Callout**: Admin clicks "Availability Link" from event listing
3. **View Resources**: Callout listing displays all resources in "Not Sent" status (data from Resource module)
4. **Select Resources**: Admin filters/selects target resources using checkboxes
5. **Send Request**: Admin clicks "Send Request" (individual or bulk)
6. **Create EventResource**: System creates EventResource entry with status "Pending"
7. **Generate Token**: System generates unique token for each resource
8. **Send Communication**: System sends email/SMS with token link
9. **Log Communication**: System records communication log entry (timestamp, channel, recipient)
10. **Real-time Update**: SSE broadcasts status change to admin dashboard

### Workflow: Resource Responds to Availability Request
**Steps:**
1. **Receive Link**: Resource receives email/SMS with token link
2. **Click Link**: Resource clicks link (token validated)
3. **Submit Availability**: 
   - **Available**: 
     - DA/WD: Provide departing location → System calculates ETA based on destination utility
     - LC/VG: Provide departing location(s), FTE count, digger count, bucket count, special equipment with counts (can add multiple entries for different locations)
   - **Not Available**: Simple decline
4. **Update Status**: System updates EventResource status to "Available" or "Not Available"
5. **Create ResourceDetails**: System creates ResourceDetails entry with departing location, equipment data
6. **Real-time Broadcast**: SSE updates admin dashboard immediately

### Workflow: Inline Editing Availability
**Prerequisites:**
- Resource must NOT be in "Not Sent" status (EventResource entry must exist)
- Inline editing is only available for resources with status: Pending, Available, or Not Available

**Steps:**
1. Admin views resource in callout listing
2. Admin verifies resource has status other than "Not Sent" (inline edit icon is enabled)
3. Admin clicks inline edit icon in "Action" column
4. Admin selects "Available" or "Not Available"
5. If "Available", admin provides departing location and equipment details
6. System updates EventResource and ResourceDetails
7. SSE broadcasts change to all connected admin clients

**Note:** For "Not Sent" resources, admin must first "Send Request" to create EventResource entry before inline editing becomes available.

### Workflow: Bulk Operations
**Steps:**
1. **Select Resources**: Admin checks multiple resources in listing
2. **Choose Bulk Action**:
   - **Send Request**: Send availability requests to all selected
   - **Share Availability**: Share confirmed availability link to utility
   - **Send SMS**: Send custom SMS to all selected
   - **Change Status**: Update status for all selected
   - **Move to Category**: Move selected resources to different category for this event
   - **Revert to Original**: Revert moved resources back to original category
3. **Execute Action**: System processes bulk operation for all selected resources
4. **Log All**: Communication logs created for each resource
5. **Real-time Update**: SSE broadcasts bulk status changes

### Workflow: Frequency Settings for Auto-Resend
**Steps:**
1. Admin selects resources with "Pending" status
2. Admin clicks "Frequency Settings" button
3. Admin configures:
   - Communication channels: Email and/or SMS
   - Resend interval: Select unit (minutes/hours/days) + interval value
   - Maximum occurrences: Max number of resend attempts
4. Admin clicks "Save"
5. System schedules background job (PgBoss)
6. At each interval: System checks all "Pending" resources → resends via selected channels → increments occurrence count → stops when max reached
7. Communication logs track each resend attempt

### Workflow: Share Availability to Utility
**Steps:**
1. Admin confirms resources marked as "Available"
2. Admin selects "Available" resources
3. Admin clicks "Share Availability Link"
4. Admin selects target utility
5. System generates availability report (destination matrix)
6. Destination matrix displays available resources sorted by ETA
7. Utility dashboard receives report with resource details

## Data Relationships & Dependencies

### Primary Entities
- **Event**: Parent event entity
- **EventResource**: Links Resource to Event with availability status
- **ResourceDetails**: Stores detailed availability data (departing location, equipment)
- **CommunicationLog**: Audit trail for all communications
- **AvailabilityToken**: Secure tokens for resource responses

### Related Entities
- **Resource**: Base resource from Resource module (referenced when status = "Not Sent")
- **Category**: Resource categorization (DA, WD, LC, VG)
- **Utility**: Destination utility for availability sharing
- **DestinationMatrix**: Calculated ETA-based resource listing

### Dependencies
- Resource module: Data source for "Not Sent" resources
- Event module: Parent event management
- Email service: Sending availability request emails
- SMS service: Sending availability request SMS
- SSE service: Real-time updates to admin dashboard
- PgBoss: Background job for frequency-based resends
- ETA calculation service: Distance/time calculations for DA/WD resources

## Validation Rules

### Input Validations
| Field | Rule | Error Message |
|-------|------|---------------|
| `email` | Must be valid email format | "Invalid email address" |
| `phone` | Must be valid 10-digit phone | "Invalid phone number" |
| `departingLocation` | Required for Available status (DA/WD/LC/VG) | "Departing location is required" |
| `fteCount` | Required for LC/VG, must be >= 0 | "FTE count must be a positive number" |
| `diggerCount` | Required for LC/VG, must be >= 0 | "Digger count must be a positive number" |
| `bucketCount` | Required for LC/VG, must be >= 0 | "Bucket count must be a positive number" |
| `specialEquipment` | Array of {name, count}, count >= 0 | "Equipment count must be a positive number" |
| `token` | Must be valid and not expired | "Invalid or expired token" |
| `frequencyInterval` | Must be > 0 | "Interval must be greater than zero" |
| `maxOccurrences` | Must be > 0 | "Max occurrences must be greater than zero" |

### Business Rule Validations
| Rule | Condition | Action |
|------|-----------|--------|
| Inline edit restriction | Status = "Not Sent" | Reject inline edit with error "Cannot edit resource in Not Sent status. Send request first." |
| No duplicate requests | EventResource already exists for Resource+Event | Update existing record, don't create new |
| Token expiry | Token older than configured expiry time | Reject response with "Token expired" |
| Status transition | Can only go Not Sent → Pending → Available/Not Available | Reject invalid transitions |
| Category move | Resource moved to different category | Mark `wasOriginCategory=true`, create ResourceMoveEvent, create new entry with `isDestinationCategory=true` |
| Revert category | Resource reverted to original | Remove destination entry, restore original entry |
| Frequency resend limit | Occurrence count >= max occurrences | Stop auto-resending |
| Available without details | Status=Available but no departing location/equipment | Reject with validation error |

## Special Cases & Edge Cases

### Event-Specific Callouts
**Scenario:**
Resources are added to specific events; callout requests are isolated per event. A resource can be in multiple events simultaneously with different availability statuses.

**Rules:**
- EventResource is unique per Resource + Event combination
- Same resource can be "Available" in Event A and "Not Available" in Event B
- Moving resource to different category creates new EventResource entry with destination flags
- Communication logs are event-specific

### Multi-Category Callouts
**Scenario:**
Admin sends callout to resources across multiple categories (DA, WD, LC, VG) within same event. Each category may have different data requirements.

**Rules:**
- DA/WD: Require only departing location (ETA calculated automatically)
- LC/VG: Require departing location + FTE + Diggers + Buckets + Special Equipment
- LC/VG can submit multiple entries with different departing locations
- Filters allow selection across categories
- Bulk operations respect category-specific validation rules

### Resource Category Movement During Event
**Scenario:**
Admin moves a resource from Category A to Category B for this specific event only (e.g., DA resource temporarily moved to WD category).

**Rules:**
- Original resource entry marked with `wasOriginCategory=true`, `isDestinationCategory=false`
- New resource entry created in destination category with `wasOriginCategory=false`, `isDestinationCategory=true`
- ResourceMoveEvent table tracks original resource, moved resource, and event
- Database constraint ensures `wasOriginCategory` and `isDestinationCategory` cannot both be true
- "Revert to Original" bulk operation reverses this process
- Both entries reference same base Resource but have separate EventResource records

### Frequency Settings Edge Cases
**Scenario:**
Admin sets frequency to resend every hour for max 5 occurrences. Resource responds after 3 resends.

**Rules:**
- System stops auto-resending once status changes from "Pending"
- Occurrence count persists in EventResource or separate FrequencyTracking table
- Admin can update frequency settings mid-cycle
- If event ends before max occurrences, stop resending

### Inline Editing vs. Resource Self-Response
**Scenario:**
Admin marks resource as available inline, but resource clicks email link afterward and submits different availability.

**Rules:**
- Latest submission wins (timestamp-based)
- Audit log tracks both admin inline edit and resource self-response
- ResourceDetails updated to latest values
- No conflict resolution; last write overwrites

### Inline Editing Restriction for "Not Sent" Status
**Scenario:**
Admin attempts to inline edit a resource that is still in "Not Sent" status (request hasn't been sent yet).

**Rules:**
- UI should disable inline edit icon/button for "Not Sent" resources
- If API receives inline edit request for "Not Sent" status, reject with error: "Cannot edit resource in Not Sent status. Send request first."
- Reason: "Not Sent" resources don't have EventResource entries; they're just references to Resource module
- Admin must first "Send Request" to create EventResource entry (status → Pending)
- Once EventResource entry exists (Pending/Available/Not Available), inline editing becomes enabled
- This prevents data inconsistencies and ensures proper audit trail

## API Endpoints

### Endpoints Available to Admin
- `GET /api/v1/events/:eventId/callout` - Get callout listing with filters
- `POST /api/v1/events/:eventId/callout/send-request` - Send availability request (single or bulk)
- `PUT /api/v1/events/:eventId/callout/:resourceId/status` - Inline edit resource status
- `POST /api/v1/events/:eventId/callout/bulk-send-request` - Bulk send requests
- `POST /api/v1/events/:eventId/callout/bulk-send-sms` - Bulk send SMS
- `PUT /api/v1/events/:eventId/callout/bulk-status` - Bulk update status
- `POST /api/v1/events/:eventId/callout/bulk-move-category` - Bulk move resources to different category
- `POST /api/v1/events/:eventId/callout/bulk-revert-category` - Bulk revert resources to original category
- `POST /api/v1/events/:eventId/callout/frequency-settings` - Configure auto-resend frequency
- `POST /api/v1/events/:eventId/callout/share-availability` - Share availability to utility
- `GET /api/v1/events/:eventId/callout/communication-logs` - View communication logs
- `GET /api/v1/events/:eventId/callout/destination-matrix` - View destination matrix with ETA
- `GET /api/v1/events/:eventId/callout/sse` - SSE endpoint for real-time updates

### Public Endpoints (Token-Based)
- `GET /api/v1/callout/availability/:token` - Display availability form for resource
- `POST /api/v1/callout/availability/:token` - Submit availability response

## Notes & Considerations
- **Real-time Updates**: SSE integration broadcasts all status changes immediately to admin dashboard
- **Inline Edit Restriction**: UI must disable inline edit for "Not Sent" status; API must validate EventResource exists before allowing inline edit
- **Token Security**: Tokens should expire after configured time (e.g., 7 days); generate new tokens for resends
- **Communication Logs**: Critical for audit trail; never delete communication logs
- **ETA Calculation**: Dependent on external service (Google Maps API, etc.); handle failures gracefully
- **LC/VG Multi-Location**: Subcontractors can submit multiple departing location entries; store as separate ResourceDetails records or JSONB array
- **Event Closure**: When event ends, stop all frequency-based resends; archive callout data
- **Category Movement Audit**: ResourceMoveEvent table maintains complete audit trail for category changes during events
- **Performance**: Bulk operations should be queued (PgBoss) for large selections (>100 resources)
- **Idempotency**: Send request operations should be idempotent; don't duplicate EventResource entries 

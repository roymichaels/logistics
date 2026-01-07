# Driver Application Approval System

## Overview
Superadmins can now review and approve driver applications submitted through the platform.

## Implementation

### 1. Driver Application Page
**Location:** `/src/pages/admin/DriverApplications.tsx`

Features:
- View all pending, approved, and rejected driver applications
- Filter applications by status
- Search by phone, license number, or vehicle plate
- Approve or reject applications with notes
- Automatic driver profile creation upon approval
- User role update to "driver" upon approval

### 2. Seed Data
**Location:** `/src/foundation/data/LocalDataStore.ts`

Added:
- 2 pending driver applications
- 2 user profiles for pending drivers (David Cohen and Sarah Levi)
- Applications include:
  - Vehicle type, plate, and license information
  - Phone number and availability
  - Application notes
  - Submission timestamp

### 3. Routing
**Location:** `/src/routing/SimpleRouter.tsx`

Added route: `/admin/driver-applications`
- Available to superadmin and admin roles
- Lazy-loaded for performance

### 4. Driver Service Integration
The system uses existing driver service functions:
- `submitDriverApplication()` - Drivers submit applications
- `getPendingApplications()` - Fetch all pending applications
- `approveDriverApplication()` - Approve and create driver profile
- `rejectDriverApplication()` - Reject with reason

## User Flow

### For Drivers
1. Click "Become a Driver" from any role
2. Fill out application form with:
   - Vehicle type (motorcycle, car, van, truck)
   - Vehicle plate number
   - License number
   - Phone number
   - Availability (full-time, part-time, flexible)
   - Optional notes
3. Submit application
4. Status is set to "pending"

### For Superadmin
1. Navigate to `/admin/driver-applications`
2. View list of pending applications
3. Click "Approve" or "Reject" on any application
4. Add optional notes (required for rejection)
5. System automatically:
   - Creates driver profile (if approved)
   - Updates user role to "driver"
   - Records reviewer ID and timestamp
   - Saves review notes

## Data Model

### driver_applications Table
```
{
  id: string
  user_id: string
  vehicle_type: string ('motorcycle' | 'car' | 'van' | 'truck')
  vehicle_plate: string
  license_number: string
  phone: string
  availability: string ('fulltime' | 'parttime' | 'flexible')
  notes: string | null
  status: 'pending' | 'approved' | 'rejected'
  submitted_at: string
  reviewed_at: string | null
  reviewed_by: string | null
  review_notes: string | null
}
```

## Current Seed Data

### Pending Applications
1. **David Cohen** (user-pending-driver-1)
   - Car driver (plate: 12-345-67)
   - License: DL8765432
   - Phone: 054-5555555
   - Full-time availability
   - 5 years experience

2. **Sarah Levi** (user-pending-driver-2)
   - Motorcycle driver (plate: 98-765-43)
   - License: DL1234567
   - Phone: 052-4444444
   - Part-time availability
   - Evening shifts only

## Access Control
- Only superadmin and admin roles can access driver applications
- Applications are visible to all authorized admins
- Approval/rejection requires authenticated superadmin user ID

## Next Steps
- Navigate to `/admin/driver-applications` as superadmin
- Review and approve pending applications
- Approved drivers can then access driver dashboard and receive delivery assignments

# Boarding House Rental Management System

A comprehensive mobile and web application for managing boarding house operations, built with React Native (Expo) and Firebase.

## 📁 Project Structure

```
boarding-house-rental-management-system/
├── app/                          # Application source code
│   ├── components/              # Reusable UI components
│   │   ├── auth/               # Authentication components
│   │   │   ├── AuthFormField.js
│   │   │   ├── AuthModeSelector.js
│   │   │   ├── AuthNotice.js
│   │   │   └── AuthPrimaryButton.js
│   │   ├── BottomNav.js         # Caretaker bottom navigation
│   │   ├── CaretakerHeader.js   # Caretaker header
│   │   ├── Logo.js              # App logo component
│   │   ├── OwnerBottomNav.js    # Owner bottom navigation
│   │   ├── OwnerHeader.js       # Owner header
│   │   ├── TenantBottomNav.js   # Tenant bottom navigation
│   │   └── TenantHeader.js      # Tenant header
│   │
│   ├── screens/                 # Application screens
│   │   ├── auth/               # Authentication screens
│   │   │   └── LoginScreen.js
│   │   ├── owner/              # Owner portal screens
│   │   │   ├── OwnerDashboard.js
│   │   │   ├── OwnerRooms.js
│   │   │   ├── OwnerTenants.js  # NEW: Tenant management
│   │   │   └── OwnerReports.js
│   │   ├── tenant/             # Tenant portal screens
│   │   │   ├── TenantHomeScreen.js
│   │   │   ├── TenantComplaintsScreen.js
│   │   │   ├── TenantRoomChangeScreen.js
│   │   │   └── TenantUpdatesScreen.js
│   │   ├── AnnouncementsScreen.js  # Caretaker announcements
│   │   ├── BillingScreen.js        # Caretaker billing
│   │   ├── CaretakerDashboard.js   # Caretaker dashboard
│   │   ├── IssuesScreen.js         # Caretaker issues
│   │   ├── RoomsScreen.js          # Caretaker rooms
│   │   └── TenantsScreen.js        # Caretaker tenants
│   │
│   ├── services/                # Business logic & data layer
│   │   ├── authService.js       # Authentication service
│   │   ├── dataService.js       # Data operations (36 functions)
│   │   ├── databaseSchema.js    # Database schema definitions
│   │   └── seedDatabase.js      # Database seeding
│   │
│   ├── utils/                   # Utility functions
│   │   ├── firebase.js          # Firebase configuration
│   │   ├── responsive.js        # Responsive design utilities
│   │   └── ThemeContext.js      # Theme management (light/dark)
│   │
│   ├── CaretakerApp.js          # Caretaker app container
│   ├── OwnerApp.js              # Owner app container
│   ├── TenantApp.js             # Tenant app container
│   ├── RoleSelector.js          # Role selection screen
│   └── index.js                 # App entry point
│
├── assets/                      # Static assets (images, fonts)
├── .gitignore                   # Git ignore rules
├── App.js                       # Root app component
├── app.json                     # Expo configuration
├── firebase.json                # Firebase configuration
├── firestore.rules              # Firestore security rules
├── FIRESTORE_SETUP.md           # Database setup guide
├── index.js                     # Expo entry point
├── metro.config.js              # Metro bundler configuration
├── package.json                 # Dependencies
└── README.md                    # This file
```

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ and npm
- Expo CLI: `npm install -g expo-cli`
- Firebase account and project

### Installation

1. **Clone the repository**
   ```bash
   cd d:\Final_MobileApp_Project\Boarding-House-Rental-Management-System
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Firebase** (see `FIRESTORE_SETUP.md`)
   - Create Firebase project
   - Enable Authentication (Email/Password)
   - Enable Firestore Database
   - Deploy security rules: `firebase deploy --only firestore:rules`

4. **Start the development server**
   ```bash
   npm start
   # or
   npx expo start
   ```

## 👥 User Roles

### Landlord (Owner / Caretaker)
- Owner and Caretaker are separate user accounts (each signs in with their own credentials) but the application consolidates both roles into a single administrative portal labeled "Landlord". Both Owner and Caretaker accounts access the same shared admin interface to manage tenants, rooms, billing, complaints, and announcements. This design centralizes administrative tasks in one portal. If you later need more granular separation, the code can be adjusted to route Owner and Caretaker to different containers.
- Manage tenants (add, edit, delete, assign rooms)
- Manage rooms (add rooms)
- Create and terminate leases
- View financial reports
- Generate invoices
- Record payments

### Tenant Portal
- View personal dashboard
- Submit complaints
- Request room changes
- View announcements
- View billing information

## 🔐 Authentication

### Demo Accounts
Create staff accounts via Firebase Console:
- Owner: Configure in Firebase Authentication
- Caretaker: Configure in Firebase Authentication
- Tenants: Self-register through the app

## 📊 Database Schema

The application uses a normalized relational database with collections including:

- `users` - User accounts and roles
- `staff_profiles` - Owner/Caretaker profiles
- `tenants` - Tenant information
- `boarding_houses` - Property details
- `room_types` - Room categories
- `rooms` - Physical units
- `leases` - Tenant-room assignments
- `utility_readings` - Electricity consumption
- `invoices` - Monthly billing
- `payments` - Payment records
- `complaints` - Issue tracking
- `room_change_requests` - Room transfer requests
- `announcements` - System notices

See `FIRESTORE_SETUP.md` for detailed schema documentation.

## 🎨 Features

### ✅ Implemented
- User authentication (login, register, password reset)
- Role-based access control
- Tenant management (CRUD operations)
- Room management (add, assign)
- Lease management (create, terminate)
- Complaint system (submit, update status)
- Announcements (create, view)
- Room change requests (submit, review)
- Responsive design (mobile, tablet, desktop)
- Dark mode support
- Real-time Firestore integration

### 🚧 In Progress
- Invoice generation interface
- Payment recording interface
- Utility meter reading entry

## 🛠️ Technologies

- **Frontend**: React Native, Expo SDK 57
- **Backend**: Firebase (Authentication, Firestore)
- **State Management**: React Hooks (useState, useEffect)
- **Styling**: React Native StyleSheet, Theme Context
- **Navigation**: Custom navigation system
- **Icons**: Expo Vector Icons (Ionicons)

## 📱 Platform Support

- ✅ iOS (via Expo Go)
- ✅ Android (via Expo Go)
- ✅ Web (via Expo Web)

## 🔧 Development

### Clear cache and restart
```bash
npx expo start --clear
```

### Deploy Firestore rules
```bash
firebase deploy --only firestore:rules --project boardinghouse-rental-mgt
```

### Project scripts
```bash
npm start          # Start Expo development server
npm run android    # Run on Android
npm run ios        # Run on iOS
npm run web        # Run on web
```

## 📝 Documentation

- `FIRESTORE_SETUP.md` - Database schema and setup instructions
- `CARETAKER_SYSTEM.md` - Caretaker features documentation
- `firestore.rules` - Security rules (with inline comments)

## Scope and Limitation

This implementation focuses on a mobile- and web-based Boarding House Rental Management System for Nads & Gracy Boarding House in Tagum City. It supports three user types: Landlord (Owner/Caretaker), and Tenants. Owner and Caretaker are separate user accounts but the application consolidates both roles into a single shared administrative portal labeled "Landlord"; both Owner and Caretaker sign in with their own credentials and access the same administrative interface for managing tenants, rooms, billing, complaints, and announcements.

The system is configured for the boarding house's 17 rooms (12 single-occupancy and 5 double-occupancy). The Caretaker can register tenants, record personal information, upload valid identification and payment proof images, and assign tenants to rooms or bed spaces. The application indicates which rooms or bed spaces are occupied or available, enabling the Caretaker to monitor availability and allowing tenants to check available rooms.

Billing and payment records are supported. The Caretaker can record monthly rent, electricity charges (manually entered), and water bills. The system tracks payment due dates, approved payment extensions, unpaid balances, and payment records. Digital payment records and receipt references can be created for recorded payments, and tenants may upload receipt images for staff review. Tenants can view balances, payment history, due dates, and billing details through their accounts.

For communication and maintenance, the system provides complaint reporting and in‑app notifications. Tenants submit concerns through the app and the Caretaker updates complaint status. Messages and announcements are stored in the database and shown in the app; however, push notifications (device push) are not included and must be added separately if required.

Limitations:
- The system is specific to Nads & Gracy Boarding House and does not support multi-property management.
- There is no integrated online payment gateway (e.g., GCash, Maya, credit cards, or bank transfers); payments are manually verified and recorded by staff.
- Push notifications are not implemented (only in-app notifications are available).
- There are no automated backup scripts or scheduled exports in the repository; add a backup/export process for reliable offsite backups.
- The app supports Android, iOS (via Expo), and Web; it is not limited to Android only.
- Meter readings are entered manually by the Caretaker; there is no IoT integration.
- Physical security integrations (electronic locks, biometrics, CCTV) are outside the scope.
- Some payment logic assumes cash-based receipts; full electronic payment flows require development.
- The codebase includes Firebase and optional Supabase helpers; runtime behavior depends on which backend is configured—ensure environment variables and project configuration are set accordingly.
- Owner and Caretaker share a consolidated administrative portal; consider separating owner-only functions or routing caretakers to a dedicated limited interface in future work.

## 🤝 Contributing

This is a team project. Follow these guidelines:
1. Never commit backup files (*.backup.*, *.bak)
2. Never commit build artifacts (dist/, .expo/)
3. Never commit environment files with secrets (.env)
4. Always test before committing
5. Follow the existing code structure

## 📄 License

See LICENSE file for details.

## 🆘 Support

For issues or questions:
1. Check `FIRESTORE_SETUP.md` for database issues
2. Verify Firebase configuration in `app/utils/firebase.js`
3. Ensure Firestore rules are deployed
4. Clear cache if needed: `npx expo start --clear`

---

**Last Updated**: October 2026
**Version**: 1.0.0 (Phase 1 Complete)

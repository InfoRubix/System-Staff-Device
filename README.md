# Device Management System

A professional, modern web application for managing staff devices within an organization. Built with Next.js, Firebase, and TypeScript, featuring a responsive design optimized for both desktop and mobile devices.

## Overview

This system allows administrators to efficiently manage and track all staff devices including laptops, desktops, and other IT equipment. The application provides comprehensive device information management, real-time search capabilities, and a clean, professional interface.

## Features

### Core Functionality
- **Device Management**: Add, edit, and delete device records
- **Staff Assignment**: Associate devices with specific staff members and departments
- **Hardware Specifications**: Track detailed hardware specs (CPU, RAM, GPU, Storage)
- **Status Tracking**: Monitor device status (Working, Broken, Under Repair)
- **Ownership Management**: Track company-owned vs. personal devices
- **Real-time Search**: Instant search by staff name with debounced queries

### User Interface
- **Modern Design**: Professional red, white, and black color scheme
- **Responsive Layout**: Optimized for desktop, tablet, and mobile devices
- **Desktop View**: Traditional table layout for large screens
- **Mobile View**: Card-based layout for mobile devices
- **Animated Elements**: Smooth transitions and floating background elements
- **Glass Morphism**: Modern UI effects with backdrop blur

### Authentication & Security
- **Admin-Only Access**: Secure admin authentication without public signup
- **Firebase Security**: Protected with Firebase security rules
- **Session Persistence**: Maintains login state across browser sessions

## Technology Stack

- **Framework**: Next.js 15.5.2 with Turbopack
- **Database**: Firebase (Firestore + Realtime Database)
- **Authentication**: Firebase Authentication
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **State Management**: React Context API

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm, yarn, pnpm, or bun
- Firebase project with Firestore and Authentication enabled

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd my-project
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Configure Firebase:
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com)
   - Enable Firestore Database and Authentication
   - Copy your Firebase config to `src/lib/firebase.ts`

4. Set up Firebase Security Rules:

**Firestore Rules:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**Realtime Database Rules:**
```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}
```

### Development

Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Project Structure

```
src/
├── app/
│   └── page.tsx                 # Main application page
├── components/
│   ├── Dashboard.tsx            # Main dashboard component
│   ├── DeviceForm.tsx           # Add/Edit device form
│   ├── DeviceList.tsx           # Device list with table/card views
│   └── LoginForm.tsx            # Admin login interface
├── contexts/
│   ├── AuthContext.tsx          # Authentication state management
│   └── DeviceContext.tsx        # Device data management
├── lib/
│   └── firebase.ts              # Firebase configuration
└── types/
    └── device.ts                # TypeScript type definitions
```

## Usage

### Admin Login
1. Access the application at the configured URL
2. Click "Login" to reveal the admin login form
3. Enter admin credentials to access the dashboard

### Managing Devices
1. **Add Device**: Click "Add Device" button and fill out the form
2. **Edit Device**: Click the "Edit" button on any device row/card
3. **Delete Device**: Click "Delete" and confirm the action
4. **Search**: Use the search bar to find devices by staff name

### Device Information
Each device record includes:
- Staff name (required)
- Department
- Device type (Laptop/Desktop/Both)
- Device model
- Operating system
- Hardware specifications (CPU, RAM, GPU, Storage)
- Status and ownership information
- Optional notes

## Mobile Responsiveness

### Desktop (1024px+)
- Traditional table layout
- Full feature visibility
- Hover effects and animations

### Tablet/Mobile (<1024px)
- Card-based layout
- Stacked information display
- Touch-optimized buttons
- Horizontal scrolling for table (fallback)

## Authentication Flow

1. **Initial Load**: Check for existing authentication
2. **Login Required**: Show login form for unauthenticated users
3. **Admin Access**: Validate credentials and redirect to dashboard
4. **Session Management**: Maintain authentication state
5. **Logout**: Clear session and return to login

## Database Schema

### Device Object Structure
```typescript
interface Device {
  id: string;
  staffName: string;
  department: string;
  deviceType: 'Laptop' | 'Desktop' | 'Both';
  deviceModel: string;
  operatingSystem: string;
  processor: string;
  ram: string;
  graphics: string;
  storage: string;
  status: 'Working' | 'Broken' | 'Under Repair';
  ownership: 'Company-owned' | 'Personal';
  notes?: string;
}
```

## Deployment

### Vercel (Recommended)
1. Connect your repository to Vercel
2. Configure environment variables for Firebase
3. Deploy automatically on push to main branch

### Other Platforms
The application can be deployed to any platform supporting Next.js:
- Netlify
- Firebase Hosting
- AWS Amplify
- Self-hosted with Docker

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly on both desktop and mobile
5. Submit a pull request

## License

This project is proprietary software for internal company use.

## Support

For technical support or feature requests, please contact the development team.

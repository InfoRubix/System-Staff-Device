# System Staff Device Management

A comprehensive Next.js application for managing staff devices across multiple departments with real-time analytics and reporting capabilities.

## 🚀 Features

### Core Functionality
- **Device Management**: Add, edit, delete, and track devices across departments
- **Staff Management**: Associate devices with staff members and departments
- **Real-time Search**: Advanced search functionality for finding devices and staff
- **Department Overview**: Visual dashboard showing device distribution by department
- **Status Tracking**: Monitor device status (Working, Broken, Needs Repair)

### Analytics & Reporting
- **Data Analysis Dashboard**: Comprehensive visual analytics with interactive charts
- **Device Status Distribution**: Pie charts showing working vs. broken devices
- **Device Type Analysis**: Distribution of laptops, desktops, tablets, and phones
- **OS Age Analysis**: Track operating system versions and their ages
- **Hardware Upgrade Tracking**: Monitor devices needing CPU/RAM upgrades
- **Issues Trend Analysis**: 12-month trend view of device problems
- **PDF Export**: Export analytics reports to PDF format

### Technical Features
- **Firebase Integration**: Real-time database with Firestore
- **Authentication**: Secure login system with Firebase Auth
- **Responsive Design**: Mobile-first design with Tailwind CSS
- **Performance Optimized**: Dynamic chart loading and optimized rendering
- **Type Safety**: Full TypeScript implementation

## 🏗️ Tech Stack

- **Frontend**: Next.js 15.5.2, React 19.1.0, TypeScript 5.9.2
- **Styling**: Tailwind CSS 3.4.1
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Charts**: Chart.js 4.5.0 with React Chart.js 2
- **PDF Generation**: jsPDF 3.0.2 with html2canvas 1.4.1
- **Development**: ESLint, PostCSS, Turbopack

## 📦 Installation

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Firebase project setup

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd System-Staff-Device
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Firebase**
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Firestore Database and Authentication
   - Copy your Firebase configuration

4. **Environment Setup**
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your_project.firebaseio.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:3000`

## 🔧 Available Scripts

```bash
# Development
npm run dev          # Start development server with Turbopack
npm run build        # Build for production
npm run build:turbo  # Build with Turbopack
npm run start        # Start production server

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues automatically
```

## 📊 Department Structure

The application supports the following departments:
- **MARKETING**: Marketing and communications team
- **RUBIX**: Development and technical team
- **CONVEY**: Logistics and operations
- **ACCOUNT**: Finance and accounting
- **HR**: Human resources
- **LITIGATION**: Legal department
- **SANCO**: Compliance and regulatory
- **POT/POC**: Proof of concept projects
- **AFC**: Administrative and facilities

## 🗂️ Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── dashboard/         # Main dashboard page
│   ├── data-analysis/     # Analytics dashboard
│   └── api/              # API routes
├── components/            # React components
│   ├── Dashboard.tsx      # Main dashboard component
│   ├── DepartmentDashboard.tsx  # Department overview
│   ├── DataAnalysis.tsx   # Analytics dashboard
│   ├── DeviceForm.tsx     # Device creation/editing
│   ├── DeviceList.tsx     # Device listing
│   └── Navigation.tsx     # Navigation component
├── contexts/              # React contexts
│   ├── AuthContext.tsx    # Authentication state
│   ├── DeviceContext.tsx  # Device data management
│   └── BudgetContext.tsx  # Budget calculations
├── lib/                   # Utility libraries
│   ├── firebase.ts        # Firebase configuration
│   ├── authService.ts     # Authentication services
│   └── deviceService.ts   # Device CRUD operations
├── types/                 # TypeScript type definitions
│   ├── device.ts          # Device-related types
│   └── budget.ts          # Budget-related types
└── data/                  # Static data and configurations
    ├── deviceCosts.ts     # Device pricing data
    └── partsCatalog.ts    # Hardware parts catalog
```

## 📱 Usage Guide

### Adding a New Device
1. Navigate to the Dashboard
2. Click "Add Device" button
3. Fill in device details:
   - Staff name and department
   - Device type (Laptop, Desktop, Tablet, Phone)
   - Hardware specifications (CPU, RAM, Storage, Graphics)
   - Operating system
   - Current status
   - Additional notes

### Managing Devices
- **Edit**: Click the edit button on any device card
- **Delete**: Use the delete button with confirmation
- **Search**: Use the global search to find devices by staff name
- **Filter by Department**: Click on department cards to view specific departments

### Viewing Analytics
1. Go to Data Analysis page
2. View interactive charts and KPI metrics
3. Click on chart elements for detailed breakdowns
4. Export reports using the PDF export feature

### Understanding Device Status
- **Working**: Device is functioning normally
- **Broken**: Device is completely non-functional
- **Needs Repair**: Device has issues but may be partially functional

## 🔐 Security Features

- **Authentication Required**: All pages require user authentication
- **Data Validation**: Form inputs are validated on both client and server
- **Secure Firebase Rules**: Database access controlled by Firebase security rules
- **Environment Variables**: Sensitive configuration stored securely

## 🌐 Deployment

### Firebase Hosting
1. Build the project: `npm run build`
2. Install Firebase CLI: `npm install -g firebase-tools`
3. Login to Firebase: `firebase login`
4. Deploy: `firebase deploy`

### Vercel (Recommended for Next.js)
1. Connect your repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on commits

## 📈 Performance Considerations

- **Dynamic Imports**: Charts are loaded dynamically to reduce initial bundle size
- **Image Optimization**: Next.js automatic image optimization
- **Code Splitting**: Automatic code splitting for optimal loading
- **Caching**: Firebase data caching for improved performance

## 🛠️ Customization

### Adding New Device Types
1. Update the `DeviceType` type in `src/types/device.ts`
2. Add corresponding options in `DeviceForm.tsx`
3. Update chart configurations in `DataAnalysis.tsx`

### Adding New Departments
1. Update the `Department` type and `DEPARTMENTS` array in `src/types/device.ts`
2. The UI will automatically reflect the changes

### Modifying Analytics
- Charts are configured in `DataAnalysis.tsx`
- KPI calculations are in the component's `useMemo` hooks
- Add new chart types by importing from Chart.js

## 🐛 Troubleshooting

### Common Issues

**Firebase Connection Issues**
- Verify environment variables are correctly set
- Check Firebase project configuration
- Ensure Firestore rules allow read/write access

**Chart Rendering Problems**
- Clear browser cache
- Check console for JavaScript errors
- Verify Chart.js imports are correct

**Authentication Problems**
- Check Firebase Auth configuration
- Verify domain is authorized in Firebase console
- Clear browser storage and retry

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -m 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section above
- Review Firebase documentation for database-related issues

## 🔄 Version History

- **v0.1.0**: Initial release with basic device management
- **Current**: Full analytics dashboard, PDF export, advanced search

---

Built with ❤️ using Next.js and Firebase
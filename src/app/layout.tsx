import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "../contexts/AuthContext";
import { DeviceProvider } from "../contexts/DeviceContext";
import { DepartmentProvider } from "../contexts/DepartmentContext";
import { BudgetProvider } from "../contexts/BudgetContext";
import { NavigationProvider } from "../contexts/NavigationContext";
import NavigationLoadingScreen from "../components/NavigationLoadingScreen";
import NotificationPrompt from "../components/NotificationPrompt";
import CriticalDeviceMonitor from "../components/CriticalDeviceMonitor";
import PWAInstallPrompt from "../components/PWAInstallPrompt";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Device Management System",
  description: "Admin-only web app for managing staff devices",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Device Manager",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#3b82f6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <DepartmentProvider>
            <DeviceProvider>
              <BudgetProvider>
                <NavigationProvider>
                  <NavigationLoadingScreen />
                  <NotificationPrompt />
                  <CriticalDeviceMonitor />
                  <PWAInstallPrompt />
                  {children}
                </NavigationProvider>
              </BudgetProvider>
            </DeviceProvider>
          </DepartmentProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

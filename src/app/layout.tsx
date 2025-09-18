import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "../contexts/AuthContext";
import { DeviceProvider } from "../contexts/DeviceContext";
import { BudgetProvider } from "../contexts/BudgetContext";
import { NavigationProvider } from "../contexts/NavigationContext";
import NavigationLoadingScreen from "../components/NavigationLoadingScreen";
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
          <DeviceProvider>
            <BudgetProvider>
              <NavigationProvider>
                <NavigationLoadingScreen />
                {children}
              </NavigationProvider>
            </BudgetProvider>
          </DeviceProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

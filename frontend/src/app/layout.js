import { Geist, Geist_Mono } from "next/font/google";
import Script from 'next/script';
import "./globals.css";
import Navbar from '@/components/navbar'; // adjust path if needed
import { SessionProvider } from '@/components/session-context';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "VoteWind.org",
  description: "Vote for community wind turbines anywhere in the UK",
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/icons/icon-192.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased m-0 p-0`}>
        {/* reCAPTCHA script globally loaded */}
        <Script
          src="https://www.google.com/recaptcha/api.js"
          strategy="beforeInteractive"
        />
        <Navbar />
        <main>
          <SessionProvider>
            {children}
          </SessionProvider>
        </main>
      </body>
    </html>
  );
}

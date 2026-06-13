import { Geist, Geist_Mono, Playfair_Display, Poppins } from "next/font/google";
import "./globals.css";
import 'bootstrap/dist/css/bootstrap.min.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import Navbar from '@/navigation/page';
import StoreProvider from 'lib/StoreProvider';
import AuthInitializer from 'lib/AuthInitializer';


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-playfair',
  display: 'swap',
});

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata = {
  title: "Leevon Delivery",
  description: "Food Delivery Application",
  manifest: '/manifest.json',
  other: {
    'theme-color': '#F8F5EB',
    'apple-mobile-web-app-status-bar-style': 'default',
  }
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#F8F5EB',
  viewportFit: 'cover',
};

import GlobalServiceCheck from './components/GlobalServiceCheck';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} ${poppins.variable} antialiased`}
      >
        <StoreProvider>
          <AuthInitializer />
          <GlobalServiceCheck />
          {children}
          <Navbar />
        </StoreProvider>
      </body>
    </html>
  );
}



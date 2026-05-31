import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.leevon.delivery',
  appName: 'Leevon Delivery',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    url: 'https://leevon-delivery.vercel.app/',
    allowNavigation: ['leevon-delivery.vercel.app'],
    cleartext: true
  }
};

export default config;

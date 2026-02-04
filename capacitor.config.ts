import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.poker3.app',
  appName: 'Poker3',
  webDir: 'out',
  server: {
    androidScheme: 'https'
  }
};

export default config;

import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.e0239be64e0d42c5a3c3ac383083c1b4',
  appName: 'Imperial Trading',
  webDir: 'dist',
  server: {
    url: 'https://e0239be6-4e0d-42c5-a3c3-ac383083c1b4.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    LocalNotifications: {
      smallIcon: 'ic_notification',
      iconColor: '#C09A58',
      sound: 'default'
    },
    Badge: {
      persist: true,
      autoClear: false
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0A0A0A',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false
    }
  }
};

export default config;

const config = {
  appId: 'com.euphorie.mobile.test', // Changed to avoid conflicts
  appName: 'Euphorie Mobile',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    Camera: {
      permissions: ['camera']
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#000000'
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#000000',
      showSpinner: false
    }
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#000000'
  },
  android: {
    backgroundColor: '#000000'
  }
};

module.exports = config;
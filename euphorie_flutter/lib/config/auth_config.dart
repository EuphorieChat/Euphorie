/// Authentication Configuration for Euphorie
/// 
/// Native OAuth + Email/Password authentication
/// Backend: Django at euphorie.com

class AuthConfig {
  // ============================================
  // BACKEND URL
  // ============================================
  
  // Production (your EC2 server)
  static const String backendUrl = 'https://euphorie.com';
  
  // 🔧 FOR LOCAL TESTING ONLY:
  // iOS Simulator with local Django:
  // static const String backendUrl = 'http://localhost:8000';
  
  // Real Device with local Django (use your Mac's IP):
  // Find IP: Mac → System Preferences → Network → Wi-Fi → Details
  // static const String backendUrl = 'http://192.168.1.XXX:8000';
  
  static const bool enableBackendSync = true;
  
  // ============================================
  // GOOGLE OAUTH
  // ============================================
  static const String googleClientIdIOS = 
      '271690446038-vubq0fuoa1du3cbin4sncdhl41rnm5qq.apps.googleusercontent.com';  // ✅ UPDATED iOS CLIENT ID
  
  static const String googleClientIdAndroid = 
      '271690446038-a1c3v0vcc9qk6sdjn5jmgeir3n6256m8.apps.googleusercontent.com';
  
  // ============================================
  // MICROSOFT AZURE AD
  // ============================================
  // Your existing Azure AD credentials
  static const String microsoftClientId = 'f8d15ce5-2c27-41cf-a8db-1e7c84ec0c11';
  static const String microsoftTenantId = '49a31049-7b61-4fae-bce8-5e9a2ce13434';
  
  // iOS Redirect URI (must match Info.plist CFBundleURLSchemes)
  static const String microsoftRedirectUriIOS = 'msauth.com.euphorie.app://auth';
  
  // Android Redirect URI  
  static const String microsoftRedirectUriAndroid = 'msauth://com.euphorie.app/auth';
  
  // ============================================
  // APPLE SIGN-IN
  // ============================================
  // Apple Sign-In is configured in Xcode:
  // - Target → Signing & Capabilities → + Capability → Sign in with Apple
  // - Bundle ID: com.euphorie.app
  // - Team ID: YBASLHXF5R
  // No additional config needed here - it works automatically!
  
  // ============================================
  // SESSION STORAGE KEYS
  // ============================================
  static const String storageKeyUser = 'user_data';
  static const String storageKeyProvider = 'auth_provider';
}
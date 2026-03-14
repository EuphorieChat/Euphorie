import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';
import 'package:flutter_appauth/flutter_appauth.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/auth_config.dart';

class AuthService extends ChangeNotifier {
  // ============================================
  // CONFIGURATION
  // ============================================
  
  final GoogleSignIn _googleSignIn = GoogleSignIn(
    clientId: defaultTargetPlatform == TargetPlatform.iOS 
        ? AuthConfig.googleClientIdIOS 
        : AuthConfig.googleClientIdAndroid,
    scopes: ['email', 'profile'],
  );
  
  final FlutterAppAuth _appAuth = const FlutterAppAuth();
  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage();

  Map<String, dynamic>? _user;
  bool _isLoading = false;
  String? _errorMessage;
  String? _authProvider; // 'google', 'apple', 'microsoft', 'email'

  Map<String, dynamic>? get user => _user;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  bool get isAuthenticated => _user != null;
  String? get authProvider => _authProvider;

  AuthService() {
    _loadUserFromStorage();
  }

  Future<void> _loadUserFromStorage() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final userData = prefs.getString('user_data');
      final provider = prefs.getString('auth_provider');
      
      if (userData != null) {
        _user = jsonDecode(userData);
        _authProvider = provider;
        notifyListeners();
        debugPrint('✅ Loaded user from storage: ${_user?['email']}');
      }
    } catch (e) {
      debugPrint('⚠️ Error loading user from storage: $e');
    }
  }

  Future<void> _saveUserToStorage(Map<String, dynamic> userData, String provider) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('user_data', jsonEncode(userData));
      await prefs.setString('auth_provider', provider);
      
      _user = userData;
      _authProvider = provider;
      
      debugPrint('✅ User saved to storage');
    } catch (e) {
      debugPrint('⚠️ Error saving user to storage: $e');
    }
  }

  void _setLoading(bool loading) {
    _isLoading = loading;
    notifyListeners();
  }

  void _setError(String? error) {
    _errorMessage = error;
    notifyListeners();
  }

  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }


  /// Send social auth credentials to backend, get JWT tokens back.
  Future<Map<String, dynamic>?> _backendSocialAuth(
    String endpoint,
    Map<String, dynamic> body,
  ) async {
    try {
      final response = await http.post(
        Uri.parse('${AuthConfig.backendUrl}$endpoint'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(body),
      );
      if (response.statusCode == 200 || response.statusCode == 201) {
        return jsonDecode(response.body);
      } else {
        final err = jsonDecode(response.body);
        debugPrint('Backend social auth error: ${err["error"]}');
        return null;
      }
    } catch (e) {
      debugPrint('Backend social auth exception: $e');
      return null;
    }
  }

  // ============================================
  // EMAIL & PASSWORD AUTHENTICATION
  // ============================================

  Future<bool> register({
    required String email,
    required String password,
    String? displayName,
  }) async {
    try {
      _setLoading(true);
      _setError(null);

      debugPrint('🔐 Registering user with email: $email');

      final response = await http.post(
        Uri.parse('${AuthConfig.backendUrl}/api/auth/register/'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': email,
          'password': password,
          'display_name': displayName ?? email.split('@')[0],
        }),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = jsonDecode(response.body);
        
        debugPrint('✅ Registration successful');

        final userData = {
          'id': data['user_id'].toString(),
          'email': data['email'],
          'displayName': data['display_name'] ?? displayName ?? email.split('@')[0],
          'accessToken': data['access_token'],
          'refreshToken': data['refresh_token'],
          'provider': 'email',
        };

        try {
          if (data['access_token'] != null) {
            await _secureStorage.write(key: 'email_access_token', value: data['access_token']);
          }
          if (data['refresh_token'] != null) {
            await _secureStorage.write(key: 'email_refresh_token', value: data['refresh_token']);
          }
        } catch (e) {
          debugPrint('Secure storage write skipped: $e');
        }

        await _saveUserToStorage(userData, 'email');
        notifyListeners();

        return true;
      } else {
        final errorData = jsonDecode(response.body);
        final errorMessage = errorData['error'] ?? 'Registration failed';
        
        debugPrint('❌ Registration failed: $errorMessage');
        _setError(errorMessage);
        return false;
      }
    } catch (e) {
      debugPrint('❌ Registration error: $e');
      
      if (e.toString().contains('SocketException') || e.toString().contains('Connection')) {
        _setError('Cannot connect to server. Please check your internet connection.');
      } else {
        _setError('Registration failed. Please try again.');
      }
      
      return false;
    } finally {
      _setLoading(false);
    }
  }

  Future<bool> login({
    required String email,
    required String password,
  }) async {
    try {
      _setLoading(true);
      _setError(null);

      debugPrint('🔐 Signing in with email: $email');

      final response = await http.post(
        Uri.parse('${AuthConfig.backendUrl}/api/auth/login/'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': email,
          'password': password,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        
        debugPrint('✅ Sign-in successful');

        final userData = {
          'id': data['user_id'].toString(),
          'email': data['email'],
          'displayName': data['display_name'] ?? email.split('@')[0],
          'accessToken': data['access_token'],
          'refreshToken': data['refresh_token'],
          'provider': 'email',
        };

        try {
          if (data['access_token'] != null) {
            await _secureStorage.write(key: 'email_access_token', value: data['access_token']);
          }
          if (data['refresh_token'] != null) {
            await _secureStorage.write(key: 'email_refresh_token', value: data['refresh_token']);
          }
        } catch (e) {
          debugPrint('Secure storage write skipped: $e');
        }

        await _saveUserToStorage(userData, 'email');
        notifyListeners();

        return true;
      } else {
        final errorData = jsonDecode(response.body);
        final errorMessage = errorData['error'] ?? 'Invalid credentials';
        
        debugPrint('❌ Sign-in failed: $errorMessage');
        _setError(errorMessage);
        return false;
      }
    } catch (e) {
      debugPrint('❌ Sign-in error: $e');
      
      if (e.toString().contains('SocketException') || e.toString().contains('Connection')) {
        _setError('Cannot connect to server. Please check your internet connection.');
      } else {
        _setError('Sign-in failed. Please try again.');
      }
      
      return false;
    } finally {
      _setLoading(false);
    }
  }

  // ============================================
  // GOOGLE SIGN-IN
  // ============================================

  Future<bool> signInWithGoogle() async {
    try {
      _setLoading(true);
      _setError(null);

      debugPrint('Starting Google Sign-In...');

      final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();

      if (googleUser == null) {
        debugPrint('Google sign-in cancelled by user');
        _setLoading(false);
        return false;
      }

      final GoogleSignInAuthentication googleAuth = await googleUser.authentication;

      debugPrint('Google OAuth complete: ${googleUser.email}');

      // Send to backend for user creation + JWT
      final data = await _backendSocialAuth('/api/auth/google/', {
        'id_token': googleAuth.idToken,
        'access_token': googleAuth.accessToken,
        'email': googleUser.email,
        'displayName': googleUser.displayName ?? '',
      });

      if (data == null) {
        _setError('Google sign-in failed. Please try again.');
        return false;
      }

      final userData = {
        'id': data['user_id'].toString(),
        'email': data['email'],
        'displayName': data['display_name'] ?? googleUser.displayName ?? googleUser.email.split('@')[0],
        'photoURL': googleUser.photoUrl,
        'accessToken': data['access_token'],
        'refreshToken': data['refresh_token'],
        'provider': 'google',
      };

      try {
        await _secureStorage.write(key: 'access_token', value: data['access_token']);
        await _secureStorage.write(key: 'refresh_token', value: data['refresh_token']);
      } catch (e) {
        debugPrint('Secure storage write skipped: $e');
      }

      await _saveUserToStorage(userData, 'google');
      notifyListeners();

      debugPrint('Google sign-in complete: ${data['email']}');
      return true;
    } catch (e) {
      debugPrint('Google sign-in error: $e');
      _setError('Google sign-in failed. Please try again.');
      return false;
    } finally {
      _setLoading(false);
    }
  }

  // ============================================
  // APPLE SIGN-IN
  // ============================================

  Future<bool> signInWithApple() async {
    try {
      _setLoading(true);
      _setError(null);

      debugPrint('Starting Apple Sign-In...');

      final isAvailable = await SignInWithApple.isAvailable();
      if (!isAvailable) {
        _setError('Apple Sign-In is not available on this device');
        _setLoading(false);
        return false;
      }

      final credential = await SignInWithApple.getAppleIDCredential(
        scopes: [
          AppleIDAuthorizationScopes.email,
          AppleIDAuthorizationScopes.fullName,
        ],
      );

      debugPrint('Apple OAuth complete');

      final displayName = credential.givenName != null || credential.familyName != null
          ? '${credential.givenName ?? ''} ${credential.familyName ?? ''}'.trim()
          : null;

      // Send identity token to backend for JWT verification + user creation
      final data = await _backendSocialAuth('/api/auth/apple/', {
        'identityToken': credential.identityToken,
        'email': credential.email,
        'displayName': displayName ?? '',
        'apple_user_id': credential.userIdentifier,
      });

      if (data == null) {
        _setError('Apple sign-in failed. Please try again.');
        return false;
      }

      final userData = {
        'id': data['user_id'].toString(),
        'email': data['email'],
        'displayName': data['display_name'] ?? displayName ?? data['email'].split('@')[0],
        'accessToken': data['access_token'],
        'refreshToken': data['refresh_token'],
        'provider': 'apple',
      };

      try {
        await _secureStorage.write(key: 'access_token', value: data['access_token']);
        await _secureStorage.write(key: 'refresh_token', value: data['refresh_token']);
      } catch (e) {
        debugPrint('Secure storage write skipped: $e');
      }

      await _saveUserToStorage(userData, 'apple');
      notifyListeners();

      debugPrint('Apple sign-in complete: ${data['email']}');
      return true;
    } catch (e) {
      debugPrint('Apple sign-in error: $e');

      if (e.toString().contains('1001') || e.toString().contains('canceled')) {
        debugPrint('Apple sign-in cancelled by user');
        _setLoading(false);
        return false;
      }

      _setError('Apple sign-in failed. Please try again.');
      return false;
    } finally {
      _setLoading(false);
    }
  }

  // ============================================
  // MICROSOFT SIGN-IN
  // ============================================

  Future<bool> signInWithMicrosoft() async {
    try {
      _setLoading(true);
      _setError(null);

      debugPrint('Starting Microsoft Sign-In...');

      if (!_isMicrosoftSupported()) {
        _setError('Microsoft sign-in requires iOS or Android');
        _setLoading(false);
        return false;
      }

      final AuthorizationTokenResponse? result = await _appAuth.authorizeAndExchangeCode(
        AuthorizationTokenRequest(
          AuthConfig.microsoftClientId,
          defaultTargetPlatform == TargetPlatform.iOS
              ? AuthConfig.microsoftRedirectUriIOS
              : AuthConfig.microsoftRedirectUriAndroid,
          serviceConfiguration: const AuthorizationServiceConfiguration(
            authorizationEndpoint:
                'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
            tokenEndpoint:
                'https://login.microsoftonline.com/common/oauth2/v2.0/token',
          ),
          scopes: ['openid', 'profile', 'email', 'offline_access', 'User.Read'],
          promptValues: ['login'],
        ),
      );

      if (result == null) {
        debugPrint('Microsoft sign-in cancelled by user');
        _setLoading(false);
        return false;
      }

      debugPrint('Microsoft OAuth complete, sending to backend...');

      // Send access token to backend for MS Graph verification + user creation
      final data = await _backendSocialAuth('/api/auth/microsoft/', {
        'access_token': result.accessToken,
      });

      if (data == null) {
        _setError('Microsoft sign-in failed. Please try again.');
        return false;
      }

      final userData = {
        'id': data['user_id'].toString(),
        'email': data['email'],
        'displayName': data['display_name'] ?? data['email'].split('@')[0],
        'accessToken': data['access_token'],
        'refreshToken': data['refresh_token'],
        'provider': 'microsoft',
      };

      try {
        await _secureStorage.write(key: 'access_token', value: data['access_token']);
        await _secureStorage.write(key: 'refresh_token', value: data['refresh_token']);
      } catch (e) {
        debugPrint('Secure storage write skipped: $e');
      }

      await _saveUserToStorage(userData, 'microsoft');
      notifyListeners();

      debugPrint('Microsoft sign-in complete: ${data['email']}');
      return true;
    } catch (e) {
      debugPrint('Microsoft sign-in error: $e');

      if (e.toString().contains('User cancelled') ||
          e.toString().contains('CANCELED')) {
        debugPrint('Microsoft sign-in cancelled by user');
        _setLoading(false);
        return false;
      }

      _setError('Microsoft sign-in failed. Please try again.');
      return false;
    } finally {
      _setLoading(false);
    }
  }

  bool _isMicrosoftSupported() {
    return defaultTargetPlatform == TargetPlatform.iOS || defaultTargetPlatform == TargetPlatform.android;
  }

  // ============================================
  // SIGN OUT
  // ============================================

  Future<void> signOut() async {
    try {
      _setLoading(true);

      debugPrint('🚪 Signing out user...');

      switch (_authProvider) {
        case 'google':
          try { await _googleSignIn.signOut(); } catch (_) {}
          break;
        case 'microsoft':
          try {
            await _secureStorage.delete(key: 'microsoft_access_token');
            await _secureStorage.delete(key: 'microsoft_refresh_token');
          } catch (_) {}
          break;
        case 'email':
          try {
            await _secureStorage.delete(key: 'email_access_token');
            await _secureStorage.delete(key: 'email_refresh_token');
          } catch (_) {}
          break;
        case 'apple':
          break;
      }

      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('user_data');
      await prefs.remove('auth_provider');

      _user = null;
      _authProvider = null;
      _errorMessage = null;

      notifyListeners();

      debugPrint('✅ User signed out successfully');
    } catch (e) {
      debugPrint('❌ Sign out error: $e');
    } finally {
      _setLoading(false);
    }
  }

  // ============================================
  // USER PROFILE METHODS
  // ============================================

  String? getUserId() => _user?['id'];
  String? getUserEmail() => _user?['email'];
  String? getUserDisplayName() => _user?['displayName'];
  String? getUserPhotoURL() => _user?['photoURL'];
  Map<String, dynamic>? getUserData() => _user;

  bool isSignedInWith(String provider) {
    return _authProvider == provider && _user != null;
  }

  Future<void> checkAuthStatus() async {
    await _loadUserFromStorage();
  }
}
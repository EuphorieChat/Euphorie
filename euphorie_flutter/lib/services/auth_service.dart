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
      
      // Optional: Save to backend
      if (AuthConfig.enableBackendSync) {
        await _syncUserToBackend(userData);
      }
      
      debugPrint('✅ User saved to storage');
    } catch (e) {
      debugPrint('⚠️ Error saving user to storage: $e');
    }
  }

  Future<void> _syncUserToBackend(Map<String, dynamic> userData) async {
    try {
      final response = await http.post(
        Uri.parse('${AuthConfig.backendUrl}/api/auth/sync'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(userData),
      );
      
      if (response.statusCode == 200) {
        debugPrint('✅ User synced to backend');
      }
    } catch (e) {
      debugPrint('⚠️ Backend sync failed (continuing anyway): $e');
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

        if (data['access_token'] != null) {
          await _secureStorage.write(
            key: 'email_access_token',
            value: data['access_token'],
          );
        }
        if (data['refresh_token'] != null) {
          await _secureStorage.write(
            key: 'email_refresh_token',
            value: data['refresh_token'],
          );
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

        if (data['access_token'] != null) {
          await _secureStorage.write(
            key: 'email_access_token',
            value: data['access_token'],
          );
        }
        if (data['refresh_token'] != null) {
          await _secureStorage.write(
            key: 'email_refresh_token',
            value: data['refresh_token'],
          );
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

      debugPrint('🔐 Starting Google Sign-In...');

      final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();

      if (googleUser == null) {
        debugPrint('⚠️ Google sign-in cancelled by user');
        _setLoading(false);
        return false;
      }

      final GoogleSignInAuthentication googleAuth = await googleUser.authentication;

      debugPrint('✅ Google sign-in successful: ${googleUser.email}');

      final userData = {
        'id': googleUser.id,
        'email': googleUser.email,
        'displayName': googleUser.displayName,
        'photoURL': googleUser.photoUrl,
        'accessToken': googleAuth.accessToken,
        'idToken': googleAuth.idToken,
        'provider': 'google',
      };

      await _saveUserToStorage(userData, 'google');
      notifyListeners();

      return true;
    } catch (e) {
      debugPrint('❌ Google sign-in error: $e');
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

      debugPrint('🔐 Starting Apple Sign-In...');

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

      debugPrint('✅ Apple sign-in successful');

      final displayName = credential.givenName != null || credential.familyName != null
          ? '${credential.givenName ?? ''} ${credential.familyName ?? ''}'.trim()
          : null;

      final userData = {
        'id': credential.userIdentifier,
        'email': credential.email ?? 'apple_user_${credential.userIdentifier}',
        'displayName': displayName,
        'identityToken': credential.identityToken,
        'authorizationCode': credential.authorizationCode,
        'provider': 'apple',
      };

      await _saveUserToStorage(userData, 'apple');
      notifyListeners();

      return true;
    } catch (e) {
      debugPrint('❌ Apple sign-in error: $e');

      if (e.toString().contains('1001') || e.toString().contains('canceled')) {
        debugPrint('⚠️ Apple sign-in cancelled by user');
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

      debugPrint('🔐 Starting Microsoft Sign-In...');

      final AuthorizationTokenResponse? result = await _appAuth.authorizeAndExchangeCode(
        AuthorizationTokenRequest(
          AuthConfig.microsoftClientId,
          defaultTargetPlatform == TargetPlatform.iOS 
              ? AuthConfig.microsoftRedirectUriIOS 
              : AuthConfig.microsoftRedirectUriAndroid,
          serviceConfiguration: AuthorizationServiceConfiguration(
            authorizationEndpoint: 
                'https://login.microsoftonline.com/${AuthConfig.microsoftTenantId}/oauth2/v2.0/authorize',
            tokenEndpoint: 
                'https://login.microsoftonline.com/${AuthConfig.microsoftTenantId}/oauth2/v2.0/token',
          ),
          scopes: ['openid', 'profile', 'email', 'offline_access', 'User.Read'],
          promptValues: ['login'],
        ),
      );

      if (result == null) {
        debugPrint('⚠️ Microsoft sign-in cancelled by user');
        _setLoading(false);
        return false;
      }

      debugPrint('✅ Microsoft access token obtained');

      if (result.accessToken != null) {
        await _secureStorage.write(
          key: 'microsoft_access_token',
          value: result.accessToken,
        );
      }
      if (result.refreshToken != null) {
        await _secureStorage.write(
          key: 'microsoft_refresh_token',
          value: result.refreshToken,
        );
      }

      final userInfo = await _getMicrosoftUserInfo(result.accessToken!);

      if (userInfo == null) {
        _setError('Failed to get user information');
        _setLoading(false);
        return false;
      }

      debugPrint('✅ Microsoft sign-in successful: ${userInfo['mail'] ?? userInfo['userPrincipalName']}');

      final userData = {
        'id': userInfo['id'],
        'email': userInfo['mail'] ?? userInfo['userPrincipalName'],
        'displayName': userInfo['displayName'],
        'accessToken': result.accessToken,
        'refreshToken': result.refreshToken,
        'provider': 'microsoft',
      };

      await _saveUserToStorage(userData, 'microsoft');
      notifyListeners();

      return true;
    } catch (e) {
      debugPrint('❌ Microsoft sign-in error: $e');
      
      if (e.toString().contains('User cancelled') || 
          e.toString().contains('CANCELED')) {
        debugPrint('⚠️ Microsoft sign-in cancelled by user');
        _setLoading(false);
        return false;
      }
      
      _setError('Microsoft sign-in failed. Please try again.');
      return false;
    } finally {
      _setLoading(false);
    }
  }

  Future<Map<String, dynamic>?> _getMicrosoftUserInfo(String accessToken) async {
    try {
      final response = await http.get(
        Uri.parse('https://graph.microsoft.com/v1.0/me'),
        headers: {
          'Authorization': 'Bearer $accessToken',
          'Content-Type': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        debugPrint('❌ Failed to get user info: ${response.statusCode}');
        return null;
      }
    } catch (e) {
      debugPrint('❌ Error getting user info: $e');
      return null;
    }
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
          await _googleSignIn.signOut();
          break;
        case 'microsoft':
          await _secureStorage.delete(key: 'microsoft_access_token');
          await _secureStorage.delete(key: 'microsoft_refresh_token');
          break;
        case 'email':
          await _secureStorage.delete(key: 'email_access_token');
          await _secureStorage.delete(key: 'email_refresh_token');
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
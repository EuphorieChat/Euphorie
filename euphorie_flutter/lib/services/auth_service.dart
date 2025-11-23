import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';
import 'package:flutter_appauth/flutter_appauth.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;

class AuthService extends ChangeNotifier {
  // ============================================
  // CONFIGURATION
  // ============================================
  
  // Google OAuth Configuration
  static const String _googleClientIdIOS = '271690446038-a1c3v0vcc9qk6sdjn5jmgeir3n6256m8.apps.googleusercontent.com';
  static const String _googleClientIdAndroid = '271690446038-a1c3v0vcc9qk6sdjn5jmgeir3n6256m8.apps.googleusercontent.com'; // Update if different
  
  // Microsoft OAuth Configuration
  static const String _microsoftClientId = 'f8d15ce5-2c27-41cf-a8db-1e7c84ec0c11';
  static const String _microsoftTenantId = '49a31049-7b61-4fae-bce8-5e9a2ce13434';
  static const String _microsoftRedirectUri = 'msauth.com.euphorie.app://auth';
  static const String _microsoftAuthorizationEndpoint = 
      'https://login.microsoftonline.com/$_microsoftTenantId/oauth2/v2.0/authorize';
  static const String _microsoftTokenEndpoint = 
      'https://login.microsoftonline.com/$_microsoftTenantId/oauth2/v2.0/token';
  static const List<String> _microsoftScopes = [
    'openid',
    'profile',
    'email',
    'offline_access',
    'User.Read',
  ];
  
  // Backend API (optional - for user profile storage)
  static const String _backendUrl = 'https://euphorie.com';
  
  final GoogleSignIn _googleSignIn = GoogleSignIn(
    clientId: defaultTargetPlatform == TargetPlatform.iOS 
        ? _googleClientIdIOS 
        : _googleClientIdAndroid,
    scopes: ['email', 'profile'],
  );
  
  final FlutterAppAuth _appAuth = const FlutterAppAuth();
  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage();

  Map<String, dynamic>? _user;
  bool _isLoading = false;
  String? _errorMessage;
  String? _authProvider; // 'google', 'apple', 'microsoft'

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
      await _syncUserToBackend(userData);
      
      debugPrint('✅ User saved to storage');
    } catch (e) {
      debugPrint('⚠️ Error saving user to storage: $e');
    }
  }

  Future<void> _syncUserToBackend(Map<String, dynamic> userData) async {
    try {
      final response = await http.post(
        Uri.parse('$_backendUrl/api/auth/sync'),
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

  Future<bool> registerWithEmail({
    required String email,
    required String password,
    String? displayName,
  }) async {
    try {
      _setLoading(true);
      _setError(null);

      debugPrint('🔐 Registering user with email: $email');

      // Send registration request to your Django backend
      final response = await http.post(
        Uri.parse('$_backendUrl/api/auth/register'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': email,
          'password': password,
          'display_name': displayName,
        }),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = jsonDecode(response.body);
        
        debugPrint('✅ Registration successful');

        // Create user data
        final userData = {
          'id': data['user_id'] ?? data['id'],
          'email': email,
          'displayName': displayName ?? email.split('@')[0],
          'accessToken': data['access_token'],
          'refreshToken': data['refresh_token'],
          'provider': 'email',
        };

        // Store tokens securely
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
        final errorMessage = errorData['message'] ?? errorData['error'] ?? 'Registration failed';
        
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

  Future<bool> signInWithEmail({
    required String email,
    required String password,
  }) async {
    try {
      _setLoading(true);
      _setError(null);

      debugPrint('🔐 Signing in with email: $email');

      // Send login request to your Django backend
      final response = await http.post(
        Uri.parse('$_backendUrl/api/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': email,
          'password': password,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        
        debugPrint('✅ Sign-in successful');

        // Create user data
        final userData = {
          'id': data['user_id'] ?? data['id'],
          'email': email,
          'displayName': data['display_name'] ?? data['name'] ?? email.split('@')[0],
          'photoURL': data['photo_url'],
          'accessToken': data['access_token'],
          'refreshToken': data['refresh_token'],
          'provider': 'email',
        };

        // Store tokens securely
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
        final errorMessage = errorData['message'] ?? errorData['error'] ?? 'Invalid credentials';
        
        debugPrint('❌ Sign-in failed: $errorMessage');
        
        if (errorMessage.contains('credentials') || errorMessage.contains('password')) {
          _setError('Invalid email or password');
        } else {
          _setError(errorMessage);
        }
        
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
  // PASSWORD RESET
  // ============================================

  Future<bool> sendPasswordResetEmail(String email) async {
    try {
      _setLoading(true);
      _setError(null);

      debugPrint('📧 Sending password reset email to: $email');

      final response = await http.post(
        Uri.parse('$_backendUrl/api/auth/reset-password'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email}),
      );

      if (response.statusCode == 200) {
        debugPrint('✅ Password reset email sent');
        return true;
      } else {
        final errorData = jsonDecode(response.body);
        _setError(errorData['message'] ?? 'Failed to send reset email');
        return false;
      }
    } catch (e) {
      debugPrint('❌ Password reset error: $e');
      _setError('Failed to send reset email. Please try again.');
      return false;
    } finally {
      _setLoading(false);
    }
  }

  Future<bool> resetPassword({
    required String token,
    required String newPassword,
  }) async {
    try {
      _setLoading(true);
      _setError(null);

      debugPrint('🔑 Resetting password with token');

      final response = await http.post(
        Uri.parse('$_backendUrl/api/auth/reset-password/confirm'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'token': token,
          'new_password': newPassword,
        }),
      );

      if (response.statusCode == 200) {
        debugPrint('✅ Password reset successful');
        return true;
      } else {
        final errorData = jsonDecode(response.body);
        _setError(errorData['message'] ?? 'Password reset failed');
        return false;
      }
    } catch (e) {
      debugPrint('❌ Password reset error: $e');
      _setError('Password reset failed. Please try again.');
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

      // Trigger Google Sign-In flow
      final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();

      if (googleUser == null) {
        debugPrint('⚠️ Google sign-in cancelled by user');
        _setLoading(false);
        return false;
      }

      // Get auth details
      final GoogleSignInAuthentication googleAuth = await googleUser.authentication;

      debugPrint('✅ Google sign-in successful: ${googleUser.email}');

      // Create user data
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

      // Check if available
      final isAvailable = await SignInWithApple.isAvailable();
      if (!isAvailable) {
        _setError('Apple Sign-In is not available on this device');
        _setLoading(false);
        return false;
      }

      // Request credential
      final credential = await SignInWithApple.getAppleIDCredential(
        scopes: [
          AppleIDAuthorizationScopes.email,
          AppleIDAuthorizationScopes.fullName,
        ],
      );

      debugPrint('✅ Apple sign-in successful');

      // Create user data
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

      // Handle user cancellation gracefully
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

      // Authorize with Microsoft
      final AuthorizationTokenResponse? result = await _appAuth.authorizeAndExchangeCode(
        AuthorizationTokenRequest(
          _microsoftClientId,
          _microsoftRedirectUri,
          serviceConfiguration: AuthorizationServiceConfiguration(
            authorizationEndpoint: _microsoftAuthorizationEndpoint,
            tokenEndpoint: _microsoftTokenEndpoint,
          ),
          scopes: _microsoftScopes,
          promptValues: ['login'], // Force account selection
        ),
      );

      if (result == null) {
        debugPrint('⚠️ Microsoft sign-in cancelled by user');
        _setLoading(false);
        return false;
      }

      debugPrint('✅ Microsoft access token obtained');

      // Store tokens securely
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

      // Get user info from Microsoft Graph API
      final userInfo = await _getMicrosoftUserInfo(result.accessToken!);

      if (userInfo == null) {
        _setError('Failed to get user information');
        _setLoading(false);
        return false;
      }

      debugPrint('✅ Microsoft sign-in successful: ${userInfo['mail'] ?? userInfo['userPrincipalName']}');

      // Create user data
      final userData = {
        'id': userInfo['id'],
        'email': userInfo['mail'] ?? userInfo['userPrincipalName'],
        'displayName': userInfo['displayName'],
        'photoURL': null, // Would need additional API call
        'accessToken': result.accessToken,
        'refreshToken': result.refreshToken,
        'provider': 'microsoft',
      };

      await _saveUserToStorage(userData, 'microsoft');
      notifyListeners();

      return true;
    } catch (e) {
      debugPrint('❌ Microsoft sign-in error: $e');
      
      // Handle user cancellation
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

      // Sign out from respective provider
      switch (_authProvider) {
        case 'google':
          await _googleSignIn.signOut();
          break;
        case 'microsoft':
          // Clear secure storage tokens
          await _secureStorage.delete(key: 'microsoft_access_token');
          await _secureStorage.delete(key: 'microsoft_refresh_token');
          break;
        case 'email':
          // Clear email auth tokens
          await _secureStorage.delete(key: 'email_access_token');
          await _secureStorage.delete(key: 'email_refresh_token');
          
          // Optional: Call backend logout endpoint
          try {
            final accessToken = await _secureStorage.read(key: 'email_access_token');
            if (accessToken != null) {
              await http.post(
                Uri.parse('$_backendUrl/api/auth/logout'),
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': 'Bearer $accessToken',
                },
              );
            }
          } catch (e) {
            debugPrint('⚠️ Backend logout failed (continuing): $e');
          }
          break;
        case 'apple':
          // Apple doesn't have a sign-out method
          break;
      }

      // Clear local storage
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

  Future<bool> updateUserProfile({
    String? displayName,
    String? photoURL,
  }) async {
    if (_user == null) return false;

    try {
      final updatedUser = Map<String, dynamic>.from(_user!);

      if (displayName != null) {
        updatedUser['displayName'] = displayName;
      }
      if (photoURL != null) {
        updatedUser['photoURL'] = photoURL;
      }

      await _saveUserToStorage(updatedUser, _authProvider!);
      notifyListeners();

      debugPrint('✅ User profile updated');
      return true;
    } catch (e) {
      debugPrint('❌ Error updating profile: $e');
      return false;
    }
  }

  // ============================================
  // TOKEN REFRESH (for Microsoft)
  // ============================================

  Future<String?> refreshMicrosoftToken() async {
    if (_authProvider != 'microsoft') return null;

    try {
      // Get stored refresh token
      final refreshToken = await _secureStorage.read(key: 'microsoft_refresh_token');
      
      if (refreshToken == null) {
        debugPrint('❌ No refresh token found');
        return null;
      }

      // Request new access token
      final TokenResponse? result = await _appAuth.token(
        TokenRequest(
          _microsoftClientId,
          _microsoftRedirectUri,
          serviceConfiguration: AuthorizationServiceConfiguration(
            authorizationEndpoint: _microsoftAuthorizationEndpoint,
            tokenEndpoint: _microsoftTokenEndpoint,
          ),
          refreshToken: refreshToken,
        ),
      );

      if (result?.accessToken != null) {
        // Store new tokens
        await _secureStorage.write(
          key: 'microsoft_access_token',
          value: result!.accessToken,
        );
        
        if (result.refreshToken != null) {
          await _secureStorage.write(
            key: 'microsoft_refresh_token',
            value: result.refreshToken,
          );
        }

        // Update user data
        if (_user != null) {
          final updatedUser = Map<String, dynamic>.from(_user!);
          updatedUser['accessToken'] = result.accessToken;
          updatedUser['refreshToken'] = result.refreshToken;
          await _saveUserToStorage(updatedUser, 'microsoft');
        }

        debugPrint('✅ Microsoft token refreshed');
        return result.accessToken;
      }

      return null;
    } catch (e) {
      debugPrint('❌ Token refresh failed: $e');
      return null;
    }
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  bool isSignedInWith(String provider) {
    return _authProvider == provider && _user != null;
  }

  Future<void> checkAuthStatus() async {
    await _loadUserFromStorage();
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

  // Note: Email/Password removed - using only native OAuth providers
  // If you need email/password, you can add it to your Django backend
}
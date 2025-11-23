// lib/services/auth_service.dart
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:jwt_decoder/jwt_decoder.dart';
import 'package:dio/dio.dart';
import 'dart:convert';
import 'dart:math';
import 'package:crypto/crypto.dart';

class AuthService extends ChangeNotifier {
  // 🔐 Secure storage for tokens
  final _storage = const FlutterSecureStorage();
  final _dio = Dio();
  
  // 🌐 Backend URL - UPDATE THIS!
  static const String _baseUrl = 'http://localhost:8000';  // Change to your backend URL
  
  final GoogleSignIn _googleSignIn = GoogleSignIn(
    scopes: ['email', 'profile'],
  );
  
  // User state
  Map<String, dynamic>? _user;
  String? _accessToken;
  String? _refreshToken;
  bool _isLoading = false;
  String? _errorMessage;

  // Getters
  Map<String, dynamic>? get user => _user;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  bool get isAuthenticated => _user != null && _accessToken != null;
  String? get accessToken => _accessToken;

  AuthService() {
    _initializeDio();
    _loadSavedAuth();
  }

  // Configure Dio with interceptors
  void _initializeDio() {
    _dio.options.baseUrl = _baseUrl;
    _dio.options.connectTimeout = const Duration(seconds: 10);
    _dio.options.receiveTimeout = const Duration(seconds: 10);
    
    // Add interceptor for auth token
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          if (_accessToken != null) {
            options.headers['Authorization'] = 'Bearer $_accessToken';
          }
          return handler.next(options);
        },
        onError: (error, handler) async {
          // Auto-refresh token on 401
          if (error.response?.statusCode == 401 && _refreshToken != null) {
            try {
              await _refreshAccessToken();
              // Retry the request
              final opts = Options(
                method: error.requestOptions.method,
                headers: error.requestOptions.headers,
              );
              final response = await _dio.request(
                error.requestOptions.path,
                options: opts,
                data: error.requestOptions.data,
                queryParameters: error.requestOptions.queryParameters,
              );
              return handler.resolve(response);
            } catch (e) {
              return handler.next(error);
            }
          }
          return handler.next(error);
        },
      ),
    );
  }

  // Load saved authentication
  Future<void> _loadSavedAuth() async {
    try {
      _accessToken = await _storage.read(key: 'access_token');
      _refreshToken = await _storage.read(key: 'refresh_token');
      final userJson = await _storage.read(key: 'user');
      
      if (_accessToken != null && userJson != null) {
        _user = jsonDecode(userJson);
        
        // Check if token is expired
        if (JwtDecoder.isExpired(_accessToken!)) {
          await _refreshAccessToken();
        }
        
        notifyListeners();
        debugPrint('✅ Auth loaded from storage: ${_user?['email']}');
      }
    } catch (e) {
      debugPrint('⚠️ Error loading saved auth: $e');
      await _clearAuth();
    }
  }

  // Save authentication
  Future<void> _saveAuth({
    required String accessToken,
    required String refreshToken,
    required Map<String, dynamic> user,
  }) async {
    _accessToken = accessToken;
    _refreshToken = refreshToken;
    _user = user;
    
    await _storage.write(key: 'access_token', value: accessToken);
    await _storage.write(key: 'refresh_token', value: refreshToken);
    await _storage.write(key: 'user', value: jsonEncode(user));
    
    notifyListeners();
  }

  // Clear authentication
  Future<void> _clearAuth() async {
    _accessToken = null;
    _refreshToken = null;
    _user = null;
    
    await _storage.deleteAll();
    notifyListeners();
  }

  // Refresh access token
  Future<void> _refreshAccessToken() async {
    try {
      final response = await _dio.post(
        '/api/auth/refresh/',
        data: {'refresh': _refreshToken},
      );
      
      _accessToken = response.data['access'];
      await _storage.write(key: 'access_token', value: _accessToken!);
      
      debugPrint('✅ Token refreshed');
    } catch (e) {
      debugPrint('❌ Token refresh failed: $e');
      await _clearAuth();
      rethrow;
    }
  }

  // Set loading state
  void _setLoading(bool value) {
    _isLoading = value;
    notifyListeners();
  }

  // Set error
  void _setError(String message) {
    _errorMessage = message;
    debugPrint('❌ Auth Error: $message');
    notifyListeners();
  }

  // Clear error
  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }

  // 📧 Register with Email/Password
  Future<bool> register({
    required String email,
    required String password,
    String? firstName,
    String? lastName,
  }) async {
    try {
      _setLoading(true);
      clearError();
      
      final response = await _dio.post(
        '/api/auth/register/',
        data: {
          'email': email,
          'password': password,
          'first_name': firstName ?? '',
          'last_name': lastName ?? '',
        },
      );
      
      await _saveAuth(
        accessToken: response.data['access'],
        refreshToken: response.data['refresh'],
        user: response.data['user'],
      );
      
      debugPrint('✅ Registration successful: $email');
      _setLoading(false);
      return true;
      
    } on DioException catch (e) {
      _setError(e.response?.data['error'] ?? 'Registration failed');
      _setLoading(false);
      return false;
    } catch (e) {
      _setError('Registration failed: $e');
      _setLoading(false);
      return false;
    }
  }

  // 🔑 Login with Email/Password
  Future<bool> login({
    required String email,
    required String password,
  }) async {
    try {
      _setLoading(true);
      clearError();
      
      final response = await _dio.post(
        '/api/auth/login/',
        data: {
          'email': email,
          'password': password,
        },
      );
      
      await _saveAuth(
        accessToken: response.data['access'],
        refreshToken: response.data['refresh'],
        user: response.data['user'],
      );
      
      debugPrint('✅ Login successful: $email');
      _setLoading(false);
      return true;
      
    } on DioException catch (e) {
      _setError(e.response?.data['error'] ?? 'Login failed');
      _setLoading(false);
      return false;
    } catch (e) {
      _setError('Login failed: $e');
      _setLoading(false);
      return false;
    }
  }

  // 🍎 Sign in with Apple
  Future<bool> signInWithApple() async {
    try {
      _setLoading(true);
      clearError();
      
      // Generate nonce
      final rawNonce = _generateNonce();
      final nonce = _sha256ofString(rawNonce);

      // Request credential
      final appleCredential = await SignInWithApple.getAppleIDCredential(
        scopes: [
          AppleIDAuthorizationScopes.email,
          AppleIDAuthorizationScopes.fullName,
        ],
        nonce: nonce,
      );

      // Send to backend
      final response = await _dio.post(
        '/api/auth/apple/',
        data: {
          'id_token': appleCredential.identityToken,
          'first_name': appleCredential.givenName ?? '',
          'last_name': appleCredential.familyName ?? '',
        },
      );
      
      await _saveAuth(
        accessToken: response.data['access'],
        refreshToken: response.data['refresh'],
        user: response.data['user'],
      );
      
      debugPrint('✅ Apple Sign In successful');
      _setLoading(false);
      return true;
      
    } on SignInWithAppleAuthorizationException catch (e) {
      _setError('Apple Sign In cancelled: ${e.message}');
      _setLoading(false);
      return false;
    } on DioException catch (e) {
      _setError(e.response?.data['error'] ?? 'Apple Sign In failed');
      _setLoading(false);
      return false;
    } catch (e) {
      _setError('Apple Sign In failed: $e');
      _setLoading(false);
      return false;
    }
  }

  // 🔵 Sign in with Google
  Future<bool> signInWithGoogle() async {
    try {
      _setLoading(true);
      clearError();

      // Trigger Google Sign In
      final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();
      
      if (googleUser == null) {
        _setError('Google Sign In cancelled');
        _setLoading(false);
        return false;
      }

      // Get auth details
      final GoogleSignInAuthentication googleAuth = await googleUser.authentication;

      // Send to backend
      final response = await _dio.post(
        '/api/auth/google/',
        data: {
          'access_token': googleAuth.accessToken,
          'id_token': googleAuth.idToken,
        },
      );
      
      await _saveAuth(
        accessToken: response.data['access'],
        refreshToken: response.data['refresh'],
        user: response.data['user'],
      );
      
      debugPrint('✅ Google Sign In successful');
      _setLoading(false);
      return true;
      
    } on DioException catch (e) {
      _setError(e.response?.data['error'] ?? 'Google Sign In failed');
      _setLoading(false);
      return false;
    } catch (e) {
      _setError('Google Sign In failed: $e');
      _setLoading(false);
      return false;
    }
  }

  // 🟦 Sign in with Microsoft
  Future<bool> signInWithMicrosoft() async {
    try {
      _setLoading(true);
      clearError();
      
      // Note: You'll need to implement Microsoft OAuth flow
      // For now, this is a placeholder
      _setError('Microsoft Sign In coming soon');
      _setLoading(false);
      return false;
      
    } catch (e) {
      _setError('Microsoft Sign In failed: $e');
      _setLoading(false);
      return false;
    }
  }

  // 🚪 Sign out
  Future<void> signOut() async {
    try {
      if (_refreshToken != null) {
        await _dio.post(
          '/api/auth/logout/',
          data: {'refresh': _refreshToken},
        );
      }
    } catch (e) {
      debugPrint('⚠️ Logout API call failed: $e');
    }
    
    await _googleSignIn.signOut();
    await _clearAuth();
    debugPrint('✅ Sign out successful');
  }

  // 👤 Get user profile
  Future<void> fetchUserProfile() async {
    try {
      final response = await _dio.get('/api/auth/profile/');
      _user = response.data;
      await _storage.write(key: 'user', value: jsonEncode(_user!));
      notifyListeners();
    } catch (e) {
      debugPrint('❌ Error fetching profile: $e');
    }
  }

  // Helper: Generate nonce for Apple Sign In
  String _generateNonce([int length = 32]) {
    const charset = '0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._';
    final random = Random.secure();
    return List.generate(length, (_) => charset[random.nextInt(charset.length)]).join();
  }

  // Helper: SHA256 hash
  String _sha256ofString(String input) {
    final bytes = utf8.encode(input);
    final digest = sha256.convert(bytes);
    return digest.toString();
  }
}
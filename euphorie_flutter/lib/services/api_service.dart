import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  static const String baseUrl = 'https://euphorie.com';
  final Dio _dio = Dio();
  String? _userId;
  bool _isInitialized = false;
  
  // Image compression settings
  static const int maxImageWidth = 640;  // Resize to max 640px wide
  static const int jpegQuality = 70;     // Compress to 70% quality
  
  ApiService() {
    _dio.options.baseUrl = baseUrl;
    _dio.options.connectTimeout = const Duration(seconds: 30);  // Increased
    _dio.options.receiveTimeout = const Duration(seconds: 60);  // Increased for AI processing
    _dio.options.sendTimeout = const Duration(seconds: 30);     // Added send timeout
    _dio.options.headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    _initUserId();
  }
  
  Future<void> _initUserId() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      _userId = prefs.getString('euphorie_user_id');
      
      if (_userId == null) {
        _userId = 'flutter_user_${DateTime.now().millisecondsSinceEpoch}';
        await prefs.setString('euphorie_user_id', _userId!);
        print('✅ Created new user ID: $_userId');
      } else {
        print('✅ Loaded existing user ID: $_userId');
      }
      
      _isInitialized = true;
    } catch (e) {
      print('⚠️ Error initializing user ID: $e');
      _userId = 'flutter_user_${DateTime.now().millisecondsSinceEpoch}';
      _isInitialized = true;
    }
  }
  
  Future<void> _ensureInitialized() async {
    if (!_isInitialized) {
      await _initUserId();
    }
  }
  
  /// Compress and resize image file for efficient upload
  void _handleDioError(DioException e) {
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
        print('⚠️ Connection timeout - server might be slow or unreachable');
        break;
      case DioExceptionType.sendTimeout:
        print('⚠️ Send timeout - image upload too slow (check network)');
        break;
      case DioExceptionType.receiveTimeout:
        print('⚠️ Receive timeout - AI processing taking too long');
        break;
      case DioExceptionType.connectionError:
        print('⚠️ Connection error - check internet connectivity');
        break;
      default:
        print('⚠️ Network error: ${e.message}');
    }
  }
  
  // Health Check
  Future<bool> checkHealth() async {
    try {
      print('🏥 Checking backend health...');
      final response = await _dio.get(
        '/health',
        options: Options(
          sendTimeout: const Duration(seconds: 10),
          receiveTimeout: const Duration(seconds: 10),
        ),
      );
      
      if (response.statusCode == 200) {
        print('✅ Backend is healthy: ${response.data}');
        return true;
      }
      return false;
    } catch (e) {
      print('⚠️ Backend health check failed: $e');
      return false;
    }
  }
  
  // Test connection
  Future<bool> testConnection() async {
    try {
      print('🔌 Testing connection to $baseUrl...');
      final response = await _dio.get(
        '/health',
        options: Options(
          sendTimeout: const Duration(seconds: 5),
          receiveTimeout: const Duration(seconds: 5),
        ),
      );
      print('✅ Connection successful');
      return response.statusCode == 200;
    } catch (e) {
      print('❌ Connection test failed: $e');
      return false;
    }
  }

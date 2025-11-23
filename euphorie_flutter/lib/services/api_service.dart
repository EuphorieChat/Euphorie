import 'dart:convert';
import 'dart:typed_data';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:camera/camera.dart';

class ApiService {
  static const String baseUrl = 'https://euphorie.com';
  final Dio _dio = Dio();
  String? _userId;
  bool _isInitialized = false;
  
  ApiService() {
    _dio.options.baseUrl = baseUrl;
    _dio.options.connectTimeout = const Duration(seconds: 15);
    _dio.options.receiveTimeout = const Duration(seconds: 15);
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
  
  // Convert CameraImage to Base64
  String _cameraImageToBase64(CameraImage image) {
    try {
      // Convert YUV420 to RGB (iOS uses this format)
      final int width = image.width;
      final int height = image.height;
      
      // For simplicity, use the Y plane (grayscale)
      final Uint8List bytes = image.planes[0].bytes;
      
      // Convert to base64
      return base64Encode(bytes);
    } catch (e) {
      print('⚠️ Error converting camera image: $e');
      return '';
    }
  }
  
  // Vision Analysis - Main Detection Method
  Future<DetectionResult?> analyzeVision({
    required CameraImage frame,
    String context = 'real-time detection',
  }) async {
    await _ensureInitialized();
    
    try {
      print('🎥 Converting frame to base64...');
      final frameBase64 = _cameraImageToBase64(frame);
      
      if (frameBase64.isEmpty) {
        print('❌ Failed to convert frame');
        return null;
      }
      
      print('📤 Sending frame to backend (${frameBase64.length} bytes)...');
      
      final response = await _dio.post(
        '/api/vision/analyze',
        data: {
          'user_id': _userId,
          'frame': frameBase64,
          'context': context,
          'timestamp': DateTime.now().toIso8601String(),
        },
      );
      
      if (response.statusCode == 200) {
        print('✅ Received detection results');
        return DetectionResult.fromJson(response.data);
      } else {
        print('⚠️ Unexpected status code: ${response.statusCode}');
        return null;
      }
    } on DioException catch (e) {
      if (e.type == DioExceptionType.connectionTimeout) {
        print('⚠️ Connection timeout - backend might be slow');
      } else if (e.type == DioExceptionType.receiveTimeout) {
        print('⚠️ Receive timeout - detection taking too long');
      } else {
        print('⚠️ Network error: ${e.message}');
      }
      return null;
    } catch (e) {
      print('❌ Vision API error: $e');
      return null;
    }
  }
  
  // Simplified detection for testing
  Future<Map<String, dynamic>?> analyzeVisionSimple({
    required String frameBase64,
    String context = 'test',
  }) async {
    await _ensureInitialized();
    
    try {
      final response = await _dio.post(
        '/api/vision/analyze',
        data: {
          'user_id': _userId,
          'frame': frameBase64,
          'context': context,
        },
      );
      
      if (response.statusCode == 200) {
        return response.data;
      }
    } catch (e) {
      print('Vision API error: $e');
    }
    return null;
  }
  
  // Health Check
  Future<bool> checkHealth() async {
    try {
      print('🏥 Checking backend health...');
      final response = await _dio.get('/health');
      
      if (response.statusCode == 200) {
        print('✅ Backend is healthy');
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
}

// Detection Result Model
class DetectionResult {
  final List<DetectedObject> objects;
  final String? message;
  final int? processingTimeMs;
  
  DetectionResult({
    required this.objects,
    this.message,
    this.processingTimeMs,
  });
  
  factory DetectionResult.fromJson(Map<String, dynamic> json) {
    final objectsList = json['objects'] as List? ?? [];
    
    return DetectionResult(
      objects: objectsList
          .map((obj) => DetectedObject.fromJson(obj as Map<String, dynamic>))
          .toList(),
      message: json['message'] as String?,
      processingTimeMs: json['processing_time_ms'] as int?,
    );
  }
  
  bool get hasDetections => objects.isNotEmpty;
  int get detectionCount => objects.length;
}

// Detected Object Model
class DetectedObject {
  final String label;
  final double confidence;
  final BoundingBox boundingBox;
  
  DetectedObject({
    required this.label,
    required this.confidence,
    required this.boundingBox,
  });
  
  factory DetectedObject.fromJson(Map<String, dynamic> json) {
    return DetectedObject(
      label: json['label'] as String? ?? 'unknown',
      confidence: (json['confidence'] as num?)?.toDouble() ?? 0.0,
      boundingBox: BoundingBox.fromJson(
        json['bounding_box'] as Map<String, dynamic>? ?? {},
      ),
    );
  }
  
  String get confidencePercent => '${(confidence * 100).toInt()}%';
}

// Bounding Box Model
class BoundingBox {
  final double x;
  final double y;
  final double width;
  final double height;
  
  BoundingBox({
    required this.x,
    required this.y,
    required this.width,
    required this.height,
  });
  
  factory BoundingBox.fromJson(Map<String, dynamic> json) {
    return BoundingBox(
      x: (json['x'] as num?)?.toDouble() ?? 0.0,
      y: (json['y'] as num?)?.toDouble() ?? 0.0,
      width: (json['width'] as num?)?.toDouble() ?? 0.0,
      height: (json['height'] as num?)?.toDouble() ?? 0.0,
    );
  }
  
  // Convert to Flutter Rect for drawing
  // Note: Coordinates may need scaling based on camera vs screen size
  double get left => x;
  double get top => y;
  double get right => x + width;
  double get bottom => y + height;
}
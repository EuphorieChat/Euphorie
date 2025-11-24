import 'dart:convert';
import 'dart:typed_data';
import 'dart:io';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:camera/camera.dart';
import 'package:image/image.dart' as img;

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
  /// Returns base64 encoded compressed JPEG
  Future<String> _compressImageFile(String filePath) async {
    try {
      final stopwatch = Stopwatch()..start();
      
      // Read original file
      final originalBytes = await File(filePath).readAsBytes();
      final originalSize = originalBytes.length;
      print('📦 Original image size: ${(originalSize / 1024).toStringAsFixed(1)} KB');
      
      // Decode image
      final image = img.decodeImage(originalBytes);
      if (image == null) {
        print('⚠️ Could not decode image, sending original');
        return base64Encode(originalBytes);
      }
      
      print('📐 Original dimensions: ${image.width}x${image.height}');
      
      // Resize if needed (maintain aspect ratio)
      img.Image resized;
      if (image.width > maxImageWidth) {
        final ratio = maxImageWidth / image.width;
        final newHeight = (image.height * ratio).round();
        resized = img.copyResize(
          image, 
          width: maxImageWidth, 
          height: newHeight,
          interpolation: img.Interpolation.linear,
        );
        print('📐 Resized to: ${resized.width}x${resized.height}');
      } else {
        resized = image;
        print('📐 No resize needed');
      }
      
      // Encode as JPEG with compression
      final compressedBytes = img.encodeJpg(resized, quality: jpegQuality);
      final compressedSize = compressedBytes.length;
      
      stopwatch.stop();
      
      final compressionRatio = ((1 - compressedSize / originalSize) * 100).toStringAsFixed(1);
      print('✅ Compressed: ${(compressedSize / 1024).toStringAsFixed(1)} KB '
            '(${compressionRatio}% reduction) in ${stopwatch.elapsedMilliseconds}ms');
      
      return base64Encode(compressedBytes);
    } catch (e) {
      print('⚠️ Compression error: $e - sending original');
      final originalBytes = await File(filePath).readAsBytes();
      return base64Encode(originalBytes);
    }
  }
  
  /// Compress base64 image string
  Future<String> _compressBase64Image(String base64Image) async {
    try {
      final stopwatch = Stopwatch()..start();
      
      // Decode base64
      final originalBytes = base64Decode(base64Image);
      final originalSize = originalBytes.length;
      print('📦 Original base64 decoded size: ${(originalSize / 1024).toStringAsFixed(1)} KB');
      
      // Decode image
      final image = img.decodeImage(originalBytes);
      if (image == null) {
        print('⚠️ Could not decode image, sending original');
        return base64Image;
      }
      
      // Resize if needed
      img.Image resized;
      if (image.width > maxImageWidth) {
        final ratio = maxImageWidth / image.width;
        final newHeight = (image.height * ratio).round();
        resized = img.copyResize(
          image, 
          width: maxImageWidth, 
          height: newHeight,
          interpolation: img.Interpolation.linear,
        );
        print('📐 Resized: ${image.width}x${image.height} → ${resized.width}x${resized.height}');
      } else {
        resized = image;
      }
      
      // Encode as JPEG
      final compressedBytes = img.encodeJpg(resized, quality: jpegQuality);
      
      stopwatch.stop();
      print('✅ Compression done in ${stopwatch.elapsedMilliseconds}ms');
      
      return base64Encode(compressedBytes);
    } catch (e) {
      print('⚠️ Compression error: $e');
      return base64Image;
    }
  }
  
  // Convert CameraImage to Base64
  String _cameraImageToBase64(CameraImage image) {
    try {
      final int width = image.width;
      final int height = image.height;
      final Uint8List bytes = image.planes[0].bytes;
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
      _handleDioError(e);
      return null;
    } catch (e) {
      print('❌ Vision API error: $e');
      return null;
    }
  }
  
  /// Analyze vision from a file path (used by camera_screen)
  /// This is the preferred method - handles compression automatically
  Future<Map<String, dynamic>?> analyzeVisionFromFile({
    required String filePath,
    String context = 'flutter-realtime',
  }) async {
    await _ensureInitialized();
    
    try {
      print('🎥 Processing image file: $filePath');
      
      // Compress the image before sending
      final compressedBase64 = await _compressImageFile(filePath);
      
      print('📤 Sending compressed image (${(compressedBase64.length / 1024).toStringAsFixed(1)} KB base64)...');
      
      final response = await _dio.post(
        '/api/vision/analyze',
        data: {
          'user_id': _userId,
          'frame': 'data:image/jpeg;base64,$compressedBase64',
          'context': context,
        },
      );
      
      if (response.statusCode == 200) {
        print('✅ Analysis complete');
        return response.data;
      }
      
      print('⚠️ Unexpected status: ${response.statusCode}');
      return null;
    } on DioException catch (e) {
      _handleDioError(e);
      return null;
    } catch (e) {
      print('❌ Vision API error: $e');
      return null;
    }
  }
  
  // Simplified detection (with compression)
  Future<Map<String, dynamic>?> analyzeVisionSimple({
    required String frameBase64,
    String context = 'test',
  }) async {
    await _ensureInitialized();
    
    try {
      // Compress if the image is large (> 100KB base64)
      String processedBase64 = frameBase64;
      if (frameBase64.length > 100000) {
        print('🗜️ Large image detected, compressing...');
        processedBase64 = await _compressBase64Image(frameBase64);
      }
      
      print('📤 Sending to backend (${(processedBase64.length / 1024).toStringAsFixed(1)} KB)...');
      
      final response = await _dio.post(
        '/api/vision/analyze',
        data: {
          'user_id': _userId,
          'frame': 'data:image/jpeg;base64,$processedBase64',
          'context': context,
        },
      );
      
      if (response.statusCode == 200) {
        return response.data;
      }
    } on DioException catch (e) {
      _handleDioError(e);
    } catch (e) {
      print('Vision API error: $e');
    }
    return null;
  }
  
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
  
  double get left => x;
  double get top => y;
  double get right => x + width;
  double get bottom => y + height;
}
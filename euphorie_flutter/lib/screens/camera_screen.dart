import 'dart:async';
import 'dart:io';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import 'package:provider/provider.dart';
import 'package:vector_math/vector_math_64.dart' as vector;
import '../services/app_state.dart';
import '../services/news_service.dart';
import '../services/api_service.dart';
import '../widgets/hamburger_menu.dart';
import '../widgets/news_feed_panel.dart';
import '../widgets/ai_chat_box.dart';

class CameraScreen extends StatefulWidget {
  const CameraScreen({super.key});

  @override
  State<CameraScreen> createState() => _CameraScreenState();
}

class _CameraScreenState extends State<CameraScreen> with WidgetsBindingObserver {
  CameraController? _controller;
  List<CameraDescription>? _cameras;
  bool _isInitialized = false;
  String? _error;
  
  // AI Detection
  final ApiService _apiService = ApiService();
  DetectionResult? _currentDetections;
  bool _isDetecting = false;
  Timer? _detectionTimer;
  String _detectionStatus = 'Initializing...';
  
  // Measurement Mode
  bool _isMeasurementMode = false;
  List<Offset> _measurementPoints = [];
  double? _measuredDistance;
  Size? _screenSize;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    print('🎥 Camera screen initializing...');
    _testBackend();
    _initializeCamera();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _detectionTimer?.cancel();
    _controller?.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    final CameraController? cameraController = _controller;

    if (cameraController == null || !cameraController.value.isInitialized) {
      return;
    }

    if (state == AppLifecycleState.inactive) {
      _detectionTimer?.cancel();
      cameraController.dispose();
    } else if (state == AppLifecycleState.resumed) {
      _initializeCamera();
    }
  }

  Future<void> _testBackend() async {
    print('🧪 Testing backend connection...');
    final healthy = await _apiService.checkHealth();
    
    if (healthy) {
      print('✅ Backend is responding!');
      setState(() {
        _detectionStatus = 'Backend connected ✓';
      });
    } else {
      print('❌ Backend not reachable');
      setState(() {
        _detectionStatus = 'Backend offline ✗';
      });
    }
  }

  Future<void> _initializeCamera() async {
    try {
      print('🎥 Getting available cameras...');
      
      _cameras = await availableCameras();
      
      if (_cameras == null || _cameras!.isEmpty) {
        setState(() {
          _error = 'No cameras found on this device';
        });
        print('❌ No cameras found');
        return;
      }
      
      print('✅ Found ${_cameras!.length} camera(s)');
      for (var cam in _cameras!) {
        print('   - ${cam.name} (${cam.lensDirection})');
      }
      
      final camera = _cameras!.firstWhere(
        (cam) => cam.lensDirection == CameraLensDirection.back,
        orElse: () => _cameras!.first,
      );
      
      print('🎥 Initializing camera: ${camera.name}...');
      
      _controller = CameraController(
        camera,
        ResolutionPreset.high,
        enableAudio: false,
        imageFormatGroup: ImageFormatGroup.jpeg,
      );
      
      await _controller!.initialize();
      
      print('✅ Camera initialized successfully!');
      
      if (mounted) {
        setState(() {
          _isInitialized = true;
          _error = null;
        });
        
        _startDetectionLoop();
      }
    } catch (e) {
      print('❌ Camera error: $e');
      
      if (e.toString().contains('permission') || 
          e.toString().contains('authorized') ||
          e.toString().contains('denied')) {
        setState(() {
          _error = 'Camera access denied. Please enable in:\nSettings → Euphorie AI → Camera';
        });
      } else {
        setState(() {
          _error = 'Camera error: ${e.toString()}';
        });
      }
    }
  }

  void _startDetectionLoop() {
    print('🎯 Starting AI detection loop...');
    
    _detectionTimer = Timer.periodic(const Duration(seconds: 3), (timer) {
      if (_controller != null && 
          _controller!.value.isInitialized && 
          !_isDetecting &&
          !_isMeasurementMode &&
          mounted) {
        _runDetection();
      }
    });
  }

  Future<void> _runDetection() async {
    if (_isDetecting || _controller == null || !_controller!.value.isInitialized) {
      return;
    }

    setState(() {
      _isDetecting = true;
      _detectionStatus = 'Capturing...';
    });

    try {
      final image = await _controller!.takePicture();
      print('📸 Frame captured: ${image.path}');
      
      setState(() {
        _detectionStatus = 'Converting image...';
      });
      
      final bytes = await File(image.path).readAsBytes();
      final base64Image = base64Encode(bytes);
      print('📦 Converted to base64 (${base64Image.length} chars)');
      
      setState(() {
        _detectionStatus = 'Sending to AI...';
      });
      
      final result = await _apiService.analyzeVisionSimple(
        frameBase64: base64Image,
        context: 'flutter-realtime',
      );
      
      if (result != null) {
        print('✅ Got detection result: $result');
        
        if (result['objects_detected'] != null && result['objects_detected'] is List) {
          final objectsList = result['objects_detected'] as List;
          
          if (objectsList.isNotEmpty) {
            print('🎯 Found ${objectsList.length} objects: $objectsList');
            
            final mockDetections = DetectionResult(
              objects: objectsList.asMap().entries.map((entry) {
                final index = entry.key;
                final label = entry.value.toString();
                
                return DetectedObject(
                  label: label,
                  confidence: (result['confidence'] as num?)?.toDouble() ?? 0.85,
                  boundingBox: BoundingBox(
                    x: 0.1,
                    y: 0.1 + (index * 0.18),
                    width: 0.8,
                    height: 0.15,
                  ),
                );
              }).toList(),
              message: result['insight'] as String?,
            );
            
            setState(() {
              _currentDetections = mockDetections;
              _detectionStatus = 'Detected ${objectsList.length} objects';
            });
            
            try {
              await File(image.path).delete();
            } catch (e) {
              print('⚠️ Could not delete temp file: $e');
            }
            
            return;
          }
        }
        
        try {
          final detections = DetectionResult.fromJson(result);
          
          if (detections.hasDetections) {
            print('🎯 Found ${detections.detectionCount} objects with bounding boxes!');
            
            setState(() {
              _currentDetections = detections;
              _detectionStatus = 'Detected ${detections.detectionCount} objects';
            });
          } else {
            print('👀 No objects detected');
            setState(() {
              _currentDetections = null;
              _detectionStatus = 'No objects found';
            });
          }
        } catch (e) {
          print('⚠️ Could not parse detection: $e');
          setState(() {
            _currentDetections = null;
            _detectionStatus = 'No objects found';
          });
        }
      } else {
        print('⚠️ No response from backend');
        setState(() {
          _detectionStatus = 'Backend timeout';
        });
      }
      
      try {
        await File(image.path).delete();
      } catch (e) {
        print('⚠️ Could not delete temp file: $e');
      }
      
    } catch (e) {
      print('❌ Detection error: $e');
      final errorMsg = e.toString();
      setState(() {
        _detectionStatus = 'Error: ${errorMsg.length > 30 ? errorMsg.substring(0, 30) + '...' : errorMsg}';
      });
    } finally {
      if (mounted) {
        setState(() {
          _isDetecting = false;
        });
        
        if (_detectionStatus.contains('Error') || _detectionStatus.contains('timeout')) {
          Future.delayed(const Duration(seconds: 3), () {
            if (mounted) {
              setState(() {
                _detectionStatus = 'Ready to detect';
              });
            }
          });
        }
      }
    }
  }

  void _toggleMeasurementMode() {
    setState(() {
      _isMeasurementMode = !_isMeasurementMode;
      _measurementPoints.clear();
      _measuredDistance = null;
      
      print('📏 Measurement mode: $_isMeasurementMode');
      
      if (_isMeasurementMode) {
        _detectionStatus = '📍 Tap first point';
      } else {
        _detectionStatus = 'Ready to detect';
      }
    });
    
    // Reset app state mode
    if (!_isMeasurementMode) {
      context.read<AppState>().setMode('detect');
    }
  }

  void _handleMeasurementTap(TapDownDetails details) {
    if (!_isMeasurementMode) {
      print('⚠️ Not in measurement mode, ignoring tap');
      return;
    }
    
    print('🎯 Tap detected at: ${details.localPosition}');
    print('📍 Current points: ${_measurementPoints.length}');
    
    setState(() {
      if (_measurementPoints.length < 2) {
        _measurementPoints.add(details.localPosition);
        print('✅ Added point ${_measurementPoints.length}');
        
        if (_measurementPoints.length == 1) {
          _detectionStatus = '📍 Tap second point';
        } else if (_measurementPoints.length == 2) {
          print('🔢 Calculating distance...');
          _calculateDistance();
        }
      } else {
        print('⚠️ Already have 2 points, ignoring tap');
      }
    });
  }

  void _calculateDistance() {
    if (_measurementPoints.length != 2 || _screenSize == null) return;
    
    final dx = _measurementPoints[1].dx - _measurementPoints[0].dx;
    final dy = _measurementPoints[1].dy - _measurementPoints[0].dy;
    final pixelDistance = vector.Vector2(dx, dy).length;
    
    final metersPerPixel = 0.7 / _screenSize!.width;
    _measuredDistance = pixelDistance * metersPerPixel;
    
    print('📏 Measured distance: ${_measuredDistance!.toStringAsFixed(2)}m');
    
    setState(() {
      _detectionStatus = '📏 ${_measuredDistance!.toStringAsFixed(2)}m';
    });
  }

  @override
  Widget build(BuildContext context) {
    _screenSize = MediaQuery.of(context).size;
    
    return Scaffold(
      body: Consumer<AppState>(
        builder: (context, appState, _) {
          // Handle mode changes from menu
          if (appState.currentMode == 'measure' && !_isMeasurementMode) {
            WidgetsBinding.instance.addPostFrameCallback((_) {
              _toggleMeasurementMode();
            });
          }
          
          return Stack(
            children: [
              // Camera Preview
              _buildCameraView(),
              
              // Measurement Overlay (draw points and line)
              if (_isMeasurementMode && _measurementPoints.isNotEmpty)
                IgnorePointer(
                  child: CustomPaint(
                    painter: MeasurementPainter(
                      _measurementPoints,
                      _measuredDistance,
                    ),
                    child: Container(),
                  ),
                ),
              
              // AI Detection Overlays
              if (_isInitialized && _currentDetections != null && !_isMeasurementMode)
                IgnorePointer(
                  child: _buildDetectionOverlay(),
                ),
              
              // Measurement Tap Handler - MUST be on top
              if (_isMeasurementMode)
                Positioned.fill(
                  child: GestureDetector(
                    onTapDown: (details) {
                      print('🎯 TAP CAPTURED! Position: ${details.localPosition}');
                      _handleMeasurementTap(details);
                    },
                    behavior: HitTestBehavior.translucent,
                    child: Container(
                      color: Colors.transparent,
                    ),
                  ),
                ),
              
              // Status Indicator
              if (_isInitialized)
                Positioned(
                  top: MediaQuery.of(context).padding.top + 16,
                  left: 16,
                  child: _buildStatus(),
                ),
              
              // Exit button - ALWAYS visible in measurement mode
              if (_isMeasurementMode)
                Positioned(
                  top: MediaQuery.of(context).padding.top + 70,
                  right: 16,
                  child: GestureDetector(
                    onTap: () {
                      print('🚪 Exit measurement tapped');
                      _toggleMeasurementMode();
                    },
                    child: Container(
                      width: 50,
                      height: 50,
                      decoration: BoxDecoration(
                        color: const Color(0xFFEF4444),
                        borderRadius: BorderRadius.circular(25),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFFEF4444).withOpacity(0.5),
                            blurRadius: 20,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: const Icon(
                        Icons.close,
                        color: Colors.white,
                        size: 28,
                      ),
                    ),
                  ),
                ),
              
              // UI Elements (hidden in measurement mode)
              if (_isInitialized) ...[
                Positioned(
                  top: MediaQuery.of(context).padding.top + 16,
                  right: 16,
                  child: _isMeasurementMode 
                      ? const SizedBox.shrink() 
                      : _buildHamburgerButton(),
                ),
                if (!_isMeasurementMode)
                  Positioned(
                    bottom: MediaQuery.of(context).padding.bottom + 24,
                    right: 24,
                    child: _buildNewsFab(),
                  ),
                if (!_isMeasurementMode)
                  const Positioned(
                    bottom: 24,
                    left: 24,
                    right: 100,
                    child: AiChatBox(),
                  ),
                const HamburgerMenu(),
                const NewsFeedPanel(),
              ],
            ],
          );
        },
      ),
    );
  }

  Widget _buildStatus() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.7),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: _isMeasurementMode
              ? const Color(0xFFEF4444).withOpacity(0.8)
              : _isDetecting 
                  ? const Color(0xFF10B981) 
                  : const Color(0xFF8B5CF6).withOpacity(0.5),
          width: 1.5,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (_isDetecting && !_isMeasurementMode)
            SizedBox(
              width: 12,
              height: 12,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                valueColor: AlwaysStoppedAnimation<Color>(
                  const Color(0xFF10B981),
                ),
              ),
            )
          else
            Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(
                color: _isMeasurementMode
                    ? const Color(0xFFEF4444)
                    : _detectionStatus.contains('connected')
                        ? const Color(0xFF10B981)
                        : _detectionStatus.contains('offline')
                            ? const Color(0xFFEF4444)
                            : _detectionStatus.contains('Detected')
                                ? const Color(0xFF10B981)
                                : const Color(0xFF8B5CF6),
                shape: BoxShape.circle,
              ),
            ),
          const SizedBox(width: 8),
          Text(
            _detectionStatus,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 11,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDetectionOverlay() {
    if (_currentDetections == null || !_currentDetections!.hasDetections) {
      return const SizedBox.shrink();
    }

    return CustomPaint(
      painter: DetectionPainter(_currentDetections!.objects),
      child: Container(),
    );
  }

  Widget _buildCameraView() {
    if (_controller != null && _controller!.value.isInitialized) {
      return SizedBox.expand(
        child: CameraPreview(_controller!),
      );
    }
    
    return Container(
      color: Colors.black,
      child: Center(
        child: _error != null
            ? Padding(
                padding: const EdgeInsets.all(32),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.camera_alt_outlined,
                      size: 80,
                      color: Colors.white.withOpacity(0.3),
                    ),
                    const SizedBox(height: 20),
                    Text(
                      _error!,
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.7),
                        fontSize: 14,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 30),
                    ElevatedButton.icon(
                      onPressed: () {
                        setState(() {
                          _error = null;
                          _isInitialized = false;
                        });
                        _initializeCamera();
                      },
                      icon: const Icon(Icons.refresh),
                      label: const Text('Retry'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF8B5CF6),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 24,
                          vertical: 12,
                        ),
                      ),
                    ),
                  ],
                ),
              )
            : Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const CircularProgressIndicator(
                    color: Color(0xFF8B5CF6),
                  ),
                  const SizedBox(height: 20),
                  Text(
                    'Initializing camera...',
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.7),
                      fontSize: 14,
                    ),
                  ),
                ],
              ),
      ),
    );
  }

  Widget _buildHamburgerButton() {
    return Consumer<AppState>(
      builder: (context, appState, _) {
        return GestureDetector(
          onTap: () => appState.toggleMenu(),
          child: Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF8B5CF6), Color(0xFF3B82F6)],
              ),
              borderRadius: BorderRadius.circular(28),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF8B5CF6).withOpacity(0.5),
                  blurRadius: 20,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Icon(
              appState.isMenuOpen ? Icons.close : Icons.menu,
              color: Colors.white,
              size: 28,
            ),
          ),
        );
      },
    );
  }

  Widget _buildNewsFab() {
    return Consumer<AppState>(
      builder: (context, appState, _) {
        return Stack(
          children: [
            GestureDetector(
              onTap: () => appState.toggleNewsFeed(),
              child: Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF8B5CF6), Color(0xFF3B82F6)],
                  ),
                  borderRadius: BorderRadius.circular(28),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF8B5CF6).withOpacity(0.5),
                      blurRadius: 20,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: const Icon(
                  Icons.article,
                  color: Colors.white,
                  size: 28,
                ),
              ),
            ),
            Consumer<NewsService>(
              builder: (context, news, _) {
                if (news.articles.isEmpty || appState.isNewsFeedOpen) {
                  return const SizedBox.shrink();
                }
                return Positioned(
                  top: -4,
                  right: -4,
                  child: Container(
                    padding: const EdgeInsets.all(6),
                    decoration: const BoxDecoration(
                      color: Color(0xFFEF4444),
                      shape: BoxShape.circle,
                    ),
                    child: Text(
                      '${news.articles.length}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                );
              },
            ),
          ],
        );
      },
    );
  }
}

// Measurement Overlay Painter
class MeasurementPainter extends CustomPainter {
  final List<Offset> points;
  final double? distance;
  
  MeasurementPainter(this.points, this.distance);
  
  @override
  void paint(Canvas canvas, Size size) {
    if (points.isEmpty) return;
    
    final pointPaint = Paint()
      ..color = const Color(0xFF8B5CF6)
      ..style = PaintingStyle.fill;
    
    final linePaint = Paint()
      ..color = const Color(0xFF8B5CF6)
      ..strokeWidth = 3.0
      ..style = PaintingStyle.stroke;
    
    // Draw first point (purple)
    canvas.drawCircle(points[0], 10, pointPaint);
    
    // Draw second point (green) if exists
    if (points.length > 1) {
      final secondPointPaint = Paint()
        ..color = const Color(0xFF10B981)
        ..style = PaintingStyle.fill;
      
      canvas.drawCircle(points[1], 10, secondPointPaint);
      
      // Draw line
      canvas.drawLine(points[0], points[1], linePaint);
      
      // Draw distance label
      if (distance != null) {
        final midPoint = Offset(
          (points[0].dx + points[1].dx) / 2,
          (points[0].dy + points[1].dy) / 2,
        );
        
        final textSpan = TextSpan(
          text: '${distance!.toStringAsFixed(2)}m\n'
              '${(distance! * 100).toStringAsFixed(0)}cm\n'
              '${(distance! * 3.28084).toStringAsFixed(2)}ft',
          style: const TextStyle(
            color: Colors.white,
            fontSize: 14,
            fontWeight: FontWeight.bold,
          ),
        );
        
        final textPainter = TextPainter(
          text: textSpan,
          textDirection: TextDirection.ltr,
          textAlign: TextAlign.center,
        );
        
        textPainter.layout();
        
        // Draw background
        final bgRect = Rect.fromCenter(
          center: midPoint,
          width: textPainter.width + 16,
          height: textPainter.height + 12,
        );
        
        final bgPaint = Paint()
          ..color = Colors.black.withOpacity(0.8);
        
        canvas.drawRRect(
          RRect.fromRectAndRadius(bgRect, const Radius.circular(8)),
          bgPaint,
        );
        
        // Draw text
        textPainter.paint(
          canvas,
          Offset(
            midPoint.dx - textPainter.width / 2,
            midPoint.dy - textPainter.height / 2,
          ),
        );
      }
    }
  }
  
  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}

// Detection Overlay Painter
class DetectionPainter extends CustomPainter {
  final List<DetectedObject> detections;
  
  DetectionPainter(this.detections);
  
  @override
  void paint(Canvas canvas, Size size) {
    for (final detection in detections) {
      final paint = Paint()
        ..color = const Color(0xFF8B5CF6)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 3.0;
      
      final box = detection.boundingBox;
      final rect = Rect.fromLTWH(
        box.x * size.width,
        box.y * size.height,
        box.width * size.width,
        box.height * size.height,
      );
      
      canvas.drawRect(rect, paint);
      
      final labelPaint = Paint()
        ..color = const Color(0xFF8B5CF6).withOpacity(0.9);
      
      final textSpan = TextSpan(
        text: '${detection.label} ${detection.confidencePercent}',
        style: const TextStyle(
          color: Colors.white,
          fontSize: 14,
          fontWeight: FontWeight.bold,
        ),
      );
      
      final textPainter = TextPainter(
        text: textSpan,
        textDirection: TextDirection.ltr,
      );
      
      textPainter.layout();
      
      canvas.drawRect(
        Rect.fromLTWH(
          rect.left,
          rect.top - 25,
          textPainter.width + 12,
          25,
        ),
        labelPaint,
      );
      
      textPainter.paint(
        canvas,
        Offset(rect.left + 6, rect.top - 22),
      );
    }
  }
  
  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}
import 'package:flutter/material.dart';
import 'package:arkit_plugin/arkit_plugin.dart';
import 'package:vector_math/vector_math_64.dart' as vector;

class ARMeasurementScreen extends StatefulWidget {
  const ARMeasurementScreen({super.key});

  @override
  State<ARMeasurementScreen> createState() => _ARMeasurementScreenState();
}

class _ARMeasurementScreenState extends State<ARMeasurementScreen> {
  late ARKitController arkitController;
  List<vector.Vector3> points = [];
  List<ARKitNode> nodes = [];
  ARKitNode? lineNode;
  double? distance;

  @override
  void dispose() {
    arkitController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('AR Measurement'),
        backgroundColor: const Color(0xFF8B5CF6),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _reset,
            tooltip: 'Reset',
          ),
        ],
      ),
      body: Stack(
        children: [
          ARKitSceneView(
            onARKitViewCreated: onARKitViewCreated,
            enableTapRecognizer: true,
          ),
          
          // Instructions
          Positioned(
            top: 20,
            left: 20,
            right: 20,
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.7),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: const Color(0xFF8B5CF6).withOpacity(0.5),
                  width: 1.5,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    points.isEmpty
                        ? '📍 Tap to place first point'
                        : points.length == 1
                            ? '📍 Tap to place second point'
                            : '✅ Measurement complete!',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  if (distance != null) ...[
                    const SizedBox(height: 8),
                    Text(
                      '📏 Distance: ${distance!.toStringAsFixed(2)} meters',
                      style: const TextStyle(
                        color: Color(0xFF10B981),
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      '   = ${(distance! * 100).toStringAsFixed(0)} cm',
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.7),
                        fontSize: 14,
                      ),
                    ),
                    Text(
                      '   ≈ ${(distance! * 3.28084).toStringAsFixed(2)} feet',
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.7),
                        fontSize: 14,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
          
          // Reset button
          if (points.isNotEmpty)
            Positioned(
              bottom: 40,
              left: 0,
              right: 0,
              child: Center(
                child: ElevatedButton.icon(
                  onPressed: _reset,
                  icon: const Icon(Icons.refresh),
                  label: const Text('Reset Measurement'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF8B5CF6),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 32,
                      vertical: 16,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(24),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  void onARKitViewCreated(ARKitController arkitController) {
    this.arkitController = arkitController;
    this.arkitController.onARTap = (ar) {
      final point = ar.firstWhere(
        (o) => o.type == ARKitHitTestResultType.featurePoint,
        orElse: () => ar.first,
      );
      _addPoint(point);
    };
  }

  void _addPoint(ARKitTestResult point) {
    if (points.length >= 2) {
      return; // Already have 2 points
    }

    final position = vector.Vector3(
      point.worldTransform.getColumn(3).x,
      point.worldTransform.getColumn(3).y,
      point.worldTransform.getColumn(3).z,
    );

    points.add(position);

    // Add sphere at point
    final material = ARKitMaterial(
      lightingModelName: ARKitLightingModel.constant,
      diffuse: ARKitMaterialProperty.color(
        points.length == 1 
            ? const Color(0xFF8B5CF6) 
            : const Color(0xFF10B981),
      ),
    );

    final sphere = ARKitSphere(
      radius: 0.01,
      materials: [material],
    );

    final node = ARKitNode(
      geometry: sphere,
      position: position,
    );

    arkitController.add(node);
    nodes.add(node);

    if (points.length == 2) {
      _drawLine();
      _calculateDistance();
    }

    setState(() {});
  }

  void _drawLine() {
    final lineGeometry = ARKitLine(
      fromVector: points[0],
      toVector: points[1],
    );

    final material = ARKitMaterial(
      diffuse: ARKitMaterialProperty.color(const Color(0xFF8B5CF6)),
    );

    lineNode = ARKitNode(
      geometry: lineGeometry,
    );

    arkitController.add(lineNode!);
  }

  void _calculateDistance() {
    if (points.length == 2) {
      final dx = points[1].x - points[0].x;
      final dy = points[1].y - points[0].y;
      final dz = points[1].z - points[0].z;

      distance = vector.Vector3(dx, dy, dz).length;
      setState(() {});
    }
  }

  void _reset() {
    // Remove all nodes
    for (final node in nodes) {
      arkitController.remove(node.name);
    }
    if (lineNode != null) {
      arkitController.remove(lineNode!.name);
    }

    // Clear data
    points.clear();
    nodes.clear();
    lineNode = null;
    distance = null;

    setState(() {});
  }
}
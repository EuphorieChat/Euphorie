import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/app_state.dart';
import '../services/voice_service.dart';

class HamburgerMenu extends StatelessWidget {
  const HamburgerMenu({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<AppState>(
      builder: (context, appState, _) {
        return Stack(
          children: [
            // Dark overlay - tap to close
            if (appState.isMenuOpen)
              GestureDetector(
                onTap: () => appState.toggleMenu(),
                child: Container(
                  color: Colors.black.withOpacity(0.5),
                ),
              ),
            
            // Menu panel
            AnimatedPositioned(
              duration: const Duration(milliseconds: 400),
              curve: Curves.easeInOut,
              top: 0,
              right: appState.isMenuOpen ? 0 : -320,
              bottom: 0,
              child: Material(
                color: Colors.transparent,
                child: Container(
                  width: 300,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Color(0xFF0F0023),
                        Color(0xFF1E0A32),
                        Color(0xFF140528),
                      ],
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.8),
                        blurRadius: 60,
                        offset: const Offset(-20, 0),
                      ),
                    ],
                  ),
                  child: SafeArea(
                    child: Column(
                      children: [
                        const SizedBox(height: 20),
                        _buildHeader(),
                        const SizedBox(height: 16),
                        Expanded(
                          child: SingleChildScrollView(
                            physics: const BouncingScrollPhysics(),
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            child: Column(
                              children: [
                                _buildSection('AR MODES'),
                                _buildMenuItem(
                                  context,
                                  Icons.camera_alt,
                                  'Object Detection',
                                  'Identify objects in real-time',
                                  () => _onMenuItemTap(context, 'detect'),
                                ),
                                _buildMenuItem(
                                  context,
                                  Icons.straighten,
                                  'Measurement',
                                  'Tap two points to measure distance',
                                  () => _onMenuItemTap(context, 'measure'),
                                ),
                                _buildMenuItem(
                                  context,
                                  Icons.view_in_ar,
                                  '3D Objects',
                                  'Place virtual 3D objects in AR',
                                  () => _onMenuItemTap(context, '3d'),
                                ),
                                const SizedBox(height: 24),
                                _buildSection('CONTROLS'),
                                Consumer<VoiceService>(
                                  builder: (context, voice, _) {
                                    return _buildMenuItem(
                                      context,
                                      Icons.mic,
                                      'Voice Control',
                                      voice.isEnabled ? 'Tap to disable' : 'Hands-free voice commands',
                                      () {
                                        voice.toggle();
                                        appState.toggleMenu();
                                      },
                                      isActive: voice.isEnabled,
                                    );
                                  },
                                ),
                                _buildMenuItem(
                                  context,
                                  Icons.photo_camera,
                                  'Take Photo',
                                  'Capture AR screenshot with overlays',
                                  () => _onMenuItemTap(context, 'photo'),
                                ),
                                _buildMenuItem(
                                  context,
                                  Icons.remove_red_eye,
                                  'Describe Scene',
                                  'AI describes what it sees',
                                  () => _onMenuItemTap(context, 'describe'),
                                ),
                                const SizedBox(height: 24),
                                _buildSection('SYSTEM'),
                                _buildMenuItem(
                                  context,
                                  Icons.help_outline,
                                  'Help & Commands',
                                  'View all voice commands & tips',
                                  () => _showHelp(context),
                                ),
                                _buildMenuItem(
                                  context,
                                  Icons.close,
                                  'Close Menu',
                                  'Return to camera view',
                                  () => appState.toggleMenu(),
                                ),
                                const SizedBox(height: 80),
                              ],
                            ),
                          ),
                        ),
                        _buildFooter(),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildHeader() {
    return Column(
      children: [
        // Compact Logo
        Container(
          width: 45,
          height: 45,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Color(0xFF8B5CF6).withOpacity(0.3),
                Color(0xFF3B82F6).withOpacity(0.3),
              ],
            ),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: Color(0xFF8B5CF6).withOpacity(0.5),
              width: 1.5,
            ),
            boxShadow: [
              BoxShadow(
                color: Color(0xFF8B5CF6).withOpacity(0.3),
                blurRadius: 12,
                spreadRadius: 1,
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: Image.asset(
              'assets/images/logo.png',
              width: 45,
              height: 45,
              fit: BoxFit.cover,
            ),
          ),
        ),
        const SizedBox(height: 8),
        
        // App Name
        ShaderMask(
          shaderCallback: (bounds) => const LinearGradient(
            colors: [Color(0xFFA78BFA), Color(0xFF60A5FA)],
          ).createShader(bounds),
          child: const Text(
            'Euphorie AI',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: Colors.white,
              letterSpacing: 0.3,
            ),
          ),
        ),
        const SizedBox(height: 1),
        
        // Subtitle
        Text(
          'Ultimate AR System',
          style: TextStyle(
            fontSize: 9,
            color: Colors.white.withOpacity(0.6),
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }

  Widget _buildSection(String title) {
    return Padding(
      padding: const EdgeInsets.only(left: 8, bottom: 12, top: 8),
      child: Row(
        children: [
          Container(
            width: 3,
            height: 12,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF8B5CF6), Color(0xFF3B82F6)],
              ),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(width: 8),
          Text(
            title,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w800,
              color: const Color(0xFFA78BFA).withOpacity(0.8),
              letterSpacing: 1.2,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMenuItem(
    BuildContext context,
    IconData icon,
    String title,
    String subtitle,
    VoidCallback onTap, {
    bool isActive = false,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: isActive
              ? [
                  const Color(0xFF8B5CF6).withOpacity(0.3),
                  const Color(0xFF3B82F6).withOpacity(0.3),
                ]
              : [
                  const Color(0xFF8B5CF6).withOpacity(0.1),
                  const Color(0xFF3B82F6).withOpacity(0.1),
                ],
        ),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isActive
              ? const Color(0xFF8B5CF6).withOpacity(0.8)
              : const Color(0xFF8B5CF6).withOpacity(0.3),
          width: isActive ? 2 : 1,
        ),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(14),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        const Color(0xFF8B5CF6).withOpacity(0.3),
                        const Color(0xFF3B82F6).withOpacity(0.3),
                      ],
                    ),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: const Color(0xFF8B5CF6).withOpacity(0.5),
                      width: 1,
                    ),
                  ),
                  child: Icon(
                    icon,
                    color: const Color(0xFFA78BFA),
                    size: 22,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                          fontSize: 14,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        subtitle,
                        style: TextStyle(
                          color: Colors.white.withOpacity(0.6),
                          fontSize: 11,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                if (isActive)
                  const Icon(
                    Icons.check_circle,
                    color: Color(0xFF10B981),
                    size: 20,
                  )
                else
                  Icon(
                    Icons.chevron_right,
                    color: Colors.white.withOpacity(0.3),
                    size: 20,
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildFooter() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        border: Border(
          top: BorderSide(
            color: Colors.white.withOpacity(0.1),
            width: 1,
          ),
        ),
      ),
      child: Column(
        children: [
          Text(
            'Powered by AI Vision',
            style: TextStyle(
              color: Colors.white.withOpacity(0.5),
              fontSize: 10,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 4),
          Text(
            'Version 2.0 • Flutter Native',
            style: TextStyle(
              color: const Color(0xFFA78BFA).withOpacity(0.6),
              fontSize: 10,
              fontWeight: FontWeight.w600,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  void _onMenuItemTap(BuildContext context, String action) {
    final appState = context.read<AppState>();
    final voice = context.read<VoiceService>();
    
    appState.setMode(action);
    appState.toggleMenu();
    
    switch (action) {
      case 'detect':
        voice.speak('Object detection mode activated');
        break;
      case 'measure':
        voice.speak('Measurement mode. Tap two points to measure distance');
        break;
      case '3d':
        voice.speak('3D object placement mode');
        break;
      case 'photo':
        voice.speak('Screenshot captured');
        break;
      case 'describe':
        voice.speak('Analyzing scene');
        break;
    }
  }

  void _showHelp(BuildContext context) {
    context.read<AppState>().toggleMenu();
    
    showDialog(
      context: context,
      builder: (context) => Dialog(
        backgroundColor: Colors.transparent,
        child: Container(
          constraints: const BoxConstraints(maxWidth: 400, maxHeight: 600),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Color(0xFF1E0A32),
                Color(0xFF0F0023),
              ],
            ),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(
              color: const Color(0xFF8B5CF6).withOpacity(0.5),
              width: 2,
            ),
          ),
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                '🎤 Voice Commands',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 24),
              Flexible(
                child: SingleChildScrollView(
                  child: Column(
                    children: [
                      _buildHelpItem('"detect objects"', 'Activate object detection'),
                      _buildHelpItem('"measure distance"', 'Activate measurement tool'),
                      _buildHelpItem('"place cube"', 'Add 3D cube to scene'),
                      _buildHelpItem('"show news"', 'Toggle news feed'),
                      _buildHelpItem('"what is this"', 'AI describes the scene'),
                      _buildHelpItem('"take photo"', 'Capture AR screenshot'),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () => Navigator.pop(context),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF8B5CF6),
                  padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: const Text(
                  'Got It!',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHelpItem(String command, String description) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.mic, color: Color(0xFF10B981), size: 16),
          const SizedBox(width: 12),
          Expanded(
            child: RichText(
              text: TextSpan(
                style: const TextStyle(color: Colors.white, fontSize: 13),
                children: [
                  TextSpan(
                    text: command,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      color: Color(0xFFA78BFA),
                    ),
                  ),
                  const TextSpan(text: ' - '),
                  TextSpan(text: description),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
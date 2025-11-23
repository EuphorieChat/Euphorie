import 'package:flutter/material.dart';
import 'package:speech_to_text/speech_to_text.dart';
import 'package:flutter_tts/flutter_tts.dart';

class VoiceService extends ChangeNotifier {
  final SpeechToText _speech = SpeechToText();
  final FlutterTts _tts = FlutterTts();
  
  bool _isListening = false;
  bool _isEnabled = false;
  String _lastWords = '';
  
  bool get isListening => _isListening;
  bool get isEnabled => _isEnabled;
  String get lastWords => _lastWords;

  Future<void> initialize() async {
    try {
      final available = await _speech.initialize();
      if (available) {
        print('✅ Voice recognition initialized');
      }
      
      await _tts.setLanguage('en-US');
      await _tts.setSpeechRate(0.5);
      await _tts.setVolume(1.0);
      await _tts.setPitch(1.0);
      
      print('✅ Text-to-speech initialized');
    } catch (e) {
      print('⚠️ Voice initialization failed: $e');
    }
  }

  Future<void> toggleListening() async {
    if (_isListening) {
      await stopListening();
    } else {
      await startListening();
    }
  }

  Future<void> startListening() async {
    if (!_speech.isAvailable) {
      await speak("Voice recognition not available");
      return;
    }
    
    _isListening = true;
    _isEnabled = true;
    notifyListeners();
    
    await _speech.listen(
      onResult: (result) {
        _lastWords = result.recognizedWords;
        notifyListeners();
        
        if (result.finalResult) {
          _processCommand(result.recognizedWords);
        }
      },
    );
    
    await speak("Voice control enabled");
  }

  Future<void> stopListening() async {
    _isListening = false;
    notifyListeners();
    
    await _speech.stop();
    await speak("Voice control disabled");
  }

  void _processCommand(String command) {
    print('🎤 Voice command: $command');
    // Commands will be processed by the UI
  }

  Future<void> speak(String text) async {
    try {
      await _tts.speak(text);
      print('🔊 Speaking: $text');
    } catch (e) {
      print('⚠️ TTS error: $e');
    }
  }

  void toggle() {
    _isEnabled = !_isEnabled;
    notifyListeners();
    
    if (_isEnabled) {
      startListening();
    } else {
      stopListening();
    }
  }

  @override
  void dispose() {
    _speech.stop();
    _tts.stop();
    super.dispose();
  }
}
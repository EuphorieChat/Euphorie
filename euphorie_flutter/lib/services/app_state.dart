import 'package:flutter/material.dart';

class AppState extends ChangeNotifier {
  bool _isMenuOpen = false;
  bool _isNewsFeedOpen = false;
  String _currentMode = 'detect'; // detect, measure, 3d
  
  bool get isMenuOpen => _isMenuOpen;
  bool get isNewsFeedOpen => _isNewsFeedOpen;
  String get currentMode => _currentMode;
  
  void toggleMenu() {
    _isMenuOpen = !_isMenuOpen;
    // Close news feed when opening menu
    if (_isMenuOpen && _isNewsFeedOpen) {
      _isNewsFeedOpen = false;
    }
    notifyListeners();
  }
  
  void toggleNewsFeed() {
    _isNewsFeedOpen = !_isNewsFeedOpen;
    // Close menu when opening news feed
    if (_isNewsFeedOpen && _isMenuOpen) {
      _isMenuOpen = false;
    }
    notifyListeners();
  }
  
  void setMode(String mode) {
    _currentMode = mode;
    notifyListeners();
  }
  
  void closeAll() {
    _isMenuOpen = false;
    _isNewsFeedOpen = false;
    notifyListeners();
  }
}
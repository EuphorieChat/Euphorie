import 'package:flutter/material.dart';

class AppTheme {
  static const purple = Color(0xFF8B5CF6);
  static const blue = Color(0xFF3B82F6);
  static const green = Color(0xFF10B981);
  static const red = Color(0xFFEF4444);
  
  static ThemeData darkTheme = ThemeData(
    brightness: Brightness.dark,
    primaryColor: purple,
    scaffoldBackgroundColor: Colors.black,
    colorScheme: const ColorScheme.dark(
      primary: purple,
      secondary: blue,
      surface: Color(0xFF1A1A1A),
      error: red,
    ),
  );
}
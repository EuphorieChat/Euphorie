import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';

class WebSocketService {
  final String url;
  final Function(Map<String, dynamic>) onEvent;
  final VoidCallback? onConnected;
  final VoidCallback? onDisconnected;

  WebSocket? _socket;
  Timer? _reconnectTimer;
  bool _disposed = false;

  WebSocketService({
    required this.url,
    required this.onEvent,
    this.onConnected,
    this.onDisconnected,
  });

  void connect() async {
    if (_disposed) return;
    try {
      debugPrint('WS: Connecting to $url');
      _socket = await WebSocket.connect(url);
      debugPrint('WS: Connected');
      onConnected?.call();

      _socket?.listen(
        (data) {
          try {
            final msg = jsonDecode(data as String) as Map<String, dynamic>;
            onEvent(msg);
          } catch (e) {
            debugPrint('WS parse error: $e');
          }
        },
        onDone: () {
          debugPrint('WS: Closed');
          onDisconnected?.call();
          _scheduleReconnect();
        },
        onError: (error) {
          debugPrint('WS error: $error');
          onDisconnected?.call();
          _scheduleReconnect();
        },
      );
    } catch (e) {
      debugPrint('WS connect failed: $e');
      _scheduleReconnect();
    }
  }

  void authenticate({required String email, required String name, required String token}) {
    send({'type': 'auth', 'email': email, 'name': name, 'token': token});
  }

  void sendCommand(String text) {
    send({'type': 'command', 'text': text});
  }

  void send(Map<String, dynamic> data) {
    try {
      _socket?.add(jsonEncode(data));
    } catch (e) {
      debugPrint('WS send error: $e');
    }
  }

  void _scheduleReconnect() {
    if (_disposed) return;
    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(const Duration(seconds: 3), () {
      if (_disposed == false) connect();
    });
  }

  void disconnect() {
    _disposed = true;
    _reconnectTimer?.cancel();
    try { _socket?.close(); } catch (_) {}
    _socket = null;
  }
}

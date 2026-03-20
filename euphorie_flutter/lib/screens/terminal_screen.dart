import 'dart:async';
import 'dart:io' show Platform;
import 'dart:io' show Platform;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:speech_to_text/speech_to_text.dart';
import '../services/websocket_service.dart';
import '../services/auth_service.dart';
import '../services/revenue_cat_service.dart';

const _bg = Color(0xFF06080c);
const _bgSurface = Color(0xFF080a10);
const _border = Color(0xFF151b25);
const _accent = Color(0xFFa78bfa);
const _accentBright = Color(0xFFc4b5fd);
const _textMain = Color(0xFFe2e8f0);
const _textDim = Color(0xFF4a5568);
const _textMuted = Color(0xFF2d3748);
const _textData = Color(0xFFa0aec0);
const _danger = Color(0xFFfb7185);

const _agentColors = {
  'ATLAS': Color(0xFFa78bfa),
  'CIPHER': Color(0xFF00b4ff),
  'ORACLE': Color(0xFFff6b35),
  'HERALD': Color(0xFF00e5a0),
  'SENTINEL': Color(0xFFffd93d),
};

class TerminalScreen extends StatefulWidget {
  final String? userName;
  final String? userEmail;
  final String? token;
  const TerminalScreen({super.key, this.userName, this.userEmail, this.token});

  @override
  State<TerminalScreen> createState() => _TerminalScreenState();
}

class _TerminalScreenState extends State<TerminalScreen> {
  final _inputCtl = TextEditingController();
  final _scrollCtl = ScrollController();
  final _inputFocus = FocusNode();
  final List<_Line> _lines = [];
  final List<String> _history = [];
  int _histIdx = -1;
  bool _processing = false;
  bool _listening = false;
  bool _menuOpen = false;
  WebSocketService? _ws;
  bool _speechOk = false;
  SpeechToText? _speech;

  @override
  void initState() {
    super.initState();
    _loadHistory();
    _connectWs();
    if (Platform.isMacOS == false) _setupSpeech();
    // RevenueCat init on-demand only
  }

  @override
  void dispose() {
    _ws?.disconnect();
    _inputCtl.dispose();
    _scrollCtl.dispose();
    _inputFocus.dispose();
    super.dispose();
  }

  Future<void> _loadHistory() async {
    try {
      final p = await SharedPreferences.getInstance();
      final h = p.getStringList('euphorie_cmd_history');
      if (h != null && mounted) setState(() => _history.addAll(h));
    } catch (_) {}
  }

  Future<void> _saveHistory() async {
    try {
      final p = await SharedPreferences.getInstance();
      await p.setStringList('euphorie_cmd_history', _history.take(50).toList());
    } catch (_) {}
  }

  void _connectWs() {
    try {
      _ws = WebSocketService(
        url: 'wss://api.authe.me/v1/ws',
        onEvent: _onWsEvent,
        onConnected: () {
          _ws?.authenticate(
            email: widget.userEmail ?? '',
            name: widget.userName ?? '',
            token: widget.token ?? '',
          );
        },
        onDisconnected: () {
          if (mounted) _add(_Line.system('Connection lost. Reconnecting...'));
        },
      );
      _ws?.connect();
    } catch (e) {
      debugPrint('WS init error: $e');
    }
  }

  void _setupSpeech() async {
    try {
      _speech = SpeechToText();
      _speechOk = await _speech?.initialize() ?? false;
    } catch (e) {
      debugPrint('Speech init: $e');
      _speechOk = false;
    }
  }

  void _initRevenueCat() async {
    try {
      final rc = RevenueCatService();
      await rc.initialize();
    } catch (e) {
      debugPrint('RevenueCat init: $e');
    }
  }

  void _onWsEvent(Map<String, dynamic> m) {
    if (!mounted) return;
    final t = m['type'] as String?;
    switch (t) {
      case 'auth_ok': debugPrint('Adapter authenticated'); break;
      case 'ready':
        setState(() => _processing = false);
        _inputFocus.requestFocus();
        break;
      case 'system': _add(_Line.system(m['text'] ?? '')); break;
      case 'agent': _add(_Line.agent(m['text'] ?? '', m['agent'] ?? 'ATLAS')); break;
      case 'data': _add(_Line.data(m['text'] ?? '')); break;
      case 'blank': _add(_Line.blank()); break;
      case 'turn_complete':
        setState(() => _processing = false);
        _inputFocus.requestFocus();
        break;
      case 'error':
        _add(_Line.system('Error: ${m['message'] ?? 'Unknown'}'));
        setState(() => _processing = false);
        break;
    }
  }

  void _add(_Line l) {
    if (!mounted) return;
    setState(() => _lines.add(l));
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollCtl.hasClients) {
        _scrollCtl.animateTo(_scrollCtl.position.maxScrollExtent,
            duration: const Duration(milliseconds: 80), curve: Curves.easeOut);
      }
    });
  }

  void _run(String cmd) {
    final s = cmd.trim();
    if (s.isEmpty) return;

    _add(_Line.input(s));
    _add(_Line.blank());
    _history.insert(0, s);
    if (_history.length > 50) _history.removeLast();
    _histIdx = -1;
    _saveHistory();
    _inputCtl.clear();

    // Local commands
    final lower = s.toLowerCase();
    if (lower == 'clear') { setState(() => _lines.clear()); return; }
    if (lower == 'history') {
      _add(_Line.system('COMMAND HISTORY'));
      for (var i = 0; i < _history.length && i < 15; i++) {
        _add(_Line.data('  ${(i + 1).toString().padLeft(2)}  ${_history[i]}'));
      }
      _add(_Line.blank());
      return;
    }
    if (lower == 'logout') { _doLogout(); return; }
    if (lower == 'buy' || lower == 'credits' || lower == 'subscribe') {
      _showPaywall();
      return;
    }

    // Send to server
    if (_ws != null) {
      setState(() => _processing = true);
      _ws?.sendCommand(s);
    } else {
      _add(_Line.system('Not connected. Reconnecting...'));
      _connectWs();
    }
  }

  void _doLogout() {
    _ws?.disconnect();
    try {
      final auth = Provider.of<AuthService>(context, listen: false);
      auth.signOut();
    } catch (e) {
      debugPrint('Logout error: $e');
    }
  }

  void _showPaywall() async {
    try {
      final rc = RevenueCatService();
      if (rc.isInitialized == false) await rc.initialize();

      if (rc.hasAnySubscription) {
        _add(_Line.system('You are subscribed: ' + rc.currentTier.displayName));
        _add(_Line.blank());
        return;
      }

      await rc.loadOfferings();
      final offerings = rc.offerings;
      if (offerings?.current == null || offerings!.current!.availablePackages.isEmpty) {
        _add(_Line.system('No subscription plans available yet.'));
        _add(_Line.system('Visit https://euphorie.com for credits.'));
        _add(_Line.blank());
        return;
      }

      if (!mounted) return;
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          backgroundColor: const Color(0xFF0a0e14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: const BorderSide(color: Color(0xFF151b25))),
          title: ShaderMask(
            shaderCallback: (b) => const LinearGradient(colors: [Color(0xFFc4b5fd), Color(0xFFa78bfa)]).createShader(b),
            child: const Text('Euphorie Pro', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: Colors.white)),
          ),
          content: SizedBox(
            width: 300,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text('Unlock unlimited AI agent access', style: TextStyle(color: Color(0xFF4a5568), fontSize: 13)),
                const SizedBox(height: 16),
                ...offerings.current!.availablePackages.map((pkg) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: GestureDetector(
                    onTap: () async {
                      Navigator.of(ctx).pop();
                      _add(_Line.system('Processing purchase...'));
                      final success = await rc.purchasePackage(pkg);
                      if (success) {
                        _add(_Line.system('Purchase successful! Welcome to Pro.'));
                      } else {
                        _add(_Line.system('Purchase cancelled or failed.'));
                      }
                      _add(_Line.blank());
                    },
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFa78bfa).withOpacity(0.3)),
                        color: const Color(0xFF06080c),
                      ),
                      child: Row(children: [
                        Expanded(child: Text(pkg.storeProduct.title, style: const TextStyle(color: Color(0xFFe2e8f0), fontSize: 14))),
                        Text(pkg.storeProduct.priceString, style: const TextStyle(color: Color(0xFFa78bfa), fontSize: 14, fontWeight: FontWeight.w600)),
                      ]),
                    ),
                  ),
                )),
                const SizedBox(height: 8),
                GestureDetector(
                  onTap: () async {
                    Navigator.of(ctx).pop();
                    _add(_Line.system('Restoring purchases...'));
                    final restored = await rc.restorePurchases();
                    _add(_Line.system(restored ? 'Purchases restored!' : 'No purchases found.'));
                    _add(_Line.blank());
                  },
                  child: const Text('Restore Purchases', style: TextStyle(color: Color(0xFF4a5568), fontSize: 12)),
                ),
              ],
            ),
          ),
        ),
      );
    } catch (e) {
      debugPrint('Paywall error: $e');
      _add(_Line.system('Visit https://euphorie.com for credits.'));
      _add(_Line.blank());
    }
  }

  void _toggleVoice() async {
    if (_speech == null || !_speechOk) return;
    if (_listening) {
      try { await _speech?.stop(); } catch (_) {}
      if (mounted) setState(() => _listening = false);
    } else {
      if (mounted) setState(() => _listening = true);
      try {
        await _speech?.listen(onResult: (r) {
          if (!mounted) return;
          _inputCtl.text = r.recognizedWords;
          if (r.finalResult && r.recognizedWords.trim().isNotEmpty) {
            setState(() => _listening = false);
            _run(r.recognizedWords.trim());
          }
        });
      } catch (e) {
        debugPrint('Listen error: $e');
        if (mounted) setState(() => _listening = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bg,
      body: SafeArea(
        bottom: false,
        child: Column(children: [
          _header(context),
          _agentBar(),
          Expanded(child: _terminal()),
          _inputArea(),
          _quickBar(),
          SizedBox(height: MediaQuery.of(context).padding.bottom),
        ]),
      ),
    );
  }

  Widget _header(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: _border, width: 0.5))),
      child: Row(children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: Image.asset('assets/images/logo.png', width: 28, height: 28, fit: BoxFit.cover,
            errorBuilder: (_, __, ___) => Container(width: 28, height: 28,
              decoration: BoxDecoration(borderRadius: BorderRadius.circular(8), color: _accent),
              child: const Center(child: Text('E', style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w700))))),
        ),
        const SizedBox(width: 10),
        ShaderMask(
          shaderCallback: (b) => const LinearGradient(colors: [_accentBright, _accent]).createShader(b),
          child: const Text('EUPHORIE', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, letterSpacing: 4, color: Colors.white)),
        ),
        const Spacer(),
        GestureDetector(
          onTap: () => setState(() => _menuOpen = !_menuOpen),
          child: Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(borderRadius: BorderRadius.circular(6), border: Border.all(color: _border)),
            child: Icon(_menuOpen ? Icons.close : Icons.menu, size: 18, color: _accent),
          ),
        ),
      ]),
    );
  }

  Widget _agentBar() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      decoration: const BoxDecoration(color: _bgSurface, border: Border(bottom: BorderSide(color: _border, width: 0.5))),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(children: [
          ..._agentColors.entries.map((e) => Padding(
            padding: const EdgeInsets.only(right: 14),
            child: Row(children: [
              Container(width: 5, height: 5, decoration: BoxDecoration(
                shape: BoxShape.circle, color: e.value,
                boxShadow: [BoxShadow(color: e.value.withOpacity(0.3), blurRadius: 4)])),
              const SizedBox(width: 5),
              Text(e.key, style: const TextStyle(fontSize: 9, color: _textMuted, fontWeight: FontWeight.w600, letterSpacing: 0.8)),
            ]),
          )),
          const SizedBox(width: 20),
          const Text('authe.me \u2713', style: TextStyle(fontSize: 9, color: _textMuted, letterSpacing: 0.3)),
        ]),
      ),
    );
  }

  Widget _terminal() {
    return GestureDetector(
      onTap: () {
        setState(() => _processing = false);
        _inputFocus.requestFocus();
      },
      child: Container(
        color: _bg,
        child: ListView.builder(
          controller: _scrollCtl,
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
          itemCount: _lines.length,
          itemBuilder: (_, i) => _buildLine(_lines[i]),
        ),
      ),
    );
  }

  Widget _buildLine(_Line l) {
    switch (l.type) {
      case _LType.blank: return const SizedBox(height: 8);
      case _LType.system:
        return Padding(padding: const EdgeInsets.symmetric(vertical: 1),
          child: Text(l.text, style: const TextStyle(fontSize: 13, color: _textMuted, height: 1.6)));
      case _LType.input:
        return Padding(padding: const EdgeInsets.symmetric(vertical: 1),
          child: RichText(text: TextSpan(children: [
            const TextSpan(text: '\u276f ', style: TextStyle(fontSize: 13, color: _accent, fontWeight: FontWeight.w700)),
            TextSpan(text: l.text, style: const TextStyle(fontSize: 13, color: _textMain, height: 1.6)),
          ])));
      case _LType.agent:
        final c = _agentColors[l.agent] ?? _accent;
        return Padding(padding: const EdgeInsets.symmetric(vertical: 1),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            SizedBox(width: 76, child: Text('[${l.agent}]', style: TextStyle(fontSize: 13, color: c, fontWeight: FontWeight.w700, height: 1.6))),
            Expanded(child: Text(l.text, style: const TextStyle(fontSize: 13, color: _textMain, height: 1.6))),
          ]));
      case _LType.data:
        return Padding(padding: const EdgeInsets.symmetric(vertical: 1),
          child: Text(l.text, style: const TextStyle(fontSize: 13, color: _textData, height: 1.6)));
    }
  }

  Widget _inputArea() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: const BoxDecoration(color: _bg, border: Border(top: BorderSide(color: _border, width: 0.5))),
      child: Row(children: [
        const Text('\u276f', style: TextStyle(fontSize: 16, color: _accent, fontWeight: FontWeight.w700)),
        const SizedBox(width: 10),
        Expanded(
          child: RawKeyboardListener(
            focusNode: FocusNode(),
            onKey: (e) {
              if (e is RawKeyDownEvent) {
                if (e.logicalKey == LogicalKeyboardKey.arrowUp && _histIdx < _history.length - 1) {
                  _histIdx++;
                  _inputCtl.text = _history[_histIdx];
                  _inputCtl.selection = TextSelection.collapsed(offset: _inputCtl.text.length);
                } else if (e.logicalKey == LogicalKeyboardKey.arrowDown) {
                  if (_histIdx > 0) { _histIdx--; _inputCtl.text = _history[_histIdx]; }
                  else { _histIdx = -1; _inputCtl.clear(); }
                }
              }
            },
            child: TextField(
              controller: _inputCtl,
              focusNode: _inputFocus,
              autofocus: true,
              onSubmitted: (_) => _run(_inputCtl.text),
              style: const TextStyle(fontSize: 14, color: _textMain),
              cursorColor: _accent,
              decoration: InputDecoration(
                hintText: _processing ? 'processing...' : 'type a command or speak...',
                hintStyle: const TextStyle(color: _textMuted, fontSize: 14),
                border: InputBorder.none, isDense: true, contentPadding: EdgeInsets.zero,
              ),
            ),
          ),
        ),
        if (_listening)
          Padding(padding: const EdgeInsets.only(right: 8),
            child: Row(children: [
              Container(width: 6, height: 6, decoration: const BoxDecoration(shape: BoxShape.circle, color: _danger)),
              const SizedBox(width: 5),
              const Text('LISTENING', style: TextStyle(fontSize: 9, color: _accent, fontWeight: FontWeight.w600, letterSpacing: 0.8)),
            ])),
        GestureDetector(
          onTap: _toggleVoice,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: _listening ? _danger.withOpacity(0.5) : _border),
              color: _listening ? _danger.withOpacity(0.08) : _accent.withOpacity(0.06)),
            child: Row(children: [
              Icon(Icons.mic, size: 14, color: _listening ? _danger : _accent),
              const SizedBox(width: 5),
              Text(_listening ? 'STOP' : 'VOICE',
                style: TextStyle(fontSize: 9, fontWeight: FontWeight.w600, letterSpacing: 0.8, color: _listening ? _danger : _accent)),
            ]),
          ),
        ),
      ]),
    );
  }

  Widget _quickBar() {
    // Now returns empty when menu is closed
    if (!_menuOpen) return const SizedBox.shrink();
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: const BoxDecoration(
        color: _bgSurface,
        border: Border(top: BorderSide(color: _border, width: 0.5)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text('QUICK COMMANDS', style: TextStyle(fontSize: 9, color: _textMuted, fontWeight: FontWeight.w600, letterSpacing: 1.2)),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8, runSpacing: 8,
            children: ['morning', 'agents', 'research', 'status', 'help'].map((c) =>
              GestureDetector(
                onTap: () { setState(() => _menuOpen = false); _run(c); },
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(borderRadius: BorderRadius.circular(6), border: Border.all(color: _border), color: const Color(0x04ffffff)),
                  child: Text(c, style: const TextStyle(fontSize: 11, color: _textDim, letterSpacing: 0.5)),
                ),
              ),
            ).toList(),
          ),
          const SizedBox(height: 14),
          const Text('ACCOUNT', style: TextStyle(fontSize: 9, color: _textMuted, fontWeight: FontWeight.w600, letterSpacing: 1.2)),
          const SizedBox(height: 8),
          _menuItem(Icons.star, 'Subscribe', _accent, _showPaywall),
          const SizedBox(height: 6),
          _menuItem(Icons.delete_forever, 'Delete Account', _danger, _showDeleteAccount),
          const SizedBox(height: 6),
          _menuItem(Icons.logout, 'Logout', _danger, _doLogout),
        ],
      ),
    );
  }

  Widget _menuItem(IconData icon, String label, Color color, VoidCallback onTap) {
    return GestureDetector(
      onTap: () { setState(() => _menuOpen = false); onTap(); },
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: color.withOpacity(0.2)),
          color: color.withOpacity(0.04),
        ),
        child: Row(children: [
          Icon(icon, size: 16, color: color),
          const SizedBox(width: 10),
          Text(label, style: TextStyle(fontSize: 13, color: color, fontWeight: FontWeight.w500)),
        ]),
      ),
    );
  }

  void _showDeleteAccount() {
    final auth = Provider.of<AuthService>(context, listen: false);
    final isEmailUser = auth.authProvider == 'email';
    final passwordCtl = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDState) => AlertDialog(
          backgroundColor: const Color(0xFF0a0e14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: const BorderSide(color: Color(0xFF151b25))),
          title: const Row(children: [
            Icon(Icons.warning_amber_rounded, color: Color(0xFFEF4444), size: 24),
            SizedBox(width: 10),
            Text('Delete Account', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: Color(0xFFEF4444))),
          ]),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'This will permanently delete your account and all associated data. This action cannot be undone.',
                style: TextStyle(color: Color(0xFF4a5568), fontSize: 13),
              ),
              if (isEmailUser) ...[
                const SizedBox(height: 14),
                TextField(
                  controller: passwordCtl,
                  obscureText: true,
                  style: const TextStyle(fontSize: 14, color: Color(0xFFe2e8f0)),
                  cursorColor: _accent,
                  decoration: InputDecoration(
                    hintText: 'Enter password to confirm',
                    hintStyle: const TextStyle(color: Color(0xFF2d3748), fontSize: 14),
                    filled: true, fillColor: const Color(0xFF06080c),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF151b25))),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF151b25))),
                    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFEF4444), width: 1.5)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
                  ),
                ),
              ],
              if (auth.errorMessage != null) ...[
                const SizedBox(height: 10),
                Text(auth.errorMessage ?? '', style: const TextStyle(color: Color(0xFFEF4444), fontSize: 12)),
              ],
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel', style: TextStyle(color: Color(0xFF4a5568))),
            ),
            TextButton(
              onPressed: auth.isLoading ? null : () async {
                final success = await auth.deleteAccount(
                  password: isEmailUser ? passwordCtl.text : null,
                );
                if (success && ctx.mounted) {
                  Navigator.pop(ctx);
                }
                setDState(() {});
              },
              child: auth.isLoading
                ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFFEF4444)))
                : const Text('Delete', style: TextStyle(color: Color(0xFFEF4444), fontWeight: FontWeight.w700)),
            ),
          ],
        ),
      ),
    );
  }
}

enum _LType { system, input, agent, data, blank }

class _Line {
  final _LType type; final String text; final String agent;
  _Line._(this.type, this.text, this.agent);
  factory _Line.system(String t) => _Line._(_LType.system, t, '');
  factory _Line.input(String t) => _Line._(_LType.input, t, '');
  factory _Line.agent(String t, String a) => _Line._(_LType.agent, t, a);
  factory _Line.data(String t) => _Line._(_LType.data, t, '');
  factory _Line.blank() => _Line._(_LType.blank, '', '');
}

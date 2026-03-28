import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'screens/terminal_screen.dart';
import 'screens/nexus_screen.dart';
import 'services/app_state.dart';
import 'services/auth_service.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
    systemNavigationBarColor: Color(0xFF06080c),
    systemNavigationBarIconBrightness: Brightness.light,
  ));
  runApp(const EuphorieApp());
}

const _bg = Color(0xFF06080c);
const _bgRaised = Color(0xFF0a0e14);
const _border = Color(0xFF151b25);
const _accent = Color(0xFFa78bfa);
const _accentBright = Color(0xFFc4b5fd);
const _textMain = Color(0xFFe2e8f0);
const _textDim = Color(0xFF4a5568);
const _textMuted = Color(0xFF2d3748);
const _danger = Color(0xFFfb7185);

class EuphorieApp extends StatelessWidget {
  const EuphorieApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AppState()),
        ChangeNotifierProvider(create: (_) => AuthService()),
      ],
      child: MaterialApp(
        title: 'Euphorie',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          brightness: Brightness.dark,
          scaffoldBackgroundColor: _bg,
          colorScheme: const ColorScheme.dark(primary: _accent, surface: _bgRaised),
          textSelectionTheme: const TextSelectionThemeData(cursorColor: _accent),
        ),
        home: const AuthGate(),
      ),
    );
  }
}

class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<AuthService>(
      builder: (context, auth, _) {
        if (auth.isAuthenticated) {
          return HomeScreen(
            userName: auth.getUserDisplayName(),
            userEmail: auth.getUserEmail(),
            token: auth.user?['accessToken'],
          );
        }
        return const LoginScreen();
      },
    );
  }
}

class HomeScreen extends StatefulWidget {
  final String? userName;
  final String? userEmail;
  final String? token;
  const HomeScreen({super.key, this.userName, this.userEmail, this.token});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    final screens = [
      NexusScreen(token: widget.token),
      TerminalScreen(
        userName: widget.userName,
        userEmail: widget.userEmail,
        token: widget.token,
      ),
    ];

    return Scaffold(
      body: IndexedStack(index: _currentIndex, children: screens),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          border: Border(top: BorderSide(color: Color(0xFF1a2233))),
        ),
        child: BottomNavigationBar(
          currentIndex: _currentIndex,
          onTap: (i) => setState(() => _currentIndex = i),
          backgroundColor: const Color(0xFF06080c),
          selectedItemColor: const Color(0xFF6ee7b7),
          unselectedItemColor: const Color(0xFF4a5568),
          type: BottomNavigationBarType.fixed,
          selectedFontSize: 11,
          unselectedFontSize: 11,
          items: const [
            BottomNavigationBarItem(icon: Icon(Icons.search_rounded), label: 'Nexus'),
            BottomNavigationBarItem(icon: Icon(Icons.terminal_rounded), label: 'Terminal'),
          ],
        ),
      ),
    );
  }
}

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> with SingleTickerProviderStateMixin {
  final _emailCtl = TextEditingController();
  final _passCtl = TextEditingController();
  final _nameCtl = TextEditingController();
  final _emailFocus = FocusNode();
  bool _isLogin = true;
  late AnimationController _anim;

  @override
  void initState() {
    super.initState();
    _anim = AnimationController(vsync: this, duration: const Duration(milliseconds: 900))..forward();
  }

  @override
  void dispose() {
    _anim.dispose();
    _emailCtl.dispose();
    _passCtl.dispose();
    _nameCtl.dispose();
    _emailFocus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthService>(context);

    return Scaffold(
      backgroundColor: _bg,
      body: Stack(children: [
        // Ambient glow
        Positioned.fill(child: Container(
          decoration: const BoxDecoration(gradient: RadialGradient(
            center: Alignment(0.0, -0.4), radius: 1.4,
            colors: [Color(0x0Ca78bfa), Colors.transparent])))),
        // Content
        FadeTransition(
          opacity: CurvedAnimation(parent: _anim, curve: Curves.easeOut),
          child: SafeArea(child: Center(child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 40),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 360),
              child: Column(children: [
                // Logo
                Container(
                  width: 72, height: 72,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(18),
                    boxShadow: const [BoxShadow(color: Color(0x25a78bfa), blurRadius: 24, spreadRadius: 2)]),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(18),
                    child: Image.asset('assets/images/logo.png', fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(
                        decoration: BoxDecoration(borderRadius: BorderRadius.circular(18),
                          gradient: const LinearGradient(colors: [Color(0xFF7c3aed), _accent])),
                        child: const Center(child: Text('E', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w700, color: Colors.white)))))),
                ),
                const SizedBox(height: 18),
                ShaderMask(
                  shaderCallback: (b) => const LinearGradient(colors: [_accentBright, _accent]).createShader(b),
                  child: const Text('EUPHORIE', style: TextStyle(fontSize: 26, fontWeight: FontWeight.w700, letterSpacing: 5, color: Colors.white)),
                ),
                const SizedBox(height: 4),
                const Text('AI Procurement Intelligence', style: TextStyle(fontSize: 12, color: _textDim, letterSpacing: 1.5)),
                const SizedBox(height: 32),

                // Error
                if (auth.errorMessage != null)
                  Container(
                    width: double.infinity, margin: const EdgeInsets.only(bottom: 14),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(color: const Color(0x12fb7185), borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0x25fb7185))),
                    child: Text(auth.errorMessage!, style: const TextStyle(color: _danger, fontSize: 12), textAlign: TextAlign.center),
                  ),

                // Email fields first
                _field(_emailCtl, 'Email', TextInputType.emailAddress, focusNode: _emailFocus),
                const SizedBox(height: 10),
                _field(_passCtl, 'Password', TextInputType.visiblePassword, obscure: true, onSubmit: () => _submit(auth)),
                if (!_isLogin) ...[
                  const SizedBox(height: 10),
                  _field(_nameCtl, 'Display name (optional)', TextInputType.name),
                ],
                const SizedBox(height: 18),

                // Submit
                SizedBox(width: double.infinity, child: GestureDetector(
                  onTap: auth.isLoading ? null : () => _submit(auth),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    padding: const EdgeInsets.symmetric(vertical: 15),
                    decoration: BoxDecoration(
                      gradient: auth.isLoading ? null : const LinearGradient(colors: [Color(0xFF7c3aed), _accent]),
                      color: auth.isLoading ? _bgRaised : null, borderRadius: BorderRadius.circular(12)),
                    child: Center(child: auth.isLoading
                      ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: _accent))
                      : Text(_isLogin ? 'Sign In' : 'Create Account',
                          style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w600, letterSpacing: 0.5))),
                  ),
                )),
                const SizedBox(height: 14),

                // Toggle
                GestureDetector(
                  onTap: () => setState(() { _isLogin = !_isLogin; auth.clearError(); }),
                  child: Text(_isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in',
                    style: const TextStyle(color: _accent, fontSize: 12)),
                ),

                const SizedBox(height: 24),
                _divider(),
                const SizedBox(height: 24),

                // Social auth
                _socialBtn('Continue with Google', Icons.g_mobiledata, auth.isLoading ? null : () async {
                  try { await auth.signInWithGoogle(); } catch (e) { debugPrint('Google: $e'); }
                }),
                const SizedBox(height: 8),
                if (defaultTargetPlatform == TargetPlatform.iOS)
                  _socialBtn('Continue with Apple', Icons.apple, auth.isLoading ? null : () async {
                    try { await auth.signInWithApple(); } catch (e) { debugPrint('Apple: $e'); }
                  }),
                const SizedBox(height: 8),
                _socialBtn('Continue with Microsoft', Icons.window, auth.isLoading ? null : () async {
                  try { await auth.signInWithMicrosoft(); } catch (e) { debugPrint('Microsoft: $e'); }
                }),
              ])),
          ))),
        ),
      ]),
    );
  }

  void _submit(AuthService auth) async {
    auth.clearError();
    if (_isLogin) {
      await auth.login(email: _emailCtl.text.trim(), password: _passCtl.text);
    } else {
      await auth.register(
        email: _emailCtl.text.trim(), password: _passCtl.text,
        displayName: _nameCtl.text.trim().isEmpty ? null : _nameCtl.text.trim());
    }
  }

  Widget _socialBtn(String label, IconData icon, VoidCallback? onTap) {
    return SizedBox(width: double.infinity, child: GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 13, horizontal: 16),
        decoration: BoxDecoration(color: _bgRaised, borderRadius: BorderRadius.circular(12), border: Border.all(color: _border)),
        child: Row(children: [
          Icon(icon, size: 20, color: _textDim),
          const SizedBox(width: 14),
          Text(label, style: const TextStyle(color: _textMain, fontSize: 14)),
        ]),
      ),
    ));
  }

  Widget _divider() {
    return Row(children: [
      Expanded(child: Container(height: 1, color: _border)),
      const Padding(padding: EdgeInsets.symmetric(horizontal: 14),
        child: Text('or', style: TextStyle(color: _textMuted, fontSize: 11, letterSpacing: 1))),
      Expanded(child: Container(height: 1, color: _border)),
    ]);
  }

  Widget _field(TextEditingController ctl, String hint, TextInputType type,
      {bool obscure = false, FocusNode? focusNode, VoidCallback? onSubmit}) {
    return TextField(
      controller: ctl, focusNode: focusNode, keyboardType: type, obscureText: obscure,
      onSubmitted: (_) => onSubmit?.call(),
      style: const TextStyle(fontSize: 14, color: _textMain), cursorColor: _accent,
      decoration: InputDecoration(
        hintText: hint, hintStyle: const TextStyle(color: _textMuted, fontSize: 14),
        filled: true, fillColor: _bgRaised,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: _border)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: _border)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: _accent, width: 1.5)),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15)),
    );
  }
}

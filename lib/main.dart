import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:url_launcher/url_launcher.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Color(0xFF08080A),
    statusBarIconBrightness: Brightness.light,
    systemNavigationBarColor: Color(0xFF08080A),
    systemNavigationBarIconBrightness: Brightness.light,
  ));
  runApp(const EuphorieApp());
}

class EuphorieApp extends StatelessWidget {
  const EuphorieApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Euphorie',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        scaffoldBackgroundColor: const Color(0xFF08080A),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFFB8A9D4),
          surface: Color(0xFF08080A),
        ),
      ),
      home: const EuphorieWebView(),
    );
  }
}

class EuphorieWebView extends StatefulWidget {
  const EuphorieWebView({super.key});

  @override
  State<EuphorieWebView> createState() => _EuphorieWebViewState();
}

class _EuphorieWebViewState extends State<EuphorieWebView> {
  late final WebViewController _controller;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFF08080A))
      ..setNavigationDelegate(NavigationDelegate(
        onPageStarted: (_) {
          if (mounted) setState(() => _isLoading = true);
        },
        onPageFinished: (_) {
          if (mounted) setState(() => _isLoading = false);
        },
        onNavigationRequest: (request) {
          final url = request.url;
          if (url.startsWith('https://euphorie.com') ||
              url.startsWith('https://www.euphorie.com')) {
            return NavigationDecision.navigate;
          }
          // Stripe and all external links open in system browser
          launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
          return NavigationDecision.prevent;
        },
      ))
      ..loadRequest(Uri.parse('https://euphorie.com'));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF08080A),
      body: SafeArea(
        child: Stack(
          children: [
            WebViewWidget(controller: _controller),
            if (_isLoading)
              const Center(
                child: CircularProgressIndicator(
                  color: Color(0xFFB8A9D4),
                  strokeWidth: 2,
                ),
              ),
          ],
        ),
      ),
    );
  }
}

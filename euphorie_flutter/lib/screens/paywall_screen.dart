import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:purchases_flutter/purchases_flutter.dart';
import '../services/revenue_cat_service.dart';

class PaywallScreen extends StatefulWidget {
  final String? source;
  final String? message;
  
  const PaywallScreen({
    super.key,
    this.source,
    this.message,
  });

  @override
  State<PaywallScreen> createState() => _PaywallScreenState();
}

class _PaywallScreenState extends State<PaywallScreen> with SingleTickerProviderStateMixin {
  late AnimationController _glowController;
  late Animation<double> _glowAnimation;
  
  int _selectedPackageIndex = 1; // Default to yearly (best value)
  bool _isProcessing = false;

  @override
  void initState() {
    super.initState();
    
    _glowController = AnimationController(
      duration: const Duration(milliseconds: 2000),
      vsync: this,
    )..repeat(reverse: true);
    
    _glowAnimation = Tween<double>(begin: 0.5, end: 1.0).animate(
      CurvedAnimation(parent: _glowController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _glowController.dispose();
    super.dispose();
  }

  Future<void> _purchase(BuildContext context, Package package) async {
    setState(() => _isProcessing = true);

    try {
      final revenueCat = context.read<RevenueCatService>();
      final success = await revenueCat.purchasePackage(package);

      if (!mounted) return;

      if (success) {
        // Show success message
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: const [
                Icon(Icons.check_circle, color: Colors.white),
                SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Subscription activated! 🎉',
                    style: TextStyle(fontWeight: FontWeight.w700),
                  ),
                ),
              ],
            ),
            backgroundColor: const Color(0xFF10b981),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        );

        // Close paywall after short delay
        await Future.delayed(const Duration(milliseconds: 500));
        if (mounted) Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Purchase failed: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isProcessing = false);
      }
    }
  }

  Future<void> _restorePurchases(BuildContext context) async {
    setState(() => _isProcessing = true);

    try {
      final revenueCat = context.read<RevenueCatService>();
      final success = await revenueCat.restorePurchases();

      if (!mounted) return;

      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text(
              'Subscriptions restored! ✅',
              style: TextStyle(fontWeight: FontWeight.w700),
            ),
            backgroundColor: const Color(0xFF10b981),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        );
        
        Navigator.pop(context);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('No active subscriptions found'),
            backgroundColor: Colors.orange,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Restore failed: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isProcessing = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<RevenueCatService>(
      builder: (context, revenueCat, child) {
        final offerings = revenueCat.offerings?.current;
        
        return Scaffold(
          body: Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  Color(0xFF0A001A),
                  Color(0xFF1A0030),
                  Color(0xFF0F0023),
                  Color(0xFF1E0A32),
                ],
              ),
            ),
            child: SafeArea(
              child: Column(
                children: [
                  // Header with close button
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const SizedBox(width: 48),
                        const Spacer(),
                        IconButton(
                          onPressed: () => Navigator.pop(context),
                          icon: const Icon(
                            Icons.close_rounded,
                            color: Colors.white,
                            size: 28,
                          ),
                        ),
                      ],
                    ),
                  ),

                  Expanded(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        children: [
                          // Logo & Title
                          AnimatedBuilder(
                            animation: _glowAnimation,
                            builder: (context, child) {
                              return Container(
                                padding: const EdgeInsets.all(20),
                                decoration: BoxDecoration(
                                  gradient: const LinearGradient(
                                    colors: [
                                      Color(0xFF8B5CF6),
                                      Color(0xFF6366f1),
                                    ],
                                  ),
                                  borderRadius: BorderRadius.circular(28),
                                  boxShadow: [
                                    BoxShadow(
                                      color: Color(0xFF8B5CF6)
                                          .withOpacity(_glowAnimation.value * 0.6),
                                      blurRadius: 40,
                                      spreadRadius: 8,
                                    ),
                                  ],
                                ),
                                child: ClipRRect(
                                  borderRadius: BorderRadius.circular(16),
                                  child: Image.asset(
                                    'assets/images/logo.png',
                                    width: 70,
                                    height: 70,
                                    fit: BoxFit.contain,
                                    errorBuilder: (context, error, stackTrace) {
                                      return const Icon(
                                        Icons.remove_red_eye_rounded,
                                        size: 70,
                                        color: Colors.white,
                                      );
                                    },
                                  ),
                                ),
                              );
                            },
                          ),
                          const SizedBox(height: 24),

                          ShaderMask(
                            shaderCallback: (bounds) => const LinearGradient(
                              colors: [
                                Color(0xFFA78BFA),
                                Colors.white,
                                Color(0xFF60A5FA),
                              ],
                            ).createShader(bounds),
                            child: const Text(
                              'Upgrade to Premium',
                              style: TextStyle(
                                fontSize: 36,
                                fontWeight: FontWeight.w900,
                                color: Colors.white,
                                letterSpacing: 1,
                              ),
                              textAlign: TextAlign.center,
                            ),
                          ),
                          const SizedBox(height: 12),

                          if (widget.message != null)
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 20,
                                vertical: 12,
                              ),
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(
                                  color: const Color(0xFF8B5CF6).withOpacity(0.3),
                                  width: 1.5,
                                ),
                                color: Colors.white.withOpacity(0.05),
                              ),
                              child: Text(
                                widget.message!,
                                style: TextStyle(
                                  fontSize: 15,
                                  color: Colors.white.withOpacity(0.9),
                                  fontWeight: FontWeight.w600,
                                  letterSpacing: 0.3,
                                ),
                                textAlign: TextAlign.center,
                              ),
                            ),
                          const SizedBox(height: 32),

                          // Features List
                          _buildFeaturesList(),
                          const SizedBox(height: 32),

                          // Subscription Plans
                          if (offerings != null && offerings.availablePackages.isNotEmpty)
                            _buildSubscriptionPlans(offerings.availablePackages)
                          else
                            _buildLoadingPlans(),

                          const SizedBox(height: 24),

                          // Restore Button
                          TextButton(
                            onPressed: _isProcessing
                                ? null
                                : () => _restorePurchases(context),
                            child: Text(
                              'Restore Purchases',
                              style: TextStyle(
                                color: Colors.white.withOpacity(0.7),
                                fontSize: 15,
                                decoration: TextDecoration.underline,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),

                          // Terms & Privacy
                          Text(
                            'Terms of Service • Privacy Policy',
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.white.withOpacity(0.5),
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildFeaturesList() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Colors.white.withOpacity(0.08),
            Colors.white.withOpacity(0.03),
          ],
        ),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: Colors.white.withOpacity(0.15),
          width: 1.5,
        ),
      ),
      child: Column(
        children: [
          _buildFeatureItem(
            Icons.all_inclusive_rounded,
            'Unlimited AI Analyses',
            'No daily limits - analyze as much as you want',
          ),
          const SizedBox(height: 16),
          _buildFeatureItem(
            Icons.view_in_ar_rounded,
            'Advanced AR Features',
            '3D objects, measurements, and more',
          ),
          const SizedBox(height: 16),
          _buildFeatureItem(
            Icons.no_photography_rounded,
            'No Watermarks',
            'Clean screenshots without branding',
          ),
          const SizedBox(height: 16),
          _buildFeatureItem(
            Icons.cloud_download_rounded,
            'Export & Save',
            'Download your analysis history',
          ),
          const SizedBox(height: 16),
          _buildFeatureItem(
            Icons.mic_rounded,
            'Custom Voice Commands',
            'Personalized voice control',
          ),
          const SizedBox(height: 16),
          _buildFeatureItem(
            Icons.offline_bolt_rounded,
            'Offline Mode',
            'Work without internet connection',
          ),
        ],
      ),
    );
  }

  Widget _buildFeatureItem(IconData icon, String title, String description) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF8B5CF6), Color(0xFF6366f1)],
            ),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, color: Colors.white, size: 24),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: Colors.white,
                  letterSpacing: 0.3,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                description,
                style: TextStyle(
                  fontSize: 13,
                  color: Colors.white.withOpacity(0.7),
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSubscriptionPlans(List<Package> packages) {
    // Sort packages: yearly first, then monthly
    final sortedPackages = List<Package>.from(packages);
    sortedPackages.sort((a, b) {
      if (a.identifier.contains('yearly')) return -1;
      if (b.identifier.contains('yearly')) return 1;
      return 0;
    });

    return Column(
      children: sortedPackages.asMap().entries.map((entry) {
        final index = entry.key;
        final package = entry.value;
        
        final isYearly = package.identifier.contains('yearly');
        final isPro = package.identifier.contains('pro');
        final isSelected = _selectedPackageIndex == index;

        return GestureDetector(
          onTap: () => setState(() => _selectedPackageIndex = index),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            margin: const EdgeInsets.only(bottom: 16),
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: isSelected
                  ? LinearGradient(
                      colors: isPro
                          ? [
                              const Color(0xFFFFD700).withOpacity(0.2),
                              const Color(0xFFFFA500).withOpacity(0.2),
                            ]
                          : [
                              const Color(0xFF8B5CF6).withOpacity(0.2),
                              const Color(0xFF6366f1).withOpacity(0.2),
                            ],
                    )
                  : null,
              color: isSelected ? null : Colors.white.withOpacity(0.05),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: isSelected
                    ? (isPro
                        ? const Color(0xFFFFD700)
                        : const Color(0xFF8B5CF6))
                    : Colors.white.withOpacity(0.2),
                width: isSelected ? 3 : 1.5,
              ),
              boxShadow: isSelected
                  ? [
                      BoxShadow(
                        color: (isPro
                                ? const Color(0xFFFFD700)
                                : const Color(0xFF8B5CF6))
                            .withOpacity(0.4),
                        blurRadius: 20,
                        spreadRadius: 2,
                      ),
                    ]
                  : null,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        if (isSelected)
                          Container(
                            margin: const EdgeInsets.only(right: 12),
                            padding: const EdgeInsets.all(4),
                            decoration: BoxDecoration(
                              color: isPro
                                  ? const Color(0xFFFFD700)
                                  : const Color(0xFF8B5CF6),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              Icons.check,
                              size: 16,
                              color: Colors.white,
                            ),
                          ),
                        Text(
                          isPro ? '🌟 Pro' : '💎 Premium',
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w900,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                    if (isYearly)
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [
                              Color(0xFF10b981),
                              Color(0xFF059669),
                            ],
                          ),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Text(
                          'SAVE 33%',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w900,
                            color: Colors.white,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      package.storeProduct.priceString,
                      style: const TextStyle(
                        fontSize: 32,
                        fontWeight: FontWeight.w900,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Padding(
                      padding: const EdgeInsets.only(bottom: 6),
                      child: Text(
                        isYearly ? '/year' : '/month',
                        style: TextStyle(
                          fontSize: 16,
                          color: Colors.white.withOpacity(0.7),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  package.storeProduct.description,
                  style: TextStyle(
                    fontSize: 13,
                    color: Colors.white.withOpacity(0.8),
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildLoadingPlans() {
    return Container(
      padding: const EdgeInsets.all(40),
      child: Column(
        children: const [
          CircularProgressIndicator(
            color: Color(0xFF8B5CF6),
          ),
          SizedBox(height: 16),
          Text(
            'Loading subscription plans...',
            style: TextStyle(
              color: Colors.white70,
              fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }
}
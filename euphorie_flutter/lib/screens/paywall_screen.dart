// lib/screens/paywall_screen.dart
import 'package:flutter/material.dart';
import 'package:purchases_flutter/purchases_flutter.dart';
import '../services/revenue_cat_service.dart';

class PaywallScreen extends StatefulWidget {
  const PaywallScreen({super.key});

  @override
  State<PaywallScreen> createState() => _PaywallScreenState();
}

class _PaywallScreenState extends State<PaywallScreen> {
  final RevenueCatService _revenueCat = RevenueCatService();
  Offerings? _offerings;
  bool _isLoading = true;
  bool _isPurchasing = false;
  Package? _selectedPackage;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadOfferings();
  }

  Future<void> _loadOfferings() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final offerings = await _revenueCat.getOfferings();
      setState(() {
        _offerings = offerings;
        _isLoading = false;

        // Pre-select yearly package (best value)
        if (offerings?.current?.availablePackages.isNotEmpty ?? false) {
          _selectedPackage = offerings!.current!.availablePackages.firstWhere(
            (pkg) => pkg.packageType == PackageType.annual,
            orElse: () => offerings.current!.availablePackages.first,
          );
        } else {
          _errorMessage = 'No subscription plans available';
        }
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage = 'Failed to load plans: $e';
      });
    }
  }

  Future<void> _purchasePackage(Package package) async {
    setState(() {
      _isPurchasing = true;
      _errorMessage = null;
    });

    try {
      final success = await _revenueCat.purchasePackage(package);
      setState(() => _isPurchasing = false);

      if (success && mounted) {
        Navigator.pop(context, true);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('🎉 Welcome to Euphorie Premium!'),
            backgroundColor: Color(0xFF10b981),
          ),
        );
      }
    } catch (e) {
      setState(() {
        _isPurchasing = false;
        _errorMessage = 'Purchase failed: $e';
      });
    }
  }

  Future<void> _restorePurchases() async {
    setState(() {
      _isPurchasing = true;
      _errorMessage = null;
    });

    try {
      final success = await _revenueCat.restorePurchases();
      setState(() => _isPurchasing = false);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(success 
              ? '✅ Purchases restored!' 
              : 'No purchases to restore'
            ),
            backgroundColor: success ? const Color(0xFF10b981) : const Color(0xFFef4444),
          ),
        );

        if (success) {
          Navigator.pop(context, true);
        }
      }
    } catch (e) {
      setState(() {
        _isPurchasing = false;
        _errorMessage = 'Restore failed: $e';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF6366f1), // Euphorie purple theme
      body: SafeArea(
        child: Stack(
          children: [
            // Main Content
            _isLoading
                ? const Center(
                    child: CircularProgressIndicator(color: Colors.white),
                  )
                : SingleChildScrollView(
                    child: Column(
                      children: [
                        _buildHeader(),
                        if (_errorMessage != null) _buildErrorMessage(),
                        _buildFeaturesList(),
                        _buildPricingCards(),
                        _buildContinueButton(),
                        _buildFooter(),
                        const SizedBox(height: 100),
                      ],
                    ),
                  ),

            // Close Button
            Positioned(
              top: 16,
              right: 16,
              child: IconButton(
                icon: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.close_rounded, color: Colors.white),
                ),
                onPressed: () => Navigator.pop(context, false),
              ),
            ),

            // Loading Overlay
            if (_isPurchasing)
              Container(
                color: Colors.black54,
                child: const Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      CircularProgressIndicator(color: Colors.white),
                      SizedBox(height: 16),
                      Text(
                        'Processing...',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(32, 48, 32, 32),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF8b5cf6), Color(0xFFa855f7)],
              ),
              borderRadius: BorderRadius.circular(24),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.3),
                  blurRadius: 24,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: const Icon(Icons.remove_red_eye_rounded, size: 56, color: Colors.white),
          ),
          const SizedBox(height: 32),
          const Text(
            'Unlock Premium Vision',
            style: TextStyle(
              fontSize: 36,
              fontWeight: FontWeight.w800,
              color: Colors.white,
              letterSpacing: -1,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 12),
          Text(
            'Experience unlimited AI-powered vision with advanced AR capabilities',
            style: TextStyle(
              fontSize: 17,
              color: Colors.white.withOpacity(0.85),
              fontWeight: FontWeight.w500,
              height: 1.5,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildErrorMessage() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFef4444).withOpacity(0.2),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: const Color(0xFFef4444).withOpacity(0.5),
        ),
      ),
      child: Column(
        children: [
          const Icon(Icons.warning_rounded, color: Colors.white, size: 32),
          const SizedBox(height: 8),
          Text(
            _errorMessage!,
            style: const TextStyle(color: Colors.white, fontSize: 13),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 12),
          TextButton(
            onPressed: _loadOfferings,
            child: const Text(
              'Retry',
              style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFeaturesList() {
    final features = [
      {
        'icon': Icons.all_inclusive_rounded,
        'title': 'Unlimited Vision Scans',
        'desc': 'No daily limits on AI vision'
      },
      {
        'icon': Icons.auto_awesome_rounded,
        'title': 'Advanced AI Analysis',
        'desc': 'Deeper insights and understanding'
      },
      {
        'icon': Icons.view_in_ar_rounded,
        'title': 'Premium AR Features',
        'desc': 'Exclusive augmented reality tools'
      },
      {
        'icon': Icons.speed_rounded,
        'title': 'Priority Processing',
        'desc': 'Faster response times'
      },
      {
        'icon': Icons.cloud_sync_rounded,
        'title': 'Cloud Sync',
        'desc': 'Access your data anywhere'
      },
      {
        'icon': Icons.support_agent_rounded,
        'title': 'Priority Support',
        'desc': 'Get help when you need it'
      },
    ];

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
      child: Column(
        children: features
            .map((feature) => _buildFeatureItem(
                  icon: feature['icon'] as IconData,
                  title: feature['title'] as String,
                  description: feature['desc'] as String,
                ))
            .toList(),
      ),
    );
  }

  Widget _buildFeatureItem({
    required IconData icon,
    required String title,
    required String description,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.15),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(icon, color: Colors.white, size: 26),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  description,
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.white.withOpacity(0.75),
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
          Icon(
            Icons.check_circle_rounded,
            color: const Color(0xFF10b981).withOpacity(0.8),
            size: 24,
          ),
        ],
      ),
    );
  }

  Widget _buildPricingCards() {
    if (_offerings?.current?.availablePackages.isEmpty ?? true) {
      return const SizedBox.shrink();
    }

    final packages = _offerings!.current!.availablePackages;

    return Padding(
      padding: const EdgeInsets.fromLTRB(32, 24, 32, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Choose Your Plan',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w700,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 16),
          ...packages.map((package) {
            final isYearly = package.packageType == PackageType.annual;
            final isSelected = _selectedPackage == package;

            return GestureDetector(
              onTap: () => setState(() => _selectedPackage = package),
              child: Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: isSelected ? Colors.white : Colors.white.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: isSelected
                        ? const Color(0xFF10b981)
                        : Colors.transparent,
                    width: 3,
                  ),
                  boxShadow: isSelected
                      ? [
                          BoxShadow(
                            color: const Color(0xFF10b981).withOpacity(0.3),
                            blurRadius: 20,
                            offset: const Offset(0, 8),
                          ),
                        ]
                      : [],
                ),
                child: Row(
                  children: [
                    Icon(
                      isSelected
                          ? Icons.check_circle_rounded
                          : Icons.radio_button_off_rounded,
                      color: isSelected ? const Color(0xFF10b981) : Colors.white,
                      size: 28,
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(
                                isYearly ? 'Yearly' : 'Monthly',
                                style: TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.w700,
                                  color: isSelected
                                      ? const Color(0xFF6366f1)
                                      : Colors.white,
                                ),
                              ),
                              if (isYearly) ...[
                                const SizedBox(width: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 10,
                                    vertical: 4,
                                  ),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF10b981),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: const Text(
                                    'SAVE 33%',
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w800,
                                      color: Colors.white,
                                    ),
                                  ),
                                ),
                              ],
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(
                            package.storeProduct.priceString,
                            style: TextStyle(
                              fontSize: 28,
                              fontWeight: FontWeight.w800,
                              color: isSelected
                                  ? const Color(0xFF6366f1)
                                  : Colors.white,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            );
          }).toList(),
        ],
      ),
    );
  }

  Widget _buildContinueButton() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 32),
      child: ElevatedButton(
        onPressed: _selectedPackage != null && !_isPurchasing
            ? () => _purchasePackage(_selectedPackage!)
            : null,
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF10b981),
          disabledBackgroundColor: Colors.white.withOpacity(0.2),
          padding: const EdgeInsets.symmetric(vertical: 18),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          elevation: 12,
          shadowColor: const Color(0xFF10b981).withOpacity(0.4),
        ),
        child: const Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              'Continue',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: Colors.white,
              ),
            ),
            SizedBox(width: 12),
            Icon(Icons.arrow_forward_rounded, color: Colors.white, size: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildFooter() {
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        children: [
          TextButton(
            onPressed: _isPurchasing ? null : _restorePurchases,
            child: Text(
              'Restore Purchases',
              style: TextStyle(
                color: Colors.white.withOpacity(0.8),
                decoration: TextDecoration.underline,
                fontSize: 15,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          const SizedBox(height: 20),
          Text(
            'Auto-renewing subscription. Cancel anytime.',
            style: TextStyle(
              fontSize: 13,
              color: Colors.white.withOpacity(0.6),
              fontWeight: FontWeight.w500,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}
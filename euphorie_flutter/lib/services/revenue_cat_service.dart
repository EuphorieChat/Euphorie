import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:purchases_flutter/purchases_flutter.dart';

class RevenueCatService extends ChangeNotifier {
  static final RevenueCatService _instance = RevenueCatService._internal();
  factory RevenueCatService() => _instance;
  RevenueCatService._internal();

  // Your RevenueCat API keys
  static const String _iosApiKey = 'appl_QGkIOsXyGDNnMpxenremWxVcJWD';
  static const String _androidApiKey = 'goog_oaPgPpweeTAgWszlkHGHYxBYWdx';

  // Entitlement IDs (must match RevenueCat dashboard)
  static const String premiumEntitlementId = 'premium_features';
  static const String proEntitlementId = 'pro_features';

  // Product IDs (must match App Store Connect & Play Console)
  static const String premiumMonthlyId = 'euphorie_premium_monthly';
  static const String premiumYearlyId = 'euphorie_premium_yearly';
  static const String proMonthlyId = 'euphorie_pro_monthly';
  static const String proYearlyId = 'euphorie_pro_yearly';

  CustomerInfo? _customerInfo;
  Offerings? _offerings;
  bool _isInitialized = false;
  bool _isPremium = false;
  bool _isPro = false;
  int _dailyAnalysisCount = 0;
  int _dailyLimit = 10;

  // Getters
  CustomerInfo? get customerInfo => _customerInfo;
  Offerings? get offerings => _offerings;
  bool get isInitialized => _isInitialized;
  bool get isPremium => _isPremium;
  bool get isPro => _isPro;
  bool get hasAnySubscription => _isPremium || _isPro;
  int get dailyAnalysisCount => _dailyAnalysisCount;
  int get dailyLimit => _dailyLimit;
  int get remainingAnalyses => _dailyLimit - _dailyAnalysisCount;
  
  SubscriptionTier get currentTier {
    if (_isPro) return SubscriptionTier.pro;
    if (_isPremium) return SubscriptionTier.premium;
    return SubscriptionTier.free;
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  Future<void> initialize() async {
    if (_isInitialized) {
      debugPrint('⚠️ RevenueCat already initialized');
      return;
    }

    try {
      debugPrint('🔐 Initializing RevenueCat...');

      // Configure SDK
      final configuration = PurchasesConfiguration(
        defaultTargetPlatform == TargetPlatform.iOS 
            ? _iosApiKey 
            : _androidApiKey,
      );

      await Purchases.configure(configuration);

      // Enable debug logs in debug mode
      if (kDebugMode) {
        await Purchases.setLogLevel(LogLevel.debug);
      }

      // Get customer info
      await refreshCustomerInfo();

      // Load offerings
      await loadOfferings();

      // Set up listener for purchase updates
      Purchases.addCustomerInfoUpdateListener(_onCustomerInfoUpdate);

      _isInitialized = true;
      debugPrint('✅ RevenueCat initialized successfully');
      
    } catch (e) {
      debugPrint('❌ RevenueCat initialization failed: $e');
      // Continue anyway - app should work without subscriptions
    }
  }

  // ============================================
  // CUSTOMER INFO
  // ============================================

  Future<void> refreshCustomerInfo() async {
    try {
      _customerInfo = await Purchases.getCustomerInfo();
      _updateEntitlements();
      notifyListeners();
    } catch (e) {
      debugPrint('❌ Error refreshing customer info: $e');
    }
  }

  void _onCustomerInfoUpdate(CustomerInfo customerInfo) {
    debugPrint('👤 Customer info updated');
    _customerInfo = customerInfo;
    _updateEntitlements();
    notifyListeners();
  }

  void _updateEntitlements() {
    if (_customerInfo == null) {
      _isPremium = false;
      _isPro = false;
      return;
    }

    // Check entitlements
    final entitlements = _customerInfo!.entitlements.all;
    
    _isPro = entitlements[proEntitlementId]?.isActive ?? false;
    _isPremium = entitlements[premiumEntitlementId]?.isActive ?? false;

    // Update daily limit based on tier
    if (_isPro || _isPremium) {
      _dailyLimit = 999999; // Effectively unlimited
    } else {
      _dailyLimit = 10;
    }

    debugPrint('💎 Premium: $_isPremium');
    debugPrint('🌟 Pro: $_isPro');
    debugPrint('📊 Daily limit: $_dailyLimit');
  }

  // ============================================
  // OFFERINGS
  // ============================================

  Future<void> loadOfferings() async {
    try {
      _offerings = await Purchases.getOfferings();
      
      if (_offerings?.current != null) {
        final current = _offerings!.current!;
        debugPrint('✅ Loaded offering: ${current.identifier}');
        debugPrint('   Packages: ${current.availablePackages.length}');
        
        for (var package in current.availablePackages) {
          debugPrint('   - ${package.identifier}: ${package.storeProduct.priceString}');
        }
      } else {
        debugPrint('⚠️ No current offering found');
      }
      
      notifyListeners();
    } catch (e) {
      debugPrint('❌ Error loading offerings: $e');
    }
  }

  // ============================================
  // PURCHASE
  // ============================================

  Future<bool> purchasePackage(Package package) async {
    try {
      debugPrint('💳 Starting purchase: ${package.identifier}');

      final purchaserInfo = await Purchases.purchasePackage(package);
      
      _customerInfo = purchaserInfo.customerInfo;
      _updateEntitlements();
      notifyListeners();

      debugPrint('✅ Purchase successful!');
      return true;

    } on PlatformException catch (e) {
      final errorCode = PurchasesErrorHelper.getErrorCode(e);
      
      if (errorCode == PurchasesErrorCode.purchaseCancelledError) {
        debugPrint('⚠️ Purchase cancelled by user');
      } else if (errorCode == PurchasesErrorCode.purchaseNotAllowedError) {
        debugPrint('❌ Purchase not allowed');
      } else {
        debugPrint('❌ Purchase error: ${e.message}');
      }
      
      return false;
    } catch (e) {
      debugPrint('❌ Purchase error: $e');
      return false;
    }
  }

  Future<bool> purchaseProduct(String productId) async {
    if (_offerings?.current == null) {
      debugPrint('❌ No offerings available');
      return false;
    }

    final package = _offerings!.current!.availablePackages.firstWhere(
      (pkg) => pkg.storeProduct.identifier == productId,
      orElse: () => throw Exception('Product not found: $productId'),
    );

    return purchasePackage(package);
  }

  // ============================================
  // RESTORE PURCHASES
  // ============================================

  Future<bool> restorePurchases() async {
    try {
      debugPrint('🔄 Restoring purchases...');

      final customerInfo = await Purchases.restorePurchases();
      
      _customerInfo = customerInfo;
      _updateEntitlements();
      notifyListeners();

      if (_isPremium || _isPro) {
        debugPrint('✅ Purchases restored successfully');
        return true;
      } else {
        debugPrint('⚠️ No active subscriptions found');
        return false;
      }

    } catch (e) {
      debugPrint('❌ Error restoring purchases: $e');
      return false;
    }
  }

  // ============================================
  // USAGE TRACKING
  // ============================================

  bool canAnalyze() {
    // Premium and Pro get unlimited
    if (_isPro || _isPremium) {
      return true;
    }

    // Free tier: check daily limit
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    
    // Reset counter if it's a new day
    // (In production, you'd store this in local storage)
    // For now, this is simplified
    
    return _dailyAnalysisCount < _dailyLimit;
  }

  void incrementAnalysisCount() {
    if (!_isPro && !_isPremium) {
      _dailyAnalysisCount++;
      notifyListeners();
      
      debugPrint('📊 Analysis count: $_dailyAnalysisCount/$_dailyLimit');
    }
  }

  void resetDailyCount() {
    _dailyAnalysisCount = 0;
    notifyListeners();
    debugPrint('🔄 Daily analysis count reset');
  }

  // ============================================
  // FEATURE ACCESS
  // ============================================

  bool canUse3DObjects() {
    return _isPremium || _isPro;
  }

  bool canUseMeasurements() {
    return _isPremium || _isPro;
  }

  bool canUseVoiceCommands() {
    return _isPremium || _isPro;
  }

  bool canExportHistory() {
    return _isPremium || _isPro;
  }

  bool canUseAPI() {
    return _isPro;
  }

  bool hasPriorityProcessing() {
    return _isPro;
  }

  bool canRemoveWatermarks() {
    return _isPremium || _isPro;
  }

  // ============================================
  // SUBSCRIPTION INFO
  // ============================================

  String? getSubscriptionExpirationDate() {
    if (_customerInfo == null) return null;

    EntitlementInfo? activeEntitlement;
    
    if (_isPro) {
      activeEntitlement = _customerInfo!.entitlements.all[proEntitlementId];
    } else if (_isPremium) {
      activeEntitlement = _customerInfo!.entitlements.all[premiumEntitlementId];
    }

    if (activeEntitlement?.expirationDate != null) {
      return activeEntitlement!.expirationDate!;
    }

    return null;
  }

  bool willRenew() {
    if (_customerInfo == null) return false;

    EntitlementInfo? activeEntitlement;
    
    if (_isPro) {
      activeEntitlement = _customerInfo!.entitlements.all[proEntitlementId];
    } else if (_isPremium) {
      activeEntitlement = _customerInfo!.entitlements.all[premiumEntitlementId];
    }

    return activeEntitlement?.willRenew ?? false;
  }

  String? getProductIdentifier() {
    if (_customerInfo == null) return null;

    EntitlementInfo? activeEntitlement;
    
    if (_isPro) {
      activeEntitlement = _customerInfo!.entitlements.all[proEntitlementId];
    } else if (_isPremium) {
      activeEntitlement = _customerInfo!.entitlements.all[premiumEntitlementId];
    }

    return activeEntitlement?.productIdentifier;
  }

  // ============================================
  // PROMOTIONAL OFFERS
  // ============================================

  Future<void> checkEligibilityForIntroOffer(String productId) async {
    try {
      final eligibility = await Purchases.checkTrialOrIntroductoryPriceEligibility([productId]);
      final status = eligibility[productId];
      
      debugPrint('🎁 Intro offer eligibility for $productId: ${status?.status}');
    } catch (e) {
      debugPrint('❌ Error checking intro offer: $e');
    }
  }

  // ============================================
  // ATTRIBUTION
  // ============================================

  Future<void> setAttributes(Map<String, String> attributes) async {
    try {
      await Purchases.setAttributes(attributes);
      debugPrint('✅ Attributes set');
    } catch (e) {
      debugPrint('❌ Error setting attributes: $e');
    }
  }

  Future<void> setUserId(String userId) async {
    try {
      await Purchases.logIn(userId);
      await refreshCustomerInfo();
      debugPrint('✅ User ID set: $userId');
    } catch (e) {
      debugPrint('❌ Error setting user ID: $e');
    }
  }

  Future<void> logout() async {
    try {
      await Purchases.logOut();
      _customerInfo = null;
      _isPremium = false;
      _isPro = false;
      notifyListeners();
      debugPrint('✅ RevenueCat user logged out');
    } catch (e) {
      debugPrint('❌ Error logging out: $e');
    }
  }
}

// ============================================
// SUBSCRIPTION TIER ENUM
// ============================================

enum SubscriptionTier {
  free,
  premium,
  pro,
}

extension SubscriptionTierExtension on SubscriptionTier {
  String get displayName {
    switch (this) {
      case SubscriptionTier.free:
        return 'Free';
      case SubscriptionTier.premium:
        return 'Premium';
      case SubscriptionTier.pro:
        return 'Pro';
    }
  }

  String get emoji {
    switch (this) {
      case SubscriptionTier.free:
        return '🆓';
      case SubscriptionTier.premium:
        return '💎';
      case SubscriptionTier.pro:
        return '🌟';
    }
  }
}
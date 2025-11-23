// lib/services/revenue_cat_service.dart
import 'dart:async';
import 'dart:io' show Platform;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:purchases_flutter/purchases_flutter.dart';

class RevenueCatService {
  static final RevenueCatService _instance = RevenueCatService._internal();
  factory RevenueCatService() => _instance;
  RevenueCatService._internal();

  // 🔑 YOUR TEST API KEY
  static const String _apiKey = 'test_lKLgTvZoLpZxhyoigixLvHsAuqL';

  // 📦 Product IDs (must match App Store Connect / Play Console)
  static const String premiumMonthly = 'euphorie_monthly';
  static const String premiumYearly = 'euphorie_yearly';

  // 🎁 Entitlement ID (configure in RevenueCat dashboard)
  static const String premiumEntitlement = 'euphorie_premium';

  bool _isInitialized = false;
  CustomerInfo? _customerInfo;
  StreamController<bool>? _subscriptionStatusController;

  Stream<bool> get subscriptionStatusStream {
    _subscriptionStatusController ??= StreamController.broadcast();
    return _subscriptionStatusController!.stream;
  }

  /// Initialize RevenueCat SDK
  Future<void> initialize({String? userId}) async {
    if (_isInitialized) return;

    try {
      final configuration = PurchasesConfiguration(_apiKey);
      
      if (userId != null) {
        configuration.appUserID = userId;
      }

      await Purchases.configure(configuration);
      await Purchases.setLogLevel(LogLevel.debug);

      Purchases.addCustomerInfoUpdateListener((customerInfo) {
        _customerInfo = customerInfo;
        _subscriptionStatusController?.add(isPremium());
      });

      _customerInfo = await Purchases.getCustomerInfo();
      _isInitialized = true;
      
      debugPrint('✅ RevenueCat initialized - User is ${isPremium() ? "PREMIUM" : "FREE"}');
    } catch (e) {
      debugPrint('❌ RevenueCat initialization error: $e');
      rethrow;
    }
  }

  /// Check if user has premium subscription
  bool isPremium() {
    if (_customerInfo == null) return false;
    final entitlements = _customerInfo!.entitlements.all;
    return entitlements[premiumEntitlement]?.isActive ?? false;
  }

  /// Get available offerings (subscription plans)
  Future<Offerings?> getOfferings() async {
    try {
      debugPrint('🔍 Fetching offerings from RevenueCat...');
      final offerings = await Purchases.getOfferings();
      
      if (offerings.current == null) {
        debugPrint('⚠️ No current offering found');
        return null;
      }

      debugPrint('📦 Found ${offerings.current!.availablePackages.length} packages');
      return offerings;
    } catch (e) {
      debugPrint('❌ Error fetching offerings: $e');
      return null;
    }
  }

  /// Purchase a package
  Future<bool> purchasePackage(Package package) async {
    try {
      debugPrint('💳 Attempting purchase: ${package.identifier}');
      final purchaseResult = await Purchases.purchasePackage(package);
      _customerInfo = purchaseResult.customerInfo;
      _subscriptionStatusController?.add(isPremium());
      
      final success = isPremium();
      debugPrint(success ? '✅ Purchase successful!' : '❌ Purchase failed');
      return success;
    } on PlatformException catch (e) {
      final errorCode = PurchasesErrorHelper.getErrorCode(e);
      if (errorCode == PurchasesErrorCode.purchaseCancelledError) {
        debugPrint('ℹ️ User cancelled purchase');
      } else {
        debugPrint('❌ Purchase error: $e');
      }
      return false;
    } catch (e) {
      debugPrint('❌ Unexpected purchase error: $e');
      return false;
    }
  }

  /// Restore purchases
  Future<bool> restorePurchases() async {
    try {
      debugPrint('🔄 Restoring purchases...');
      final customerInfo = await Purchases.restorePurchases();
      _customerInfo = customerInfo;
      _subscriptionStatusController?.add(isPremium());
      
      final success = isPremium();
      debugPrint(success ? '✅ Purchases restored!' : 'ℹ️ No purchases to restore');
      return success;
    } catch (e) {
      debugPrint('❌ Restore error: $e');
      return false;
    }
  }

  /// Get vision scan limit based on subscription
  int getVisionScanLimit() {
    return isPremium() ? -1 : 20; // -1 = unlimited
  }

  /// Check if feature is available
  bool isFeatureAvailable(String feature) {
    if (isPremium()) return true;

    // Free tier features
    const freeTierFeatures = [
      'basic_vision',
      'text_recognition',
      'basic_ar',
    ];
    return freeTierFeatures.contains(feature);
  }

  void dispose() {
    _subscriptionStatusController?.close();
  }
}
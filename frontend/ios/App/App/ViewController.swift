import UIKit
import Capacitor

@objc(ViewController)
class ViewController: CAPBridgeViewController {
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        print("🔴 ViewController loaded!")
        
        // Set background to black
        view.backgroundColor = .black
        
        // Remove any safe area if view is UIView
        if #available(iOS 11.0, *) {
            additionalSafeAreaInsets = UIEdgeInsets(top: 0, left: 0, bottom: 0, right: 0)
        }
        
        // Apply webView fixes
        applyWebViewFixes()
    }
    
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        print("🔴 viewDidAppear - reapplying fixes...")
        
        // Reapply fixes after view appears
        applyWebViewFixes()
    }
    
    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        
        // Force webView to fill entire view
        if let webView = self.webView {
            webView.frame = view.bounds
            print("🔴 WebView frame set to: \(webView.frame)")
            print("🔴 View bounds: \(view.bounds)")
        }
    }
    
    private func applyWebViewFixes() {
        guard let webView = self.webView else {
            print("🔴 ERROR: WebView is nil!")
            return
        }
        
        print("🔴 Applying WebView fixes...")
        
        // Disable automatic content inset adjustment - KEY FIX
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        
        // Set webView styling
        webView.isOpaque = false
        webView.backgroundColor = .black
        
        // Remove all insets and margins
        webView.scrollView.contentInset = .zero
        webView.scrollView.scrollIndicatorInsets = .zero
        
        // Disable bouncing
        webView.scrollView.bounces = false
        webView.scrollView.alwaysBounceVertical = false
        webView.scrollView.alwaysBounceHorizontal = false
        
        // Force webView to fill the entire view
        webView.frame = view.bounds
        webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        
        // Log the frame for debugging
        print("🔴 WebView frame: \(webView.frame)")
        print("🔴 WebView contentInset: \(webView.scrollView.contentInset)")
        print("🔴 View bounds: \(view.bounds)")
        print("🔴 View safeAreaInsets: \(view.safeAreaInsets)")
    }
    
    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .lightContent
    }
    
    override var prefersStatusBarHidden: Bool {
        return false
    }
}

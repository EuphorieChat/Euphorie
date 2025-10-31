import UIKit
import Capacitor

class ViewController: CAPBridgeViewController {
    override func viewDidLoad() {
        super.viewDidLoad()
        
        // Set background to black
        view.backgroundColor = .black
        
        // THIS IS THE KEY FIX - Prevents iOS from automatically adding padding/borders
        if let webView = self.webView {
            // Disable automatic content inset adjustment
            webView.scrollView.contentInsetAdjustmentBehavior = .never
            
            // Set webView to be transparent with black background
            webView.isOpaque = false
            webView.backgroundColor = .black
            
            // Remove any default margins and insets
            webView.scrollView.contentInset = .zero
            webView.scrollView.scrollIndicatorInsets = .zero
            
            // Ensure scrollView doesn't bounce
            webView.scrollView.bounces = false
            webView.scrollView.alwaysBounceVertical = false
            webView.scrollView.alwaysBounceHorizontal = false
        }
    }
    
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        
        // Double-check webView settings after it appears
        if let webView = self.webView {
            webView.scrollView.contentInsetAdjustmentBehavior = .never
        }
    }
    
    // Use light content status bar (white text)
    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .lightContent
    }
    
    // Don't hide the status bar
    override var prefersStatusBarHidden: Bool {
        return false
    }
    
    // Update status bar when app state changes
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        setNeedsStatusBarAppearanceUpdate()
    }
}
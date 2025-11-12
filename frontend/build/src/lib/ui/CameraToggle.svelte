<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  export let enabled = false;
  
  const dispatch = createEventDispatcher();
  
  let showPrivacyModal = false;
  let isFirstTime = !localStorage.getItem('euphorie-camera-explained');

  function handleToggle() {
    if (!enabled && isFirstTime) {
      // Show privacy explanation for first-time users
      showPrivacyModal = true;
      return;
    }
    
    // Direct toggle for users who've seen the explanation
    dispatch('toggle');
  }

  function confirmEnableCamera() {
    // Mark that user has seen the explanation
    localStorage.setItem('euphorie-camera-explained', 'true');
    isFirstTime = false;
    showPrivacyModal = false;
    
    // Enable camera
    dispatch('toggle');
  }

  function cancelCameraEnable() {
    showPrivacyModal = false;
  }
</script>

<!-- Camera Toggle Button -->
<button 
  class="camera-toggle"
  class:enabled
  on:click={handleToggle}
  title={enabled ? 'Disable AI Vision' : 'Enable AI Vision'}
>
  <div class="icon">
    {#if enabled}
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
        <circle cx="12" cy="13" r="4"/>
        <circle cx="18" cy="8" r="1" fill="currentColor"/>
      </svg>
    {:else}
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
        <circle cx="12" cy="13" r="4"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
      </svg>
    {/if}
  </div>
  
  <span class="label">
    {enabled ? 'AI Vision ON' : 'Enable AI Vision'}
  </span>
  
  {#if enabled}
    <div class="status-indicator"></div>
  {/if}
</button>

<!-- Privacy Modal -->
{#if showPrivacyModal}
  <div class="modal-overlay" on:click={cancelCameraEnable}>
    <div class="modal-content" on:click|stopPropagation>
      <div class="modal-header">
        <h2>🤖 Enable AI Vision</h2>
        <button class="close-btn" on:click={cancelCameraEnable}>×</button>
      </div>
      
      <div class="modal-body">
        <div class="feature-explanation">
          <h3>What happens when you enable AI Vision?</h3>
          <ul class="benefit-list">
            <li>
              <span class="icon">👁️</span>
              <div>
                <strong>AI agents can see your camera</strong>
                <p>Just like ChatGPT analyzing a PDF, our AI can analyze what you're looking at</p>
              </div>
            </li>
            <li>
              <span class="icon">💡</span>
              <div>
                <strong>Proactive assistance</strong>
                <p>Get help with code, cooking, learning - based on what's actually in front of you</p>
              </div>
            </li>
            <li>
              <span class="icon">🎯</span>
              <div>
                <strong>Contextual conversations</strong>
                <p>AI understands your environment and can reference what you're working on</p>
              </div>
            </li>
          </ul>
        </div>

        <div class="privacy-section">
          <h3>🔒 Your Privacy</h3>
          <ul class="privacy-list">
            <li>✅ Camera feed is processed in real-time, not stored</li>
            <li>✅ You can disable this anytime with one click</li>
            <li>✅ Other users cannot see your camera unless you explicitly share</li>
            <li>✅ AI only analyzes what's relevant to helping you</li>
            <li>✅ No facial recognition or personal identification</li>
          </ul>
        </div>

        <div class="example-section">
          <h3>💡 Example Scenarios</h3>
          <div class="examples">
            <div class="example">
              <strong>Coding:</strong> "I see you have a syntax error on line 23. Want help fixing it?"
            </div>
            <div class="example">
              <strong>Learning:</strong> "You're studying calculus! Need help with that derivative problem?"
            </div>
            <div class="example">
              <strong>Cooking:</strong> "Those ingredients would make great pad thai. Want the recipe?"
            </div>
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="cancel-btn" on:click={cancelCameraEnable}>
          Maybe Later
        </button>
        <button class="confirm-btn" on:click={confirmEnableCamera}>
          Enable AI Vision
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .camera-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.3);
    color: white;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
    transition: all 0.3s ease;
    position: relative;
  }

  .camera-toggle:hover {
    border-color: rgba(0, 255, 136, 0.5);
    background: rgba(0, 255, 136, 0.1);
    transform: translateY(-1px);
  }

  .camera-toggle.enabled {
    border-color: #00ff88;
    background: rgba(0, 255, 136, 0.2);
    box-shadow: 0 0 20px rgba(0, 255, 136, 0.3);
  }

  .camera-toggle.enabled:hover {
    border-color: #ff4444;
    background: rgba(255, 68, 68, 0.2);
    box-shadow: 0 0 20px rgba(255, 68, 68, 0.3);
  }

  .icon {
    display: flex;
    align-items: center;
    color: inherit;
  }

  .label {
    font-size: 0.85rem;
    white-space: nowrap;
  }

  .status-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #00ff88;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  /* Modal Styles */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal-content {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    border: 1px solid rgba(0, 255, 136, 0.3);
    border-radius: 16px;
    width: 90%;
    max-width: 600px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .modal-header h2 {
    color: white;
    margin: 0;
    font-size: 1.4rem;
  }

  .close-btn {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.6);
    font-size: 2rem;
    cursor: pointer;
    padding: 0;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .close-btn:hover {
    color: white;
  }

  .modal-body {
    padding: 1.5rem;
    color: white;
  }

  .feature-explanation h3,
  .privacy-section h3,
  .example-section h3 {
    color: #00ff88;
    margin: 0 0 1rem 0;
    font-size: 1.1rem;
  }

  .benefit-list,
  .privacy-list {
    list-style: none;
    padding: 0;
    margin: 0 0 2rem 0;
  }

  .benefit-list li {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .benefit-list .icon {
    font-size: 1.2rem;
    margin-top: 0.2rem;
  }

  .benefit-list strong {
    color: #00ff88;
    display: block;
    margin-bottom: 0.25rem;
  }

  .benefit-list p {
    margin: 0;
    opacity: 0.8;
    font-size: 0.9rem;
  }

  .privacy-list li {
    margin-bottom: 0.5rem;
    opacity: 0.9;
    font-size: 0.9rem;
  }

  .examples {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .example {
    background: rgba(0, 255, 136, 0.1);
    border: 1px solid rgba(0, 255, 136, 0.2);
    border-radius: 8px;
    padding: 1rem;
    font-size: 0.9rem;
  }

  .example strong {
    color: #00ff88;
  }

  .modal-footer {
    display: flex;
    gap: 1rem;
    padding: 1.5rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    justify-content: flex-end;
  }

  .cancel-btn,
  .confirm-btn {
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .cancel-btn {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: white;
  }

  .cancel-btn:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .confirm-btn {
    background: linear-gradient(135deg, #00ff88, #00cc6a);
    border: none;
    color: black;
    font-weight: 600;
  }

  .confirm-btn:hover {
    background: linear-gradient(135deg, #00cc6a, #00aa55);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 255, 136, 0.3);
  }

  /* Mobile responsive */
  @media (max-width: 768px) {
    .camera-toggle .label {
      display: none; /* Show only icon on mobile */
    }

    .modal-content {
      width: 95%;
      margin: 1rem;
    }

    .modal-footer {
      flex-direction: column;
    }

    .cancel-btn,
    .confirm-btn {
      width: 100%;
    }
  }
</style>
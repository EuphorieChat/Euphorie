<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { EuphorieEngine } from '$lib/babylon/engine.js';
  import { SceneManager } from '$lib/babylon/scene-manager.js';
  import { WebSocketManager } from '$lib/networking/websocket.js';
  import Chat from '$lib/ui/Chat.svelte';
  import UserList from '$lib/ui/UserList.svelte';
  import CameraToggle from '$lib/ui/CameraToggle.svelte';
  import { userStore } from '$lib/stores/user.js';
  import { roomStore } from '$lib/stores/room.js';
  import { agentsStore } from '$lib/stores/agents.js';
  import type { User, Room } from '$lib/types/room.js';

  // Get room ID from URL
  $: roomId = $page.params.id;

  // 3D engine and scene
  let canvas: HTMLCanvasElement;
  let engine: EuphorieEngine | null = null;
  let sceneManager: SceneManager | null = null;
  let wsManager: WebSocketManager | null = null;

  // UI state
  let isLoading = true;
  let error: string | null = null;
  let showChat = true;
  let showUserList = true;
  let cameraEnabled = false;

  // Chat and user state
  let messages: Array<{ user: string; text: string; timestamp: Date; isAgent?: boolean }> = [];
  let connectedUsers: User[] = [];
  let currentUser: User | null = null;

  onMount(async () => {
    try {
      // Initialize 3D engine
      engine = new EuphorieEngine(canvas);
      await engine.initialize();
      
      // Setup scene manager for room-specific content
      sceneManager = new SceneManager(engine.getScene());
      await sceneManager.loadRoom(roomId);

      // Connect to WebSocket server
      wsManager = new WebSocketManager();
      await wsManager.connect();
      
      // Join the room
      await wsManager.joinRoom(roomId, $userStore);
      
      // Set up event listeners
      setupEventListeners();
      
      isLoading = false;
      console.log(`🎊 Connected to Euphorie room: ${roomId}`);
      
    } catch (err) {
      console.error('Failed to initialize room:', err);
      error = 'Failed to connect to room. Please try again.';
      isLoading = false;
    }
  });

  onDestroy(() => {
    // Cleanup resources
    if (wsManager) {
      wsManager.disconnect();
    }
    if (engine) {
      engine.dispose();
    }
  });

  function setupEventListeners(): void {
    if (!wsManager || !sceneManager) return;

    // Handle incoming messages
    wsManager.onMessage((message) => {
      messages = [...messages, {
        user: message.user,
        text: message.text,
        timestamp: new Date(message.timestamp),
        isAgent: message.isAgent || false
      }];
    });

    // Handle user join/leave
    wsManager.onUserJoined((user) => {
      connectedUsers = [...connectedUsers, user];
      sceneManager?.addUserAvatar(user);
    });

    wsManager.onUserLeft((userId) => {
      connectedUsers = connectedUsers.filter(u => u.id !== userId);
      sceneManager?.removeUserAvatar(userId);
    });

    // Handle user movement
    wsManager.onUserMoved((userId, position, rotation) => {
      sceneManager?.updateUserAvatar(userId, position, rotation);
    });

    // Handle AI agent responses
    wsManager.onAgentMessage((agentMessage) => {
      messages = [...messages, {
        user: agentMessage.agentName,
        text: agentMessage.text,
        timestamp: new Date(),
        isAgent: true
      }];
      
      // Show agent in 3D space
      sceneManager?.showAgentResponse(agentMessage);
    });

    // Send camera position updates to other users
    if (engine) {
      setInterval(() => {
        const cameraData = engine.getCameraData();
        wsManager?.sendMovement(cameraData.position, cameraData.rotation);
      }, 100); // 10 FPS position updates
    }
  }

  // Chat functions
  function sendMessage(event: CustomEvent<string>) {
    const text = event.detail;
    if (wsManager && text.trim()) {
      wsManager.sendMessage(text);
      
      // Add to local messages immediately for responsiveness
      messages = [...messages, {
        user: $userStore.name,
        text,
        timestamp: new Date()
      }];
    }
  }

  // Camera toggle
  function toggleCamera() {
    cameraEnabled = !cameraEnabled;
    
    if (cameraEnabled) {
      // Start camera stream to AI service
      startCameraStream();
    } else {
      // Stop camera stream
      stopCameraStream();
    }
  }

  async function startCameraStream() {
    try {
      // This will be implemented in camera capture module
      console.log('🎥 Starting camera stream for AI analysis...');
      // TODO: Initialize camera capture and AI vision pipeline
    } catch (err) {
      console.error('Failed to start camera:', err);
      cameraEnabled = false;
    }
  }

  function stopCameraStream() {
    console.log('🎥 Stopping camera stream...');
    // TODO: Stop camera capture
  }

  // Keyboard shortcuts
  function handleKeydown(event: KeyboardEvent) {
    switch (event.key) {
      case 'Enter':
        if (!event.shiftKey) {
          // Focus chat input
          const chatInput = document.querySelector('#chat-input') as HTMLInputElement;
          chatInput?.focus();
        }
        break;
      case 'Escape':
        // Toggle UI visibility
        showChat = !showChat;
        break;
      case 'Tab':
        event.preventDefault();
        showUserList = !showUserList;
        break;
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="room-container">
  <!-- 3D Canvas (full screen) -->
  <canvas 
    bind:this={canvas} 
    class="babylon-canvas"
    class:cursor-none={cameraEnabled}
  />

  <!-- Loading Screen -->
  {#if isLoading}
    <div class="loading-overlay">
      <div class="loading-content">
        <div class="spinner"></div>
        <h2>Entering Euphorie...</h2>
        <p>Initializing 3D space and connecting to room {roomId}</p>
      </div>
    </div>
  {/if}

  <!-- Error Screen -->
  {#if error}
    <div class="error-overlay">
      <div class="error-content">
        <h2>Connection Failed</h2>
        <p>{error}</p>
        <button on:click={() => window.location.reload()}>
          Try Again
        </button>
      </div>
    </div>
  {/if}

  <!-- UI Overlays (only show when not loading) -->
  {#if !isLoading && !error}
    
    <!-- Top Bar -->
    <header class="top-bar">
      <div class="room-info">
        <h1>Room: {roomId}</h1>
        <span class="user-count">{connectedUsers.length} online</span>
      </div>
      
      <div class="top-controls">
        <!-- Camera Toggle - The key feature! -->
        <CameraToggle 
          enabled={cameraEnabled} 
          on:toggle={toggleCamera}
        />
        
        <button 
          class="ui-toggle"
          on:click={() => showChat = !showChat}
        >
          {showChat ? 'Hide' : 'Show'} Chat
        </button>
      </div>
    </header>

    <!-- Chat Panel (right side) -->
    {#if showChat}
      <aside class="chat-panel">
        <Chat 
          {messages}
          currentUser={$userStore}
          on:sendMessage={sendMessage}
        />
      </aside>
    {/if}

    <!-- User List (left side) -->
    {#if showUserList}
      <aside class="user-panel">
        <UserList 
          users={connectedUsers}
          agents={$agentsStore}
        />
      </aside>
    {/if}

    <!-- Camera Overlay (when enabled) -->
    {#if cameraEnabled}
      <div class="camera-overlay">
        <div class="ai-insights">
          <p>🤖 AI Vision Active</p>
          <small>Jarvis is watching and ready to help</small>
        </div>
      </div>
    {/if}

    <!-- Help Overlay -->
    <div class="help-overlay">
      <p><kbd>Enter</kbd> Chat • <kbd>Esc</kbd> Toggle UI • <kbd>Tab</kbd> Users • <kbd>WASD</kbd> Move</p>
    </div>

  {/if}
</div>

<style>
  .room-container {
    position: relative;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    background: #000;
  }

  .babylon-canvas {
    width: 100%;
    height: 100%;
    display: block;
    outline: none;
    cursor: grab;
  }

  .babylon-canvas:active {
    cursor: grabbing;
  }

  .loading-overlay, .error-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .loading-content, .error-content {
    text-align: center;
    color: white;
    max-width: 400px;
    padding: 2rem;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(255, 255, 255, 0.1);
    border-top: 3px solid #00ff88;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 1rem;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .top-bar {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 60px;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 1rem;
    z-index: 100;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .room-info h1 {
    color: white;
    font-size: 1.2rem;
    margin: 0;
  }

  .user-count {
    color: #00ff88;
    font-size: 0.9rem;
  }

  .top-controls {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .ui-toggle {
    background: rgba(255, 255, 255, 0.1);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.2);
    padding: 0.5rem 1rem;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s ease;
  }

  .ui-toggle:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .chat-panel {
    position: absolute;
    top: 60px;
    right: 0;
    width: 350px;
    height: calc(100vh - 60px);
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(20px);
    border-left: 1px solid rgba(255, 255, 255, 0.1);
    z-index: 90;
  }

  .user-panel {
    position: absolute;
    top: 60px;
    left: 0;
    width: 250px;
    height: calc(100vh - 60px);
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(20px);
    border-right: 1px solid rgba(255, 255, 255, 0.1);
    z-index: 90;
  }

  .camera-overlay {
    position: absolute;
    top: 70px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 255, 136, 0.1);
    border: 1px solid rgba(0, 255, 136, 0.3);
    border-radius: 8px;
    padding: 0.75rem 1.5rem;
    color: white;
    z-index: 80;
  }

  .ai-insights p {
    margin: 0;
    font-weight: 500;
  }

  .ai-insights small {
    opacity: 0.7;
  }

  .help-overlay {
    position: absolute;
    bottom: 1rem;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.6);
    color: rgba(255, 255, 255, 0.8);
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-size: 0.8rem;
    z-index: 80;
  }

  .help-overlay kbd {
    background: rgba(255, 255, 255, 0.1);
    padding: 2px 6px;
    border-radius: 3px;
    font-family: monospace;
    font-size: 0.75rem;
  }

  /* Mobile responsive */
  @media (max-width: 768px) {
    .chat-panel {
      width: 100%;
      height: 40%;
      top: auto;
      bottom: 0;
      border-left: none;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .user-panel {
      width: 100%;
      height: 200px;
      top: 60px;
      border-right: none;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .help-overlay {
      display: none; /* Hide keyboard shortcuts on mobile */
    }
  }
</style>
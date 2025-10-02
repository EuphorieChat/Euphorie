import type { User, Message, AgentMessage } from '$lib/types/room.js';
import { Vector3 } from '@babylonjs/core';

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
}

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnected = false;
  private currentRoomId: string | null = null;
  private heartbeatInterval: number | null = null;

  // Event callbacks
  private onMessageCallback: ((message: Message) => void) | null = null;
  private onUserJoinedCallback: ((user: User) => void) | null = null;
  private onUserLeftCallback: ((userId: string) => void) | null = null;
  private onUserMovedCallback: ((userId: string, position: Vector3, rotation: Vector3) => void) | null = null;
  private onAgentMessageCallback: ((message: AgentMessage) => void) | null = null;
  private onConnectionStatusCallback: ((connected: boolean) => void) | null = null;

  constructor() {
    // Auto-reconnect on page visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && !this.isConnected) {
        this.reconnect();
      }
    });
  }

  async connect(url?: string): Promise<void> {
    const wsUrl = url || this.getWebSocketUrl();
    
    try {
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('🔗 Connected to Euphorie server');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.onConnectionStatusCallback?.(true);
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(JSON.parse(event.data));
      };

      this.ws.onclose = () => {
        console.log('🔌 Disconnected from Euphorie server');
        this.isConnected = false;
        this.stopHeartbeat();
        this.onConnectionStatusCallback?.(false);
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
      };

      // Wait for connection to open
      await this.waitForConnection();
      
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      throw new Error('Unable to connect to Euphorie servers');
    }
  }

  private getWebSocketUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = import.meta.env.VITE_WS_HOST || window.location.host;
    return `${protocol}//${host}/ws`;
  }

  private waitForConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 5000);

      if (this.ws?.readyState === WebSocket.OPEN) {
        clearTimeout(timeout);
        resolve();
        return;
      }

      this.ws!.addEventListener('open', () => {
        clearTimeout(timeout);
        resolve();
      });

      this.ws!.addEventListener('error', () => {
        clearTimeout(timeout);
        reject(new Error('WebSocket connection failed'));
      });
    });
  }

  private handleMessage(wsMessage: WebSocketMessage): void {
    const { type, data } = wsMessage;

    switch (type) {
      case 'chat_message':
        this.onMessageCallback?.(data as Message);
        break;
        
      case 'user_joined':
        this.onUserJoinedCallback?.(data as User);
        break;
        
      case 'user_left':
        this.onUserLeftCallback?.(data.userId);
        break;
        
      case 'user_moved':
        const { userId, position, rotation } = data;
        this.onUserMovedCallback?.(
          userId,
          new Vector3(position.x, position.y, position.z),
          new Vector3(rotation.x, rotation.y, rotation.z)
        );
        break;
        
      case 'agent_message':
        this.onAgentMessageCallback?.(data as AgentMessage);
        break;
        
      case 'pong':
        // Heartbeat response - connection is alive
        break;
        
      default:
        console.warn('Unknown message type:', type);
    }
  }

  // Public API methods
  async joinRoom(roomId: string, user: User): Promise<void> {
    this.currentRoomId = roomId;
    this.send({
      type: 'join_room',
      data: { roomId, user }
    });
  }

  sendMessage(text: string): void {
    this.send({
      type: 'chat_message',
      data: { text }
    });
  }

  sendMovement(position: Vector3, rotation: Vector3): void {
    this.send({
      type: 'user_movement',
      data: {
        position: { x: position.x, y: position.y, z: position.z },
        rotation: { x: rotation.x, y: rotation.y, z: rotation.z }
      }
    });
  }

  // Send message to AI agent
  sendAgentMessage(message: string, agentId?: string): void {
    this.send({
      type: 'agent_chat',
      data: { message, agentId }
    });
  }

  // Camera frame for AI analysis (when enabled)
  sendCameraFrame(frameData: string): void {
    this.send({
      type: 'camera_frame',
      data: { frame: frameData }
    });
  }

  private send(message: Omit<WebSocketMessage, 'timestamp'>): void {
    if (!this.isConnected || !this.ws) {
      console.warn('WebSocket not connected, message queued');
      return;
    }

    const wsMessage: WebSocketMessage = {
      ...message,
      timestamp: Date.now()
    };

    this.ws.send(JSON.stringify(wsMessage));
  }

  // Event listeners
  onMessage(callback: (message: Message) => void): void {
    this.onMessageCallback = callback;
  }

  onUserJoined(callback: (user: User) => void): void {
    this.onUserJoinedCallback = callback;
  }

  onUserLeft(callback: (userId: string) => void): void {
    this.onUserLeftCallback = callback;
  }

  onUserMoved(callback: (userId: string, position: Vector3, rotation: Vector3) => void): void {
    this.onUserMovedCallback = callback;
  }

  onAgentMessage(callback: (message: AgentMessage) => void): void {
    this.onAgentMessageCallback = callback;
  }

  onConnectionStatus(callback: (connected: boolean) => void): void {
    this.onConnectionStatusCallback = callback;
  }

  // Connection management
  private startHeartbeat(): void {
    this.heartbeatInterval = window.setInterval(() => {
      this.send({ type: 'ping', data: {} });
    }, 30000); // Ping every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`🔄 Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      this.reconnect();
    }, delay);
  }

  private async reconnect(): Promise<void> {
    try {
      await this.connect();
      if (this.currentRoomId) {
        // Rejoin the current room
        this.send({
          type: 'rejoin_room',
          data: { roomId: this.currentRoomId }
        });
      }
    } catch (error) {
      console.error('Reconnection failed:', error);
    }
  }

  disconnect(): void {
    this.isConnected = false;
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  // Utility methods
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  getCurrentRoom(): string | null {
    return this.currentRoomId;
  }
}
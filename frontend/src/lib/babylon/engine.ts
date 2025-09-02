import {
  Engine,
  Scene,
  UniversalCamera,
  HemisphericLight,
  Vector3,
  Color3,
  FreeCamera,
  ArcRotateCamera,
  DirectionalLight,
  StandardMaterial,
  Texture,
  PBRMaterial
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';

export class EuphorieEngine {
  private canvas: HTMLCanvasElement;
  private engine: Engine;
  private scene: Scene;
  private camera: UniversalCamera;
  private isInitialized: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.engine = new Engine(canvas, true, {
      adaptToDeviceRatio: true,
      antialias: true,
      powerPreference: "high-performance"
    });
    
    this.scene = new Scene(this.engine);
    this.setupBasicScene();
    this.setupCamera();
    this.setupLighting();
    this.setupRenderLoop();
  }

  private setupBasicScene(): void {
    // Set background color (dark space theme)
    this.scene.clearColor = new Color3(0.1, 0.1, 0.15);
    
    // Enable physics (for future interactions)
    this.scene.enablePhysics(new Vector3(0, -9.81, 0));
    
    // Optimize for performance
    this.scene.freezeActiveMeshes();
  }

  private setupCamera(): void {
    // First-person style camera
    this.camera = new UniversalCamera(
      "userCamera", 
      new Vector3(0, 1.8, -5), // Eye level height
      this.scene
    );
    
    // Attach camera controls to canvas
    this.camera.attachToCanvas(this.canvas, true);
    
    // Configure movement
    this.camera.setTarget(Vector3.Zero());
    this.camera.speed = 0.5;
    this.camera.angularSensibility = 2000;
    
    // Set movement boundaries (prevent users from flying away)
    this.camera.upperBetaLimit = Math.PI / 2.2; // Prevent looking too far up
    this.camera.lowerBetaLimit = -Math.PI / 2.2; // Prevent looking too far down
  }

  private setupLighting(): void {
    // Ambient lighting
    const hemisphericLight = new HemisphericLight(
      "hemiLight",
      new Vector3(0, 1, 0),
      this.scene
    );
    hemisphericLight.intensity = 0.4;
    hemisphericLight.diffuse = new Color3(1, 1, 0.9); // Warm white

    // Directional lighting (like sunlight)
    const directionalLight = new DirectionalLight(
      "dirLight",
      new Vector3(-1, -1, -0.5),
      this.scene
    );
    directionalLight.intensity = 0.8;
    directionalLight.diffuse = new Color3(1, 0.95, 0.8); // Slightly warm
  }

  private setupRenderLoop(): void {
    // Render loop with performance monitoring
    this.engine.runRenderLoop(() => {
      if (this.scene && this.scene.activeCamera) {
        this.scene.render();
      }
    });

    // Handle window resize
    window.addEventListener('resize', () => {
      this.engine.resize();
    });
  }

  // Public methods for scene management
  public getScene(): Scene {
    return this.scene;
  }

  public getCamera(): UniversalCamera {
    return this.camera;
  }

  public getEngine(): Engine {
    return this.engine;
  }

  // Enable/disable camera controls (useful when typing in chat)
  public setCameraControlsEnabled(enabled: boolean): void {
    if (enabled) {
      this.camera.attachToCanvas(this.canvas, true);
    } else {
      this.camera.detachControls();
    }
  }

  // Update camera position (for multiplayer sync)
  public updateCameraPosition(position: Vector3, rotation: Vector3): void {
    this.camera.position = position;
    this.camera.rotation = rotation;
  }

  // Get camera data for sending to other users
  public getCameraData(): { position: Vector3; rotation: Vector3 } {
    return {
      position: this.camera.position.clone(),
      rotation: this.camera.rotation.clone()
    };
  }

  // Performance optimization
  public optimizeForMobile(): void {
    // Reduce rendering quality on mobile devices
    if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
      this.engine.setHardwareScalingLevel(0.8);
      this.scene.skipPointerMovePicking = true;
    }
  }

  // Cleanup
  public dispose(): void {
    this.scene.dispose();
    this.engine.dispose();
  }

  // Initialize after DOM is ready
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    // Wait for engine to be ready
    await this.scene.whenReadyAsync();
    
    // Optimize based on device
    this.optimizeForMobile();
    
    this.isInitialized = true;
    console.log('🎮 Euphorie 3D engine initialized');
  }
}
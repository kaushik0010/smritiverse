import {
  AssetManifest,
  AssetType,
  SessionMode,
  World,
  Mesh,
  MeshBasicMaterial,
  AssetManager,
  AmbientLight,
  DirectionalLight,
  Box3,
  Vector3,
  Plane,
  DoubleSide,
  PlaneGeometry,
} from "@iwsdk/core";

import { PortalSystem } from "./portal-system";
import { HotspotSystem } from "./hotspot-system";
import { MemoryUISystem } from "./memory-ui-system";
import { ElevatorSystem, ElevatorTarget } from "./elevator-system";
import { TravelUISystem } from "./travel-ui-system";
import { MovementSystem } from "./movement-system";

// --- Configuration ---

interface DestinationConfig {
  id: string;
  name: string;
  description?: string;
  assetId: string;
  audioUrl: string;
  scale: number;
  offset: { x: number; y: number; z: number };
  rotationY: number; 
  lightIntensity: number;
  skyColor: number;
  hotspots: { x: number; y: number; z: number; title: string; story: string }[];
}

const destinations: DestinationConfig[] = [
  {
    id: "shrine",
    name: "Kyoto Shrine",
    description: "A peaceful path of 1000 gates.",
    assetId: "shrine",
    audioUrl: "/audio/shrine.mp3",
    scale: 1.0,
    offset: { x: 0, y: -1.6, z: -2.5 }, 
    rotationY: 0,
    lightIntensity: 0.4,
    skyColor: 0x87CEEB,
    hotspots: [
      { 
        x: 17.5, y: 2.8, z: -6.2, 
        title: "The Guardian", 
        story: "My sister loved this fox statue. She said it watches over travelers." 
      }
    ]
  },
  {
    id: "temple",
    name: "Chinese Temple",
    description: "Ancient stone lions watch over this sacred ground.",
    assetId: "temple", 
    audioUrl: "/audio/crickets.mp3",
    scale: 0.02,
    offset: { x: 0, y: -8.2, z: 5.0 }, 
    rotationY: 0,
    lightIntensity: 1.2, 
    skyColor: 0x050510,
    hotspots: [
      { 
        x: 4.5, y: 1.5, z: -12.0, 
        title: "The Stone Lion", 
        story: "Legend says these lions come alive at night to protect the temple." 
      }
    ]
  },
];

const assets: AssetManifest = {
  shrine: {
    url: "/gltf/shrine-optimized.glb",
    type: AssetType.GLTF,
    priority: "critical",
  },
  temple: {
    url: "/gltf/temple-optimized.glb",
    type: AssetType.GLTF,
    priority: "critical",
  },
  portalFrame: {
    url: "/gltf/stone_gate.glb",
    type: AssetType.GLTF,
    priority: "critical",
  },
};

export function startExperience() {

  World.create(document.getElementById("scene-container") as HTMLDivElement, {
    assets,
    xr: {
      sessionMode: SessionMode.ImmersiveAR,
      offer: "always",
      features: {
        handTracking: { required: true },
        anchors: { required: true },
        hitTest: { required: true },
        planeDetection: { required: true },
        meshDetection: false,
        layers: true,
      },
    },
    features: {
      locomotion: true,
      grabbing: true,
      physics: false,
      sceneUnderstanding: true,
    },
  }).then((world) => {
    
    world.launchXR();

    // 1. Register Systems
    world.registerSystem(PortalSystem);
    world.registerSystem(MemoryUISystem);
    world.registerSystem(HotspotSystem);
    world.registerSystem(ElevatorSystem);
    world.registerSystem(TravelUISystem);
    world.registerSystem(MovementSystem);
    
    // 2. Lighting
    const ambientLight = new AmbientLight(0xffffff, 1.0);
    world.scene.add(ambientLight);

    const sunLight = new DirectionalLight(0xffffff, 5.0);
    sunLight.position.set(5, 10, 5);
    world.scene.add(sunLight);

    world.renderer.localClippingEnabled = true;
    world.renderer.sortObjects = true;
    
    const portalClipPlane = new Plane(new Vector3(0, 0, -1), -2.0);


    // 3. THE NEW PORTAL (Frame + Invisible Walls)
    const frameAsset = AssetManager.getGLTF("portalFrame");
    if (frameAsset) {
        const frame = frameAsset.scene;
        frame.scale.setScalar(0.5); 
        frame.position.set(0, -0.3, -2.0); 
        world.createTransformEntity(frame);
    } else {
        console.warn("⚠️ Portal Frame Asset Missing!");
    }

    const wallMat = new MeshBasicMaterial({ colorWrite: false }); 

    function createWall(w: number, h: number, x: number, y: number) {
        const mesh = new Mesh(new PlaneGeometry(w, h), wallMat);
        mesh.renderOrder = -2;
        mesh.position.set(x, y, -1.95); 
        world.createTransformEntity(mesh);
    }

    createWall(500, 500, 0, 253.6);

    createWall(500, 500, 0, -250.4);

    createWall(500, 500, -251.2, 0);

    createWall(500, 500, 251.2, 0);
    

    // 4. Destination Loader
    let currentWorldEntity: any = null;
    let currentHotspots: any[] = [];
    let currentHtmlAudio = new Audio();
    currentHtmlAudio.loop = true;
    currentHtmlAudio.volume = 0.5;

    // Setup Travel UI
    const travelSys = world.getSystem(TravelUISystem) as any;
    if (travelSys) {
        travelSys.setup(destinations);
    }

    function loadDestination(config: DestinationConfig) {
      if (currentWorldEntity) currentWorldEntity.destroy();
      currentHotspots.forEach(h => h.destroy());
      currentHotspots = [];

      // Update Sky Color in Portal System
      const portalSys = world.getSystem(PortalSystem) as any;
      if (portalSys) {
          portalSys.updateSkyColor(config.skyColor);
      }

      currentHtmlAudio.src = config.audioUrl;
      currentHtmlAudio.play().catch(e => console.warn("Click screen to unmute!"));

      const asset = AssetManager.getGLTF(config.assetId);
      if (!asset) return;

      const virtualWorld = asset.scene;
      virtualWorld.position.set(0,0,0);
      virtualWorld.rotation.set(0,0,0);
      virtualWorld.scale.setScalar(config.scale);
      virtualWorld.rotation.y = config.rotationY * (Math.PI / 180);
      
      ambientLight.intensity = 1.0 * config.lightIntensity;
      sunLight.intensity = 5.0 * config.lightIntensity;

      autoFitModel(virtualWorld, -2.0, 1.6, config.offset);

      virtualWorld.traverse((child: any) => {
        if (child.isMesh) {
          child.renderOrder = 2;
          child.material.clippingPlanes = [portalClipPlane];
          child.material.clipShadows = true;
          child.material.side = DoubleSide; 
          child.frustumCulled = false;
        }
      });

      currentWorldEntity = world.createTransformEntity(virtualWorld);
      currentWorldEntity.addComponent(ElevatorTarget);
      
      const hotspotSystem = world.getSystem(HotspotSystem) as any;
      
      if (hotspotSystem && config.hotspots) {
          config.hotspots.forEach(h => {
              const pos = new Vector3(h.x, h.y, h.z);
              const orb = hotspotSystem.createHotspot(pos, h.title, h.story);
              orb.addComponent(ElevatorTarget);
              currentHotspots.push(orb);
          });
      }
    }

    window.addEventListener('click', () => {
        if(currentHtmlAudio.paused && currentHtmlAudio.src) currentHtmlAudio.play();
    });

    window.addEventListener('travel-go', (e: any) => {
      const index = e.detail;
      if (destinations[index]) {
          loadDestination(destinations[index]);
      }
    });

    loadDestination(destinations[0]); 

    // 5. Controls
    window.addEventListener('keydown', (event) => {
      const user = world.camera.parent;
      if (!user) return;

      if (event.key === '1') loadDestination(destinations[0]); 
      if (event.key === '2') loadDestination(destinations[1]); 
    });
  });
}


// --- Helper Functions ---

function autoFitModel(
  model: any, 
  portalZ: number, 
  portalY: number, 
  manualOffset = { x: 0, y: 0, z: 0 }
) {
  model.traverse((child: any) => {
    if (child.isObject3D) child.updateMatrixWorld(true);
  });

  const box = new Box3().setFromObject(model);

  if (box.isEmpty() || !isFinite(box.max.z)) {
    model.position.set(0, -1.6, -10);
    return;
  }

  const center = new Vector3();
  box.getCenter(center);

  const offsetX = -center.x + manualOffset.x;
  const floorY = Number.isFinite(box.min.y) ? box.min.y : 0;
  const offsetY = (-floorY - 1.6) + manualOffset.y;
  const frontZ = Number.isFinite(box.max.z) ? box.max.z : center.z;
  const offsetZ = (portalZ - frontZ) - 0.5 + manualOffset.z;

  model.position.set(offsetX, offsetY, offsetZ);
}

// Helper
export function forceRenderOnTop(entity: any) {
    if (!entity || !entity.object3D) return;
    entity.object3D.renderOrder = 999; 
    entity.object3D.traverse((child: any) => {
        if (child.isMesh) {
            child.renderOrder = 999;
            if (child.material) {
                child.material.depthTest = false; 
                child.material.depthWrite = false;
                child.material.transparent = true;
            }
        }
    });
}
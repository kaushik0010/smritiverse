import {
  createSystem,
  createComponent,
  Types,
  Mesh,
  SphereGeometry,
  MeshStandardMaterial,
  Interactable,
  DistanceGrabbable,
  Vector3,
  OneHandGrabbable,
} from "@iwsdk/core";

import { MemoryUISystem } from "./memory-ui-system";

export const Hotspot = createComponent("Hotspot", {
  title: { type: Types.String, default: "Memory" },
  story: { type: Types.String, default: "..." },
});

export class HotspotSystem extends createSystem({
  hotspots: { required: [Hotspot] },
}) {
  private tempOrbPos = new Vector3();
  private tempCamPos = new Vector3();
  private lastLogTime = 0;

  init() {
    console.log("✨ Hotspot System Initialized");
  }

  createHotspot(position: Vector3, title: string, story: string) {
    const geometry = new SphereGeometry(0.25, 32, 32);
    const material = new MeshStandardMaterial({
      color: 0xffcc00,
      emissive: 0xff9900,
      emissiveIntensity: 1.0,
      roughness: 0.2,
      metalness: 0.8,
    });
    const mesh = new Mesh(geometry, material);

    const entity = this.world.createTransformEntity(mesh);
    
    if (entity.object3D) {
        entity.object3D.position.copy(position);
        entity.object3D.userData.originalY = position.y;
        entity.object3D.userData.isOpen = false;
        entity.object3D.userData.manuallyClosed = false;
        entity.object3D.userData.hotspotData = { title, story };
    }

    entity.addComponent(Hotspot, { title, story });
    entity.addComponent(Interactable);
    entity.addComponent(DistanceGrabbable);
    entity.addComponent(OneHandGrabbable);
    
    return entity;
  }

  update(delta: number, time: number) {
    this.queries.hotspots.entities.forEach((entity: any) => {
      if (!entity) return;
      if (!entity.object3D) return;

      // 1. Calculate Distance
      entity.object3D.getWorldPosition(this.tempOrbPos);
      this.world.camera.getWorldPosition(this.tempCamPos);
      const dist = this.tempOrbPos.distanceTo(this.tempCamPos);

      if (time - this.lastLogTime > 1.0) {
          // console.log(`📏 Dist: ${dist.toFixed(2)}m`);
          console.log(`📏 Dist: ${dist.toFixed(2)}m | Open: ${entity.object3D.userData.isOpen}`);
          this.lastLogTime = time;
      }

      // 2. Animation
      if (entity.object3D.parent === this.world.scene && dist > 1.0) {
        const originalY = entity.object3D.userData.originalY || entity.object3D.position.y;
        entity.object3D.position.y = originalY + Math.sin(time * 2) * 0.05;
      }

      // 3. STATE LOGIC
      const isOpen = entity.object3D.userData.isOpen;

      // Case A: Auto-Close
      if (isOpen && dist > 2.5) {
          this.closeMemory(entity); 
      }
      
      // Case B: Reset Manual Flag
      if (!isOpen && dist > 3.0) {
          entity.object3D.userData.manuallyClosed = false;
      }

      // Case C: Trigger Logic
      // FIX: SAFE CHECK for getComponent
      let isClicked = false;
      if (typeof entity.getComponent === 'function') {
          const interactable = entity.getComponent(Interactable);
          isClicked = interactable && interactable.pressed;
      }

      if (!isOpen) {
          if ((isClicked || dist < 1.5) && !entity.object3D.userData.manuallyClosed) {
               this.openMemory(entity);
          }
      }
    });
  }

  openMemory(entity: any) {
    console.log("🚀 openMemory called!");
      entity.object3D.userData.isOpen = true;

      let title = "Memory";
      let story = "...";
      
      if (entity.object3D && entity.object3D.userData.hotspotData) {
          title = entity.object3D.userData.hotspotData.title;
          story = entity.object3D.userData.hotspotData.story;
      }

      const uiSystem = this.world.getSystem(MemoryUISystem) as any;
      
      if (uiSystem) {
          const spawnPos = this.tempCamPos.clone();
          const forward = new Vector3(0, 0, -1).applyQuaternion(this.world.camera.quaternion);
          forward.y = 0;
          forward.normalize().multiplyScalar(0.8);
          spawnPos.add(forward);
          spawnPos.y = this.tempCamPos.y;

          uiSystem.showMemory(spawnPos, title, story, entity);
      }
  }

  closeMemory(entity: any) {
      const uiSystem = this.world.getSystem(MemoryUISystem) as any;
      if (uiSystem) {
          uiSystem.closeMemory();
      } else {
          entity.object3D.userData.isOpen = false;
      }
  }
}
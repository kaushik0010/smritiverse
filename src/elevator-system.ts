import {
  createSystem,
  createComponent,
  PanelUI,
  PanelDocument,
  Interactable,
  UIKit,
  UIKitDocument,
  Vector3,
} from "@iwsdk/core";

export const ElevatorTarget = createComponent("ElevatorTarget", {});

export class ElevatorSystem extends createSystem({
  targets: { required: [ElevatorTarget] }
}) {
  private uiEntity: any = null;

  init() {
    console.log("✨ Elevator System Initialized");
    this.spawnUI();
  }

  spawnUI() {
    const entity = this.world.createTransformEntity();
    
    if (entity.object3D) {
        entity.object3D.position.set(-0.8, 1.2, -0.5);
        entity.object3D.renderOrder = 999;
        
        // FIX: Disable Fog and ToneMapping so UI looks crisp in bright scenes
        entity.object3D.traverse((c: any) => {
            if (c.isMesh && c.material) {
                c.material.depthTest = false; 
                c.material.depthWrite = false;
                c.material.transparent = true;
                
                // CRITICAL FIXES FOR BAMBOO SCENE:
                c.material.fog = false;        // Ignore the white fog
                c.material.toneMapped = false; // Keep colors true (don't darken/brighten)
            }
        });
    }

    entity.addComponent(PanelUI, {
      config: "/ui/elevator.json",
      maxWidth: 0.25, 
    });
    
    entity.addComponent(Interactable);

    this.uiEntity = entity;
    this.pollForButtons(entity, 0);
  }

  pollForButtons(entity: any, attempts: number) {
     if (attempts > 100) return;
     const doc = PanelDocument.data.document[entity.index] as UIKitDocument;
     
     if (doc && doc.getElementById('btn-up')) {
         this.setupListeners(doc);
     } else {
         setTimeout(() => this.pollForButtons(entity, attempts + 1), 100);
     }
  }

  setupListeners(doc: any) {
     const btnUp = doc.getElementById('btn-up') as UIKit.Component;
     const btnDown = doc.getElementById('btn-down') as UIKit.Component;

     if (btnUp) btnUp.addEventListener('click', () => this.moveWorld(-0.5)); 
     if (btnDown) btnDown.addEventListener('click', () => this.moveWorld(0.5));
  }

  moveWorld(amount: number) {
      console.log(`🚀 Shifting World by ${amount}m`);
      this.queries.targets.entities.forEach((entity: any) => {
          if (entity.object3D) {
              entity.object3D.position.y += amount;
              entity.object3D.updateMatrixWorld(true);
          }
      });
  }

  update(delta: number) {
      if (!this.uiEntity || !this.uiEntity.object3D) return;

      const camera = this.world.camera;
      const offset = new Vector3(-0.6, -0.3, -0.8); 
      offset.applyQuaternion(camera.quaternion); 
      const targetPos = offset.add(camera.position);

      this.uiEntity.object3D.position.lerp(targetPos, 0.1);
      this.uiEntity.object3D.lookAt(camera.position);
  }
}
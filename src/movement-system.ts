import {
  createSystem,
  PanelUI,
  PanelDocument,
  Interactable,
  Vector3,
  UIKit,
  UIKitDocument,
} from "@iwsdk/core";

import { ElevatorTarget } from "./elevator-system"; 
import { PortalSystem } from "./portal-system";

export class MovementSystem extends createSystem({
  targets: { required: [ElevatorTarget] }
}) {
  private uiEntity: any = null;

  init() {
    this.spawnUI();
  }

  spawnUI() {
    const entity = this.world.createTransformEntity();
    
    if (entity.object3D) {
        entity.object3D.position.set(0.6, 1.2, -0.5);
        entity.object3D.lookAt(0, 1.2, 0);
        entity.object3D.rotateY(-Math.PI / 4);
        entity.object3D.renderOrder = 9999;
        
        entity.object3D.traverse((c: any) => {
            if (c.isMesh) {
                c.material.depthTest = false;
                c.material.depthWrite = false;
                c.material.transparent = true;
            }
        });
    }

    entity.addComponent(PanelUI, {
      config: "/ui/movement.json",
      maxWidth: 0.25, 
    });
    
    entity.addComponent(Interactable);

    this.uiEntity = entity;
    this.pollForButtons(entity, 0);
  }

  pollForButtons(entity: any, attempts: number) {
     if (attempts > 100) return;
     const doc = PanelDocument.data.document[entity.index] as UIKitDocument;
     
     if (doc && doc.getElementById('btn-fwd')) {
         this.setupListeners(doc);
     } else {
         setTimeout(() => this.pollForButtons(entity, attempts + 1), 100);
     }
  }

  setupListeners(doc: any) {
     const btnFwd = doc.getElementById('btn-fwd') as UIKit.Component;
     const btnBack = doc.getElementById('btn-back') as UIKit.Component;

     if (btnFwd) {
         btnFwd.addEventListener('click', () => this.moveWorld(1.0)); 
     }
     if (btnBack) {
         btnBack.addEventListener('click', () => this.moveWorld(-1.0));
     }
  }

  moveWorld(amount: number) {
      const forward = new Vector3(0, 0, -1).applyQuaternion(this.world.camera.quaternion);
      forward.y = 0;
      forward.normalize();
      
      const moveVec = forward.multiplyScalar(-amount);

      this.queries.targets.entities.forEach((entity: any) => {
          if (entity.object3D) {
              entity.object3D.position.add(moveVec);
              entity.object3D.updateMatrixWorld(true);
          }
      });
  }

  update() {
      const portalSys = this.world.getSystem(PortalSystem) as any;
      if (this.uiEntity && this.uiEntity.object3D && portalSys) {
          this.uiEntity.object3D.visible = portalSys.isInside;
      }

      if (!this.uiEntity || !this.uiEntity.object3D) return;

      const camera = this.world.camera;
      const offset = new Vector3(0.6, -0.3, -0.8); 
      offset.applyQuaternion(camera.quaternion);
      const targetPos = offset.add(camera.position);
      
      this.uiEntity.object3D.position.lerp(targetPos, 0.1);
      this.uiEntity.object3D.lookAt(camera.position);
  }
}
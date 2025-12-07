import {
  createSystem,
  PanelUI,
  PanelDocument,
  Interactable,
  UIKit,
  UIKitDocument,
} from "@iwsdk/core";

export class TravelUISystem extends createSystem({}) {
  private uiEntity: any = null;
  private destinations: any[] = [];
  private currentIndex = 0;

  init() {
    console.log("✨ Travel UI Initialized");
  }

  setup(destinations: any[]) {
      this.destinations = destinations;
      this.spawnUI();
  }

  spawnUI() {
    const entity = this.world.createTransformEntity();
    
    if (entity.object3D) {
        entity.object3D.position.set(0.3, 1.6, -0.4);
        entity.object3D.rotation.set(0, -Math.PI / 4, 0); 
        entity.object3D.renderOrder = 999;
        
        entity.object3D.traverse((c: any) => {
            if (c.isMesh && c.material) {
                c.material.depthTest = false; 
                c.material.depthWrite = false;
                c.material.fog = false;        
                c.material.toneMapped = false; 
            }
        });
    }

    entity.addComponent(PanelUI, {
      config: "/ui/travel-menu.json",
      maxWidth: 0.25, 
    });
    
    entity.addComponent(Interactable);

    this.uiEntity = entity;
    this.pollForDocument(entity, 0);
  }

  pollForDocument(entity: any, attempts: number) {
     if (attempts > 100) return;
     const doc = PanelDocument.data.document[entity.index] as UIKitDocument;
     
     if (doc && doc.getElementById('btn-next')) {
         this.setupListeners(doc);
         this.updateDisplay(doc); 
     } else {
         setTimeout(() => this.pollForDocument(entity, attempts + 1), 100);
     }
  }

  setupListeners(doc: any) {
     const next = doc.getElementById('btn-next') as UIKit.Component;
     const prev = doc.getElementById('btn-prev') as UIKit.Component;
     const enter = doc.getElementById('btn-enter') as UIKit.Component;

     if (next) next.addEventListener('click', () => this.changeIndex(1));
     if (prev) prev.addEventListener('click', () => this.changeIndex(-1));
     
     if (enter) enter.addEventListener('click', () => {
         window.dispatchEvent(new CustomEvent('travel-go', { detail: this.currentIndex }));
     });
  }

  changeIndex(dir: number) {
      if (this.destinations.length === 0) return;
      this.currentIndex = (this.currentIndex + dir + this.destinations.length) % this.destinations.length;
      
      const doc = PanelDocument.data.document[this.uiEntity.index] as UIKitDocument;
      this.updateDisplay(doc);
  }

  updateDisplay(doc: UIKitDocument) {
      if (!doc) return;
      
      const dest = this.destinations[this.currentIndex];
      const nameEl = doc.getElementById('dest-name') as UIKit.Text;
      const descEl = doc.getElementById('dest-desc') as UIKit.Text;

      const desc = dest.description || "A beautiful place to explore.";

      if (nameEl) nameEl.setProperties({ text: dest.name });
      if (descEl) descEl.setProperties({ text: desc });
  }
}
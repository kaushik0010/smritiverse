import {
  createSystem,
  PanelUI,
  PanelDocument,
  Interactable,
  Vector3,
  UIKitDocument,
  UIKit,
} from "@iwsdk/core";

export class MemoryUISystem extends createSystem({}) {
  private currentCard: any = null;
  private pendingTitle: string = "";
  private pendingStory: string = "";
  private activeHotspotEntity: any = null;
  private closeTimer: any = null;
  
  init() {
    console.log("✨ Memory UI System Initialized");
  }

  showMemory(position: Vector3, title: string, story: string, sourceEntity: any) {
    this.closeMemory(); 

    this.pendingTitle = title;
    this.pendingStory = story;
    this.activeHotspotEntity = sourceEntity; 

    const cardEntity = this.world.createTransformEntity();
    
    if (cardEntity.object3D) {
        cardEntity.object3D.position.copy(position);
        cardEntity.object3D.position.y += 0.4; 
        cardEntity.object3D.lookAt(this.world.camera.position);
        cardEntity.object3D.renderOrder = 999;

        cardEntity.object3D.traverse((child: any) => {
            if (child.isMesh && child.material) {
                child.renderOrder = 999;
                child.material.depthTest = false; 
                child.material.depthWrite = false; 
                child.material.transparent = true;
                
                child.material.fog = false;        
                child.material.toneMapped = false;
            }
        });
    }

    cardEntity.addComponent(PanelUI, {
      config: "/ui/memory-card.json", 
      maxWidth: 0.5, 
    });

    cardEntity.addComponent(Interactable);

    this.currentCard = cardEntity;
    this.pollForDocument(cardEntity, 0);

    this.closeTimer = setTimeout(() => {
        this.closeMemory();
    }, 8000);
  }

  closeMemory() {
    if (this.closeTimer) {
        clearTimeout(this.closeTimer);
        this.closeTimer = null;
    }

    if (this.currentCard) {
      if (typeof this.currentCard.destroy === 'function') {
          this.currentCard.destroy();
      }
      this.currentCard = null;

      if (this.activeHotspotEntity && this.activeHotspotEntity.object3D) {
          this.activeHotspotEntity.object3D.userData.isOpen = false;
          this.activeHotspotEntity.object3D.userData.manuallyClosed = true;
      }
      this.activeHotspotEntity = null;
    }
  }

  update(delta: number) {
      if (this.currentCard && this.currentCard.object3D) {
          this.currentCard.object3D.lookAt(this.world.camera.position);
      }
  }

  pollForDocument(entity: any, attempts: number) {
     if (entity !== this.currentCard) return;
     if (attempts > 100) return;

     const doc = PanelDocument.data.document[entity.index] as UIKitDocument;

     if (doc && doc.getElementById('card-title')) {
         this.applyContent(doc);
     } else {
         setTimeout(() => this.pollForDocument(entity, attempts + 1), 50);
     }
  }

  applyContent(doc: UIKitDocument) {
     const titleEl = doc.getElementById('card-title') as UIKit.Text;
     const storyEl = doc.getElementById('card-story') as UIKit.Text;
     const closeBtn = doc.getElementById('close-btn') as UIKit.Component;
     
     if (titleEl) titleEl.setProperties({ text: this.pendingTitle });
     if (storyEl) storyEl.setProperties({ text: this.pendingStory });
     if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            this.closeMemory();
        });
     }
  }
}
import { createSystem } from "@iwsdk/core";
import * as THREE from "three";

// DEFINE THE SHADERS
const vertexShader = `
  varying vec3 vWorldPosition;
  #include <clipping_planes_pars_vertex>

  void main() {
    // 1. Calculate World Position (for the Gradient)
    vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
    vWorldPosition = worldPosition.xyz;

    // 2. Calculate Model-View Position (REQUIRED for Clipping)
    vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );

    // 3. Run the Clipping Logic
    #include <clipping_planes_vertex>

    // 4. Set Final Position
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  uniform vec3 topColor;
  uniform vec3 bottomColor;
  uniform float offset;
  uniform float exponent;
  varying vec3 vWorldPosition;

  #include <clipping_planes_pars_fragment>

  void main() {
    #include <clipping_planes_fragment>
    
    float h = normalize( vWorldPosition + offset ).y;
    gl_FragColor = vec4( mix( bottomColor, topColor, max( pow( max( h , 0.0), exponent ), 0.0 ) ), 1.0 );
  }
`;

export class PortalSystem extends createSystem({}) {
  private portalZ = -2.0; 
  public isInside = false;

  // Visuals
  private skyMesh: THREE.Mesh | null = null;
  private skyMat: THREE.ShaderMaterial | null = null; 
  private portalFrame: THREE.Mesh | null = null;
  private exitHole: THREE.Mesh | null = null;
  private exitSign: THREE.Mesh | null = null;
  
  // Clip Plane
  private clipPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), -2.0);

  init() {
    this.createSkySphere();
    this.createPortalFrame();
    this.createExitHole();
  }

  createSkySphere() {
    const geo = new THREE.SphereGeometry(80, 32, 32);
    
    const uniforms = {
      topColor: { value: new THREE.Color(0x0077ff) },
      bottomColor: { value: new THREE.Color(0xffffff) },
      offset: { value: 33 },
      exponent: { value: 0.6 }
    };

    this.skyMat = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        side: THREE.BackSide, 
        clippingPlanes: [this.clipPlane], 
        clipShadows: true,
        clipping: true 
    });

    this.skyMesh = new THREE.Mesh(geo, this.skyMat);
    this.skyMesh.renderOrder = -1; 
    this.skyMesh.visible = true;

    this.world.scene.add(this.skyMesh);
  }

  createPortalFrame() {
      const width = 2.4;
      const height = 4.0;
      const thickness = 0.15;

      const shape = new THREE.Shape();
      
      // Outer Rectangle
      shape.moveTo(-width/2 - thickness, -height/2 - thickness);
      shape.lineTo(width/2 + thickness, -height/2 - thickness);
      shape.lineTo(width/2 + thickness, height/2 + thickness);
      shape.lineTo(-width/2 - thickness, height/2 + thickness);
      shape.lineTo(-width/2 - thickness, -height/2 - thickness);

      // Inner Hole (The Doorway)
      const hole = new THREE.Path();
      hole.moveTo(-width/2, -height/2);
      hole.lineTo(width/2, -height/2);
      hole.lineTo(width/2, height/2);
      hole.lineTo(-width/2, height/2);
      hole.lineTo(-width/2, -height/2);
      shape.holes.push(hole);

      const geo = new THREE.ShapeGeometry(shape);
      const mat = new THREE.MeshBasicMaterial({ 
          color: 0xFFFFFF, 
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.6 
      });
      
      this.portalFrame = new THREE.Mesh(geo, mat);
      
      // Match the Exit Hole position
      this.portalFrame.position.set(0, 1.6, this.portalZ); 
      this.portalFrame.visible = false; 
      
      this.world.scene.add(this.portalFrame);
  }

  createExitHole() {
      const width = 2.4;
      const height = 4.0; 

      // Create the geometry
      const geo = new THREE.PlaneGeometry(width, height);
      
      const mat = new THREE.MeshBasicMaterial({ 
          colorWrite: false,
          side: THREE.DoubleSide 
      });
      
      this.exitHole = new THREE.Mesh(geo, mat);
      
      this.exitHole.position.set(0, 1.6, this.portalZ);
      
      this.exitHole.renderOrder = -2; 
      this.exitHole.visible = false;

      this.world.scene.add(this.exitHole);
  }

  updateSkyGradient(topHex: number, bottomHex: number) {
      if (this.skyMat) {
          this.skyMat.uniforms.topColor.value.setHex(topHex);
          this.skyMat.uniforms.bottomColor.value.setHex(bottomHex);
      }
  }

  update() {
    if (this.skyMesh) {
        this.skyMesh.position.copy(this.world.camera.position);
    }

    const userZ = this.world.camera.position.z;

    if (userZ < this.portalZ - 0.2 && !this.isInside) {
      this.enterWorld();
    } else if (userZ > this.portalZ + 0.2 && this.isInside) {
      this.exitWorld();
    }
  }

  enterWorld() {
    this.isInside = true;
    
    if (this.skyMat) {
        this.skyMat.clippingPlanes = []; 
        this.skyMat.needsUpdate = true;
    }

    if (this.portalFrame) this.portalFrame.visible = true;
    if (this.exitSign) this.exitSign.visible = true;
    if (this.exitHole) this.exitHole.visible = true;
  }

  exitWorld() {
    this.isInside = false;
    
    if (this.skyMat) {
        this.skyMat.clippingPlanes = [this.clipPlane];
        this.skyMat.needsUpdate = true;
    }

    if (this.portalFrame) this.portalFrame.visible = false;
    if (this.exitSign) this.exitSign.visible = false;
    if (this.exitHole) this.exitHole.visible = false;
  }
}
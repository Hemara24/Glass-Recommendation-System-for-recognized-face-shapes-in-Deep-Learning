import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

// threejs-setup.js
// Three.js-based virtual glasses try-on system

class VirtualGlassesRenderer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.glasses = null;
        this.faceMesh = null;
        this.isInitialized = false;
        this.currentGlassesType = null;
        
        // Glasses configuration
        this.glassesConfig = {
            scale: 1.0,
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            opacity: 1.0
        };
        
        // Glasses database
        this.glassesModels = {
            'wayfarer': {
                geometry: 'box',
                dimensions: { width: 1.2, height: 0.4, depth: 0.05 },
                color: 0x333333,
                frameColor: 0x1a1a1a,
                lensColor: 0x87CEEB,
                opacity: 0.7,
                position: { x: 0, y: 0.3, z: 0.5 },
                scale: 0.8
            },
            'aviator': {
                geometry: 'sphere',
                dimensions: { radius: 0.3 },
                color: 0x000000,
                frameColor: 0x444444,
                lensColor: 0x4682B4,
                opacity: 0.6,
                position: { x: 0, y: 0.35, z: 0.5 },
                scale: 0.9
            },
            'rectangle': {
                geometry: 'box',
                dimensions: { width: 1.4, height: 0.5, depth: 0.05 },
                color: 0x2c3e50,
                frameColor: 0x34495e,
                lensColor: 0x4169E1,
                opacity: 0.8,
                position: { x: 0, y: 0.3, z: 0.5 },
                scale: 0.85
            },
            'round': {
                geometry: 'cylinder',
                dimensions: { radius: 0.35, height: 0.05 },
                color: 0x8B4513,
                frameColor: 0xA0522D,
                lensColor: 0x00BFFF,
                opacity: 0.7,
                position: { x: 0, y: 0.3, z: 0.5 },
                scale: 0.8
            },
            'cat-eye': {
                geometry: 'custom',
                dimensions: { width: 1.3, height: 0.6, depth: 0.05 },
                color: 0x8B008B,
                frameColor: 0x9932CC,
                lensColor: 0xDA70D6,
                opacity: 0.6,
                position: { x: 0, y: 0.25, z: 0.5 },
                scale: 0.9
            }
        };
        
        // Face landmarks mapping
        this.faceLandmarks = {
            leftEye: 33,
            rightEye: 263,
            noseTip: 1,
            leftEar: 234,
            rightEar: 454,
            mouthLeft: 61,
            mouthRight: 291
        };
    }
    
    // Initialize Three.js scene
    async init() {
        if (this.isInitialized) return;
        
        try {
            // Create scene
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x000000);
            this.scene.fog = new THREE.Fog(0x000000, 1, 10);
            
            // Create camera
            this.camera = new THREE.PerspectiveCamera(
                60, // FOV
                this.container.clientWidth / this.container.clientHeight,
                0.1,
                1000
            );
            this.camera.position.set(0, 0, 2);
            
            // Create renderer
            this.renderer = new THREE.WebGLRenderer({ 
                antialias: true,
                alpha: true,
                preserveDrawingBuffer: true
            });
            this.renderer.setSize(
                this.container.clientWidth,
                this.container.clientHeight
            );
            this.renderer.setPixelRatio(window.devicePixelRatio);
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            
            // Add renderer to container
            this.container.appendChild(this.renderer.domElement);
            
            // Add lights
            this.setupLights();
            
            // Add coordinate helpers (debug)
            // this.addHelpers();
            
            // Create face mesh placeholder
            this.createFaceMesh();
            
            // Handle window resize
            window.addEventListener('resize', () => this.onWindowResize());
            
            this.isInitialized = true;
            console.log('Three.js renderer initialized');
            
            // Start animation loop
            this.animate();
            
        } catch (error) {
            console.error('Failed to initialize Three.js:', error);
            throw error;
        }
    }
    
    // Setup lighting
    setupLights() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        // Directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 5, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);
        
        // Point light for rim lighting
        const pointLight = new THREE.PointLight(0xffffff, 0.5, 100);
        pointLight.position.set(-5, 5, 5);
        this.scene.add(pointLight);
        
        // Hemisphere light for natural outdoor lighting
        const hemisphereLight = new THREE.HemisphereLight(
            0xffffbb, // sky color
            0x080820, // ground color
            0.4 // intensity
        );
        this.scene.add(hemisphereLight);
    }
    
    // Create placeholder face mesh
    createFaceMesh() {
        // Create a simplified face geometry for positioning reference
        const faceGeometry = new THREE.SphereGeometry(0.8, 32, 32);
        const faceMaterial = new THREE.MeshPhongMaterial({
            color: 0xffccaa,
            transparent: true,
            opacity: 0.3,
            wireframe: true
        });
        
        this.faceMesh = new THREE.Mesh(faceGeometry, faceMaterial);
        this.faceMesh.position.set(0, 0, 0);
        this.faceMesh.visible = false; // Hide by default, show for debugging
        this.scene.add(this.faceMesh);
    }
    
    // Load glasses model
    loadGlasses(glassesType) {
        if (!this.isInitialized) {
            console.warn('Renderer not initialized');
            return;
        }
        
        // Remove existing glasses
        if (this.glasses) {
            this.scene.remove(this.glasses);
            this.glasses = null;
        }
        
        this.currentGlassesType = glassesType;
        const config = this.glassesModels[glassesType];
        
        if (!config) {
            console.error(`Glasses type "${glassesType}" not found`);
            return;
        }
        
        // Create glasses group
        this.glasses = new THREE.Group();
        
        // Create frame
        const frame = this.createGlassesFrame(config);
        this.glasses.add(frame);
        
        // Create lenses
        const leftLens = this.createLens(config, -0.35);
        const rightLens = this.createLens(config, 0.35);
        this.glasses.add(leftLens);
        this.glasses.add(rightLens);
        
        // Create temples (arms)
        const leftTemple = this.createTemple(config, -0.7);
        const rightTemple = this.createTemple(config, 0.7);
        this.glasses.add(leftTemple);
        this.glasses.add(rightTemple);
        
        // Create bridge
        const bridge = this.createBridge(config);
        this.glasses.add(bridge);
        
        // Position and scale glasses
        this.glasses.position.set(
            config.position.x,
            config.position.y,
            config.position.z
        );
        this.glasses.scale.set(config.scale, config.scale, config.scale);
        
        // Add to scene
        this.scene.add(this.glasses);
        
        console.log(`Loaded glasses: ${glassesType}`);
    }
    
    // Create glasses frame
    createGlassesFrame(config) {
        let frameGeometry;
        
        switch (config.geometry) {
            case 'box':
                frameGeometry = new THREE.BoxGeometry(
                    config.dimensions.width,
                    config.dimensions.height,
                    config.dimensions.depth
                );
                break;
                
            case 'sphere':
                frameGeometry = new THREE.SphereGeometry(
                    config.dimensions.radius,
                    32,
                    32
                );
                break;
                
            case 'cylinder':
                frameGeometry = new THREE.CylinderGeometry(
                    config.dimensions.radius,
                    config.dimensions.radius,
                    config.dimensions.height,
                    32
                );
                break;
                
            case 'custom':
                // Cat-eye shaped glasses
                const shape = new THREE.Shape();
                const width = config.dimensions.width;
                const height = config.dimensions.height;
                
                shape.moveTo(-width/2, -height/4);
                shape.quadraticCurveTo(-width/3, -height/2, 0, -height/2);
                shape.quadraticCurveTo(width/3, -height/2, width/2, -height/4);
                shape.lineTo(width/2, height/4);
                shape.quadraticCurveTo(width/3, height/2, 0, height/2);
                shape.quadraticCurveTo(-width/3, height/2, -width/2, height/4);
                shape.lineTo(-width/2, -height/4);
                
                const extrudeSettings = {
                    depth: config.dimensions.depth,
                    bevelEnabled: true,
                    bevelSegments: 2,
                    steps: 2,
                    bevelSize: 0.01,
                    bevelThickness: 0.01
                };
                
                frameGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
                break;
                
            default:
                frameGeometry = new THREE.BoxGeometry(1, 0.4, 0.05);
        }
        
        const frameMaterial = new THREE.MeshPhongMaterial({
            color: config.frameColor,
            shininess: 100,
            specular: 0x222222,
            transparent: true,
            opacity: config.opacity
        });
        
        return new THREE.Mesh(frameGeometry, frameMaterial);
    }
    
    // Create lens
    createLens(config, xPosition) {
        let lensGeometry;
        
        switch (config.geometry) {
            case 'box':
                lensGeometry = new THREE.BoxGeometry(
                    config.dimensions.width * 0.8,
                    config.dimensions.height * 0.8,
                    config.dimensions.depth * 0.1
                );
                break;
                
            case 'sphere':
                lensGeometry = new THREE.SphereGeometry(
                    config.dimensions.radius * 0.9,
                    32,
                    32
                );
                break;
                
            case 'cylinder':
                lensGeometry = new THREE.CylinderGeometry(
                    config.dimensions.radius * 0.9,
                    config.dimensions.radius * 0.9,
                    config.dimensions.height * 0.8,
                    32
                );
                break;
                
            default:
                lensGeometry = new THREE.CircleGeometry(0.25, 32);
        }
        
        const lensMaterial = new THREE.MeshPhysicalMaterial({
            color: config.lensColor,
            transmission: 0.9, // Glass-like transparency
            roughness: 0.1,
            thickness: 0.5,
            ior: 1.5,
            specularIntensity: 1,
            specularColor: 0xffffff,
            transparent: true,
            opacity: 0.3
        });
        
        const lens = new THREE.Mesh(lensGeometry, lensMaterial);
        lens.position.x = xPosition;
        lens.position.z = config.dimensions.depth * 0.6;
        
        return lens;
    }
    
    // Create temple (arm)
    createTemple(config, startX) {
        const templeGeometry = new THREE.BoxGeometry(0.05, 0.05, 1);
        const templeMaterial = new THREE.MeshPhongMaterial({
            color: config.frameColor,
            shininess: 50
        });
        
        const temple = new THREE.Mesh(templeGeometry, templeMaterial);
        temple.position.x = startX;
        temple.position.y = -0.1;
        temple.position.z = -0.5;
        temple.rotation.y = Math.PI / 6 * (startX > 0 ? -1 : 1);
        
        return temple;
    }
    
    // Create bridge
    createBridge(config) {
        const bridgeGeometry = new THREE.BoxGeometry(0.3, 0.05, 0.05);
        const bridgeMaterial = new THREE.MeshPhongMaterial({
            color: config.frameColor,
            shininess: 100
        });
        
        const bridge = new THREE.Mesh(bridgeGeometry, bridgeMaterial);
        bridge.position.z = config.dimensions.depth * 0.5;
        
        return bridge;
    }
    
    // Update glasses position based on face landmarks
    updateFromFaceLandmarks(landmarks) {
        if (!this.glasses || !landmarks) return;
        
        // Extract key landmarks
        const leftEye = landmarks[this.faceLandmarks.leftEye];
        const rightEye = landmarks[this.faceLandmarks.rightEye];
        const noseTip = landmarks[this.faceLandmarks.noseTip];
        
        if (!leftEye || !rightEye || !noseTip) return;
        
        // Calculate position between eyes
        const eyeCenterX = (leftEye.x + rightEye.x) / 2;
        const eyeCenterY = (leftEye.y + rightEye.y) / 2;
        
        // Map 2D coordinates to 3D
        // Normalize coordinates (-1 to 1 range)
        const normalizedX = (eyeCenterX - 0.5) * 2;
        const normalizedY = (0.5 - eyeCenterY) * 2;
        
        // Calculate distance between eyes for scaling
        const eyeDistance = Math.sqrt(
            Math.pow(rightEye.x - leftEye.x, 2) + 
            Math.pow(rightEye.y - leftEye.y, 2)
        );
        
        // Update glasses position
        this.glasses.position.x = normalizedX * 0.5;
        this.glasses.position.y = normalizedY * 0.5 + 0.2;
        this.glasses.position.z = 0.5;
        
        // Scale based on eye distance
        const scaleFactor = eyeDistance * 3;
        this.glasses.scale.setScalar(scaleFactor);
        
        // Calculate head rotation
        const headRotation = this.calculateHeadRotation(landmarks);
        this.glasses.rotation.y = headRotation;
        
        // Update face mesh position (for reference)
        if (this.faceMesh) {
            this.faceMesh.position.copy(this.glasses.position);
            this.faceMesh.position.z -= 0.3;
        }
    }
    
    // Calculate head rotation from landmarks
    calculateHeadRotation(landmarks) {
        const leftEye = landmarks[this.faceLandmarks.leftEye];
        const rightEye = landmarks[this.faceLandmarks.rightEye];
        const leftEar = landmarks[this.faceLandmarks.leftEar];
        const rightEar = landmarks[this.faceLandmarks.rightEar];
        
        if (!leftEye || !rightEye || !leftEar || !rightEar) return 0;
        
        // Calculate face center
        const faceCenterX = (leftEar.x + rightEar.x) / 2;
        
        // Calculate eye center
        const eyeCenterX = (leftEye.x + rightEye.x) / 2;
        
        // Calculate rotation angle (simplified)
        const rotation = (eyeCenterX - faceCenterX) * Math.PI;
        
        return rotation;
    }
    
    // Update glasses size
    updateScale(scale) {
        if (!this.glasses) return;
        this.glassesConfig.scale = scale / 100;
        this.glasses.scale.setScalar(this.glassesConfig.scale);
    }
    
    // Update glasses vertical position
    updatePositionY(positionY) {
        if (!this.glasses) return;
        this.glassesConfig.position.y = positionY / 100;
        this.glasses.position.y = this.glassesConfig.position.y;
    }
    
    // Update glasses rotation
    updateRotation(rotation) {
        if (!this.glasses) return;
        this.glassesConfig.rotation.z = rotation * Math.PI / 180;
        this.glasses.rotation.z = this.glassesConfig.rotation.z;
    }
    
    // Update glasses opacity
    updateOpacity(opacity) {
        if (!this.glasses) return;
        this.glassesConfig.opacity = opacity / 100;
        
        // Traverse glasses children and update opacity
        this.glasses.traverse((child) => {
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(mat => {
                        if (mat.transparent) {
                            mat.opacity = this.glassesConfig.opacity;
                        }
                    });
                } else if (child.material.transparent) {
                    child.material.opacity = this.glassesConfig.opacity;
                }
            }
        });
    }
    
    // Apply real-time face tracking
    applyFaceTracking(faceData) {
        if (!this.glasses || !faceData) return;
        
        const { landmarks, headPose } = faceData;
        
        if (landmarks) {
            this.updateFromFaceLandmarks(landmarks);
        }
        
        if (headPose) {
            this.glasses.rotation.x = headPose.pitch || 0;
            this.glasses.rotation.y = headPose.yaw || 0;
            this.glasses.rotation.z = headPose.roll || 0;
        }
    }
    
    // Take screenshot of current view
    takeScreenshot() {
        if (!this.renderer) return null;
        
        // Render current frame
        this.renderer.render(this.scene, this.camera);
        
        // Get screenshot as data URL
        const dataURL = this.renderer.domElement.toDataURL('image/png');
        return dataURL;
    }
    
    // Export glasses model as GLTF
    async exportGlasses() {
        if (!this.glasses) return;
        
        const exporter = new THREE.GLTFExporter();
        
        return new Promise((resolve, reject) => {
            exporter.parse(
                this.glasses,
                (gltf) => {
                    const output = JSON.stringify(gltf, null, 2);
                    resolve(output);
                },
                (error) => {
                    reject(error);
                }
            );
        });
    }
    
    // Handle window resize
    onWindowResize() {
        if (!this.camera || !this.renderer) return;
        
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(
            this.container.clientWidth,
            this.container.clientHeight
        );
    }
    
    // Animation loop
    animate() {
        if (!this.isInitialized) return;
        
        requestAnimationFrame(() => this.animate());
        
        // Rotate glasses slightly for demo
        if (this.glasses) {
            // this.glasses.rotation.y += 0.005; // Remove for production
        }
        
        // Render scene
        if (this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
    
    // Add coordinate helpers (debug)
    addHelpers() {
        // Add axes helper
        const axesHelper = new THREE.AxesHelper(2);
        this.scene.add(axesHelper);
        
        // Add grid helper
        const gridHelper = new THREE.GridHelper(10, 10);
        this.scene.add(gridHelper);
    }
    
    // Clean up resources
    dispose() {
        if (this.renderer) {
            this.renderer.dispose();
            this.renderer.forceContextLoss();
        }
        
        if (this.scene) {
            this.scene.traverse((object) => {
                if (object.geometry) object.geometry.dispose();
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
        }
        
        this.isInitialized = false;
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VirtualGlassesRenderer;
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Three.js setup script loaded');
    
    // You can initialize the renderer here if needed
    // Example:
    // const glassesRenderer = new VirtualGlassesRenderer('glassesContainer');
    // glassesRenderer.init();
});
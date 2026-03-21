import { useCallback, useEffect, useId, useRef, useState } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { generateMeshComponentTsx } from '../../generateMeshComponent.js';

const electronAPI = (
  window as unknown as {
    electronAPI?: {
      saveTsxComponent: (
        content: string,
        filename: string,
      ) => Promise<{ success: boolean; path: string }>;
    };
  }
).electronAPI;

/**
 * STL import preview (vanilla Three.js) + auto-export of generated mesh TSX to disk.
 */
export function StlImportViewer() {
  const inputId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState('No file loaded');

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const currentMeshRef = useRef<THREE.Mesh | null>(null);
  const animationFrameRef = useRef<number>(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / Math.max(container.clientHeight, 1),
      0.1,
      1000,
    );
    camera.position.set(5, 5, 5);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    scene.add(new THREE.AmbientLight(0x404040, 0.6));

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight.position.set(10, 10, 10);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0x7eb8da, 0.3);
    fillLight.position.set(-5, -5, 5);
    scene.add(fillLight);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = true;
    controls.minDistance = 1;
    controls.maxDistance = 100;
    controlsRef.current = controls;

    const gridHelper = new THREE.GridHelper(10, 10, 0x444444, 0x333333);
    gridHelper.position.y = -2;
    scene.add(gridHelper);

    const onResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      const el = containerRef.current;
      cameraRef.current.aspect = el.clientWidth / Math.max(el.clientHeight, 1);
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(el.clientWidth, el.clientHeight);
    };
    window.addEventListener('resize', onResize);

    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      controlsRef.current?.update();
      if (rendererRef.current && cameraRef.current && sceneRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(animationFrameRef.current);
      controls.dispose();
      const mesh = currentMeshRef.current;
      if (mesh) {
        scene.remove(mesh);
        mesh.geometry.dispose();
        if (mesh.material instanceof THREE.Material) mesh.material.dispose();
        currentMeshRef.current = null;
      }
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      controlsRef.current = null;
    };
  }, []);

  const saveGeneratedTsx = useCallback(
    async (geometry: THREE.BufferGeometry, sourceFilename: string) => {
      if (!electronAPI) {
        setStatus(sourceFilename);
        return;
      }
      try {
        const { content, outputFilename } = generateMeshComponentTsx(geometry, sourceFilename);
        const result = await electronAPI.saveTsxComponent(content, outputFilename);
        setStatus(`Saved ${outputFilename} → ${result.path}`);
      } catch (err) {
        console.error('TSX export failed:', err);
        setStatus(`Loaded ${sourceFilename} (TSX export failed)`);
      }
    },
    [],
  );

  const onFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const input = event.target;
      const file = input.files?.[0];
      if (!file) return;

      if (!file.name.toLowerCase().endsWith('.stl')) {
        setStatus('Please select an .stl file');
        return;
      }

      const scene = sceneRef.current;
      if (!scene) return;

      setStatus(`Loading ${file.name}...`);

      const loader = new STLLoader();
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          const geometry = loader.parse(buffer);
          geometry.computeVertexNormals();

          const prev = currentMeshRef.current;
          if (prev) {
            scene.remove(prev);
            prev.geometry.dispose();
            if (prev.material instanceof THREE.Material) prev.material.dispose();
            currentMeshRef.current = null;
          }

          const viewGeometry = geometry.clone();
          const material = new THREE.MeshPhongMaterial({
            color: 0x4a9eff,
            specular: 0x111111,
            shininess: 100,
            flatShading: false,
          });

          const mesh = new THREE.Mesh(viewGeometry, material);
          mesh.castShadow = true;
          mesh.receiveShadow = true;

          viewGeometry.computeBoundingBox();
          const box = viewGeometry.boundingBox!;
          const center = new THREE.Vector3();
          box.getCenter(center);
          mesh.geometry.translate(-center.x, -center.y, -center.z);

          const size = new THREE.Vector3();
          box.getSize(size);
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 4 / maxDim;
          mesh.scale.setScalar(scale);

          scene.add(mesh);
          currentMeshRef.current = mesh;

          controlsRef.current?.target.set(0, 0, 0);
          controlsRef.current?.update();

          setStatus(electronAPI ? `${file.name} — saving TSX…` : file.name);
          void saveGeneratedTsx(geometry.clone(), file.name);
        } catch (err) {
          console.error('Error loading STL:', err);
          setStatus('Error loading file');
        }
      };

      reader.readAsArrayBuffer(file);
      input.value = '';
    },
    [saveGeneratedTsx],
  );

  return (
    <>
      <div className="toolbar">
        <div className="file-input-wrapper">
          <input
            type="file"
            id={inputId}
            accept=".stl"
            onChange={onFileSelect}
          />
          <label htmlFor={inputId} className="upload-btn">
            Choose STL file
          </label>
        </div>
        <span id="file-label">{status}</span>
      </div>
      <div ref={containerRef} id="viewer" />
    </>
  );
}

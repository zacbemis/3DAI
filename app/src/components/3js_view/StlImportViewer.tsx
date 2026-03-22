import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import type { ActiveProject } from '../../context/ProjectContext';

/* eslint-disable @typescript-eslint/no-explicit-any -- three@0.183 has no .d.ts in this install */

export interface StlImportViewerProps {
  stlBuffer: ArrayBuffer | null;
  /** True while a new `/generate` is in flight — previous STL stays visible until replaced */
  isGenerating?: boolean;
  project?: ActiveProject | null;
  projectLoading?: boolean;
  projectError?: string | null;
  onNewProject?: () => void | Promise<void>;
}

function shortId(id: string): string {
  if (id.length <= 12) return id;
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}

/**
 * Three.js viewport with orbit controls; loads STL from `stlBuffer` when it changes.
 */
export function StlImportViewer({
  stlBuffer,
  isGenerating,
  project,
  projectLoading,
  projectError,
  onNewProject,
}: StlImportViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const sceneRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const rendererRef = useRef<any>(null);
  const controlsRef = useRef<any>(null);
  const currentMeshRef = useRef<any>(null);
  const animationFrameRef = useRef<number>(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0c);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / Math.max(container.clientHeight, 1),
      0.1,
      5000,
    );
    camera.position.set(80, 80, 80);
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
    controls.maxDistance = 5000;
    controlsRef.current = controls;

    const gridHelper = new THREE.GridHelper(10, 10, 0x2a2a2e, 0x1a1a1e);
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
        const mat = mesh.material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat.dispose();
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

  useEffect(() => {
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!scene || !camera || !controls) return;

    const prev = currentMeshRef.current;
    if (prev) {
      scene.remove(prev);
      prev.geometry.dispose();
      const mat = prev.material;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat.dispose();
      currentMeshRef.current = null;
    }

    if (!stlBuffer || stlBuffer.byteLength === 0) return;

    const loader = new STLLoader();
    const geometry = loader.parse(stlBuffer);
    geometry.computeVertexNormals();
    geometry.center();

    const material = new THREE.MeshStandardMaterial({
      color: 0x4a9eff,
      metalness: 0.15,
      roughness: 0.45,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    currentMeshRef.current = mesh;

    geometry.computeBoundingSphere();
    const r = geometry.boundingSphere?.radius ?? 50;
    const dist = Math.max(r * 2.8, 20);
    camera.position.set(dist, dist * 0.85, dist);
    controls.target.set(0, 0, 0);
    controls.update();
  }, [stlBuffer]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} id="viewer" className="h-full w-full rounded-xl bg-zinc-950" />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-between gap-2 p-3">
        <div className="pointer-events-auto max-w-[min(100%,24rem)] rounded-lg border border-white/10 bg-zinc-950/90 px-3 py-2 text-xs text-zinc-300 shadow-lg backdrop-blur-sm">
          {projectLoading ? (
            <div className="text-zinc-400">Preparing project…</div>
          ) : projectError ? (
            <div className="text-rose-300" title={projectError}>
              Project error: {projectError}
            </div>
          ) : project ? (
            <div className="space-y-1">
              <div className="font-medium text-zinc-100">{project.name}</div>
              <div className="font-mono text-[10px] text-zinc-500" title={project.id}>
                {shortId(project.id)}
              </div>
              {onNewProject ? (
                <button
                  type="button"
                  className="mt-1 rounded border border-white/15 bg-white/5 px-2 py-1 text-[11px] text-zinc-200 transition-colors hover:bg-white/10 disabled:opacity-50"
                  disabled={projectLoading}
                  onClick={() => void onNewProject()}
                >
                  New project
                </button>
              ) : null}
            </div>
          ) : (
            <div className="text-zinc-500">No project — sign in to save prompts.</div>
          )}
        </div>
      </div>
      {isGenerating ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex justify-center px-3">
          <div className="rounded-full border border-indigo-500/40 bg-zinc-950/90 px-4 py-2 text-xs font-medium text-indigo-200 shadow-lg backdrop-blur-sm">
            Generating… previous model stays until the new STL is ready.
          </div>
        </div>
      ) : null}
    </div>
  );
}

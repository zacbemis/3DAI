import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Simple Three.js viewport (grid + orbit controls).
 */
export function StlImportViewer() {
  const containerRef = useRef<HTMLDivElement>(null);

  const sceneRef = useRef<any | null>(null);
  const cameraRef = useRef<any | null>(null);
  const rendererRef = useRef<any | null>(null);
  const controlsRef = useRef<any | null>(null);
  const currentMeshRef = useRef<any | null>(null);
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

  return (
    <div ref={containerRef} id="viewer" className="h-full w-full rounded-xl bg-zinc-950" />
  );
}

import * as THREE from 'three';

/** Encode binary buffer as base64 (renderer-safe). */
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function attributeToBase64(attr: THREE.BufferAttribute): string {
  const arr = attr.array;
  const slice = arr.buffer.slice(arr.byteOffset, arr.byteOffset + arr.byteLength);
  return bufferToBase64(slice as ArrayBuffer);
}

/**
 * "my_model.stl" -> "MyModel"
 */
export function sanitizeComponentName(filename: string): string {
  const base = filename.replace(/\.stl$/i, '');
  const parts = base.split(/[^a-zA-Z0-9]+/).filter(Boolean);
  const pascal = parts
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join('');
  let name = pascal || 'Model';
  if (!/^[A-Za-z_]/.test(name)) {
    name = `Model${name}`;
  }
  return name;
}

/**
 * Build a React Three Fiber mesh component file as a string.
 * Expects geometry with position + normals (STL meshes are non-indexed).
 */
export function generateMeshComponentTsx(
  geometry: THREE.BufferGeometry,
  sourceFilename: string,
): { componentName: string; content: string; outputFilename: string } {
  geometry.computeVertexNormals();

  const posAttr = geometry.attributes.position as THREE.BufferAttribute;
  const normAttr = geometry.attributes.normal as THREE.BufferAttribute;
  if (!normAttr) {
    throw new Error('Geometry must have normals');
  }

  const positionB64 = attributeToBase64(posAttr);
  const normalB64 = attributeToBase64(normAttr);

  const componentName = sanitizeComponentName(sourceFilename);
  const safeSource = sourceFilename.replace(/\\/g, '/');

  const content = `/**
 * Auto-generated from "${safeSource}"
 * Mesh component for React Three Fiber.
 */
import { useMemo } from 'react';
import * as THREE from 'three';
import type { ThreeElements } from '@react-three/fiber';

const POSITION_B64 = ${JSON.stringify(positionB64)};
const NORMAL_B64 = ${JSON.stringify(normalB64)};

function decodeFloat32(b64: string): Float32Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Float32Array(bytes.buffer);
}

function useGeneratedGeometry() {
  return useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(decodeFloat32(POSITION_B64), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(decodeFloat32(NORMAL_B64), 3));
    return g;
  }, []);
}

export function ${componentName}(props: ThreeElements['mesh']) {
  const geometry = useGeneratedGeometry();
  return (
    <mesh {...props} geometry={geometry}>
      <meshPhongMaterial color="#4a9eff" specular="#111111" shininess={100} />
    </mesh>
  );
}

export default ${componentName};
`;

  const outputFilename = `${componentName}.tsx`;
  return { componentName, content, outputFilename };
}

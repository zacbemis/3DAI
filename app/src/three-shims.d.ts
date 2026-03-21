/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'three' {
  // Minimal shim: treat the Three.js module as `any` so `THREE.Scene`, etc. compile.
  const THREE: any;
  export = THREE;
}

declare module 'three/examples/jsm/loaders/STLLoader.js' {
  export const STLLoader: any;
}

declare module 'three/examples/jsm/controls/OrbitControls.js' {
  export const OrbitControls: any;
}


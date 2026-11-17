"use client";

import { useEffect, useRef, useState } from "react";
import { extractContoursFromRgba } from "@/lib/contour3d";
import {
  drawDesign,
  drawSilhouetteMask,
  getEdgeAppearance,
  getSilhouetteKey,
  MASK_SIZE,
  prepareDesignFont,
  TEX_H,
  TEX_W,
} from "@/lib/drawDesign";
import { SHAPE_MAP } from "@/lib/shapes";
import { SIZE_INFO } from "@/lib/pricing";
import type { KeychainDesign } from "@/lib/types";
import DesignPreview from "./DesignPreview";

type Props = {
  design: KeychainDesign;
  /** Segundo llavero cuando el usuario está creando su Dúo Favorito */
  partnerDesign?: KeychainDesign | null;
  duoFocus?: "both" | "first" | "second";
  onDuoFocusChange?: (focus: "both" | "first" | "second") => void;
  /** Contador opcional para girar automáticamente al reverso cuando se edita el texto trasero */
  flipSignal?: { side: "front" | "back"; seq: number } | null;
  /** Acción rápida para abrir el modal de pedido desde la mitad 3D */
  priceLabel?: string;
  onOrderClick?: () => void;
};

const WORLD_SPAN = 1.65;
const EXTRUDE_DEPTH = 0.095;

type LoadedMedia = {
  image: HTMLImageElement | null;
  drawing: HTMLImageElement | null;
};

export default function Keychain3D({
  design,
  partnerDesign = null,
  duoFocus = "both",
  onDuoFocusChange,
  flipSignal = null,
  priceLabel,
  onOrderClick,
}: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({
    design,
    partnerDesign,
    duoFocus,
  });

  const mediaCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const media1Ref = useRef<LoadedMedia>({ image: null, drawing: null });
  const media2Ref = useRef<LoadedMedia>({ image: null, drawing: null });
  const syncSceneRef = useRef<(forceGeo?: boolean) => void>(() => {});
  const pauseUntilRef = useRef<number>(0);
  const cameraApiRef = useRef<{
    front: () => void;
    back: () => void;
    reset: () => void;
    zoomIn: () => void;
    zoomOut: () => void;
  }>({
    front: () => {},
    back: () => {},
    reset: () => {},
    zoomIn: () => {},
    zoomOut: () => {},
  });

  const autoRotateRef = useRef(true);
  const [autoRotate, setAutoRotate] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    autoRotateRef.current = autoRotate;
    if (autoRotate) pauseUntilRef.current = 0;
  }, [autoRotate]);

  useEffect(() => {
    if (!flipSignal) return;
    if (flipSignal.side === "back") {
      // Mantiene visible el reverso durante 8 segundos sin disparar re-render en cascada
      pauseUntilRef.current = performance.now() + 8000;
      cameraApiRef.current.back();
    } else {
      pauseUntilRef.current = performance.now() + 1800;
      cameraApiRef.current.front();
    }
  }, [flipSignal]);

  // Montaje único del motor Three.js
  useEffect(() => {
    let disposed = false;
    let raf = 0;
    const cleanups: Array<() => void> = [];

    (async () => {
      let THREE: typeof import("three");
      try {
        THREE = await import("three");
      } catch {
        if (!disposed) setFailed(true);
        return;
      }
      if (disposed) return;
      const mount = mountRef.current;
      if (!mount) return;

      let renderer: import("three").WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        });
      } catch {
        if (!disposed) setFailed(true);
        return;
      }

      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.08;

      const el = renderer.domElement;
      el.style.display = "block";
      el.style.width = "100%";
      el.style.height = "100%";
      el.style.touchAction = "none";
      mount.appendChild(el);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
      let targetCamZ = 3.55;
      camera.position.set(0, 0.1, targetCamZ);
      camera.lookAt(0, 0.05, 0);

      // Iluminación de estudio cálida que resalta el grosor 3D, el bisel y el metal
      scene.add(new THREE.HemisphereLight(0xfffcf5, 0xdbeafe, 1.25));
      const keyLight = new THREE.DirectionalLight(0xffffff, 1.55);
      keyLight.position.set(2.8, 3.6, 4.2);
      scene.add(keyLight);
      const fillLight = new THREE.DirectionalLight(0xffedd5, 0.85);
      fillLight.position.set(-3.2, 1.4, 2.8);
      scene.add(fillLight);
      const rimLight = new THREE.DirectionalLight(0xe0f2fe, 0.75);
      rimLight.position.set(0, 2.2, -3.6);
      scene.add(rimLight);

      const stageGroup = new THREE.Group();
      scene.add(stageGroup);

      // Materiales metálicos compartidos (argolla y cadenita)
      const goldMat = new THREE.MeshStandardMaterial({
        color: 0xe6c15a,
        metalness: 0.9,
        roughness: 0.22,
      });
      const jumpRingGeo = new THREE.TorusGeometry(0.068, 0.017, 12, 28);
      const keyRingGeo = new THREE.TorusGeometry(0.145, 0.024, 14, 36);
      const chainLinkGeo = new THREE.TorusGeometry(0.044, 0.013, 10, 20);

      // Canvas de máscara reutilizable para extruir cualquier forma o nombre
      const maskCanvas = document.createElement("canvas");
      maskCanvas.width = MASK_SIZE;
      maskCanvas.height = MASK_SIZE;
      const maskCtx = maskCanvas.getContext("2d", { willReadFrequently: true });
      if (!maskCtx) {
        setFailed(true);
        return;
      }

      /** Construye la geometría 3D extruida real con UVs planares exactos para frente, reverso y cantos */
      function buildKeychainGeometry(d: KeychainDesign): {
        geometry: import("three").BufferGeometry;
        lugX: number;
        lugY: number;
      } {
        const { lugXNorm, lugYNorm } = drawSilhouetteMask(maskCtx!, d);
        const imgData = maskCtx!.getImageData(0, 0, MASK_SIZE, MASK_SIZE);
        const contour = extractContoursFromRgba(imgData.data, MASK_SIZE, 112);

        const threeShapes: import("three").Shape[] = [];
        for (const sh of contour.shapes) {
          if (sh.outer.length < 3) continue;
          const shape = new THREE.Shape();
          sh.outer.forEach(([nx, ny], idx) => {
            const wx = nx * WORLD_SPAN;
            const wy = ny * WORLD_SPAN;
            if (idx === 0) shape.moveTo(wx, wy);
            else shape.lineTo(wx, wy);
          });
          shape.closePath();

          for (const holePts of sh.holes) {
            if (holePts.length < 3) continue;
            const holePath = new THREE.Path();
            holePts.forEach(([nx, ny], idx) => {
              const wx = nx * WORLD_SPAN;
              const wy = ny * WORLD_SPAN;
              if (idx === 0) holePath.moveTo(wx, wy);
              else holePath.lineTo(wx, wy);
            });
            holePath.closePath();
            shape.holes.push(holePath);
          }
          threeShapes.push(shape);
        }

        // Respaldo por seguridad si alguna forma llegara vacía
        if (threeShapes.length === 0) {
          const fallback = new THREE.Shape();
          fallback.absarc(0, 0, 0.55, 0, Math.PI * 2, false);
          threeShapes.push(fallback);
        }

        let rawGeo: import("three").BufferGeometry;
        try {
          rawGeo = new THREE.ExtrudeGeometry(threeShapes, {
            depth: EXTRUDE_DEPTH,
            bevelEnabled: true,
            bevelThickness: 0.016,
            bevelSize: 0.011,
            bevelSegments: 2,
            curveSegments: 1,
          });
        } catch {
          const fallback = new THREE.Shape();
          fallback.absarc(0, 0, 0.55, 0, Math.PI * 2, false);
          rawGeo = new THREE.ExtrudeGeometry([fallback], {
            depth: EXTRUDE_DEPTH,
            bevelEnabled: true,
            bevelThickness: 0.014,
            bevelSize: 0.01,
            bevelSegments: 2,
          });
        }

        rawGeo.translate(0, 0, -EXTRUDE_DEPTH * 0.5);
        const nonIdx = rawGeo.index ? rawGeo.toNonIndexed() : rawGeo;
        if (nonIdx !== rawGeo) rawGeo.dispose();
        nonIdx.computeVertexNormals();

        const pos = nonIdx.getAttribute("position");
        const norm = nonIdx.getAttribute("normal");
        const triCount = Math.floor(pos.count / 3);

        // Separar triángulos en 3 grupos de material: 0=frente, 1=reverso, 2=canto 3D + bisel
        const frontTris: number[] = [];
        const backTris: number[] = [];
        const edgeTris: number[] = [];

        for (let t = 0; t < triCount; t++) {
          const i0 = t * 3;
          const nz = (norm.getZ(i0) + norm.getZ(i0 + 1) + norm.getZ(i0 + 2)) / 3;
          if (nz > 0.72) frontTris.push(t);
          else if (nz < -0.72) backTris.push(t);
          else edgeTris.push(t);
        }

        const ordered = [...frontTris, ...backTris, ...edgeTris];
        const newPos = new Float32Array(pos.count * 3);
        const newNorm = new Float32Array(pos.count * 3);
        const newUv = new Float32Array(pos.count * 2);

        let cursor = 0;
        for (const t of ordered) {
          for (let k = 0; k < 3; k++) {
            const src = t * 3 + k;
            const vx = pos.getX(src);
            const vy = pos.getY(src);
            const vz = pos.getZ(src);
            newPos[cursor * 3] = vx;
            newPos[cursor * 3 + 1] = vy;
            newPos[cursor * 3 + 2] = vz;
            newNorm[cursor * 3] = norm.getX(src);
            newNorm[cursor * 3 + 1] = norm.getY(src);
            newNorm[cursor * 3 + 2] = norm.getZ(src);
            newUv[cursor * 2] = vx / WORLD_SPAN + 0.5;
            newUv[cursor * 2 + 1] = vy / WORLD_SPAN + 0.5;
            cursor++;
          }
        }
        nonIdx.dispose();

        const finalGeo = new THREE.BufferGeometry();
        finalGeo.setAttribute("position", new THREE.BufferAttribute(newPos, 3));
        finalGeo.setAttribute("normal", new THREE.BufferAttribute(newNorm, 3));
        finalGeo.setAttribute("uv", new THREE.BufferAttribute(newUv, 2));
        finalGeo.clearGroups();
        const frontVerts = frontTris.length * 3;
        const backVerts = backTris.length * 3;
        const edgeVerts = edgeTris.length * 3;
        finalGeo.addGroup(0, frontVerts, 0);
        finalGeo.addGroup(frontVerts, backVerts, 1);
        finalGeo.addGroup(frontVerts + backVerts, edgeVerts, 2);

        return {
          geometry: finalGeo,
          lugX: lugXNorm * WORLD_SPAN,
          lugY: lugYNorm * WORLD_SPAN,
        };
      }

      /** Crea una unidad completa de llavero 3D (cuerpo extruido + argolla + cadena individual) */
      function createKeychainUnit() {
        const root = new THREE.Group();

        const frontCanvas = document.createElement("canvas");
        frontCanvas.width = TEX_W;
        frontCanvas.height = TEX_H;
        const frontCtx = frontCanvas.getContext("2d")!;

        const backCanvas = document.createElement("canvas");
        backCanvas.width = TEX_W;
        backCanvas.height = TEX_H;
        const backCtx = backCanvas.getContext("2d")!;

        const frontTex = new THREE.CanvasTexture(frontCanvas);
        frontTex.colorSpace = THREE.SRGBColorSpace;
        frontTex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());

        const backTex = new THREE.CanvasTexture(backCanvas);
        backTex.colorSpace = THREE.SRGBColorSpace;
        backTex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());

        const frontMat = new THREE.MeshStandardMaterial({
          map: frontTex,
          roughness: 0.42,
          metalness: 0.08,
        });
        const backMat = new THREE.MeshStandardMaterial({
          map: backTex,
          roughness: 0.5,
          metalness: 0.08,
        });
        const edgeMat = new THREE.MeshStandardMaterial({
          color: 0x6d3f1a,
          roughness: 0.72,
          metalness: 0.06,
        });

        const initGeo = new THREE.BufferGeometry();
        const bodyMesh = new THREE.Mesh(initGeo, [frontMat, backMat, edgeMat]);
        root.add(bodyMesh);

        // Argolla de unión vertical que atraviesa el ojal superior + aro de llavero
        const hardware = new THREE.Group();
        const jumpRing = new THREE.Mesh(jumpRingGeo, goldMat);
        jumpRing.rotation.y = Math.PI * 0.5;
        jumpRing.position.set(0, 0.055, 0);
        hardware.add(jumpRing);

        const splitRing = new THREE.Mesh(keyRingGeo, goldMat);
        splitRing.position.set(0, 0.215, 0);
        splitRing.rotation.x = 0.22;
        hardware.add(splitRing);

        // Cadena colgante individual cuando no está en modo Dúo
        const soloChain = new THREE.Group();
        const chainCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(0.08, 0.33, 0),
          new THREE.Vector3(0.22, 0.45, 0.02),
          new THREE.Vector3(0.36, 0.38, -0.02),
          new THREE.Vector3(0.45, 0.2, 0.01),
        ]);
        const links = 10;
        for (let i = 0; i < links; i++) {
          const t = (i + 0.5) / links;
          const lm = new THREE.Mesh(chainLinkGeo, goldMat);
          lm.position.copy(chainCurve.getPointAt(t));
          lm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), chainCurve.getTangentAt(t));
          if (i % 2 === 1) lm.rotateX(Math.PI * 0.5);
          soloChain.add(lm);
        }
        // Segundo aro al final de la cadenita para llevar dos llaveros
        const extraRing = new THREE.Mesh(keyRingGeo, goldMat);
        extraRing.scale.setScalar(0.76);
        extraRing.position.set(0.49, 0.08, 0.01);
        soloChain.add(extraRing);
        hardware.add(soloChain);

        root.add(hardware);

        let lastSilKey = "";
        let lastLug: [number, number] = [0, 0.55];

        const update = (
          d: KeychainDesign,
          media: LoadedMedia,
          showSoloChain: boolean,
          forceGeo = false,
        ) => {
          // 1. Pintar texturas de alta resolución inmediatamente
          drawDesign(frontCtx, d, { image: media.image, drawing: media.drawing, back: false });
          drawDesign(backCtx, d, { back: true });
          frontTex.needsUpdate = true;
          backTex.needsUpdate = true;

          // 2. Actualizar propiedades físicas de material y canto 3D
          const edge = getEdgeAppearance(d);
          edgeMat.color.set(edge.color);
          edgeMat.roughness = edge.roughness;
          edgeMat.metalness = edge.metalness;

          const isMetallic =
            d.base !== "nombre" &&
            (d.surfaceMaterial === "metal-oro" || d.surfaceMaterial === "metal-plata");
          frontMat.metalness = isMetallic ? 0.55 : 0.06;
          frontMat.roughness = isMetallic ? 0.28 : d.surfaceMaterial === "color" || d.base === "nombre" ? 0.34 : 0.62;
          backMat.metalness = frontMat.metalness;
          backMat.roughness = frontMat.roughness;

          // 3. Reconstruir la silueta 3D extruida cada vez que cambia la forma, el modo o el nombre recortado
          const silKey = getSilhouetteKey(d);
          if (forceGeo || silKey !== lastSilKey) {
            lastSilKey = silKey;
            const built = buildKeychainGeometry(d);
            const prev = bodyMesh.geometry;
            bodyMesh.geometry = built.geometry;
            prev.dispose();
            lastLug = [built.lugX, built.lugY];
            hardware.position.set(built.lugX, built.lugY, 0);
            // Argolla lateral izquierda para llavero de Solo Nombre, superior para Superficie Grabada
            hardware.rotation.z = d.base === "nombre" && !d.image ? Math.PI * 0.42 : 0;
          }

          soloChain.visible = showSoloChain;
        };

        const dispose = () => {
          bodyMesh.geometry.dispose();
          frontTex.dispose();
          backTex.dispose();
          frontMat.dispose();
          backMat.dispose();
          edgeMat.dispose();
        };

        return {
          root,
          update,
          dispose,
          getRingTopWorld: () => {
            const rz = hardware.rotation.z;
            const localX = lastLug[0] - Math.sin(rz) * 0.26;
            const localY = lastLug[1] + Math.cos(rz) * 0.26;
            return [
              root.position.x + localX * root.scale.x,
              root.position.y + localY * root.scale.y,
            ] as [number, number];
          },
        };
      }

      const unit1 = createKeychainUnit();
      const unit2 = createKeychainUnit();
      stageGroup.add(unit1.root);
      stageGroup.add(unit2.root);

      // Cadenita puente dorada que une los 2 llaveros cuando está activo el modo Dúo + cadenita
      const duoBridgeChain = new THREE.Group();
      const duoLinks: import("three").Mesh[] = [];
      for (let i = 0; i < 15; i++) {
        const lm = new THREE.Mesh(chainLinkGeo, goldMat);
        duoBridgeChain.add(lm);
        duoLinks.push(lm);
      }
      stageGroup.add(duoBridgeChain);

      function updateDuoBridge(p1: [number, number], p2: [number, number]) {
        const midX = (p1[0] + p2[0]) * 0.5;
        const peakY = Math.max(p1[1], p2[1]) + 0.22;
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(p1[0], p1[1], 0),
          new THREE.Vector3((p1[0] + midX) * 0.5, peakY - 0.04, 0.02),
          new THREE.Vector3(midX, peakY, 0),
          new THREE.Vector3((p2[0] + midX) * 0.5, peakY - 0.04, -0.02),
          new THREE.Vector3(p2[0], p2[1], 0),
        ]);
        duoLinks.forEach((lm, idx) => {
          const t = (idx + 0.5) / duoLinks.length;
          lm.position.copy(curve.getPointAt(t));
          lm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), curve.getTangentAt(t));
          if (idx % 2 === 1) lm.rotateY(Math.PI * 0.5);
        });
      }

      const syncScene = (forceGeo = false) => {
        const { design: d1, partnerDesign: d2, duoFocus: focus } = stateRef.current;
        const s1 = SIZE_INFO[d1.size]?.scale ?? 1;

        if (d2 && focus === "both") {
          const s2 = SIZE_INFO[d2.size]?.scale ?? 1;
          unit1.root.visible = true;
          unit2.root.visible = true;
          unit1.root.scale.setScalar(s1 * 0.72);
          unit2.root.scale.setScalar(s2 * 0.72);
          unit1.root.position.set(-0.66, -0.08, 0);
          unit2.root.position.set(0.66, -0.08, 0);
          unit1.root.rotation.z = 0.04;
          unit2.root.rotation.z = -0.04;

          unit1.update(d1, media1Ref.current, false, forceGeo);
          unit2.update(d2, media2Ref.current, false, forceGeo);

          duoBridgeChain.visible = Boolean(d1.chain);
          if (d1.chain) {
            updateDuoBridge(unit1.getRingTopWorld(), unit2.getRingTopWorld());
          }
        } else if (d2 && focus === "second") {
          const s2 = SIZE_INFO[d2.size]?.scale ?? 1;
          unit1.root.visible = false;
          unit2.root.visible = true;
          duoBridgeChain.visible = false;
          unit2.root.scale.setScalar(s2);
          unit2.root.position.set(0, -0.08, 0);
          unit2.root.rotation.z = 0;
          unit2.update(d2, media2Ref.current, Boolean(d1.chain), forceGeo);
        } else {
          unit1.root.visible = true;
          unit2.root.visible = false;
          duoBridgeChain.visible = false;
          unit1.root.scale.setScalar(s1);
          unit1.root.position.set(0, -0.08, 0);
          unit1.root.rotation.z = 0;
          unit1.update(d1, media1Ref.current, Boolean(d1.chain), forceGeo);
        }
      };

      syncSceneRef.current = syncScene;
      syncScene(true);

      // Interacción: arrastrar para girar 360° + rueda para acercar/alejar
      let rotY = -0.18;
      let rotX = 0.05;
      let dragging = false;
      let lastX = 0;
      let lastY = 0;
      let targetRot: { x: number; y: number } | null = null;
      let baseFitZ = 3.55;
      let userZoomOffset = 0;

      const onDown = (e: PointerEvent) => {
        dragging = true;
        targetRot = null;
        lastX = e.clientX;
        lastY = e.clientY;
        try {
          el.setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      };
      const onMove = (e: PointerEvent) => {
        if (!dragging) return;
        rotY += (e.clientX - lastX) * 0.0095;
        rotX = Math.max(-0.85, Math.min(0.85, rotX + (e.clientY - lastY) * 0.0075));
        lastX = e.clientX;
        lastY = e.clientY;
      };
      const onUp = () => {
        dragging = false;
      };
      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        userZoomOffset = Math.max(-1.1, Math.min(1.5, userZoomOffset + e.deltaY * 0.0018));
        targetCamZ = baseFitZ + userZoomOffset;
      };

      el.addEventListener("pointerdown", onDown);
      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerup", onUp);
      el.addEventListener("pointercancel", onUp);
      el.addEventListener("wheel", onWheel, { passive: false });
      cleanups.push(() => {
        el.removeEventListener("pointerdown", onDown);
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerup", onUp);
        el.removeEventListener("pointercancel", onUp);
        el.removeEventListener("wheel", onWheel);
      });

      cameraApiRef.current = {
        front: () => {
          // Normalizar rotY para girar por el camino corto
          rotY = ((rotY + Math.PI) % (Math.PI * 2)) - Math.PI;
          targetRot = { y: 0, x: 0.04 };
        },
        back: () => {
          rotY = ((rotY + Math.PI) % (Math.PI * 2)) - Math.PI;
          targetRot = { y: Math.PI, x: 0.04 };
        },
        reset: () => {
          rotY = ((rotY + Math.PI) % (Math.PI * 2)) - Math.PI;
          targetRot = { y: 0, x: 0.04 };
          userZoomOffset = 0;
          targetCamZ = baseFitZ;
        },
        zoomIn: () => {
          userZoomOffset = Math.max(-1.1, userZoomOffset - 0.35);
          targetCamZ = baseFitZ + userZoomOffset;
        },
        zoomOut: () => {
          userZoomOffset = Math.min(1.5, userZoomOffset + 0.35);
          targetCamZ = baseFitZ + userZoomOffset;
        },
      };

      const resize = () => {
        const w = Math.max(1, mount.clientWidth);
        const h = Math.max(1, mount.clientHeight);
        renderer.setSize(w, h, false);
        const aspect = w / h;
        camera.aspect = aspect;
        // Ajustar distancia automáticamente si la pantalla es vertical o en modo Dúo
        const isDuoBoth = Boolean(stateRef.current.partnerDesign && stateRef.current.duoFocus === "both");
        const neededHalfW = isDuoBoth ? 1.48 : 1.05;
        const neededHalfH = 1.12;
        const tanHalfFov = Math.tan((camera.fov * Math.PI) / 360);
        const zForH = neededHalfH / tanHalfFov;
        const zForW = neededHalfW / (tanHalfFov * Math.max(0.45, aspect));
        baseFitZ = Math.max(zForH, zForW);
        targetCamZ = baseFitZ + userZoomOffset;
        camera.updateProjectionMatrix();
      };

      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(mount);
      cleanups.push(() => ro.disconnect());

      let wasDuoBoth = Boolean(stateRef.current.partnerDesign && stateRef.current.duoFocus === "both");
      const clockStart = performance.now();

      const animate = () => {
        raf = requestAnimationFrame(animate);
        const nowDuoBoth = Boolean(stateRef.current.partnerDesign && stateRef.current.duoFocus === "both");
        if (nowDuoBoth !== wasDuoBoth) {
          wasDuoBoth = nowDuoBoth;
          resize();
        }

        if (targetRot) {
          rotY += (targetRot.y - rotY) * 0.14;
          rotX += (targetRot.x - rotX) * 0.14;
          if (Math.abs(targetRot.y - rotY) < 0.003 && Math.abs(targetRot.x - rotX) < 0.003) {
            rotY = targetRot.y;
            rotX = targetRot.x;
            targetRot = null;
          }
        } else if (!dragging && autoRotateRef.current && performance.now() > pauseUntilRef.current) {
          rotY += 0.0065;
        }

        camera.position.z += (targetCamZ - camera.position.z) * 0.12;
        const bob = Math.sin((performance.now() - clockStart) * 0.0018) * 0.025;
        stageGroup.position.y = bob;
        stageGroup.rotation.y = rotY;
        stageGroup.rotation.x = rotX;

        renderer.render(scene, camera);
      };
      animate();

      cleanups.push(() => {
        cancelAnimationFrame(raf);
        unit1.dispose();
        unit2.dispose();
        jumpRingGeo.dispose();
        keyRingGeo.dispose();
        chainLinkGeo.dispose();
        goldMat.dispose();
        renderer.dispose();
        if (el.parentNode) el.parentNode.removeChild(el);
      });
    })();

    return () => {
      disposed = true;
      cleanups.forEach((fn) => fn());
    };
  }, []);

  // Sincronización INMEDIATA al cambiar cualquier forma, color, letra, mascota o dúo
  useEffect(() => {
    let alive = true;
    stateRef.current = { design, partnerDesign, duoFocus };
    const cache = mediaCacheRef.current;

    const resolveCached = (src: string): HTMLImageElement | null => {
      if (!src) return null;
      return cache.get(src) ?? null;
    };

    // Paso 1: redibujo y reconstrucción 3D instantáneos (0 ms de espera)
    media1Ref.current = {
      image: resolveCached(design.image),
      drawing: resolveCached(design.drawing),
    };
    media2Ref.current = partnerDesign
      ? {
          image: resolveCached(partnerDesign.image),
          drawing: resolveCached(partnerDesign.drawing),
        }
      : { image: null, drawing: null };
    syncSceneRef.current(false);

    // Paso 2: si hay una fuente nueva o imagen recién subida, cargar en segundo plano y refrescar
    const loadImg = (src: string): Promise<HTMLImageElement | null> => {
      if (!src) return Promise.resolve(null);
      const hit = cache.get(src);
      if (hit) return Promise.resolve(hit);
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          if (cache.size > 24) {
            const firstKey = cache.keys().next().value;
            if (firstKey) cache.delete(firstKey);
          }
          cache.set(src, img);
          resolve(img);
        };
        img.onerror = () => resolve(null);
        img.src = src;
      });
    };

    const tasks: Promise<unknown>[] = [
      prepareDesignFont(design),
      loadImg(design.image),
      loadImg(design.drawing),
    ];
    if (partnerDesign) {
      tasks.push(
        prepareDesignFont(partnerDesign),
        loadImg(partnerDesign.image),
        loadImg(partnerDesign.drawing),
      );
    }

    Promise.all(tasks).then((results) => {
      if (!alive) return;
      media1Ref.current = {
        image: (results[1] as HTMLImageElement | null) ?? null,
        drawing: (results[2] as HTMLImageElement | null) ?? null,
      };
      if (partnerDesign) {
        media2Ref.current = {
          image: (results[4] as HTMLImageElement | null) ?? null,
          drawing: (results[5] as HTMLImageElement | null) ?? null,
        };
      }
      // Si es modo Solo Nombre, forzar actualización geométrica una vez cargada la fuente exacta
      const needsFontGeo =
        design.base === "nombre" || (partnerDesign !== null && partnerDesign.base === "nombre");
      syncSceneRef.current(needsFontGeo);
    });

    return () => {
      alive = false;
    };
  }, [design, partnerDesign, duoFocus]);

  const activeShapeName =
    design.base === "nombre"
      ? "Solo Nombre 3D"
      : SHAPE_MAP[design.shapeId || "geo-placa-clasica"]?.name ?? "Placa clásica";

  const modeBadge = partnerDesign
    ? "💞 Dúo 3D (2 llaveros)"
    : design.orderKind === "mascota" && design.petDesignId
      ? `🐾 Mascota #${String(design.petDesignId).padStart(4, "0")}`
      : design.base === "nombre"
        ? "✨ Nombre como Llavero 3D"
        : `🪵 ${activeShapeName}`;

  if (failed) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-amber-50 via-orange-50/40 to-stone-100 p-4">
        <div className={`grid items-center gap-3 ${partnerDesign ? "max-w-md grid-cols-2" : "max-w-[260px] grid-cols-1"}`}>
          <DesignPreview design={design} />
          {partnerDesign && <DesignPreview design={partnerDesign} />}
        </div>
        <p className="text-xs font-semibold text-stone-500">{modeBadge}</p>
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[radial-gradient(circle_at_50%_38%,#fffdf9_0%,#fef3c7_52%,#e7e5e4_100%)] select-none">
      {/* Barra superior flotante de información del llavero */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-wrap items-center justify-between gap-2 p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-stone-900/85 px-3 py-1 text-[11px] font-extrabold tracking-wide text-white shadow-sm backdrop-blur">
            3D EN VIVO · {modeBadge}
          </span>
          <span className="rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-bold text-stone-700 shadow-sm backdrop-blur">
            {SIZE_INFO[design.size].label} {SIZE_INFO[design.size].cm} cm
          </span>
        </div>

        {/* Selector de enfoque cuando está en modo Dúo */}
        {partnerDesign && onDuoFocusChange && (
          <div className="pointer-events-auto flex items-center gap-1 rounded-full bg-white/90 p-1 shadow backdrop-blur">
            {(
              [
                ["both", "Ambos"],
                ["first", "#1"],
                ["second", "#2"],
              ] as const
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => onDuoFocusChange(val)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold transition ${
                  duoFocus === val
                    ? "bg-amber-500 text-white shadow-sm"
                    : "text-stone-600 hover:bg-amber-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Escenario 3D interactivo a pantalla completa de su mitad */}
      <div
        ref={mountRef}
        className="h-full w-full flex-1 cursor-grab touch-none active:cursor-grabbing"
        aria-label="Vista previa 3D interactiva del llavero"
      />

      {/* Sombra ambiental suave de estudio */}
      <div className="pointer-events-none absolute bottom-16 left-1/2 h-5 w-48 -translate-x-1/2 rounded-full bg-stone-900/12 blur-xl sm:bottom-20 sm:w-64" />

      {/* Controles flotantes inferiores de cámara 3D */}
      <div className="absolute inset-x-0 bottom-0 z-10 flex flex-wrap items-center justify-between gap-2 bg-gradient-to-t from-stone-900/12 via-transparent to-transparent p-2.5 sm:p-4">
        <div className="flex flex-wrap items-center gap-1.5 rounded-full border border-white/70 bg-white/88 p-1 shadow-md backdrop-blur">
          <button
            type="button"
            onClick={() => setAutoRotate((v) => !v)}
            className={`rounded-full px-3 py-1.5 text-xs font-extrabold transition ${
              autoRotate
                ? "bg-amber-500 text-white shadow-sm"
                : "text-stone-700 hover:bg-stone-100"
            }`}
          >
            {autoRotate ? "⏸ Pausar" : "▶ Girar"}
          </button>
          <button
            type="button"
            onClick={() => {
              setAutoRotate(false);
              cameraApiRef.current.front();
            }}
            className="rounded-full px-2.5 py-1.5 text-xs font-bold text-stone-700 transition hover:bg-amber-50 hover:text-amber-800"
          >
            Frente
          </button>
          <button
            type="button"
            onClick={() => {
              setAutoRotate(false);
              cameraApiRef.current.back();
            }}
            className="rounded-full px-2.5 py-1.5 text-xs font-bold text-stone-700 transition hover:bg-amber-50 hover:text-amber-800"
          >
            Detrás
          </button>
          <button
            type="button"
            onClick={() => cameraApiRef.current.zoomIn()}
            title="Acercar"
            className="hidden rounded-full px-2 py-1.5 text-xs font-black text-stone-700 transition hover:bg-amber-50 sm:inline-block"
          >
            ＋
          </button>
          <button
            type="button"
            onClick={() => cameraApiRef.current.zoomOut()}
            title="Alejar"
            className="hidden rounded-full px-2 py-1.5 text-xs font-black text-stone-700 transition hover:bg-amber-50 sm:inline-block"
          >
            －
          </button>
          <button
            type="button"
            onClick={() => cameraApiRef.current.reset()}
            title="Centrar vista"
            className="rounded-full px-2.5 py-1.5 text-xs font-bold text-stone-500 transition hover:bg-stone-100 hover:text-stone-800"
          >
            ↺
          </button>
        </div>

        {onOrderClick && priceLabel && (
          <button
            type="button"
            onClick={onOrderClick}
            className="hidden items-center gap-1.5 rounded-full bg-stone-900 px-4 py-2 text-xs font-extrabold text-white shadow-lg transition hover:bg-amber-600 active:scale-95 xl:inline-flex"
          >
            <span>Pedir ahora</span>
            <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-black text-stone-950">
              {priceLabel}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

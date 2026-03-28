import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Button } from "@/components/ui/button";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";

/** FIFA max dimensions: 105m × 68m (length along X, width along Z). */
const PITCH_LENGTH = 105;
const PITCH_WIDTH = 68;

/** Half pitch length / width in local plane coordinates (see `PitchPlane`). */
const HW = PITCH_WIDTH / 2;
const HL = PITCH_LENGTH / 2;

/** Center circle radius (Law 1). */
const CENTER_CIRCLE_RADIUS = 9.15;

/** Center mark radius. */
const CENTER_SPOT_RADIUS = 0.4;

/** Penalty area: 16.5 m from goal line, 40.32 m across goal line (Law 1). */
const PENALTY_DEPTH = 16.5;
const PENALTY_HALF_WIDTH = 40.32 / 2;

/** Goal area (“6-yard box”): 5.5 m from goal line, 18.32 m wide (Law 1). */
const GOAL_AREA_DEPTH = 5.5;
const GOAL_AREA_HALF_WIDTH = 18.32 / 2;

/** Penalty mark: 11 m from goal line along goal–goal axis (Law 1). */
const PENALTY_MARK_FROM_GOAL_LINE = 11;

/** Goal opening: inner width 7.32 m, crossbar height 2.44 m (Law 1). */
const GOAL_WIDTH = 7.32;
const GOAL_HEIGHT = 2.44;
const GOAL_POST_THICK = 0.2;
const HALF_GOAL_WIDTH = GOAL_WIDTH / 2;
/** Post centers inset so inner edges ≈ 7.32 m apart. */
const GOAL_POST_CENTER_X = HALF_GOAL_WIDTH - GOAL_POST_THICK / 2;

/** Matches `PitchPlane`: plane in XY then X−90°, Z+90° → horizontal pitch in world space. */
const PITCH_ROTATION: [number, number, number] = [-Math.PI / 2, 0, Math.PI / 2];

/** Slight offset along plane normal (local +Z) so lines render above the grass. */
const LINE_LIFT = 0.04;

const BALL_RADIUS = 0.41;

/** Player discs sit slightly above line markings to avoid z-fighting. */
const PLAYER_LIFT = LINE_LIFT + 0.06;
const DEFAULT_PLAYER_RADIUS = 0.65;
/** Position smoothing (higher = snappier). */
const PLAYER_POSITION_SMOOTHING = 14;

export type PitchPlayer = {
  id: string;
  /** Across the pitch (m), −half width … +half width (same as plane X). */
  x: number;
  /** Along the pitch toward center (m), −half length … +half length (same as plane Y). */
  y: number;
  color: string;
  /** Disc radius in meters; defaults to `DEFAULT_PLAYER_RADIUS`. */
  radius?: number;
};

/** Wide-line width in world units (meters). */
const OUTLINE_LINE_WIDTH = 0.16;

/** Default (broadcast-style) camera. */
const CAMERA_DEFAULT_POSITION: [number, number, number] = [0, 50, 120];
const CAMERA_DEFAULT_FOV = 20;

/** Straight-down overhead: high +Y, look at pitch center; Z is screen-up to avoid gimbal lock. */
const CAMERA_OVERHEAD_Y = 118;

/** Higher = snappier camera blend between default and overhead (roughly ~1/e in 1/λ seconds). */
const CAMERA_VIEW_SMOOTHING = 11;

function applyOverheadToScratch(
  sc: THREE.PerspectiveCamera,
  overhead: boolean,
  targetPos: THREE.Vector3,
  targetQuat: THREE.Quaternion,
  targetFov: { current: number },
) {
  if (overhead) {
    sc.position.set(0, CAMERA_OVERHEAD_Y, 0);
    sc.up.set(0, 0, -1);
    sc.lookAt(0, 0, 0);
    targetFov.current = 38;
  } else {
    sc.position.set(...CAMERA_DEFAULT_POSITION);
    sc.up.set(0, 1, 0);
    sc.lookAt(0, 0, 0);
    targetFov.current = CAMERA_DEFAULT_FOV;
  }
  targetPos.copy(sc.position);
  targetQuat.copy(sc.quaternion);
}

function CameraRig({ overhead }: { overhead: boolean }) {
  const { camera } = useThree();
  const targetPos = useRef(new THREE.Vector3());
  const targetQuat = useRef(new THREE.Quaternion());
  const targetFov = useRef(CAMERA_DEFAULT_FOV);
  const scratchCam = useMemo(() => new THREE.PerspectiveCamera(), []);
  const didInitialSnap = useRef(false);
  const localYWorld = useRef(new THREE.Vector3());

  useLayoutEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    applyOverheadToScratch(
      scratchCam,
      overhead,
      targetPos.current,
      targetQuat.current,
      targetFov,
    );
    if (!didInitialSnap.current) {
      cam.position.copy(targetPos.current);
      cam.quaternion.copy(targetQuat.current);
      cam.up.copy(scratchCam.up);
      cam.fov = targetFov.current;
      cam.updateProjectionMatrix();
      didInitialSnap.current = true;
    }
  }, [camera, overhead, scratchCam]);

  useFrame((_, delta) => {
    if (!didInitialSnap.current) return;
    const cam = camera as THREE.PerspectiveCamera;
    const dt = Math.min(delta, 0.08);
    const t = 1 - Math.exp(-CAMERA_VIEW_SMOOTHING * dt);
    cam.position.lerp(targetPos.current, t);
    cam.quaternion.slerp(targetQuat.current, t);
    cam.fov = THREE.MathUtils.lerp(cam.fov, targetFov.current, t);
    localYWorld.current.set(0, 1, 0).applyQuaternion(cam.quaternion);
    cam.up.copy(localYWorld.current);
    cam.updateProjectionMatrix();
  });

  return null;
}

function outlineLoopPoints(): THREE.Vector3[] {
  const corners = [
    new THREE.Vector3(-HW, -HL, LINE_LIFT),
    new THREE.Vector3(HW, -HL, LINE_LIFT),
    new THREE.Vector3(HW, HL, LINE_LIFT),
    new THREE.Vector3(-HW, HL, LINE_LIFT),
  ];
  return [...corners, corners[0]!];
}

function halfwayLinePoints(): THREE.Vector3[] {
  return [
    new THREE.Vector3(-HW, 0, LINE_LIFT),
    new THREE.Vector3(HW, 0, LINE_LIFT),
  ];
}

function centerCirclePoints(): THREE.Vector3[] {
  const curve = new THREE.EllipseCurve(
    0,
    0,
    CENTER_CIRCLE_RADIUS,
    CENTER_CIRCLE_RADIUS,
    0,
    Math.PI * 2,
  );
  const pts = curve
    .getPoints(64)
    .map((p) => new THREE.Vector3(p.x, p.y, LINE_LIFT));
  // Full circle: first and last samples coincide; drop one so we don't double the closing segment.
  if (
    pts.length > 1 &&
    pts[0]!.distanceToSquared(pts[pts.length - 1]!) < 1e-8
  ) {
    pts.pop();
  }
  pts.push(pts[0]!);
  return pts;
}

/** Axis-aligned rectangle in pitch plane (X = across goal, Y = along pitch toward center). */
function rectLoopPoints(
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
): THREE.Vector3[] {
  const corners = [
    new THREE.Vector3(xMin, yMin, LINE_LIFT),
    new THREE.Vector3(xMax, yMin, LINE_LIFT),
    new THREE.Vector3(xMax, yMax, LINE_LIFT),
    new THREE.Vector3(xMin, yMax, LINE_LIFT),
  ];
  return [...corners, corners[0]!];
}

/** Goal at y = −HL; boxes extend toward y+. */
function penaltyBoxNegativeYPoints(): THREE.Vector3[] {
  const yGoal = -HL;
  return rectLoopPoints(
    -PENALTY_HALF_WIDTH,
    PENALTY_HALF_WIDTH,
    yGoal,
    yGoal + PENALTY_DEPTH,
  );
}

function goalAreaNegativeYPoints(): THREE.Vector3[] {
  const yGoal = -HL;
  return rectLoopPoints(
    -GOAL_AREA_HALF_WIDTH,
    GOAL_AREA_HALF_WIDTH,
    yGoal,
    yGoal + GOAL_AREA_DEPTH,
  );
}

/** Goal at y = +HL; boxes extend toward y−. */
function penaltyBoxPositiveYPoints(): THREE.Vector3[] {
  const yGoal = HL;
  return rectLoopPoints(
    -PENALTY_HALF_WIDTH,
    PENALTY_HALF_WIDTH,
    yGoal - PENALTY_DEPTH,
    yGoal,
  );
}

function goalAreaPositiveYPoints(): THREE.Vector3[] {
  const yGoal = HL;
  return rectLoopPoints(
    -GOAL_AREA_HALF_WIDTH,
    GOAL_AREA_HALF_WIDTH,
    yGoal - GOAL_AREA_DEPTH,
    yGoal,
  );
}

/**
 * Penalty arc (“D”): radius 9.15 m about penalty mark, outside penalty area (Law 1).
 * Arc meets the back edge of the penalty box where |x| = half-chord from center line.
 */
function penaltyArcNegativeYPoints(): THREE.Vector3[] {
  const yGoal = -HL;
  const penaltyMarkY = yGoal + PENALTY_MARK_FROM_GOAL_LINE;
  const backLineY = yGoal + PENALTY_DEPTH;
  const dy = backLineY - penaltyMarkY;
  const halfChord = Math.sqrt(
    Math.max(0, CENTER_CIRCLE_RADIUS * CENTER_CIRCLE_RADIUS - dy * dy),
  );
  const startAngle = Math.atan2(dy, halfChord);
  const endAngle = Math.atan2(dy, -halfChord);
  const curve = new THREE.EllipseCurve(
    0,
    penaltyMarkY,
    CENTER_CIRCLE_RADIUS,
    CENTER_CIRCLE_RADIUS,
    startAngle,
    endAngle,
  );
  return curve.getPoints(48).map((p) => new THREE.Vector3(p.x, p.y, LINE_LIFT));
}

function penaltyArcPositiveYPoints(): THREE.Vector3[] {
  const yGoal = HL;
  const penaltyMarkY = yGoal - PENALTY_MARK_FROM_GOAL_LINE;
  const backLineY = yGoal - PENALTY_DEPTH;
  const dy = backLineY - penaltyMarkY;
  const halfChord = Math.sqrt(
    Math.max(0, CENTER_CIRCLE_RADIUS * CENTER_CIRCLE_RADIUS - dy * dy),
  );
  const startAngle = Math.atan2(dy, halfChord);
  const endAngle = Math.atan2(dy, -halfChord);
  const curve = new THREE.EllipseCurve(
    0,
    penaltyMarkY,
    CENTER_CIRCLE_RADIUS,
    CENTER_CIRCLE_RADIUS,
    startAngle,
    endAngle,
    true,
    0,
  );
  return curve.getPoints(48).map((p) => new THREE.Vector3(p.x, p.y, LINE_LIFT));
}

/** Plane + markings + spots share one parent `group` so local XY matches `planeGeometry` (Z = normal). */
function PitchPlane() {
  return (
    <mesh>
      <planeGeometry args={[PITCH_WIDTH, PITCH_LENGTH]} />
      <meshStandardMaterial color="#2f6b3c" roughness={0.85} metalness={0.05} />
    </mesh>
  );
}

/** Filled center mark (dot); slightly above line z to avoid z-fighting. */
function CenterSpot() {
  return (
    <mesh position={[0, 0, LINE_LIFT + 0.008]}>
      <circleGeometry args={[CENTER_SPOT_RADIUS, 32]} />
      <meshBasicMaterial
        color="#e8eef2"
        depthTest
        polygonOffset
        polygonOffsetFactor={-1}
        polygonOffsetUnits={-1}
      />
    </mesh>
  );
}

/** Penalty marks: 11 m from each goal line on halfway axis (Law 1). */
function PenaltySpots() {
  const z = LINE_LIFT + 0.008;
  const yNeg = -HL + PENALTY_MARK_FROM_GOAL_LINE;
  const yPos = HL - PENALTY_MARK_FROM_GOAL_LINE;
  return (
    <>
      <mesh position={[0, yNeg, z]}>
        <circleGeometry args={[CENTER_SPOT_RADIUS, 32]} />
        <meshBasicMaterial
          color="#e8eef2"
          depthTest
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </mesh>
      <mesh position={[0, yPos, z]}>
        <circleGeometry args={[CENTER_SPOT_RADIUS, 32]} />
        <meshBasicMaterial
          color="#e8eef2"
          depthTest
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </mesh>
    </>
  );
}

/** Soft radial mask: white center → transparent edge (for alphaMap). */
function createBallShadowAlphaMap(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const c = size / 2;
  const g = ctx.createRadialGradient(c, c, 0, c, c, c);
  g.addColorStop(0, "rgba(255,255,255,0.95)");
  g.addColorStop(0.42, "rgba(255,255,255,0.35)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

function createSoccerBallTexture(): THREE.CanvasTexture {
  const w = 512;
  const h = 256;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#FFFF00";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#1c1c1c";

  function drawPentagon(cx: number, cy: number, r: number) {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  const spots: [number, number, number][] = [
    [0.08, 0.25, 0.07],
    [0.22, 0.5, 0.065],
    [0.38, 0.22, 0.07],
    [0.5, 0.55, 0.068],
    [0.62, 0.28, 0.065],
    [0.78, 0.48, 0.07],
    [0.92, 0.22, 0.06],
    [0.15, 0.78, 0.065],
    [0.35, 0.85, 0.06],
    [0.55, 0.75, 0.068],
    [0.72, 0.82, 0.062],
    [0.88, 0.72, 0.065],
  ];
  for (const [u, v, s] of spots) {
    drawPentagon(u * w, v * h, s * h);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

const BALL_SHADOW_RADIUS = BALL_RADIUS * 1.38;

function FootballBall({
  x = 0,
  y = 0,
  z = 0,
}: {
  x?: number;
  y?: number;
  z?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const texture = useMemo(() => createSoccerBallTexture(), []);
  const shadowAlphaMap = useMemo(() => createBallShadowAlphaMap(), []);

  useLayoutEffect(() => {
    return () => {
      texture.dispose();
      shadowAlphaMap.dispose();
    };
  }, [texture, shadowAlphaMap]);

  useFrame((_, delta) => {
    const m = meshRef.current;
    if (m) m.rotation.z += delta * 0.45;
  });

  return (
    <group position={[x, -y, 0]}>
      {/* Drawn after players; depthTest off so it layers above player discs where they overlap. */}
      <mesh
        position={[0, 0, LINE_LIFT + 0.004]}
        rotation={[0, 0, 0]}
        renderOrder={9}
      >
        <circleGeometry args={[BALL_SHADOW_RADIUS, 40]} />
        <meshBasicMaterial
          color="#050806"
          transparent
          opacity={0.5}
          alphaMap={shadowAlphaMap}
          depthWrite={false}
          depthTest={false}
          toneMapped={false}
        />
      </mesh>
      <mesh
        ref={meshRef}
        position={[0, 0, z + BALL_RADIUS + LINE_LIFT + 0.02]}
        renderOrder={10}
      >
        <sphereGeometry args={[BALL_RADIUS, 48, 32]} />
        <meshStandardMaterial
          map={texture}
          roughness={0.38}
          metalness={0.06}
          depthTest
          depthWrite
        />
      </mesh>
    </group>
  );
}

const goalFrameMaterial = new THREE.MeshStandardMaterial({
  color: "#eef1f4",
  roughness: 0.45,
  metalness: 0.25,
});

/**
 * One goal: two posts + crossbar in pitch local space (Z up from turf).
 * `yLine` is the goal line (±HL).
 */
function GoalFrame3D({ yLine }: { yLine: number }) {
  const zPost = GOAL_HEIGHT / 2;
  const zCross = GOAL_HEIGHT - GOAL_POST_THICK / 2;
  return (
    <>
      <mesh
        position={[-GOAL_POST_CENTER_X, yLine, zPost]}
        material={goalFrameMaterial}
      >
        <boxGeometry args={[GOAL_POST_THICK, GOAL_POST_THICK, GOAL_HEIGHT]} />
      </mesh>
      <mesh
        position={[GOAL_POST_CENTER_X, yLine, zPost]}
        material={goalFrameMaterial}
      >
        <boxGeometry args={[GOAL_POST_THICK, GOAL_POST_THICK, GOAL_HEIGHT]} />
      </mesh>
      <mesh position={[0, yLine, zCross]} material={goalFrameMaterial}>
        <boxGeometry
          args={[
            GOAL_WIDTH + GOAL_POST_THICK,
            GOAL_POST_THICK,
            GOAL_POST_THICK,
          ]}
        />
      </mesh>
    </>
  );
}

/**
 * Touchlines, goal lines, halfway line, center circle, penalty areas, penalty arcs, goal areas.
 */
function PitchMarkings() {
  const { size } = useThree();

  const material = useMemo(
    () =>
      new LineMaterial({
        color: "#e8eef2",
        linewidth: OUTLINE_LINE_WIDTH,
        worldUnits: true,
        depthTest: true,
      }),
    [],
  );

  useLayoutEffect(() => {
    material.resolution.set(size.width, size.height);
  }, [material, size.width, size.height]);

  const outline = useMemo(() => {
    const geometry = new LineGeometry().setFromPoints(outlineLoopPoints());
    return new Line2(geometry, material);
  }, [material]);

  const halfway = useMemo(() => {
    const geometry = new LineGeometry().setFromPoints(halfwayLinePoints());
    return new Line2(geometry, material);
  }, [material]);

  const centerCircle = useMemo(() => {
    const geometry = new LineGeometry().setFromPoints(centerCirclePoints());
    return new Line2(geometry, material);
  }, [material]);

  const penaltyNeg = useMemo(() => {
    const geometry = new LineGeometry().setFromPoints(
      penaltyBoxNegativeYPoints(),
    );
    return new Line2(geometry, material);
  }, [material]);

  const penaltyPos = useMemo(() => {
    const geometry = new LineGeometry().setFromPoints(
      penaltyBoxPositiveYPoints(),
    );
    return new Line2(geometry, material);
  }, [material]);

  const goalAreaNeg = useMemo(() => {
    const geometry = new LineGeometry().setFromPoints(
      goalAreaNegativeYPoints(),
    );
    return new Line2(geometry, material);
  }, [material]);

  const goalAreaPos = useMemo(() => {
    const geometry = new LineGeometry().setFromPoints(
      goalAreaPositiveYPoints(),
    );
    return new Line2(geometry, material);
  }, [material]);

  const penaltyArcNeg = useMemo(() => {
    const geometry = new LineGeometry().setFromPoints(
      penaltyArcNegativeYPoints(),
    );
    return new Line2(geometry, material);
  }, [material]);

  const penaltyArcPos = useMemo(() => {
    const geometry = new LineGeometry().setFromPoints(
      penaltyArcPositiveYPoints(),
    );
    return new Line2(geometry, material);
  }, [material]);

  return (
    <>
      <primitive object={outline} />
      <primitive object={halfway} />
      <primitive object={centerCircle} />
      <primitive object={penaltyNeg} />
      <primitive object={penaltyPos} />
      <primitive object={penaltyArcNeg} />
      <primitive object={penaltyArcPos} />
      <primitive object={goalAreaNeg} />
      <primitive object={goalAreaPos} />
    </>
  );
}

function PlayerCircle({
  x,
  y,
  color,
  radius = DEFAULT_PLAYER_RADIUS,
}: Pick<PitchPlayer, "x" | "y" | "color" | "radius">) {
  const groupRef = useRef<THREE.Group>(null);
  const target = useRef(new THREE.Vector3(x, -y, PLAYER_LIFT));
  const current = useRef(new THREE.Vector3(x, -y, PLAYER_LIFT));
  const initialized = useRef(false);

  useLayoutEffect(() => {
    target.current.set(x, -y, PLAYER_LIFT);
    if (!initialized.current) {
      initialized.current = true;
      const g = groupRef.current;
      if (g) {
        current.current.copy(target.current);
        g.position.copy(current.current);
      }
    }
  }, [x, y]);

  useFrame((_, delta) => {
    const g = groupRef.current;
    if (!g) return;
    const t = 1 - Math.exp(-PLAYER_POSITION_SMOOTHING * delta);
    current.current.lerp(target.current, t);
    g.position.copy(current.current);
  });

  return (
    <group ref={groupRef}>
      <mesh renderOrder={0}>
        <circleGeometry args={[radius, 32]} />
        <meshBasicMaterial
          color={color}
          depthTest
          depthWrite
        />
      </mesh>
    </group>
  );
}

function PlayerMarkers({ players }: { players: PitchPlayer[] }) {
  return (
    <>
      {players.map((p) => (
        <PlayerCircle
          key={p.id}
          x={p.x}
          y={p.y}
          color={p.color}
          radius={p.radius}
        />
      ))}
    </>
  );
}

type PitchViewProps = {
  /** Player positions in pitch plane metres; updates are smoothed toward new coordinates. */
  players?: PitchPlayer[];
  /**
   * Ball centre in pitch plane (m). Omitted = default centre spot; `null` = not drawn (e.g. not detected).
   */
  ballPosition?: { x: number; y: number; z?: number } | null;
};

export function PitchView({
  players = [],
  ballPosition,
}: PitchViewProps) {
  const [overhead, setOverhead] = useState(false);

  return (
    <div className="relative h-full min-h-0 w-full flex-1 rounded-md overflow-hidden border border-border/50">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="absolute top-2 right-2 z-10 bg-background/80 backdrop-blur-sm"
        onClick={() => setOverhead((o) => !o)}
      >
        {overhead ? "Default view" : "Overhead view"}
      </Button>
      <Canvas
        camera={{
          position: CAMERA_DEFAULT_POSITION,
          fov: CAMERA_DEFAULT_FOV,
        }}
        gl={{ antialias: true }}
      >
        <CameraRig overhead={overhead} />
        <color attach="background" args={["#0c0f12"]} />
        <ambientLight intensity={0.45} />
        <directionalLight position={[40, 60, 24]} intensity={1.1} />
        <group rotation={PITCH_ROTATION}>
          <PitchPlane />
          <PitchMarkings />
          <CenterSpot />
          <PenaltySpots />
          {!overhead && (
            <>
              <GoalFrame3D yLine={-HL} />
              <GoalFrame3D yLine={HL} />
            </>
          )}
          <PlayerMarkers players={players} />
          {(ballPosition === undefined || ballPosition !== null) && (
            <FootballBall
              x={ballPosition?.x ?? 0}
              y={ballPosition?.y ?? 0}
              z={ballPosition?.z ?? 0}
            />
          )}
        </group>
      </Canvas>
    </div>
  );
}

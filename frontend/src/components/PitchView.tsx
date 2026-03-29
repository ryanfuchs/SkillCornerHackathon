import {
  Canvas,
  useFrame,
  useThree,
  type ThreeEvent,
} from "@react-three/fiber";
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import * as THREE from "three";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import playerInfoJson from "@/data/playerInfoById.json";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

/** Stops R3F raycasts so events reach player discs (otherwise the pitch plane wins first). */
const noopRaycast: NonNullable<THREE.Object3D["raycast"]> = () => {};

type PlayerInfoRecord = {
  id: number;
  name: { full_name: string; short_name: string };
  position: {
    position_group: string;
    role_name: string;
    role_acronym: string;
  };
  team: { short_name: string; acronym: string; side: string };
  match: { number: number };
  physical?: {
    distance?: number;
    minutes?: number;
    m_per_min?: number;
  };
};

const PLAYERS_BY_ID = playerInfoJson.playersById as Record<
  string,
  PlayerInfoRecord
>;

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
const DEFAULT_PLAYER_RADIUS = 0.78;
/** Applied to marker radius when jersey numbers are shown (larger hit + label). */
const PLAYER_MARKER_NUMBER_SCALE = 1.52;
/** Number plane width/height in world units = radius × this (fills most of the disc). */
const PLAYER_NUMBER_PLANE_SCALE = 2.45;
/** Soft halo radius multiplier (additive, behind the solid disc). */
const PLAYER_GLOW_SCALE = 1.42;
const PLAYER_GLOW_OPACITY = 0.38;
/** Black outline thickness (m) around the focused player disc. */
const FOCUS_PLAYER_RING_WIDTH = 0.11;
/** Focused player disc (tooltip hover/pin) uses this instead of team color. */
/** Highlight when hovered or selected from the bar (visible on green pitch). */
const FOCUS_PLAYER_COLOR = "#008000";
/** Position smoothing (higher = snappier). */
const PLAYER_POSITION_SMOOTHING = 14;

function createPlayerNumberTexture(digits: string): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, size, size);
  const fs =
    digits.length >= 2 ? Math.round(size * 0.62) : Math.round(size * 0.78);
  ctx.font = `800 ${fs}px ui-sans-serif, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const cx = size / 2;
  const cy = size / 2 + size * 0.015;
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(12, Math.round(fs * 0.16));
  ctx.strokeStyle = "rgba(0,0,0,0.62)";
  ctx.strokeText(digits, cx, cy);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(digits, cx, cy);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  return tex;
}

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

/** Default (broadcast-style) camera — pulled back / wider FOV so the full pitch fits with margin. */
const CAMERA_DEFAULT_POSITION: [number, number, number] = [0, 54, 168];
const CAMERA_DEFAULT_FOV = 24;

/** Straight-down overhead: high +Y, look at pitch center; Z is screen-up to avoid gimbal lock. */
const CAMERA_OVERHEAD_Y = 118;
const CAMERA_OVERHEAD_FOV = 38;

/** Orbit / zoom limits (world units from target). */
const ORBIT_MIN_DISTANCE = 65;
const ORBIT_MAX_DISTANCE = 420;

type PitchThemeColors = {
  pitchSurface: string;
  pitchLine: string;
  sceneBackground: string;
  primary: string;
  accent: string;
  foreground: string;
};

const PITCH_THEME_FALLBACK: PitchThemeColors = {
  pitchSurface: "#325c75",
  pitchLine: "#e8e2db",
  sceneBackground: "#152a53",
  primary: "#1a3263",
  accent: "#fab95b",
  foreground: "#1a3263",
};

function readCssColorVariable(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const variableValue = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  if (!variableValue) return fallback;
  const probe = document.createElement("span");
  probe.style.color = variableValue;
  document.body.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();
  return resolved || fallback;
}

function usePitchThemeColors(): PitchThemeColors {
  const [colors, setColors] = useState<PitchThemeColors>(PITCH_THEME_FALLBACK);

  useLayoutEffect(() => {
    setColors({
      pitchSurface: readCssColorVariable(
        "--pitch-surface",
        PITCH_THEME_FALLBACK.pitchSurface,
      ),
      pitchLine: readCssColorVariable(
        "--pitch-line",
        PITCH_THEME_FALLBACK.pitchLine,
      ),
      sceneBackground: readCssColorVariable(
        "--pitch-scene-background",
        PITCH_THEME_FALLBACK.sceneBackground,
      ),
      primary: readCssColorVariable("--primary", PITCH_THEME_FALLBACK.primary),
      accent: readCssColorVariable("--accent", PITCH_THEME_FALLBACK.accent),
      foreground: readCssColorVariable(
        "--foreground",
        PITCH_THEME_FALLBACK.foreground,
      ),
    });
  }, []);

  return colors;
}

function applyPitchViewPreset(
  cam: THREE.PerspectiveCamera,
  controls: OrbitControls,
  overhead: boolean,
) {
  controls.target.set(0, 0, 0);
  if (overhead) {
    cam.up.set(0, 0, -1);
    cam.position.set(0, CAMERA_OVERHEAD_Y, 0);
    cam.fov = CAMERA_OVERHEAD_FOV;
  } else {
    cam.up.set(0, 1, 0);
    cam.position.set(...CAMERA_DEFAULT_POSITION);
    cam.fov = CAMERA_DEFAULT_FOV;
  }
  cam.lookAt(controls.target);
  cam.updateProjectionMatrix();
  controls.update();
}

/** Drag: orbit · wheel / pinch: zoom · right-drag / shift-drag: pan */
function PitchOrbitControls({ overhead }: { overhead: boolean }) {
  const { camera, gl } = useThree();
  const controlsRef = useRef<OrbitControls | null>(null);

  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const controls = new OrbitControls(cam, gl.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.minDistance = ORBIT_MIN_DISTANCE;
    controls.maxDistance = ORBIT_MAX_DISTANCE;
    controls.minPolarAngle = 0.08;
    controls.maxPolarAngle = Math.PI - 0.08;
    controls.minAzimuthAngle = -Infinity;
    controls.maxAzimuthAngle = Infinity;
    controls.screenSpacePanning = false;
    controls.zoomSpeed = 0.85;
    controls.rotateSpeed = 0.65;
    controls.panSpeed = 0.65;
    controlsRef.current = controls;
    return () => {
      controls.dispose();
      controlsRef.current = null;
    };
  }, [camera, gl]);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    applyPitchViewPreset(camera as THREE.PerspectiveCamera, controls, overhead);
  }, [overhead, camera]);

  useFrame(() => {
    controlsRef.current?.update();
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
function PitchPlane({ surfaceColor }: { surfaceColor: string }) {
  return (
    <mesh raycast={noopRaycast}>
      <planeGeometry args={[PITCH_WIDTH, PITCH_LENGTH]} />
      <meshStandardMaterial
        color={surfaceColor}
        roughness={0.85}
        metalness={0.05}
      />
    </mesh>
  );
}

/** Filled center mark (dot); slightly above line z to avoid z-fighting. */
function CenterSpot({ lineColor }: { lineColor: string }) {
  return (
    <mesh position={[0, 0, LINE_LIFT + 0.008]} raycast={noopRaycast}>
      <circleGeometry args={[CENTER_SPOT_RADIUS, 32]} />
      <meshBasicMaterial
        color={lineColor}
        depthTest
        polygonOffset
        polygonOffsetFactor={-1}
        polygonOffsetUnits={-1}
      />
    </mesh>
  );
}

/** Penalty marks: 11 m from each goal line on halfway axis (Law 1). */
function PenaltySpots({ lineColor }: { lineColor: string }) {
  const z = LINE_LIFT + 0.008;
  const yNeg = -HL + PENALTY_MARK_FROM_GOAL_LINE;
  const yPos = HL - PENALTY_MARK_FROM_GOAL_LINE;
  return (
    <>
      <mesh position={[0, yNeg, z]} raycast={noopRaycast}>
        <circleGeometry args={[CENTER_SPOT_RADIUS, 32]} />
        <meshBasicMaterial
          color={lineColor}
          depthTest
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </mesh>
      <mesh position={[0, yPos, z]} raycast={noopRaycast}>
        <circleGeometry args={[CENTER_SPOT_RADIUS, 32]} />
        <meshBasicMaterial
          color={lineColor}
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

function createSoccerBallTexture(
  baseColor: string,
  panelColor: string,
): THREE.CanvasTexture {
  const w = 512;
  const h = 256;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = panelColor;

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
  ballBaseColor,
  ballPanelColor,
  shadowColor,
}: {
  x?: number;
  y?: number;
  z?: number;
  ballBaseColor: string;
  ballPanelColor: string;
  shadowColor: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const texture = useMemo(
    () => createSoccerBallTexture(ballBaseColor, ballPanelColor),
    [ballBaseColor, ballPanelColor],
  );
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
        raycast={noopRaycast}
      >
        <circleGeometry args={[BALL_SHADOW_RADIUS, 40]} />
        <meshBasicMaterial
          color={shadowColor}
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
        raycast={noopRaycast}
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

/**
 * One goal: two posts + crossbar in pitch local space (Z up from turf).
 * `yLine` is the goal line (±HL).
 */
function GoalFrame3D({
  yLine,
  lineColor,
}: {
  yLine: number;
  lineColor: string;
}) {
  const goalFrameMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: lineColor,
        roughness: 0.45,
        metalness: 0.25,
      }),
    [lineColor],
  );

  useLayoutEffect(() => {
    return () => {
      goalFrameMaterial.dispose();
    };
  }, [goalFrameMaterial]);

  const zPost = GOAL_HEIGHT / 2;
  const zCross = GOAL_HEIGHT - GOAL_POST_THICK / 2;
  return (
    <>
      <mesh
        position={[-GOAL_POST_CENTER_X, yLine, zPost]}
        material={goalFrameMaterial}
        raycast={noopRaycast}
      >
        <boxGeometry args={[GOAL_POST_THICK, GOAL_POST_THICK, GOAL_HEIGHT]} />
      </mesh>
      <mesh
        position={[GOAL_POST_CENTER_X, yLine, zPost]}
        material={goalFrameMaterial}
        raycast={noopRaycast}
      >
        <boxGeometry args={[GOAL_POST_THICK, GOAL_POST_THICK, GOAL_HEIGHT]} />
      </mesh>
      <mesh
        position={[0, yLine, zCross]}
        material={goalFrameMaterial}
        raycast={noopRaycast}
      >
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
function PitchMarkings({ lineColor }: { lineColor: string }) {
  const { size } = useThree();

  const material = useMemo(
    () =>
      new LineMaterial({
        color: lineColor,
        linewidth: OUTLINE_LINE_WIDTH,
        worldUnits: true,
        depthTest: true,
      }),
    [lineColor],
  );

  useLayoutEffect(() => {
    material.resolution.set(size.width, size.height);
  }, [material, size.width, size.height]);

  const outline = useMemo(() => {
    const geometry = new LineGeometry().setFromPoints(outlineLoopPoints());
    const line = new Line2(geometry, material);
    line.raycast = noopRaycast;
    return line;
  }, [material]);

  const halfway = useMemo(() => {
    const geometry = new LineGeometry().setFromPoints(halfwayLinePoints());
    const line = new Line2(geometry, material);
    line.raycast = noopRaycast;
    return line;
  }, [material]);

  const centerCircle = useMemo(() => {
    const geometry = new LineGeometry().setFromPoints(centerCirclePoints());
    const line = new Line2(geometry, material);
    line.raycast = noopRaycast;
    return line;
  }, [material]);

  const penaltyNeg = useMemo(() => {
    const geometry = new LineGeometry().setFromPoints(
      penaltyBoxNegativeYPoints(),
    );
    const line = new Line2(geometry, material);
    line.raycast = noopRaycast;
    return line;
  }, [material]);

  const penaltyPos = useMemo(() => {
    const geometry = new LineGeometry().setFromPoints(
      penaltyBoxPositiveYPoints(),
    );
    const line = new Line2(geometry, material);
    line.raycast = noopRaycast;
    return line;
  }, [material]);

  const goalAreaNeg = useMemo(() => {
    const geometry = new LineGeometry().setFromPoints(
      goalAreaNegativeYPoints(),
    );
    const line = new Line2(geometry, material);
    line.raycast = noopRaycast;
    return line;
  }, [material]);

  const goalAreaPos = useMemo(() => {
    const geometry = new LineGeometry().setFromPoints(
      goalAreaPositiveYPoints(),
    );
    const line = new Line2(geometry, material);
    line.raycast = noopRaycast;
    return line;
  }, [material]);

  const penaltyArcNeg = useMemo(() => {
    const geometry = new LineGeometry().setFromPoints(
      penaltyArcNegativeYPoints(),
    );
    const line = new Line2(geometry, material);
    line.raycast = noopRaycast;
    return line;
  }, [material]);

  const penaltyArcPos = useMemo(() => {
    const geometry = new LineGeometry().setFromPoints(
      penaltyArcPositiveYPoints(),
    );
    const line = new Line2(geometry, material);
    line.raycast = noopRaycast;
    return line;
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

function InteractivePlayerCircle({
  playerId,
  x,
  y,
  color,
  radius = DEFAULT_PLAYER_RADIUS,
  onHoverEnter,
  onHoverLeave,
  onSelect,
  isFocused,
  showNumberOverlay,
  shirtNumber,
}: Pick<PitchPlayer, "x" | "y" | "color" | "radius"> & {
  playerId: string;
  onHoverEnter: (id: string) => void;
  onHoverLeave: (id: string) => void;
  /** Primary click on marker — syncs with dropdown selection. */
  onSelect?: (id: string) => void;
  /** Hovered HUD / bar focus — white disc. */
  isFocused: boolean;
  showNumberOverlay: boolean;
  shirtNumber: string;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const { gl } = useThree();
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

  const numberTexture = useMemo(
    () => (showNumberOverlay ? createPlayerNumberTexture(shirtNumber) : null),
    [showNumberOverlay, shirtNumber],
  );

  useLayoutEffect(() => {
    return () => {
      numberTexture?.dispose();
    };
  }, [numberTexture]);

  const hitRadius = isFocused ? radius + FOCUS_PLAYER_RING_WIDTH : radius;

  const pointerHandlers = {
    onPointerDown: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      if (e.nativeEvent.button !== 0) return;
      onSelect?.(playerId);
    },
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      gl.domElement.style.cursor = "pointer";
      onHoverEnter(playerId);
    },
    onPointerOut: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      gl.domElement.style.cursor = "auto";
      onHoverLeave(playerId);
    },
  };

  const glowColor = isFocused ? FOCUS_PLAYER_COLOR : color;
  const fillOrder = isFocused ? 2 : 1;
  const numberOrder = fillOrder + 1;
  const hitOrder = showNumberOverlay ? fillOrder + 2 : isFocused ? 3 : 2;

  return (
    <group ref={groupRef}>
      <mesh raycast={noopRaycast} renderOrder={0}>
        <circleGeometry args={[radius * PLAYER_GLOW_SCALE, 40]} />
        <meshBasicMaterial
          color={glowColor}
          transparent
          opacity={PLAYER_GLOW_OPACITY}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          depthTest
          side={THREE.DoubleSide}
        />
      </mesh>
      {isFocused ? (
        <mesh raycast={noopRaycast} renderOrder={1}>
          <ringGeometry args={[radius, radius + FOCUS_PLAYER_RING_WIDTH, 48]} />
          <meshBasicMaterial
            color="#000000"
            depthTest
            depthWrite
            side={THREE.DoubleSide}
          />
        </mesh>
      ) : null}
      <mesh raycast={noopRaycast} renderOrder={fillOrder}>
        <circleGeometry args={[radius, 32]} />
        <meshBasicMaterial
          color={isFocused ? FOCUS_PLAYER_COLOR : color}
          depthTest
          depthWrite
          side={THREE.DoubleSide}
        />
      </mesh>
      {showNumberOverlay && numberTexture ? (
        <mesh
          raycast={noopRaycast}
          position={[0, 0, 0.018]}
          renderOrder={numberOrder}
        >
          <planeGeometry
            args={[
              radius * PLAYER_NUMBER_PLANE_SCALE,
              radius * PLAYER_NUMBER_PLANE_SCALE,
            ]}
          />
          <meshBasicMaterial
            map={numberTexture}
            transparent
            depthWrite={false}
            depthTest
            toneMapped={false}
          />
        </mesh>
      ) : null}
      <mesh renderOrder={hitOrder} {...pointerHandlers}>
        <circleGeometry args={[hitRadius, 32]} />
        <meshBasicMaterial
          transparent
          opacity={0}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

const MemoInteractivePlayerCircle = memo(InteractivePlayerCircle);

function PitchPlayerHudContent({
  activeId,
  showClose,
  onClose,
}: {
  activeId: string;
  showClose?: boolean;
  onClose?: () => void;
}) {
  const info = PLAYERS_BY_ID[activeId];
  const hasClose = Boolean(showClose && onClose);
  return (
    <div
      className={`relative rounded-lg border border-white/15 bg-[#0c0c0e]/95 py-2 text-left shadow-xl backdrop-blur-md ${hasClose ? "pl-3 pr-8" : "px-3"}`}
    >
      {showClose && onClose ? (
        <button
          type="button"
          className="pointer-events-auto absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-md text-[#a1a1a6] transition-colors hover:bg-white/10 hover:text-[#f5f5f7]"
          aria-label="Clear player selection"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          <X className="h-3.5 w-3.5" strokeWidth={2.25} />
        </button>
      ) : null}
      {info ? (
        <>
          <p className="text-[13px] font-semibold leading-snug text-[#f5f5f7]">
            {info.name.full_name}
          </p>
          <p className="mt-0.5 text-[11px] text-[#a1a1a6]">
            {info.team.acronym} · #{info.match.number} · {info.team.side}
          </p>
          <p className="mt-1 text-[11px] leading-snug text-[#d2d2d7]">
            {info.position.position_group} · {info.position.role_name} (
            {info.position.role_acronym})
          </p>
          {info.physical ? (
            <p className="mt-1.5 border-t border-white/10 pt-1.5 text-[10px] tabular-nums text-[#98989d]">
              {info.physical.distance != null && (
                <span>{Math.round(info.physical.distance)} m · </span>
              )}
              {info.physical.minutes != null && (
                <span>{info.physical.minutes.toFixed(1)} min</span>
              )}
              {info.physical.m_per_min != null && (
                <span> · {info.physical.m_per_min.toFixed(1)} m/min</span>
              )}
            </p>
          ) : null}
        </>
      ) : (
        <p className="text-[12px] text-[#f5f5f7]">Player {activeId}</p>
      )}
    </div>
  );
}

const PlayerMarkers = memo(function PlayerMarkers({
  players,
  onHoverEnter,
  onHoverLeave,
  onSelect,
  focusedPlayerId,
  showPlayerNumbers,
}: {
  players: PitchPlayer[];
  onHoverEnter: (id: string) => void;
  onHoverLeave: (id: string) => void;
  onSelect?: (id: string) => void;
  focusedPlayerId: string | null;
  showPlayerNumbers: boolean;
}) {
  return (
    <>
      {players.map((p) => {
        const baseR = p.radius ?? DEFAULT_PLAYER_RADIUS;
        const markerRadius = showPlayerNumbers
          ? baseR * PLAYER_MARKER_NUMBER_SCALE
          : baseR;
        const info = PLAYERS_BY_ID[p.id];
        const shirtNumber =
          info?.match.number != null ? String(info.match.number) : "?";
        return (
          <MemoInteractivePlayerCircle
            key={p.id}
            playerId={p.id}
            x={p.x}
            y={p.y}
            color={p.color}
            radius={markerRadius}
            onHoverEnter={onHoverEnter}
            onHoverLeave={onHoverLeave}
            onSelect={onSelect}
            isFocused={focusedPlayerId === p.id}
            showNumberOverlay={showPlayerNumbers}
            shirtNumber={shirtNumber}
          />
        );
      })}
    </>
  );
});

type PitchSceneProps = {
  players: PitchPlayer[];
  ballPosition: { x: number; y: number; z?: number } | null | undefined;
  overhead: boolean;
  themeColors: PitchThemeColors;
  setHoveredPlayerId: Dispatch<SetStateAction<string | null>>;
  /** HUD + white disc: hover if set, else this selection. */
  hoveredPlayerId: string | null;
  selectedPlayerId: string | null;
  onSelectedPlayerIdChange?: (id: string | null) => void;
  showPlayerNumbers: boolean;
};

function PitchScene({
  players,
  ballPosition,
  overhead,
  themeColors,
  setHoveredPlayerId,
  hoveredPlayerId,
  selectedPlayerId,
  onSelectedPlayerIdChange,
  showPlayerNumbers,
}: PitchSceneProps) {
  const emphasisPlayerId = hoveredPlayerId ?? selectedPlayerId;

  const onHoverEnter = useCallback(
    (id: string) => setHoveredPlayerId(id),
    [setHoveredPlayerId],
  );

  const onHoverLeave = useCallback(
    (id: string) => {
      setHoveredPlayerId((h) => (h === id ? null : h));
    },
    [setHoveredPlayerId],
  );

  return (
    <>
      <PitchOrbitControls overhead={overhead} />
      <color attach="background" args={[themeColors.sceneBackground]} />
      <ambientLight intensity={0.45} />
      <directionalLight position={[40, 60, 24]} intensity={1.1} />
      <group rotation={PITCH_ROTATION}>
        <PitchPlane surfaceColor={themeColors.pitchSurface} />
        <PitchMarkings lineColor={themeColors.pitchLine} />
        <CenterSpot lineColor={themeColors.pitchLine} />
        <PenaltySpots lineColor={themeColors.pitchLine} />
        {!overhead && (
          <>
            <GoalFrame3D yLine={-HL} lineColor={themeColors.pitchLine} />
            <GoalFrame3D yLine={HL} lineColor={themeColors.pitchLine} />
          </>
        )}
        <PlayerMarkers
          players={players}
          onHoverEnter={onHoverEnter}
          onHoverLeave={onHoverLeave}
          onSelect={onSelectedPlayerIdChange}
          focusedPlayerId={emphasisPlayerId}
          showPlayerNumbers={showPlayerNumbers}
        />
        {(ballPosition === undefined || ballPosition !== null) && (
          <FootballBall
            x={ballPosition?.x ?? 0}
            y={ballPosition?.y ?? 0}
            z={ballPosition?.z ?? 0}
            ballBaseColor={themeColors.accent}
            ballPanelColor={themeColors.primary}
            shadowColor={themeColors.foreground}
          />
        )}
      </group>
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
  /** Highlights this player on the pitch when set; hover overrides while over a marker. */
  selectedPlayerId?: string | null;
  /** Primary-click on a marker sets the same selection as the player bar dropdown. Pass `null` to clear. */
  onSelectedPlayerIdChange?: (id: string | null) => void;
};

export const PitchView = memo(function PitchView({
  players = [],
  ballPosition,
  selectedPlayerId = null,
  onSelectedPlayerIdChange,
}: PitchViewProps) {
  const [overhead, setOverhead] = useState(false);
  const [showPlayerNumbers, setShowPlayerNumbers] = useState(false);
  const [hoveredPlayerId, setHoveredPlayerId] = useState<string | null>(null);
  const themeColors = usePitchThemeColors();
  /** Bottom HUD: hovered marker, else selected player (same priority as marker highlight). */
  const hudPlayerId = hoveredPlayerId ?? selectedPlayerId;

  return (
    <div
      className="relative h-full min-h-0 w-full flex-1 touch-none rounded-xl overflow-hidden border border-border/60"
      title="Drag: orbit · Wheel: zoom · Right-drag or Shift+drag: pan"
      onPointerLeave={() => setHoveredPlayerId(null)}
    >
      <div className="absolute top-2 right-2 z-10 flex flex-col items-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="bg-background/75 backdrop-blur-sm"
          onClick={() => setOverhead((o) => !o)}
        >
          {overhead ? "Default view" : "Overhead view"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="bg-background/75 backdrop-blur-sm"
          aria-pressed={showPlayerNumbers}
          onClick={() => setShowPlayerNumbers((v) => !v)}
        >
          {showPlayerNumbers ? "Hide numbers" : "Show numbers"}
        </Button>
      </div>
      <Canvas
        className="touch-none"
        camera={{
          position: CAMERA_DEFAULT_POSITION,
          fov: CAMERA_DEFAULT_FOV,
        }}
        gl={{ antialias: true }}
        onCreated={({ gl }) => {
          gl.domElement.style.touchAction = "none";
        }}
      >
        <PitchScene
          players={players}
          ballPosition={ballPosition}
          overhead={overhead}
          themeColors={themeColors}
          setHoveredPlayerId={setHoveredPlayerId}
          hoveredPlayerId={hoveredPlayerId}
          selectedPlayerId={selectedPlayerId}
          onSelectedPlayerIdChange={onSelectedPlayerIdChange}
          showPlayerNumbers={showPlayerNumbers}
        />
      </Canvas>
      {hudPlayerId ? (
        <div className="pointer-events-none absolute bottom-3 right-3 z-10 max-w-[min(280px,calc(100%-5.5rem))] select-none">
          <PitchPlayerHudContent
            activeId={hudPlayerId}
            showClose={selectedPlayerId != null}
            onClose={
              onSelectedPlayerIdChange
                ? () => onSelectedPlayerIdChange(null)
                : undefined
            }
          />
        </div>
      ) : null}
    </div>
  );
});

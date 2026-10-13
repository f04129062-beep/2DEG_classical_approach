import {
  ELEMENTARY_CHARGE,
  ELECTRON_MASS_KG,
  JOULE_PER_MEV,
  DEFAULT_MASS_RATIO,
  DEFAULT_B0,
  DEFAULT_L_NM,
  DEFAULT_K_MEV,
  DEFAULT_THETA_DEG,
  DEFAULT_X0_NM,
  DEFAULT_Y0_NM,
} from './constants';
import {
  SimulationParams,
  TrajectoryPoint,
  PhysicsDerived,
  TurningPoints,
  PresetScenario,
} from '../types/physics';

/**
 * Compute derived physical quantities from simulation parameters
 */
export function computeDerivedPhysics(params: SimulationParams): PhysicsDerived {
  const mStarKg = params.massRatio * ELECTRON_MASS_KG;
  
  // Cyclotron frequency in SI (s^-1)
  const omegaCSi = (ELEMENTARY_CHARGE * params.B0) / mStarKg;
  // Cyclotron frequency in ps^-1 (1 ps = 1e-12 s)
  const omegaC = omegaCSi * 1e-12;
  
  // beta = omega_c / L (nm^-1 ps^-1)
  const beta = omegaC / params.L;
  
  // Kinetic energy in Joules
  const kJoules = params.K * JOULE_PER_MEV;
  // Initial speed in SI (m/s)
  const v0Si = Math.sqrt((2 * kJoules) / mStarKg);
  // Initial speed in nm/ps (1 nm/ps = 1,000 m/s)
  const v0 = v0Si * 1e-3;
  
  // Initial velocity components
  const thetaRad = (params.theta * Math.PI) / 180;
  const vy0 = v0 * Math.sin(thetaRad);
  
  // Conserved parameter alpha = Py / m* = vy0 - (beta / 2) * x0^2 (nm/ps)
  const alpha = vy0 - (beta / 2) * (params.x0 * params.x0);
  
  // Generalized momentum in SI: Py = m* vy - (e B0 / 2L) x^2
  // In SI: vy0_si (m/s), x0_m (m), L_m (m)
  const x0_m = params.x0 * 1e-9;
  const L_m = params.L * 1e-9;
  const PyKgMs = mStarKg * (vy0 * 1e3) - (ELEMENTARY_CHARGE * params.B0 / (2 * L_m)) * (x0_m * x0_m);
  
  // Calculate turning points: V_eff(x) = K <=> |alpha + (beta / 2) x^2| = v0
  // Root 1: (beta / 2) x^2 = v0 - alpha
  const argOuter = (2 * (v0 - alpha)) / beta;
  const outer = argOuter >= 0 ? Math.sqrt(argOuter) : null;
  
  // Root 2: (beta / 2) x^2 = -v0 - alpha
  const argInner = (2 * (-v0 - alpha)) / beta;
  const inner = argInner > 0 ? Math.sqrt(argInner) : null;
  
  const canCrossZero = alpha > -v0;
  
  const allowedRegions: Array<[number, number]> = [];
  if (outer !== null) {
    if (inner === null) {
      // Allowed from -outer to +outer (Snake state crossing x=0)
      allowedRegions.push([-outer, outer]);
    } else {
      // Inner forbidden barrier (|x| < inner): particle reflected before reaching x=0
      // Depending on starting point x0:
      if (params.x0 >= 0) {
        allowedRegions.push([inner, outer]);
      } else {
        allowedRegions.push([-outer, -inner]);
      }
    }
  }
  
  const turningPoints: TurningPoints = {
    outer,
    inner,
    canCrossZero,
    allowedRegions,
  };
  
  // Minimum of V_eff(x) = 1/2 m* (alpha + beta/2 x^2)^2
  // If alpha < 0, minimum is 0 at x = sqrt(-2*alpha/beta)
  // If alpha >= 0, minimum is at x = 0 where V_eff(0) = 1/2 m* alpha^2
  let minX = 0;
  let minVeff = 0;
  if (alpha < 0) {
    minX = Math.sqrt((-2 * alpha) / beta);
    minVeff = 0;
  } else {
    minX = 0;
    minVeff = computeVeff(0, alpha, beta, mStarKg);
  }
  
  const cyclotronPeriod = (2 * Math.PI) / omegaC; // ps
  
  return {
    mStarKg,
    omegaC,
    omegaCSi,
    beta,
    v0,
    v0Si,
    alpha,
    PyKgMs,
    turningPoints,
    cyclotronPeriod,
    effectivePotentialWell: {
      minX,
      minVeff,
    },
  };
}

/**
 * Compute effective potential V_eff(x) in meV
 * V_eff(x) = 1/2 m* (alpha + (beta/2) * x^2)^2
 */
export function computeVeff(
  x: number,
  alpha: number,
  beta: number,
  mStarKg: number
): number {
  const vy = alpha + 0.5 * beta * x * x; // nm/ps
  const vySi = vy * 1e3; // m/s
  const vEffJoules = 0.5 * mStarKg * (vySi * vySi);
  return vEffJoules / JOULE_PER_MEV; // in meV
}

/**
 * High-precision RK4 step for coupled system:
 * dx/dt = vx
 * dy/dt = vy
 * dvx/dt = -beta * x * vy
 * dvy/dt = beta * x * vx
 */
interface State {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface Derivs {
  dx: number;
  dy: number;
  dvx: number;
  dvy: number;
}

function getDerivs(s: State, beta: number): Derivs {
  const bx = beta * s.x;
  return {
    dx: s.vx,
    dy: s.vy,
    dvx: -bx * s.vy,
    dvy: bx * s.vx,
  };
}

export function rk4Step(s: State, dt: number, beta: number): State {
  const k1 = getDerivs(s, beta);
  
  const s2: State = {
    x: s.x + 0.5 * dt * k1.dx,
    y: s.y + 0.5 * dt * k1.dy,
    vx: s.vx + 0.5 * dt * k1.dvx,
    vy: s.vy + 0.5 * dt * k1.dvy,
  };
  const k2 = getDerivs(s2, beta);
  
  const s3: State = {
    x: s.x + 0.5 * dt * k2.dx,
    y: s.y + 0.5 * dt * k2.dy,
    vx: s.vx + 0.5 * dt * k2.dvx,
    vy: s.vy + 0.5 * dt * k2.dvy,
  };
  const k3 = getDerivs(s3, beta);
  
  const s4: State = {
    x: s.x + dt * k3.dx,
    y: s.y + dt * k3.dy,
    vx: s.vx + dt * k3.dvx,
    vy: s.vy + dt * k3.dvy,
  };
  const k4 = getDerivs(s4, beta);
  
  return {
    x: s.x + (dt / 6) * (k1.dx + 2 * k2.dx + 2 * k3.dx + k4.dx),
    y: s.y + (dt / 6) * (k1.dy + 2 * k2.dy + 2 * k3.dy + k4.dy),
    vx: s.vx + (dt / 6) * (k1.dvx + 2 * k2.dvx + 2 * k3.dvx + k4.dvx),
    vy: s.vy + (dt / 6) * (k1.dvy + 2 * k2.dvy + 2 * k3.dvy + k4.dvy),
  };
}

/**
 * Generate full trajectory over duration T (ps)
 */
export function generateTrajectory(
  params: SimulationParams,
  derived: PhysicsDerived,
  totalTimePs: number,
  samples: number = 2000
): TrajectoryPoint[] {
  const points: TrajectoryPoint[] = [];
  const dt = totalTimePs / samples;
  const subSteps = 4; // Sub-stepping for ultra-high numerical accuracy
  const microDt = dt / subSteps;
  
  const thetaRad = (params.theta * Math.PI) / 180;
  let currentState: State = {
    x: params.x0,
    y: params.y0,
    vx: derived.v0 * Math.cos(thetaRad),
    vy: derived.v0 * Math.sin(thetaRad),
  };
  
  let t = 0;
  for (let step = 0; step <= samples; step++) {
    const speed = Math.sqrt(
      currentState.vx * currentState.vx + currentState.vy * currentState.vy
    );
    const speedSi = speed * 1e3;
    const currentEnergy =
      (0.5 * derived.mStarKg * speedSi * speedSi) / JOULE_PER_MEV;
    const B = (params.B0 * currentState.x) / params.L;
    const Py = currentState.vy - 0.5 * derived.beta * currentState.x * currentState.x;
    const Veff = computeVeff(currentState.x, derived.alpha, derived.beta, derived.mStarKg);
    
    points.push({
      t,
      x: currentState.x,
      y: currentState.y,
      vx: currentState.vx,
      vy: currentState.vy,
      speed,
      B,
      energy: currentEnergy,
      Py,
      Veff,
    });
    
    if (step < samples) {
      for (let sub = 0; sub < subSteps; sub++) {
        currentState = rk4Step(currentState, microDt, derived.beta);
      }
      t += dt;
    }
  }
  
  return points;
}

/**
 * Presets showcasing distinct physical regimes in linear gradient magnetic field
 */
export const PRESETS: PresetScenario[] = [
  {
    id: 'classic-snake',
    name: '經典蛇形束縛態 (Classic Snake State)',
    subtitle: '穿透 B=0 面 · 永恆沿 y 方向蛇形漂移',
    description:
      '電子在 x=0 兩側感受相反方向的勞侖茲力，軌跡曲率在穿過零磁場線時反轉，形成著名的蛇形導電軌道 (Snake Orbit)。',
    params: {
      massRatio: DEFAULT_MASS_RATIO,
      B0: DEFAULT_B0,
      L: DEFAULT_L_NM,
      K: 10.0,
      theta: 60.0,
      x0: 0.0,
      y0: 0.0,
    },
  },
  {
    id: 'grad-b-cycloid',
    name: '磁梯度漂移態 (Grad-B Drift Orbit)',
    subtitle: '局域於 x > 0 · 漸變旋輪迴旋漂移',
    description:
      '電子完全位於正磁場區 (x > 0)。由於 ∇B 磁場梯度，靠近強場區的迴旋半徑較小、弱場區較大，形成垂直於梯度的 ∇B 漂移。',
    params: {
      massRatio: DEFAULT_MASS_RATIO,
      B0: DEFAULT_B0,
      L: DEFAULT_L_NM,
      K: 14.0,
      theta: 85.0,
      x0: 65.0,
      y0: 0.0,
    },
  },
  {
    id: 'magnetic-mirror',
    name: '磁鏡反射態 (Magnetic Barrier Mirror)',
    subtitle: '出現內外雙轉折點 · 電子被中心反彈',
    description:
      '當 α ≤ -v₀ 時，有效位能 V_eff(x) 在中心形成能量壁壘，電子在抵達 x=0 前即被轉折反彈，無法穿過零場線。',
    params: {
      massRatio: DEFAULT_MASS_RATIO,
      B0: DEFAULT_B0,
      L: DEFAULT_L_NM,
      K: 5.0,
      theta: -80.0,
      x0: 75.0,
      y0: 0.0,
    },
  },
  {
    id: 'high-energy-wide',
    name: '高動能寬幅蛇行 (High Energy Snake Wave)',
    subtitle: 'K = 25 meV 極限能量 · 寬幅轉折振盪',
    description:
      '在允許的最高動能 25 meV 下，電子具備最大初速 (~3.62×10⁵ m/s)，橫向轉折點大幅向外延伸至百奈米尺度。',
    params: {
      massRatio: DEFAULT_MASS_RATIO,
      B0: DEFAULT_B0,
      L: DEFAULT_L_NM,
      K: 25.0,
      theta: 35.0,
      x0: 0.0,
      y0: 0.0,
    },
  },
  {
    id: 'low-energy-tight',
    name: '低動能細微蛇波 (Low Energy Tight State)',
    subtitle: 'K = 1.5 meV · 高頻密緻蛇形行進',
    description:
      '極低動能下的高頻細膩振盪，展示微觀奈米尺度下磁場對低速電子的強烈約束效應。',
    params: {
      massRatio: DEFAULT_MASS_RATIO,
      B0: DEFAULT_B0,
      L: DEFAULT_L_NM,
      K: 1.5,
      theta: 45.0,
      x0: 0.0,
      y0: 0.0,
    },
  },
  {
    id: 'beam-focusing',
    name: '電子束多角度發散與聚焦 (Electron Beam Fan)',
    subtitle: '發射角扇形展開 · 演示焦斑與包絡線',
    description:
      '同時發射一組微小夾角分佈的電子束，展示梯度磁場下的焦散線 (Caustics) 與週期性空間自聚焦現象。',
    isBeam: true,
    params: {
      massRatio: DEFAULT_MASS_RATIO,
      B0: DEFAULT_B0,
      L: DEFAULT_L_NM,
      K: 12.0,
      theta: 50.0,
      x0: 0.0,
      y0: 0.0,
    },
  },
];

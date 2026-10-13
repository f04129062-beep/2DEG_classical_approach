export interface SimulationParams {
  massRatio: number; // m* / m_e (default 0.067)
  B0: number; // Tesla (default 1.65)
  L: number; // nm (default 16 * pi^2 ≈ 157.91367 nm)
  K: number; // Kinetic energy in meV (0 ~ 25)
  theta: number; // Incident angle in degrees (-180 to 180)
  x0: number; // Initial position x in nm
  y0: number; // Initial position y in nm
}

export interface TrajectoryPoint {
  t: number; // ps
  x: number; // nm
  y: number; // nm
  vx: number; // nm/ps
  vy: number; // nm/ps
  speed: number; // nm/ps
  B: number; // Tesla
  energy: number; // meV
  Py: number; // conserved generalized momentum
  Veff: number; // meV
}

export interface TurningPoints {
  outer: number | null; // outer turning point x (nm)
  inner: number | null; // inner turning point x (nm)
  canCrossZero: boolean;
  allowedRegions: Array<[number, number]>;
}

export interface ParticleState {
  id: string;
  color: string;
  initialTheta: number;
  initialX: number;
  initialY: number;
  points: TrajectoryPoint[];
  currentPoint: TrajectoryPoint;
}

export interface PhysicsDerived {
  mStarKg: number;
  omegaC: number; // ps^-1
  omegaCSi: number; // s^-1 (Hz)
  beta: number; // nm^-1 ps^-1
  v0: number; // nm/ps
  v0Si: number; // m/s
  alpha: number; // nm/ps
  PyKgMs: number; // kg m / s
  turningPoints: TurningPoints;
  cyclotronPeriod: number; // ps
  effectivePotentialWell: {
    minX: number;
    minVeff: number;
  };
}

export interface PresetScenario {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  params: Partial<SimulationParams>;
  isBeam?: boolean;
}

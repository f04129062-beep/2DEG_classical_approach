// Fundamental physical constants (CODATA 2018 / SI)
export const ELEMENTARY_CHARGE = 1.602176634e-19; // C (Coulombs)
export const ELECTRON_MASS_KG = 9.1093837015e-31; // kg
export const JOULE_PER_MEV = 1.602176634e-22; // 1 meV = 1e-3 eV = 1.602176634e-22 J

// Given prompt parameters:
// m* = 0.067 m_e (standard for GaAs 2D electron gas)
// B0 = 1.65 T
// L = 16 * pi^2 nm ≈ 157.913670417 nm
export const DEFAULT_MASS_RATIO = 0.067;
export const DEFAULT_B0 = 1.65; // Tesla
export const DEFAULT_L_NM = 16 * Math.PI * Math.PI; // nm ≈ 157.91367 nm

// Working Kinetic Energy range requested by user: 0 ~ 25 meV
export const MIN_K_MEV = 0.05;
export const MAX_K_MEV = 25.0;
export const DEFAULT_K_MEV = 10.0;
export const DEFAULT_THETA_DEG = 45.0;
export const DEFAULT_X0_NM = 0.0;
export const DEFAULT_Y0_NM = 0.0;

// Conversion helper functions
// In simulator units:
// Length: [x] = nm (10^-9 m)
// Time:   [t] = ps (10^-12 s)
// Velocity: [v] = nm/ps = (10^-9 m) / (10^-12 s) = 1,000 m/s
export function meVToJoules(meV: number): number {
  return meV * JOULE_PER_MEV;
}

export function joulesToMeV(joules: number): number {
  return joules / JOULE_PER_MEV;
}

export function nmPsToMs(v_nm_ps: number): number {
  return v_nm_ps * 1e3; // 1 nm/ps = 1,000 m/s
}

export function msToNmPs(v_ms: number): number {
  return v_ms * 1e-3;
}

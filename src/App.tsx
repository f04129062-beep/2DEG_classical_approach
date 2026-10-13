/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  SimulationParams,
  ParticleState,
} from './types/physics';
import {
  DEFAULT_MASS_RATIO,
  DEFAULT_B0,
  DEFAULT_L_NM,
  DEFAULT_K_MEV,
  DEFAULT_THETA_DEG,
  DEFAULT_X0_NM,
  DEFAULT_Y0_NM,
} from './physics/constants';
import {
  computeDerivedPhysics,
  generateTrajectory,
  PRESETS,
} from './physics/engine';
import { RealSpaceCanvas } from './components/RealSpaceCanvas';
import { PotentialPlot } from './components/PotentialPlot';
import { PhaseSpacePlot } from './components/PhaseSpacePlot';
import { TelemetryPanel } from './components/TelemetryPanel';
import { ControlPanel } from './components/ControlPanel';
import { DerivationModal } from './components/DerivationModal';
import { MathView } from './components/MathView';
import { Orbit, Activity, BookOpen, Sparkles, Layers } from 'lucide-react';

export default function App() {
  // Main simulation parameters (Default to user request specs)
  const [params, setParams] = useState<SimulationParams>({
    massRatio: DEFAULT_MASS_RATIO,
    B0: DEFAULT_B0,
    L: DEFAULT_L_NM,
    K: DEFAULT_K_MEV,
    theta: DEFAULT_THETA_DEG,
    x0: DEFAULT_X0_NM,
    y0: DEFAULT_Y0_NM,
  });

  // Selected preset
  const [activePresetId, setActivePresetId] = useState<string>('classic-snake');

  // Simulation playback parameters
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(1.0);
  const [durationPs, setDurationPs] = useState<number>(45.0);
  const [progress, setProgress] = useState<number>(0); // 0 to 1
  const [isMultiBeam, setIsMultiBeam] = useState<boolean>(false);

  // Canvas visual toggles
  const [showFieldGradient, setShowFieldGradient] = useState<boolean>(true);
  const [showTurningLines, setShowTurningLines] = useState<boolean>(true);
  const [showVelocityVector, setShowVelocityVector] = useState<boolean>(true);

  // Derivation modal open
  const [isDerivationOpen, setIsDerivationOpen] = useState<boolean>(false);

  // Tab view selection for mobile / responsive
  const [activeTab, setActiveTab] = useState<'split' | 'real' | 'potential' | 'phase'>('split');

  // Compute derived physical properties
  const derived = useMemo(() => {
    return computeDerivedPhysics(params);
  }, [params]);

  // Generate primary trajectory (samples = 2000)
  const points = useMemo(() => {
    return generateTrajectory(params, derived, durationPs, 2000);
  }, [params, derived, durationPs]);

  // Multi-beam particles generation
  const beamParticles = useMemo<ParticleState[]>(() => {
    if (!isMultiBeam) return [];
    const count = 9;
    const spreadDeg = 24; // +/- 12 degrees
    const colors = [
      '#f43f5e',
      '#fb923c',
      '#facc15',
      '#4ade80',
      '#38bdf8',
      '#818cf8',
      '#c084fc',
      '#f472b6',
      '#34d399',
    ];

    const particles: ParticleState[] = [];
    for (let i = 0; i < count; i++) {
      const angleOffset = -spreadDeg / 2 + (i / (count - 1)) * spreadDeg;
      const beamParams: SimulationParams = {
        ...params,
        theta: params.theta + angleOffset,
      };
      const beamDerived = computeDerivedPhysics(beamParams);
      const beamPoints = generateTrajectory(beamParams, beamDerived, durationPs, 1500);

      particles.push({
        id: `beam-${i}`,
        color: colors[i % colors.length],
        initialTheta: beamParams.theta,
        initialX: beamParams.x0,
        initialY: beamParams.y0,
        points: beamPoints,
        currentPoint: beamPoints[0],
      });
    }
    return particles;
  }, [isMultiBeam, params, durationPs]);

  // Current active sample index
  const currentIdx = Math.min(
    points.length - 1,
    Math.max(0, Math.floor(progress * (points.length - 1)))
  );
  const currentPoint = points[currentIdx] || null;

  // Animation frame loop
  const lastTimeRef = useRef<number>(performance.now());
  useEffect(() => {
    let animId: number;

    const animate = (time: number) => {
      const dtMs = time - lastTimeRef.current;
      lastTimeRef.current = time;

      if (isPlaying && durationPs > 0) {
        // progress step: durationPs in picoseconds, let real-time 1 sec play e.g. 10 ps of simulation time at 1x
        // Normalized rate:
        const psPerSecond = 12.0 * simSpeed;
        const deltaProgress = (dtMs / 1000) * (psPerSecond / durationPs);

        setProgress((prev) => {
          const next = prev + deltaProgress;
          if (next >= 1.0) {
            return 0.0; // Loop seamlessly
          }
          return next;
        });
      }

      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, simSpeed, durationPs]);

  // Parameter update helper
  const handleUpdateParams = useCallback((newParams: Partial<SimulationParams>) => {
    setParams((prev) => ({ ...prev, ...newParams }));
  }, []);

  // Preset selection handler
  const handleSelectPreset = (presetId: string) => {
    const preset = PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setActivePresetId(presetId);
    setParams((prev) => ({
      ...prev,
      ...preset.params,
    }));
    if (preset.isBeam !== undefined) {
      setIsMultiBeam(preset.isBeam);
    }
    setProgress(0);
    setIsPlaying(true);
  };

  // Reset playback
  const handleReset = () => {
    setProgress(0);
  };

  // Export CSV
  const handleExportCsv = () => {
    if (points.length === 0) return;
    const headers = [
      'time_ps',
      'x_nm',
      'y_nm',
      'vx_nm_ps',
      'vy_nm_ps',
      'speed_nm_ps',
      'B_tesla',
      'Energy_meV',
      'Py_param',
      'Veff_meV',
    ];
    const rows = points.map((p) =>
      [
        p.t.toFixed(4),
        p.x.toFixed(4),
        p.y.toFixed(4),
        p.vx.toFixed(4),
        p.vy.toFixed(4),
        p.speed.toFixed(4),
        p.B.toFixed(5),
        p.energy.toFixed(5),
        p.Py.toFixed(5),
        p.Veff.toFixed(5),
      ].join(',')
    );
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `gradient_magnetic_orbit_K${params.K.toFixed(1)}meV_theta${params.theta}deg.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30">
      {/* Header Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/70 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-sky-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Orbit className="w-5 h-5 text-white animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-white">
                梯度磁場電子運動模擬器
              </h1>
              <span className="text-[10px] font-mono uppercase bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30">
                GaAs 2DEG · EOM
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-serif">
              <MathView
                math={`\\vec{B}(x) = \\frac{B_0 x}{L} \\hat{k} \\quad (m^* = 0.067 m_e, \\; B_0 = 1.65\\text{ T}, \\; L = 16\\pi^2\\text{ nm}, \\; K \\in [0, 25]\\text{ meV})`}
                className="text-xs text-sky-300/90"
              />
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2">
          {/* View Mode Switcher */}
          <div className="hidden md:flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('split')}
              className={`px-2.5 py-1 rounded transition ${
                activeTab === 'split' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400 hover:text-white'
              }`}
            >
              分割視角
            </button>
            <button
              onClick={() => setActiveTab('real')}
              className={`px-2.5 py-1 rounded transition ${
                activeTab === 'real' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400 hover:text-white'
              }`}
            >
              實空間 (x, y)
            </button>
            <button
              onClick={() => setActiveTab('potential')}
              className={`px-2.5 py-1 rounded transition ${
                activeTab === 'potential' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400 hover:text-white'
              }`}
            >
              有效位能 V_eff
            </button>
            <button
              onClick={() => setActiveTab('phase')}
              className={`px-2.5 py-1 rounded transition ${
                activeTab === 'phase' ? 'bg-indigo-600 text-white font-medium' : 'text-slate-400 hover:text-white'
              }`}
            >
              相空間
            </button>
          </div>

          <button
            onClick={() => setIsDerivationOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/90 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition shadow-md shadow-indigo-900/30"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>推導講義</span>
          </button>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="flex-1 p-3 sm:p-5 max-w-[1720px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left / Center Visualizer Column (7 or 8 columns on large screen) */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4">
          {/* Main Visualizer Area */}
          <div className="h-[480px] sm:h-[560px] w-full">
            <RealSpaceCanvas
              params={params}
              derived={derived}
              points={points}
              beamParticles={beamParticles}
              currentIdx={currentIdx}
              onUpdateParams={handleUpdateParams}
              showFieldGradient={showFieldGradient}
              setShowFieldGradient={setShowFieldGradient}
              showTurningLines={showTurningLines}
              setShowTurningLines={setShowTurningLines}
              showVelocityVector={showVelocityVector}
              setShowVelocityVector={setShowVelocityVector}
              isMultiBeam={isMultiBeam}
            />
          </div>

          {/* Time Scrubber / Progress Bar */}
          <div className="bg-slate-900/80 px-4 py-2.5 rounded-xl border border-slate-800 flex items-center gap-3 text-xs">
            <span className="text-slate-400 font-mono w-16 text-right">
              {currentPoint ? currentPoint.t.toFixed(1) : '0.0'} ps
            </span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.001"
              value={progress}
              onChange={(e) => {
                setProgress(Number(e.target.value));
                setIsPlaying(false);
              }}
              className="flex-1 accent-indigo-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <span className="text-slate-400 font-mono w-16">
              {durationPs.toFixed(1)} ps
            </span>
          </div>

          {/* Live Telemetry Panel */}
          <TelemetryPanel
            params={params}
            derived={derived}
            currentPoint={currentPoint}
          />

          {/* Diagnostic Sub-plots in Split View */}
          {(activeTab === 'split' || activeTab === 'potential' || activeTab === 'phase') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(activeTab === 'split' || activeTab === 'potential') && (
                <PotentialPlot
                  params={params}
                  derived={derived}
                  currentPoint={currentPoint}
                />
              )}
              {(activeTab === 'split' || activeTab === 'phase') && (
                <PhaseSpacePlot
                  points={points}
                  derived={derived}
                  currentIdx={currentIdx}
                />
              )}
            </div>
          )}
        </div>

        {/* Right Parameters & Controls Column (5 or 4 columns) */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-4">
          <ControlPanel
            params={params}
            derived={derived}
            isPlaying={isPlaying}
            onTogglePlay={() => setIsPlaying(!isPlaying)}
            onReset={handleReset}
            simSpeed={simSpeed}
            setSimSpeed={setSimSpeed}
            durationPs={durationPs}
            setDurationPs={setDurationPs}
            onUpdateParams={handleUpdateParams}
            activePresetId={activePresetId}
            onSelectPreset={handleSelectPreset}
            isMultiBeam={isMultiBeam}
            setIsMultiBeam={setIsMultiBeam}
            onExportCsv={handleExportCsv}
            onOpenDerivation={() => setIsDerivationOpen(true)}
          />

          {/* Theoretical Summary Card */}
          <div className="bg-slate-900/70 rounded-xl border border-slate-800/80 p-4 shadow-lg text-xs flex flex-col gap-2.5">
            <div className="flex items-center gap-2 font-semibold text-slate-200">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>物理機制核心提煉 (Physical Mechanism)</span>
            </div>
            <div className="text-slate-300 space-y-2 leading-relaxed text-[11px]">
              <div className="bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/60">
                <strong className="text-sky-300">蛇形態 (Snake States)：</strong>
                當 <MathView math="\alpha > -v_0" /> 時，電子在 <MathView math="x > 0" />（<MathView math="B_z > 0" />）與 <MathView math="x < 0" />（<MathView math="B_z < 0" />）之間交替穿梭。每次穿過 <MathView math="x = 0" /> 介面時，勞侖茲力變號使曲率反轉，沿著 <MathView math="y" /> 軸無阻礙蛇形前進！
              </div>
              <div className="bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/60">
                <strong className="text-amber-300">磁場梯度漂移 (Grad-B Drift)：</strong>
                若初始位置偏向一側（例如 <MathView math="x > 0" />），磁場沿 <MathView math="x" /> 軸線性增強，迴旋半徑隨位置變化，造成軌跡形如擺線（Cycloid）的橫向導向漂移。
              </div>
              <div className="bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/60">
                <strong className="text-emerald-300">守恆律驗證：</strong>
                由於磁場向量位勢在 Landau 規範下不依賴 <MathView math="y" />，廣義動量 <MathView math="P_y = m^* \dot{y} - \frac{e B_0}{2L} x^2" /> 與總動能 <MathView math="K = \frac{1}{2} m^* v^2" /> 隨時間嚴格守恆。
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/80 py-3 px-6 text-center text-xs text-slate-500">
        梯度磁場二維電子氣體運動數值模擬 · 基於 RK4 積分器 · 嚴格符合推導文件方程式規範
      </footer>

      {/* Derivation Modal */}
      <DerivationModal
        isOpen={isDerivationOpen}
        onClose={() => setIsDerivationOpen(false)}
      />
    </div>
  );
}

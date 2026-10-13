import React from 'react';
import { SimulationParams, PhysicsDerived, TrajectoryPoint } from '../types/physics';
import { nmPsToMs } from '../physics/constants';
import { MathView } from './MathView';
import { ShieldCheck, Activity, Gauge, Zap } from 'lucide-react';

interface TelemetryPanelProps {
  params: SimulationParams;
  derived: PhysicsDerived;
  currentPoint: TrajectoryPoint | null;
}

export const TelemetryPanel: React.FC<TelemetryPanelProps> = ({
  params,
  derived,
  currentPoint,
}) => {
  const currentE = currentPoint?.energy ?? params.K;
  const initialE = params.K;
  const deltaE = Math.abs(currentE - initialE);
  const relEnergyErr = initialE > 0 ? (deltaE / initialE) * 100 : 0;

  const currentPy = currentPoint?.Py ?? derived.alpha;
  const deltaPy = Math.abs(currentPy - derived.alpha);
  const relPyErr = Math.abs(derived.alpha) > 1e-4 ? (deltaPy / Math.abs(derived.alpha)) * 100 : deltaPy;

  return (
    <div className="bg-slate-900/90 rounded-xl border border-slate-800 p-3.5 shadow-lg flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
          <Activity className="w-4 h-4 text-cyan-400" />
          <span>即時物理遙測與守恆律檢驗 (Live Telemetry)</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/50">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>RK4 數值高精準度</span>
        </div>
      </div>

      {/* Grid of Key Quantities */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Total Energy & Conservation */}
        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 flex flex-col justify-between">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>總能量 E (動能)</span>
            <span className="text-emerald-400 font-mono text-[10px]">守恆</span>
          </div>
          <div className="my-1">
            <span className="text-base font-bold text-slate-100 font-mono">
              {currentE.toFixed(3)}
            </span>
            <span className="text-xs text-slate-400 ml-1">meV</span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between">
            <span>相對誤差 ΔE/E:</span>
            <span className="text-emerald-400">{relEnergyErr.toExponential(2)}%</span>
          </div>
        </div>

        {/* Conserved Momentum Py */}
        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 flex flex-col justify-between">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>廣義動量 P_y / m*</span>
            <span className="text-emerald-400 font-mono text-[10px]">守恆</span>
          </div>
          <div className="my-1">
            <span className="text-base font-bold text-sky-200 font-mono">
              {currentPy.toFixed(2)}
            </span>
            <span className="text-xs text-slate-400 ml-1">nm/ps</span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between">
            <span>參數 α:</span>
            <span className="text-slate-300">{derived.alpha.toFixed(2)} nm/ps</span>
          </div>
        </div>

        {/* Local Magnetic Field B(x) */}
        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 flex flex-col justify-between">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>即時局部磁場 B(x)</span>
            <Gauge className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="my-1">
            <span className="text-base font-bold text-amber-300 font-mono">
              {currentPoint ? currentPoint.B.toFixed(3) : ((params.B0 * params.x0) / params.L).toFixed(3)}
            </span>
            <span className="text-xs text-slate-400 ml-1">Tesla</span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between">
            <span>特徵 B₀:</span>
            <span className="text-slate-300">{params.B0.toFixed(2)} T</span>
          </div>
        </div>

        {/* Characteristic Frequencies */}
        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 flex flex-col justify-between">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>迴旋頻率 ω_c (B₀)</span>
            <Zap className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="my-1">
            <span className="text-base font-bold text-purple-300 font-mono">
              {(derived.omegaCSi / (2 * Math.PI * 1e12)).toFixed(2)}
            </span>
            <span className="text-xs text-slate-400 ml-1">THz</span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between">
            <span>週期 T_c:</span>
            <span className="text-slate-300">{derived.cyclotronPeriod.toFixed(2)} ps</span>
          </div>
        </div>
      </div>

      {/* Kinematic State & Turning Points Strip */}
      <div className="bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/80 flex flex-wrap items-center justify-between gap-y-2 text-xs font-mono text-slate-300">
        <div className="flex items-center gap-3">
          <span className="text-slate-500">當前狀態:</span>
          <span>
            t = <strong className="text-white font-bold">{currentPoint?.t.toFixed(2) ?? '0.00'}</strong> ps
          </span>
          <span>
            x = <strong className="text-sky-300">{currentPoint?.x.toFixed(1) ?? params.x0.toFixed(1)}</strong> nm
          </span>
          <span>
            y = <strong className="text-sky-300">{currentPoint?.y.toFixed(1) ?? params.y0.toFixed(1)}</strong> nm
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span>
            v = <strong className="text-amber-300">{currentPoint?.speed.toFixed(1) ?? derived.v0.toFixed(1)}</strong> nm/ps
            <span className="text-slate-500 ml-1">
              ({nmPsToMs(currentPoint?.speed ?? derived.v0).toExponential(2)} m/s)
            </span>
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-red-400">
            x_turn: ±
            {derived.turningPoints.outer !== null
              ? `${derived.turningPoints.outer.toFixed(1)} nm`
              : '無外轉折點'}
          </span>
          {derived.turningPoints.inner !== null && (
            <span className="text-amber-400">
              (內壁: ±{derived.turningPoints.inner.toFixed(1)} nm)
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

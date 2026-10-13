import React, { useState } from 'react';
import { SimulationParams, PhysicsDerived } from '../types/physics';
import { PRESETS } from '../physics/engine';
import { MathView } from './MathView';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Sliders,
  Layers,
  Download,
  Info,
  ChevronRight,
  Compass,
} from 'lucide-react';

interface ControlPanelProps {
  params: SimulationParams;
  derived: PhysicsDerived;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onReset: () => void;
  simSpeed: number;
  setSimSpeed: (speed: number) => void;
  durationPs: number;
  setDurationPs: (d: number) => void;
  onUpdateParams: (newParams: Partial<SimulationParams>) => void;
  activePresetId: string;
  onSelectPreset: (presetId: string) => void;
  isMultiBeam: boolean;
  setIsMultiBeam: (b: boolean) => void;
  onExportCsv: () => void;
  onOpenDerivation: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  params,
  derived,
  isPlaying,
  onTogglePlay,
  onReset,
  simSpeed,
  setSimSpeed,
  durationPs,
  setDurationPs,
  onUpdateParams,
  activePresetId,
  onSelectPreset,
  isMultiBeam,
  setIsMultiBeam,
  onExportCsv,
  onOpenDerivation,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Common angles
  const anglePresets = [-90, -45, 0, 30, 45, 60, 90, 135];

  return (
    <div className="bg-slate-900/90 rounded-xl border border-slate-800 p-4 shadow-xl flex flex-col gap-4 text-slate-200">
      {/* 1. Simulation Playback Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80">
        <div className="flex items-center gap-2">
          <button
            onClick={onTogglePlay}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-semibold text-xs tracking-wide transition shadow-lg ${
              isPlaying
                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-950/40'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4" /> 暫停
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" /> 播放
              </>
            )}
          </button>

          <button
            onClick={onReset}
            className="flex items-center gap-1 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition"
            title="重設時間 t=0"
          >
            <RotateCcw className="w-3.5 h-3.5" /> 重設
          </button>
        </div>

        {/* Speed Selector */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <FastForward className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-[11px]">速度:</span>
          {[0.25, 0.5, 1, 2, 4].map((spd) => (
            <button
              key={spd}
              onClick={() => setSimSpeed(spd)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition ${
                simSpeed === spd
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white'
              }`}
            >
              {spd}x
            </button>
          ))}
        </div>

        {/* Total Time Span */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="text-[11px]">時長:</span>
          <select
            value={durationPs}
            onChange={(e) => setDurationPs(Number(e.target.value))}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded px-2 py-1 font-mono focus:outline-none focus:border-indigo-500"
          >
            <option value={15}>15 ps (極短)</option>
            <option value={30}>30 ps (經典)</option>
            <option value={60}>60 ps (標準)</option>
            <option value={120}>120 ps (長軌跡)</option>
            <option value={200}>200 ps (超長)</option>
          </select>
        </div>
      </div>

      {/* 2. Preset Scenarios Quick Select */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
          <span className="flex items-center gap-1.5 text-slate-300">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            典型物理物理情境 (Presets)
          </span>
          <button
            onClick={onOpenDerivation}
            className="text-[11px] text-cyan-400 hover:text-cyan-300 underline flex items-center gap-1"
          >
            <Info className="w-3 h-3" /> 查看完整數學推導
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {PRESETS.map((p) => {
            const isSelected = activePresetId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => onSelectPreset(p.id)}
                className={`text-left p-2.5 rounded-lg border transition flex flex-col justify-between ${
                  isSelected
                    ? 'bg-indigo-950/60 border-indigo-500 text-white shadow-md shadow-indigo-950/30'
                    : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-950/70'
                }`}
              >
                <div className="font-semibold text-xs text-slate-100 flex items-center justify-between">
                  <span>{p.name.split(' (')[0]}</span>
                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />}
                </div>
                <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                  {p.subtitle}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Core Initial Conditions (動能 K, 入射角 θ, 初始位置 x0, y0) */}
      <div className="flex flex-col gap-3 bg-slate-950/50 p-3.5 rounded-xl border border-slate-800/80">
        <div className="flex items-center justify-between border-b border-slate-800/60 pb-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
            <Sliders className="w-3.5 h-3.5 text-sky-400" />
            <span>初始條件設定 (Initial Conditions)</span>
          </div>
          <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={isMultiBeam}
              onChange={(e) => setIsMultiBeam(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-indigo-500 focus:ring-0 w-3.5 h-3.5"
            />
            <span>電子束模式 (Beam Fan)</span>
          </label>
        </div>

        {/* Kinetic Energy K (0 ~ 25 meV) */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 flex items-center gap-1">
              <span>動能 K (Working Range 0 ~ 25 meV)</span>
            </span>
            <div className="flex items-center gap-1 font-mono">
              <input
                type="number"
                min="0.1"
                max="25.0"
                step="0.1"
                value={params.K}
                onChange={(e) =>
                  onUpdateParams({
                    K: Math.max(0.05, Math.min(25.0, Number(e.target.value) || 0.1)),
                  })
                }
                className="w-16 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-right text-xs text-sky-300 focus:outline-none focus:border-sky-500"
              />
              <span className="text-slate-400 text-[11px]">meV</span>
            </div>
          </div>
          <input
            type="range"
            min="0.1"
            max="25.0"
            step="0.1"
            value={params.K}
            onChange={(e) => onUpdateParams({ K: Number(e.target.value) })}
            className="w-full accent-sky-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>0 meV</span>
            <span>v₀ = {derived.v0.toFixed(1)} nm/ps ({(derived.v0Si / 1000).toFixed(0)} km/s)</span>
            <span>25 meV</span>
          </div>
        </div>

        {/* Incident Angle theta (-180 to +180) */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 flex items-center gap-1">
              <Compass className="w-3 h-3 text-emerald-400" />
              <span>入射角度 θ (Incident Angle)</span>
            </span>
            <div className="flex items-center gap-1 font-mono">
              <input
                type="number"
                min="-180"
                max="180"
                step="1"
                value={params.theta}
                onChange={(e) =>
                  onUpdateParams({
                    theta: Math.max(-180, Math.min(180, Number(e.target.value) || 0)),
                  })
                }
                className="w-14 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-right text-xs text-emerald-300 focus:outline-none focus:border-emerald-500"
              />
              <span className="text-slate-400 text-[11px]">°</span>
            </div>
          </div>
          <input
            type="range"
            min="-180"
            max="180"
            step="1"
            value={params.theta}
            onChange={(e) => onUpdateParams({ theta: Number(e.target.value) })}
            className="w-full accent-emerald-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
          {/* Angle quick pills */}
          <div className="flex flex-wrap gap-1 mt-0.5">
            {anglePresets.map((deg) => (
              <button
                key={deg}
                onClick={() => onUpdateParams({ theta: deg })}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition ${
                  params.theta === deg
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                {deg}°
              </button>
            ))}
          </div>
        </div>

        {/* Initial Position (x0, y0) */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300">起始位置 x₀</span>
              <span className="font-mono text-cyan-400 text-[11px]">{params.x0.toFixed(1)} nm</span>
            </div>
            <input
              type="range"
              min="-120"
              max="120"
              step="1"
              value={params.x0}
              onChange={(e) => onUpdateParams({ x0: Number(e.target.value) })}
              className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300">起始位置 y₀</span>
              <span className="font-mono text-cyan-400 text-[11px]">{params.y0.toFixed(1)} nm</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              step="1"
              value={params.y0}
              onChange={(e) => onUpdateParams({ y0: Number(e.target.value) })}
              className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* 4. Physical System Parameters (Expandable) */}
      <div className="border border-slate-800/80 rounded-xl overflow-hidden bg-slate-950/40">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs text-slate-300 hover:bg-slate-800/40 transition"
        >
          <span className="font-medium flex items-center gap-1.5">
            <ChevronRight
              className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
            />
            系統物理參數 (m*, B₀, L)
          </span>
          <span className="text-[11px] text-slate-500 font-mono">
            GaAs 2DEG 預設
          </span>
        </button>

        {showAdvanced && (
          <div className="p-3.5 pt-1 border-t border-slate-800/60 flex flex-col gap-3 text-xs">
            <div className="grid grid-cols-3 gap-2 text-slate-300">
              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                <div className="text-[10px] text-slate-400">有效質量 m*</div>
                <div className="font-mono text-amber-300 font-bold mt-1">
                  {params.massRatio} m_e
                </div>
                <div className="text-[9px] text-slate-500 mt-0.5">
                  (GaAs: 0.067 m_e)
                </div>
              </div>

              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                <div className="text-[10px] text-slate-400">磁場強度 B₀</div>
                <div className="font-mono text-amber-300 font-bold mt-1">
                  {params.B0} T
                </div>
                <div className="text-[9px] text-slate-500 mt-0.5">
                  1.65 Tesla
                </div>
              </div>

              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                <div className="text-[10px] text-slate-400">特徵長度 L</div>
                <div className="font-mono text-amber-300 font-bold mt-1">
                  16π² nm
                </div>
                <div className="text-[9px] text-slate-500 mt-0.5">
                  ≈ {params.L.toFixed(2)} nm
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 leading-relaxed flex flex-wrap items-center gap-1">
              <span>根據推導文件，磁場分佈為</span>
              <MathView math="\vec{B}(x) = \frac{B_0 x}{L} \hat{k}" />
              <span>，梯度常數</span>
              <MathView math="\beta = \frac{e B_0}{m^* L}" />
              <span>= {derived.beta.toFixed(5)} nm⁻¹ ps⁻¹。</span>
            </div>
          </div>
        )}
      </div>

      {/* 5. Utility Actions: CSV export & Derivation info */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={onExportCsv}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition"
          title="下載軌跡數據 (CSV 格式)"
        >
          <Download className="w-3.5 h-3.5 text-sky-400" />
          <span>匯出軌跡數據 (CSV)</span>
        </button>

        <button
          onClick={onOpenDerivation}
          className="px-3 py-1.5 bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-700/50 text-indigo-300 rounded-lg text-xs transition flex items-center gap-1"
        >
          <Info className="w-3.5 h-3.5" />
          <span>推導講義</span>
        </button>
      </div>
    </div>
  );
};

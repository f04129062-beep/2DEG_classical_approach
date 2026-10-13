import React, { useRef, useEffect, useState } from 'react';
import { TrajectoryPoint, PhysicsDerived } from '../types/physics';
import { nmPsToMs } from '../physics/constants';

interface PhaseSpacePlotProps {
  points: TrajectoryPoint[];
  derived: PhysicsDerived;
  currentIdx: number;
}

export const PhaseSpacePlot: React.FC<PhaseSpacePlotProps> = ({
  points,
  derived,
  currentIdx,
}) => {
  const [mode, setMode] = useState<'phase' | 'velocity'>('phase');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || points.length === 0) return;

    canvas.width = container.clientWidth || 500;
    canvas.height = container.clientHeight || 192;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear
    ctx.fillStyle = '#080d1a';
    ctx.fillRect(0, 0, width, height);

    const padLeft = 45;
    const padRight = 20;
    const padTop = 20;
    const padBottom = 25;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    if (mode === 'phase') {
      // Phase space: x (nm) on X-axis, vx (nm/ps) on Y-axis
      const maxTurn = derived.turningPoints.outer ?? 60;
      const xRange = Math.max(70, maxTurn * 1.25);
      const vxRange = derived.v0 * 1.15;

      const toX = (x: number) => padLeft + ((x + xRange) / (2 * xRange)) * plotW;
      const toY = (vx: number) => padTop + plotH / 2 - (vx / vxRange) * (plotH / 2);

      // Grid
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.35)';
      ctx.lineWidth = 1;

      // Axes
      const midY = toY(0);
      const midX = toX(0);

      ctx.beginPath();
      ctx.moveTo(padLeft, midY);
      ctx.lineTo(width - padRight, midY);
      ctx.moveTo(midX, padTop);
      ctx.lineTo(midX, height - padBottom);
      ctx.stroke();

      // Axis labels
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('0', midX + 6, midY + 12);
      ctx.fillText(`+${xRange.toFixed(0)}nm`, width - padRight - 15, midY + 12);
      ctx.fillText(`-${xRange.toFixed(0)}nm`, padLeft + 15, midY + 12);

      ctx.textAlign = 'right';
      ctx.fillText(`+${vxRange.toFixed(0)}`, padLeft - 6, padTop + 8);
      ctx.fillText(`-${vxRange.toFixed(0)}`, padLeft - 6, height - padBottom - 2);

      // Trajectory in phase space
      const renderLen = Math.min(points.length, currentIdx + 1);

      // Dim full trajectory
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.25)'; // Purple-500
      ctx.lineWidth = 1.2;
      ctx.moveTo(toX(points[0].x), toY(points[0].vx));
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(toX(points[i].x), toY(points[i].vx));
      }
      ctx.stroke();

      // Active traversed trajectory
      ctx.beginPath();
      ctx.strokeStyle = '#c084fc'; // Purple-400
      ctx.lineWidth = 2;
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 6;
      ctx.moveTo(toX(points[0].x), toY(points[0].vx));
      for (let i = 1; i < renderLen; i++) {
        ctx.lineTo(toX(points[i].x), toY(points[i].vx));
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Current point
      const curPt = points[Math.min(currentIdx, points.length - 1)];
      const cx = toX(curPt.x);
      const cy = toY(curPt.vx);

      ctx.beginPath();
      ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      // Velocity space: vx on X-axis, vy on Y-axis
      const vMax = derived.v0 * 1.25;
      const toX = (vx: number) => padLeft + ((vx + vMax) / (2 * vMax)) * plotW;
      const toY = (vy: number) => padTop + plotH / 2 - (vy / vMax) * (plotH / 2);

      // Axes
      const midY = toY(0);
      const midX = toX(0);

      ctx.strokeStyle = 'rgba(51, 65, 85, 0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padLeft, midY);
      ctx.lineTo(width - padRight, midY);
      ctx.moveTo(midX, padTop);
      ctx.lineTo(midX, height - padBottom);
      ctx.stroke();

      // Speed circle |v| = v0 (Energy conservation circle!)
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.4)'; // Green circle
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      const radPix = (derived.v0 / (2 * vMax)) * plotW;
      ctx.arc(midX, midY, radPix, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Trajectory in velocity space
      const renderLen = Math.min(points.length, currentIdx + 1);

      ctx.beginPath();
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.25)';
      ctx.lineWidth = 1.2;
      ctx.moveTo(toX(points[0].vx), toY(points[0].vy));
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(toX(points[i].vx), toY(points[i].vy));
      }
      ctx.stroke();

      ctx.beginPath();
      ctx.strokeStyle = '#fbbf24'; // Amber-400
      ctx.lineWidth = 2;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 6;
      ctx.moveTo(toX(points[0].vx), toY(points[0].vy));
      for (let i = 1; i < renderLen; i++) {
        ctx.lineTo(toX(points[i].vx), toY(points[i].vy));
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Current point
      const curPt = points[Math.min(currentIdx, points.length - 1)];
      const cx = toX(curPt.vx);
      const cy = toY(curPt.vy);

      ctx.beginPath();
      ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Box border
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.6)';
    ctx.lineWidth = 1;
    ctx.strokeRect(padLeft, padTop, plotW, plotH);
  }, [points, derived, currentIdx, mode]);

  const currentPt = points[Math.min(currentIdx, points.length - 1)] ?? null;

  return (
    <div className="bg-slate-900/90 rounded-xl border border-slate-800 p-3 shadow-lg flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-100">
            {mode === 'phase' ? '相空間軌道 (x, ẋ)' : '速度空間 (v_x, v_y)'}
          </span>
          <span className="text-slate-400 text-[11px]">
            {mode === 'phase' ? '閉合週期極限環振盪' : '動能守恆圓面約束'}
          </span>
        </div>
        <div className="flex items-center bg-slate-950 p-0.5 rounded border border-slate-800 text-[11px]">
          <button
            onClick={() => setMode('phase')}
            className={`px-2 py-0.5 rounded transition ${
              mode === 'phase' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            (x, ẋ) 相空間
          </button>
          <button
            onClick={() => setMode('velocity')}
            className={`px-2 py-0.5 rounded transition ${
              mode === 'velocity' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            (v_x, v_y) 速度
          </button>
        </div>
      </div>

      <div ref={containerRef} className="w-full h-48 relative">
        <canvas
          ref={canvasRef}
          className="w-full h-full block rounded bg-slate-950/80"
        />
      </div>

      <div className="text-[11px] text-slate-400 flex items-center justify-between bg-slate-950/40 p-2 rounded border border-slate-800/60 font-mono">
        {currentPt && (
          <>
            <span>v_x: {currentPt.vx.toFixed(1)} nm/ps ({nmPsToMs(currentPt.vx).toExponential(2)} m/s)</span>
            <span>v_y: {currentPt.vy.toFixed(1)} nm/ps</span>
            <span className="text-emerald-400">|v| = {currentPt.speed.toFixed(1)} nm/ps</span>
          </>
        )}
      </div>
    </div>
  );
};

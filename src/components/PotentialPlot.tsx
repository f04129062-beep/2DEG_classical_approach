import React, { useRef, useEffect } from 'react';
import { SimulationParams, PhysicsDerived, TrajectoryPoint } from '../types/physics';
import { computeVeff } from '../physics/engine';
import { MathView } from './MathView';

interface PotentialPlotProps {
  params: SimulationParams;
  derived: PhysicsDerived;
  currentPoint: TrajectoryPoint | null;
}

export const PotentialPlot: React.FC<PotentialPlotProps> = ({
  params,
  derived,
  currentPoint,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    canvas.width = container.clientWidth || 500;
    canvas.height = container.clientHeight || 192;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear background
    ctx.fillStyle = '#080d1a';
    ctx.fillRect(0, 0, width, height);

    // Padding around plot
    const padLeft = 45;
    const padRight = 20;
    const padTop = 25;
    const padBottom = 30;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    // Determine x domain: at least -1.3 * x_turn to +1.3 * x_turn, or [-100, 100] nm
    const maxTurn = derived.turningPoints.outer ?? 60;
    const xMax = Math.max(80, maxTurn * 1.35);
    const xMin = -xMax;

    // Energy domain: from 0 to 1.3 * K
    const eMax = Math.max(params.K * 1.25, 2.0);

    const toPlotX = (x: number) => padLeft + ((x - xMin) / (xMax - xMin)) * plotW;
    const toPlotY = (e: number) => padTop + plotH - (e / eMax) * plotH;

    // Grid lines
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
    ctx.lineWidth = 1;

    // Horizontal energy lines
    const eStep = eMax > 20 ? 5 : eMax > 10 ? 2 : 1;
    for (let e = 0; e <= eMax; e += eStep) {
      const py = toPlotY(e);
      ctx.beginPath();
      ctx.moveTo(padLeft, py);
      ctx.lineTo(width - padRight, py);
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${e} meV`, padLeft - 6, py + 3);
    }

    // Vertical x lines
    const xStep = xMax > 120 ? 40 : xMax > 60 ? 20 : 10;
    for (let x = Math.ceil(xMin / xStep) * xStep; x <= xMax; x += xStep) {
      const px = toPlotX(x);
      ctx.beginPath();
      ctx.moveTo(px, padTop);
      ctx.lineTo(px, height - padBottom);
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${x}`, px, height - padBottom + 14);
    }

    // Zero-line x = 0
    const zeroX = toPlotX(0);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(zeroX, padTop);
    ctx.lineTo(zeroX, height - padBottom);
    ctx.stroke();
    ctx.setLineDash([]);

    // 1. Shaded Classically Forbidden Regions where V_eff(x) > K
    // Generate potential curve points
    const samples = 300;
    const curvePoints: Array<{ x: number; y: number; val: number }> = [];
    for (let i = 0; i <= samples; i++) {
      const xVal = xMin + (i / samples) * (xMax - xMin);
      const val = computeVeff(xVal, derived.alpha, derived.beta, derived.mStarKg);
      const px = toPlotX(xVal);
      const py = toPlotY(Math.min(val, eMax * 1.5));
      curvePoints.push({ x: px, y: py, val });
    }

    // Shaded region above curve where V_eff > K
    const kY = toPlotY(params.K);

    // Draw forbidden background
    ctx.fillStyle = 'rgba(239, 68, 68, 0.08)'; // Light red
    if (derived.turningPoints.outer !== null) {
      const outerPxRight = toPlotX(derived.turningPoints.outer);
      const outerPxLeft = toPlotX(-derived.turningPoints.outer);

      // Right forbidden region (x > outer)
      ctx.fillRect(outerPxRight, padTop, width - padRight - outerPxRight, plotH);
      // Left forbidden region (x < -outer)
      ctx.fillRect(padLeft, padTop, outerPxLeft - padLeft, plotH);

      // Inner barrier if present
      if (derived.turningPoints.inner !== null) {
        const innerPxRight = toPlotX(derived.turningPoints.inner);
        const innerPxLeft = toPlotX(-derived.turningPoints.inner);
        ctx.fillStyle = 'rgba(245, 158, 11, 0.12)';
        ctx.fillRect(innerPxLeft, padTop, innerPxRight - innerPxLeft, plotH);
      }
    }

    // 2. Draw Total Energy Horizontal Line E = K
    ctx.beginPath();
    ctx.strokeStyle = '#22c55e'; // Green-500
    ctx.lineWidth = 2;
    ctx.moveTo(padLeft, kY);
    ctx.lineTo(width - padRight, kY);
    ctx.stroke();

    ctx.fillStyle = '#4ade80';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`E = K = ${params.K.toFixed(2)} meV`, width - padRight - 6, kY - 5);

    // 3. Draw V_eff(x) Potential Well Curve
    ctx.beginPath();
    ctx.strokeStyle = '#60a5fa'; // Blue-400
    ctx.lineWidth = 2.5;
    ctx.moveTo(curvePoints[0].x, curvePoints[0].y);
    for (let i = 1; i < curvePoints.length; i++) {
      ctx.lineTo(curvePoints[i].x, curvePoints[i].y);
    }
    ctx.stroke();

    // Fill under potential curve
    ctx.lineTo(curvePoints[curvePoints.length - 1].x, toPlotY(0));
    ctx.lineTo(curvePoints[0].x, toPlotY(0));
    ctx.closePath();
    const areaGrad = ctx.createLinearGradient(0, padTop, 0, height - padBottom);
    areaGrad.addColorStop(0, 'rgba(59, 130, 246, 0.25)');
    areaGrad.addColorStop(1, 'rgba(59, 130, 246, 0.02)');
    ctx.fillStyle = areaGrad;
    ctx.fill();

    // 4. Mark Turning Points
    if (derived.turningPoints.outer !== null) {
      const outX = derived.turningPoints.outer;
      const ptPxRight = toPlotX(outX);
      const ptPxLeft = toPlotX(-outX);

      // Dots on turning points
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(ptPxRight, kY, 4, 0, Math.PI * 2);
      ctx.arc(ptPxLeft, kY, 4, 0, Math.PI * 2);
      ctx.fill();

      // Turning point dashed drop lines
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(ptPxRight, kY);
      ctx.lineTo(ptPxRight, height - padBottom);
      ctx.moveTo(ptPxLeft, kY);
      ctx.lineTo(ptPxLeft, height - padBottom);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 5. Draw Current Electron Position in Potential Well
    if (currentPoint) {
      const curX = currentPoint.x;
      const curVeff = currentPoint.Veff;
      const curPx = toPlotX(curX);
      const curPy = toPlotY(curVeff);

      // Kinetic energy in x: T_x = K - V_eff(x) = 1/2 m* vx^2
      const tX = Math.max(0, params.K - curVeff);

      // Vertical energy bar from V_eff up to E
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.8)';
      ctx.lineWidth = 2;
      ctx.moveTo(curPx, curPy);
      ctx.lineTo(curPx, kY);
      ctx.stroke();

      // Glowing marker at V_eff(x)
      ctx.beginPath();
      ctx.arc(curPx, curPy, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label current energy partition
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '10px monospace';
      ctx.textAlign = curX >= 0 ? 'left' : 'right';
      const offset = curX >= 0 ? 8 : -8;
      ctx.fillText(`x = ${curX.toFixed(1)} nm`, curPx + offset, curPy - 8);
      ctx.fillText(`V_eff = ${curVeff.toFixed(2)} meV`, curPx + offset, curPy + 6);
      ctx.fillText(`T_x = ${tX.toFixed(2)} meV`, curPx + offset, curPy + 18);
    }

    // Axes boundary box
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.6)';
    ctx.lineWidth = 1;
    ctx.strokeRect(padLeft, padTop, plotW, plotH);
  }, [params, derived, currentPoint]);

  return (
    <div className="bg-slate-900/90 rounded-xl border border-slate-800 p-3 shadow-lg flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-100 flex items-center gap-1">
            有效位能 <MathView math="V_{\text{eff}}(x)" />
          </span>
          <span className="text-slate-400 text-[11px] flex items-center gap-1">
            轉折點 <MathView math="V_{\text{eff}}(x) = K" /> (能量守恆)
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono">
          <span className="flex items-center gap-1 text-blue-400">
            <span className="w-2.5 h-0.5 bg-blue-400 inline-block" /> <MathView math="V_{\text{eff}}(x)" />
          </span>
          <span className="flex items-center gap-1 text-green-400">
            <span className="w-2.5 h-0.5 bg-green-400 inline-block" /> <MathView math="E = K" />
          </span>
          <span className="flex items-center gap-1 text-red-400">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" /> 轉折點
          </span>
        </div>
      </div>

      <div ref={containerRef} className="w-full h-48 relative">
        <canvas
          ref={canvasRef}
          className="w-full h-full block rounded bg-slate-950/80"
        />
      </div>

      <div className="text-[11px] text-slate-400 leading-relaxed font-serif bg-slate-950/40 p-2 rounded border border-slate-800/60">
        <MathView
          math={`V_{\\text{eff}}(x) = \\frac{1}{2} m^* \\left(\\alpha + \\frac{\\beta}{2} x^2\\right)^2 \\quad \\Longrightarrow \\quad \\frac{1}{2} m^* \\dot{x}^2 + V_{\\text{eff}}(x) = K`}
          className="text-xs text-sky-200"
        />
      </div>
    </div>
  );
};

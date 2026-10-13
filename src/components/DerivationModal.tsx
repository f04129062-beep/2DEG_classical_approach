import React from 'react';
import { MathView } from './MathView';
import { X, BookOpen, Atom, HelpCircle } from 'lucide-react';

interface DerivationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DerivationModal: React.FC<DerivationModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="text-base font-bold text-slate-100">
                梯度磁場電子運動方程式 (EOM) 完整推導與物理詳解
              </h2>
              <p className="text-xs text-slate-400">
                對應使用者 LaTeX 文件：《EOM 推導》
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm leading-relaxed text-slate-300">
          {/* Section 1: 磁場與勞侖茲力 */}
          <section className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
            <h3 className="text-sm font-semibold text-sky-300 flex items-center gap-2 mb-2">
              <Atom className="w-4 h-4" />
              1. 梯度磁場與勞侖茲力
            </h3>
            <p className="text-slate-300">
              設二維平面上的電子感受沿 z 方向、具有一維線性梯度的磁場：
            </p>
            <MathView math="\vec{B} = \frac{B_0 x}{L} \hat{k}" block />
            <p className="mt-2 text-slate-300">
              電子帶負電 q = -e，其受到的勞侖茲力為：
            </p>
            <MathView
              math="\vec{F}_B = q(\vec{v} \times \vec{B}) = -e (\dot{x}\hat{i} + \dot{y}\hat{j}) \times \left(\frac{B_0 x}{L}\hat{k}\right) = -\frac{e B_0}{L} x (\dot{y} \hat{i} - \dot{x} \hat{j})"
              block
            />
          </section>

          {/* Section 2: 耦合微分方程組 */}
          <section className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
            <h3 className="text-sm font-semibold text-sky-300 flex items-center gap-2 mb-2">
              <Atom className="w-4 h-4" />
              2. 牛頓第二定律與耦合運動方程
            </h3>
            <p className="text-slate-300">
              考慮電子有效質量 m*，運動方程式為：
            </p>
            <MathView
              math="m^* \begin{pmatrix} \ddot{x} \\ \ddot{y} \end{pmatrix} = -\frac{e B_0}{L} x \begin{pmatrix} \dot{y} \\ -\dot{x} \end{pmatrix} \quad \Longrightarrow \quad \begin{cases} m^* \ddot{x} = -\dfrac{e B_0}{L} x \dot{y} \\[8pt] m^* \ddot{y} = \dfrac{e B_0}{L} x \dot{x} \end{cases}"
              block
            />
          </section>

          {/* Section 3: 廣義動量守恆 */}
          <section className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
            <h3 className="text-sm font-semibold text-emerald-300 flex items-center gap-2 mb-2">
              <Atom className="w-4 h-4" />
              3. y 方向廣義動量守恆律
            </h3>
            <p className="text-slate-300 flex flex-wrap items-center gap-1">
              <span>注意到 y 方向微分方程右側</span>
              <MathView math="x \dot{x} = \frac{1}{2} \frac{d}{dt}(x^2)" />
              <span>，因此下式全導數為零：</span>
            </p>
            <MathView
              math="\frac{d}{dt} \left( m^* \dot{y} - \frac{e B_0}{2L} x^2 \right) = 0"
              block
            />
            <p className="mt-2 text-slate-300 flex flex-wrap items-center gap-1">
              <span>這代表系統在 y 方向具有平移對稱性（在 Landau Gauge 下向量位勢</span>
              <MathView math="\vec{A} = (0, \frac{B_0 x^2}{2L}, 0)" />
              <span>不依賴 y），因此廣義動量為守恆常數：</span>
            </p>
            <MathView
              math="P_y = m^* \dot{y} - \frac{e B_0}{2L} x^2 = \text{const}"
              block
            />
            <p className="mt-2 text-slate-300">
              這使得 y 方向的速度可以直接完全表示為位置 x 的代數函數：
            </p>
            <MathView
              math="\dot{y}(x) = \frac{P_y}{m^*} + \frac{e B_0}{2 m^* L} x^2"
              block
            />
          </section>

          {/* Section 4: 引入參數化與 x 方向解耦非線性振盪方程 */}
          <section className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
            <h3 className="text-sm font-semibold text-amber-300 flex items-center gap-2 mb-2">
              <Atom className="w-4 h-4" />
              4. 參數化與非線性 Duffing 振盪方程
            </h3>
            <p className="text-slate-300 flex flex-wrap items-center gap-1">
              <span>引入迴旋頻率</span>
              <MathView math="\omega_c = \frac{e B_0}{m^*}" />
              <span>，並定義系統核心參數：</span>
            </p>
            <MathView
              math="\begin{cases} \alpha = \dfrac{P_y}{m^*} \\[10pt] \beta = \dfrac{\omega_c}{L} = \dfrac{e B_0}{m^* L} \end{cases}"
              block
            />
            <p className="mt-2 text-slate-300 flex flex-wrap items-center gap-1">
              <span>代入 x 方向之運動方程式，完全解耦得到非線性振盪方程組：</span>
            </p>
            <MathView
              math="\begin{cases} \ddot{x} + \alpha \beta x + \dfrac{\beta^2}{2} x^3 = 0 \\[10pt] \dot{y} = \alpha + \dfrac{\beta}{2} x^2 \end{cases}"
              block
            />
          </section>

          {/* Section 5: 三大初始條件與守恆常數之決定 */}
          <section className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
            <h3 className="text-sm font-semibold text-purple-300 flex items-center gap-2 mb-2">
              <Atom className="w-4 h-4" />
              5. 初始條件、初動能 K 與守恆量確定
            </h3>
            <p className="text-slate-300">
              給定初始動能 K、入射角 θ 與起始點 x₀：
            </p>
            <MathView
              math="v_0 = \sqrt{\frac{2K}{m^*}}, \quad \dot{x}_0 = v_0 \cos(\theta), \quad \dot{y}_0 = v_0 \sin(\theta)"
              block
            />
            <p className="mt-2 text-slate-300 flex flex-wrap items-center gap-1">
              <span>因此系統的守恆量</span>
              <MathView math="\alpha" />
              <span>由初始條件直接鎖定：</span>
            </p>
            <MathView
              math="\alpha = \sqrt{\frac{2K}{m^*}} \sin(\theta) - \frac{\beta}{2} x_0^2"
              block
            />
          </section>

          {/* Section 6: 有效位能面與轉折點 */}
          <section className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
            <h3 className="text-sm font-semibold text-rose-300 flex items-center gap-2 mb-2">
              <HelpCircle className="w-4 h-4" />
              6. 有效位能面與經典轉折點
            </h3>
            <p className="text-slate-300">
              將總機械能表示為 1D 等效能量：
            </p>
            <MathView
              math="E = \frac{1}{2} m^* \dot{x}^2 + \frac{1}{2} m^* \dot{y}^2 = \frac{1}{2} m^* \dot{x}^2 + V_{\text{eff}}(x) = K"
              block
            />
            <p className="mt-1 text-slate-300">
              其中有效位能為：
            </p>
            <MathView
              math="V_{\text{eff}}(x) = \frac{1}{2} m^* \left(\alpha + \frac{\beta}{2} x^2\right)^2"
              block
            />
            <p className="mt-2 text-slate-300 flex flex-wrap items-center gap-1">
              <span>經典轉折點發生於</span>
              <MathView math="\dot{x} = 0 \iff V_{\text{eff}}(x) = K" />
              <span>：</span>
            </p>
            <MathView
              math="\left|\alpha + \frac{\beta}{2} x^2\right| = v_0 \quad \Longrightarrow \quad x_{\text{turn}} = \pm \sqrt{\frac{2(v_0 - \alpha)}{\beta}}"
              block
            />
            <p className="mt-1 text-slate-300 flex flex-wrap items-center gap-1">
              <span>當</span>
              <MathView math="\alpha > -v_0" />
              <span>時，電子能夠暢行跨越 x = 0 介面；在跨越時因 Bz 變號，曲率隨之反轉，造就無限沿 y 軸蜿蜒前進的<strong>蛇形態 (Snake States)</strong>！</span>
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-slate-950/60 text-xs text-slate-400">
          <span>基準參數：m* = 0.067 m_e, B₀ = 1.65 T, L = 16π² nm</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition"
          >
            關閉視窗
          </button>
        </div>
      </div>
    </div>
  );
};

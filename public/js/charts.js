'use strict';

/**
 * Minimal canvas-based bar chart used on the results page.
 * Exposed as `window.pdrs.charts`.
 */
(function () {
  const PALETTE = ['#7aa2ff', '#b18cff', '#4ade80', '#fbbf24', '#f87171', '#34d399'];

  function drawBarChart(canvas, data, options) {
    if (!canvas || !canvas.getContext) return;
    const opts = options || {};
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const padding = { top: 24, right: 16, bottom: 32, left: 40 };
    const innerW = width - padding.left - padding.right;
    const innerH = height - padding.top - padding.bottom;

    ctx.clearRect(0, 0, width, height);

    if (!Array.isArray(data) || data.length === 0) {
      ctx.fillStyle = '#9aa3b2';
      ctx.font = '14px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No data', width / 2, height / 2);
      return;
    }

    const max = opts.max || Math.max(...data.map((d) => Number(d.value) || 0), 1);
    const barGap = 10;
    const barWidth = Math.max(4, (innerW - barGap * (data.length - 1)) / data.length);

    // Axis
    ctx.strokeStyle = '#262b36';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, padding.top + innerH);
    ctx.lineTo(padding.left + innerW, padding.top + innerH);
    ctx.stroke();

    ctx.fillStyle = '#9aa3b2';
    ctx.font = '12px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(String(max), padding.left - 6, padding.top + 10);
    ctx.fillText('0', padding.left - 6, padding.top + innerH);

    data.forEach((d, i) => {
      const value = Number(d.value) || 0;
      const h = (value / max) * innerH;
      const x = padding.left + i * (barWidth + barGap);
      const y = padding.top + innerH - h;
      ctx.fillStyle = (opts.color && opts.color[i]) || PALETTE[i % PALETTE.length];
      ctx.fillRect(x, y, barWidth, h);

      ctx.fillStyle = '#e6e8ef';
      ctx.textAlign = 'center';
      ctx.fillText(String(value), x + barWidth / 2, y - 6);

      ctx.fillStyle = '#9aa3b2';
      ctx.fillText(String(d.label || ''), x + barWidth / 2, padding.top + innerH + 16);
    });
  }

  window.pdrs = window.pdrs || {};
  window.pdrs.charts = { drawBarChart };
})();

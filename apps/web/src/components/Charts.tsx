'use client';

/**
 * Bağımlılıksız SVG grafikler — küçük, ölçeklenebilir.
 */

export function BarChart({
  data,
  height = 160,
  colorClass = 'fill-sunset-500',
  tickEvery = 5,
}: {
  data: Array<{ label: string; value: number; tip?: string }>;
  height?: number;
  colorClass?: string;
  tickEvery?: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const w = Math.max(data.length * 20, 200);
  const barW = w / data.length - 4;
  return (
    <div className="overflow-x-auto">
      <svg width={w} height={height + 30} className="min-w-full">
        {data.map((d, i) => {
          const barH = (d.value / max) * height;
          const x = i * (w / data.length) + 2;
          const y = height - barH;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={barH} className={colorClass} rx={2}>
                <title>{d.tip ?? `${d.label}: ${d.value}`}</title>
              </rect>
              {d.value > 0 && (
                <text
                  x={x + barW / 2}
                  y={y - 3}
                  textAnchor="middle"
                  className="fill-charcoal-600 text-[9px]"
                >
                  {d.value}
                </text>
              )}
              {i % tickEvery === 0 && (
                <text
                  x={x + barW / 2}
                  y={height + 15}
                  textAnchor="middle"
                  className="fill-charcoal-400 text-[9px]"
                >
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function LineChart({
  data,
  height = 160,
}: {
  data: Array<{ label: string; value: number }>;
  height?: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const w = Math.max(data.length * 60, 300);
  const stepX = w / Math.max(1, data.length - 1);

  const points = data
    .map((d, i) => `${i * stepX},${height - (d.value / max) * height}`)
    .join(' ');

  return (
    <div className="overflow-x-auto">
      <svg width={w} height={height + 30} className="min-w-full">
        <polyline
          points={points}
          fill="none"
          className="stroke-sunset-500"
          strokeWidth={2}
        />
        {data.map((d, i) => {
          const x = i * stepX;
          const y = height - (d.value / max) * height;
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={3} className="fill-sunset-500">
                <title>{`${d.label}: ${d.value.toLocaleString('tr-TR')}`}</title>
              </circle>
              <text
                x={x}
                y={height + 15}
                textAnchor="middle"
                className="fill-charcoal-400 text-[10px]"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

/**
 * Horizontal histogram by alert type.
 * Receives pre-aggregated bars — no Firestore / label logic here.
 *
 * @param {{ bars: Array<{ type: string, name: string, value: number, color: string }>, height?: number }} props
 */
export default function TypeHistogramChart({ bars = [], height = 280 }) {
    if (!bars.length) {
        return <p className="admin-muted">Sin datos por tipo en este alcance.</p>;
    }

    const chartH = Math.max(height, Math.min(520, 36 + bars.length * 36));
    const summary = bars.map((b) => `${b.name}: ${b.value}`).join('. ');

    return (
        <div
            className="dash-type-histogram"
            role="img"
            aria-label={`Histograma de alertas por tipo. ${summary}`}
        >
            <ResponsiveContainer width="100%" height={chartH}>
                <BarChart
                    data={bars}
                    layout="vertical"
                    margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                    <YAxis
                        type="category"
                        dataKey="name"
                        width={132}
                        tick={{ fontSize: 11 }}
                        stroke="#475569"
                    />
                    <Tooltip
                        cursor={{ fill: 'rgba(0, 122, 255, 0.05)' }}
                        contentStyle={{
                            borderRadius: 14,
                            border: '1px solid rgba(255,255,255,0.5)',
                            background: 'rgba(255,255,255,0.92)',
                            backdropFilter: 'blur(12px)',
                            fontSize: 13,
                            boxShadow: '0 8px 28px rgba(15, 23, 42, 0.08)',
                        }}
                    />
                    <Bar dataKey="value" name="Alertas" radius={[0, 8, 8, 0]} maxBarSize={22}>
                        {bars.map((entry) => (
                            <Cell key={entry.type} fill={entry.color} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
            <ul className="sr-only">
                {bars.map((b) => (
                    <li key={b.type}>
                        {b.name}: {b.value}
                    </li>
                ))}
            </ul>
        </div>
    );
}

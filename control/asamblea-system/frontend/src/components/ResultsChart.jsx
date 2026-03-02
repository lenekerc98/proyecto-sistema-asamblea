export default function ResultsChart({ results }) {
    if (!results || results.length === 0) return <p className="text-gray-500">No votes recorded yet.</p>;

    const totalShares = results.reduce((acc, curr) => acc + Number(curr.total_shares), 0);

    return (
        <div className="mt-4">
            <h3 className="font-semibold text-lg mb-2">Results</h3>
            <div className="space-y-2">
                {results.map((r, idx) => {
                    const percentage = totalShares > 0 ? (Number(r.total_shares) / totalShares) * 100 : 0;
                    return (
                        <div key={idx} className="flex flex-col">
                            <div className="flex justify-between text-sm mb-1">
                                <span className="font-medium">{r.vote_option}</span>
                                <span>{percentage.toFixed(2)}% ({r.total_shares} shares)</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                                <div
                                    className="bg-blue-600 h-2.5 rounded-full"
                                    style={{ width: `${percentage}%` }}
                                ></div>
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="mt-2 text-right text-sm text-gray-500">
                Total Shares Cast: {totalShares}
            </div>
        </div>
    );
}

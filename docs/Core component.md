export default function EventCard({ event }) {
  // Determine color based on AI severity score (1-10)
  const getSeverityColor = (score) => {
    if (score >= 8) return "bg-red-500/10 text-red-500 border-red-500/20";
    if (score >= 5) return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    return "bg-blue-500/10 text-blue-500 border-blue-500/20";
  };

  return (
    <div className="w-full bg-[#1A1A1A] border border-gray-800 rounded-xl p-4 mb-4 shadow-lg">
      
      {/* Top Row: Meta Data & Urgency */}
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
          {event.source} • {event.timeAgo}
        </span>
        <span className={`text-xs font-bold px-2 py-1 rounded-md border ${getSeverityColor(event.severity_score)}`}>
          Severity: {event.severity_score}/10
        </span>
      </div>

      {/* Main Headline */}
      <h2 className="text-lg font-semibold text-white leading-tight mb-2">
        {event.title}
      </h2>

      {/* AI Rationale */}
      <p className="text-sm text-gray-300 mb-4 border-l-2 border-gray-600 pl-3">
        {event.rationale}
      </p>

      {/* Trading Impact Badges */}
      <div className="grid grid-cols-2 gap-2 text-xs font-medium">
        {event.bullish_assets.length > 0 && (
          <div className="bg-green-900/20 text-green-400 p-2 rounded-lg border border-green-900/30">
            <span className="block mb-1 opacity-70">▲ BULLISH</span>
            {event.bullish_assets.join(", ")}
          </div>
        )}
        
        {event.bearish_assets.length > 0 && (
          <div className="bg-red-900/20 text-red-400 p-2 rounded-lg border border-red-900/30">
            <span className="block mb-1 opacity-70">▼ BEARISH</span>
            {event.bearish_assets.join(", ")}
          </div>
        )}
      </div>
      
    </div>
  );
}
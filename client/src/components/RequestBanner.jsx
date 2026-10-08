import { formatTime } from "../utils/youtube";

export function RequestBanner({ requests, canResolve, onResolve }) {
  if (!requests.length) return null;
  return (
    <div className="request-stack">
      {requests.map((request) => (
        <div className="request-banner" key={request.requestId}>
          <span>
            {request.username} requested {request.type === "seek" ? `seek to ${formatTime(request.payload.time ?? 0)}` : "a video change"}
          </span>
          {canResolve && (
            <div>
              <button onClick={() => onResolve(request.requestId, true)}>Approve</button>
              <button className="secondary" onClick={() => onResolve(request.requestId, false)}>Reject</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

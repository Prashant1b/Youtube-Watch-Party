import { MoreVertical } from "lucide-react";
import { RoleBadge } from "./RoleBadge";

export function ParticipantList({ participants, selfId, isHost, onAssignRole, onRemove, onTransferHost }) {
  return (
    <section className="panel">
      <h2>Participants</h2>
      <div className="participants">
        {participants.map((participant) => (
          <div className="participant" key={participant.userId}>
            <div>
              <strong>{participant.username}{participant.userId === selfId ? " (you)" : ""}</strong>
              <RoleBadge role={participant.role} />
            </div>
            {isHost && participant.userId !== selfId && (
              <details className="menu">
                <summary><MoreVertical size={18} /></summary>
                <button onClick={() => onAssignRole(participant.userId, "moderator")}>Make moderator</button>
                <button onClick={() => onAssignRole(participant.userId, "participant")}>Make participant</button>
                <button onClick={() => onTransferHost(participant.userId)}>Transfer host</button>
                <button className="danger" onClick={() => onRemove(participant.userId)}>Remove</button>
              </details>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

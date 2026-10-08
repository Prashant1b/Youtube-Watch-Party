const labels = {
  host: "Host",
  moderator: "Moderator",
  participant: "Participant"
};

export function RoleBadge({ role }) {
  return <span className={`badge ${role}`}>{labels[role]}</span>;
}

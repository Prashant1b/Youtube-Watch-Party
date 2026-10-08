export class Participant {
  constructor(userId, username, role, socketId, joinedAt = Date.now()) {
    this.userId = userId;
    this.username = username;
    this.role = role;
    this.socketId = socketId;
    this.joinedAt = joinedAt;
  }

  toJSON() {
    return {
      userId: this.userId,
      username: this.username,
      role: this.role,
      socketId: this.socketId,
      joinedAt: this.joinedAt
    };
  }
}

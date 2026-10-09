# YouTube Watch Party

A MERN watch-party app with React, Vite, JavaScript, Express, MongoDB, Mongoose, Socket.IO, role-based playback control, approval requests, chat, and bonus JWT authentication.

## Project Structure

```text
/client  React + Vite + JavaScript

/server  Node.js + Express + Socket.IO + Mongoose
```

## Features

* Username/password registration and login with JWT.
* Create rooms with unique 8-character room codes and shareable `/room/:roomId` links.
* Synchronized YouTube playback using the IFrame API.
* Host, Moderator, and Participant roles.
* Server-side role validation for every privileged socket event.
* Approval flow for participant video and seek requests.
* Participant list, host-only user actions, and room chat.
* Responsive two-column room layout that stacks on mobile.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create environment files:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

3. Start MongoDB locally or set `MONGODB_URI` to MongoDB Atlas.

4. Run both apps:

```bash
npm run dev
```

Client: `http://localhost:5173`

Server: `http://localhost:4000`

## Environment Variables

### Server

```text
MONGODB_URI

PORT

CLIENT_URL

JWT_SECRET=replace-me
```

### Client

```text
VITE_SERVER_URL=
```

## Socket Architecture

The server owns the authoritative room state: `playState`, `currentTime`, `updatedAt`, and `videoId`. When playback is running, the server computes the live position from `updatedAt` before sending `sync_state`.

Flow:

1. Client joins with `join_room { roomId, username }`.
2. Server attaches the socket to the room, updates participants, and immediately emits `sync_state`.
3. Host and moderators can emit `play`, `pause`, `seek`, and `change_video`.
4. Participants emit `request_change`; host/moderators receive `change_requested`.
5. Host/moderators emit `resolve_request`; approved changes are applied by the server and broadcast with `sync_state`.
6. The client suppresses local YouTube player callbacks while applying remote sync commands to prevent echo loops.

## Role Permission Table

| Action                    | Host | Moderator | Participant  |
| ------------------------- | ---- | --------- | ------------ |
| Play / pause              | Yes  | Yes       | No           |
| Seek                      | Yes  | Yes       | Request only |
| Change video              | Yes  | Yes       | Request only |
| Approve / reject requests | Yes  | Yes       | No           |
| Assign roles              | Yes  | No        | No           |
| Remove participants       | Yes  | No        | No           |
| Transfer host             | Yes  | No        | No           |
| Chat                      | Yes  | Yes       | Yes          |

If the host leaves, the server promotes the oldest moderator. If no moderator exists, it promotes the oldest participant.

## REST API

```text
POST /api/auth/register

POST /api/auth/login

POST /api/rooms

GET  /api/rooms/:roomId

GET  /health
```

`POST /api/rooms` requires:

```text
Authorization: Bearer <token>
```

## Deployment

Use Render or Railway for both services and MongoDB Atlas for the database.

### Server Settings

Build command:

```bash
npm install && npm run build --workspace server
```

Start command:

```bash
npm run start --workspace server
```

Set:

```text
MONGODB_URI
CLIENT_URL
JWT_SECRET
PORT
```

### Client Settings

Build command:

```bash
npm install && npm run build --workspace client
```

Publish directory:

```text
client/dist
```

Set:

```text
VITE_SERVER_URL
```

to the deployed server URL.

### Live URL

```text
https://your-watch-party-client.example.com
```

## Verification

Production build:

```bash
npm run build
```

This project has been verified successfully in the development workspace.

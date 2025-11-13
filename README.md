# 🎨 InkSync - Real-Time Collaborative Drawing & Video Chat Platform

<div align="center">

[![Live Demo](https://img.shields.io/badge/Live-www.inksync.live-blue?style=for-the-badge)](https://www.inksync.live)
[![Next.js](https://img.shields.io/badge/Next.js-15.5.4-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

**A modern, real-time collaborative canvas with integrated video calling and chat**

[Live Demo](https://www.inksync.live) • [Report Bug](https://github.com/YOUR_USERNAME/InkSync-NextApp/issues) • [Request Feature](https://github.com/YOUR_USERNAME/InkSync-NextApp/issues)

</div>

---

## 📖 Table of Contents

- [About](#about)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Architecture](#architecture)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)

---

## 🌟 About

**InkSync** is a full-stack collaborative platform that enables real-time drawing, video calling, and messaging. Built with Next.js and WebRTC, it provides a seamless experience for remote teams, educators, and creative professionals who need to collaborate visually in real-time.

### Why InkSync?

- **🚀 Performance:** Sub-100ms latency for drawing synchronization
- **📱 Mobile-First:** Touch-optimized controls with pinch-to-zoom and smooth panning
- **🎥 Cross-Network Video:** TURN server support for reliable video calls across different networks
- **🔒 Secure:** NextAuth authentication with email verification
- **💾 Persistent:** PostgreSQL database for chat history and user data
- **⚡ Real-time:** WebSocket-based architecture for instant updates

---

## ✨ Features

### 🖌️ Collaborative Drawing
- **Multiple Tools:** Line, Rectangle, Ellipse, Diamond, Freehand Pencil, Text
- **Real-time Sync:** See strokes as they're being drawn by collaborators
- **Smart Locking:** Prevents conflicting edits with lock/unlock mechanism
- **Live Cursors:** Colored pointers with name badges for each user
- **Undo/Redo:** Full history management for all drawing operations
- **Hand-drawn Style:** Rough.js integration for artistic look

### 🎥 WebRTC Video Calling
- **Peer-to-Peer Video/Audio:** Direct connections for low latency
- **Cross-Network Support:** TURN servers for NAT traversal
- **Multi-participant:** Support for multiple simultaneous video calls
- **Camera Controls:** Easy toggle for camera and microphone
- **Reconnect Functionality:** Automatic retry on connection failure

### 💬 Real-Time Chat
- **Instant Messaging:** WebSocket-based chat with zero delay
- **Persistent History:** All messages stored in PostgreSQL
- **Bulk Deletion:** Users can delete their own messages
- **Room-based:** Isolated conversations per collaboration room

### 🔐 Authentication & Security
- **NextAuth Integration:** Secure session management
- **Email Verification:** OTP-based account verification
- **Password Encryption:** bcrypt hashing for passwords
- **Protected Routes:** Middleware-based route guards
- **CSRF Protection:** Built-in Next.js security features

### 📱 Mobile Experience
- **Touch Gestures:** Single-finger draw, two-finger zoom/pan
- **Responsive Design:** Optimized for all screen sizes
- **Performance:** Smooth 60fps drawing on mobile devices
- **Progressive Enhancement:** Works on modern browsers

---

## 🛠️ Tech Stack

### Frontend
- **[Next.js 15.5.4](https://nextjs.org/)** - React framework with App Router
- **[React 19.1.0](https://react.dev/)** - UI library
- **[TypeScript 5](https://www.typescriptlang.org/)** - Type safety
- **[Tailwind CSS 4](https://tailwindcss.com/)** - Utility-first styling
- **[Framer Motion 12](https://www.framer.com/motion/)** - Animations
- **[Rough.js](https://roughjs.com/)** - Hand-drawn graphics
- **[Lenis](https://github.com/studio-freight/lenis)** - Smooth scrolling

### Backend
- **[Node.js](https://nodejs.org/)** - JavaScript runtime
- **[WebSocket (ws)](https://github.com/websockets/ws)** - Real-time bidirectional communication
- **[Prisma 6.16.3](https://www.prisma.io/)** - Type-safe ORM
- **[PostgreSQL](https://www.postgresql.org/)** - Relational database
- **[NextAuth 4.24.11](https://next-auth.js.org/)** - Authentication
- **[Resend](https://resend.com/)** - Email service for OTP

### Communication
- **[WebRTC](https://webrtc.org/)** - Peer-to-peer video/audio
- **[TURN/STUN Servers](https://www.metered.ca/)** - NAT traversal for cross-network calls
- **WebSocket Signaling** - ICE candidate exchange

### DevOps
- **[Vercel](https://vercel.com/)** - Frontend hosting
- **[Render](https://render.com/)** - WebSocket server hosting
- **[GitHub Actions](https://github.com/features/actions)** - CI/CD (optional)

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20+ and npm/yarn/pnpm
- **PostgreSQL** database (local or hosted)
- **Email Service** (Resend API key)
- **TURN Server Credentials** (Metered.ca account)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/YOUR_USERNAME/InkSync-NextApp.git
cd InkSync-NextApp
```

2. **Install dependencies**
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. **Set up environment variables**

Create a `.env.local` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/inksync"

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET="your-secret-key-here"

# Email Service (Resend)
RESEND_API_KEY="re_your_api_key_here"

# WebSocket Server
NEXT_PUBLIC_SOCKET_URL=ws://localhost:3010

# WebRTC ICE Servers
NEXT_PUBLIC_ICE_SERVERS=[{"urls":"stun:stun.l.google.com:19302"},{"urls":"stun:stun1.l.google.com:19302"},{"urls":"turn:a.relay.metered.ca:80","username":"your-username","credential":"your-password"},{"urls":"turn:a.relay.metered.ca:443","username":"your-username","credential":"your-password"}]
```

4. **Set up the database**
```bash
npx prisma generate
npx prisma db push
```

5. **Run the development server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

6. **Start the WebSocket server**

In a separate terminal, navigate to the WebSocket server directory:

```bash
cd ../chat-websocket
npm install
npm run dev
```

The WebSocket server will start on `ws://localhost:3010`.

---

## 🏗️ Architecture

### System Overview

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Browser   │◄───────►│  Next.js App │◄───────►│ PostgreSQL  │
│  (Client)   │         │   (Vercel)   │         │  Database   │
└─────────────┘         └──────────────┘         └─────────────┘
       │                        │
       │                        │
       ▼                        ▼
┌─────────────┐         ┌──────────────┐
│   WebRTC    │         │  WebSocket   │
│ TURN/STUN   │         │    Server    │
│  (Metered)  │         │   (Render)   │
└─────────────┘         └──────────────┘
```

### Data Flow

1. **Authentication:** NextAuth handles user login/signup with email OTP verification
2. **Room Management:** Users create or join rooms via unique room IDs
3. **Real-time Sync:** 
   - Drawing data → WebSocket Server → All connected clients
   - Chat messages → WebSocket Server → PostgreSQL → All clients
4. **Video Calling:**
   - Signaling → WebSocket Server (offer/answer/ICE exchange)
   - Media streams → Direct P2P via WebRTC (TURN fallback)

### Database Schema

```prisma
model User {
  id       Int      @id @default(autoincrement())
  email    String   @unique
  password String
  name     String
  rooms    RoomId[]
  chats    Chat[]
}

model RoomId {
  id        String   @id @default(uuid())
  name      String
  CreatedAt DateTime @default(now())
  users     User[]
  chats     Chat[]
}

model Chat {
  id        Int      @id @default(autoincrement())
  message   String
  createdAt DateTime @default(now())
  userId    Int
  roomId    String
  user      User     @relation(fields: [userId], references: [id])
  room      RoomId   @relation(fields: [roomId], references: [id])
}

model Otp {
  id        String   @id @default(uuid())
  email     String   @unique
  otp       String
  expiresAt DateTime
  createdAt DateTime @default(now())
}
```

---

## 🔧 Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `NEXTAUTH_URL` | Application URL | `https://www.inksync.live` |
| `NEXTAUTH_SECRET` | NextAuth secret key | `openssl rand -base64 32` |
| `RESEND_API_KEY` | Resend API key for emails | `re_xxxxxxxxxxxxx` |
| `NEXT_PUBLIC_SOCKET_URL` | WebSocket server URL | `wss://your-ws-server.com` |
| `NEXT_PUBLIC_ICE_SERVERS` | WebRTC ICE servers (JSON) | See format below |

### ICE Servers Format

```json
[
  {"urls":"stun:stun.l.google.com:19302"},
  {"urls":"stun:stun1.l.google.com:19302"},
  {
    "urls":"turn:a.relay.metered.ca:80",
    "username":"your-metered-username",
    "credential":"your-metered-password"
  },
  {
    "urls":"turn:a.relay.metered.ca:443",
    "username":"your-metered-username",
    "credential":"your-metered-password"
  }
]
```

**Get free TURN credentials:** [Metered.ca](https://www.metered.ca/tools/openrelay/) (50GB/month free)

---

## 🚢 Deployment

### Vercel (Frontend)

1. **Connect your GitHub repository to Vercel**
2. **Add environment variables** in Vercel dashboard
3. **Deploy:** Automatic on push to main branch

### Render (WebSocket Server)

1. **Create a new Web Service** on Render
2. **Connect your repository** (chat-websocket directory)
3. **Set build command:** `npm install`
4. **Set start command:** `npm start`
5. **Add environment variables** (if needed)

### Database

- Use a managed PostgreSQL service (Neon, Supabase, Railway, etc.)
- Update `DATABASE_URL` in environment variables

---

## 📱 Usage

### Creating a Room

1. Sign up / Log in
2. Click "Create New Room"
3. Enter a room name
4. Share the room ID with collaborators

### Drawing

- Select a tool from the toolbar
- Click and drag on canvas to draw
- Use undo/redo buttons to manage history
- Zoom with pinch gesture (mobile) or scroll (desktop)

### Video Calling

1. Enable camera permission
2. Click "Camera On" button
3. Wait for other participants to join
4. Toggle audio/video as needed
5. Use "Reconnect" if connection fails

### Chat

- Type message in chat input
- Press Enter to send
- Delete your messages with trash icon
- View message history

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Use ESLint and Prettier for code formatting
- Write meaningful commit messages
- Add tests for new features (when applicable)
- Update documentation as needed

---

## 🐛 Known Issues

- Video streaming may require TURN server for cross-network calls
- Mobile Safari has stricter autoplay policies for video
- Large canvases (>5000 shapes) may experience performance degradation

---

## 🗺️ Roadmap

- [ ] Room moderation tools (kick, mute)
- [ ] Export canvas as PNG/SVG
- [ ] File upload and image embedding
- [ ] Screen sharing during video calls
- [ ] Message reactions and emoji support
- [ ] User profiles with avatars
- [ ] Drawing layers and z-index management
- [ ] Canvas templates library
- [ ] Mobile app (React Native)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👤 Author

**Your Name**

- Website: [www.inksync.live](https://www.inksync.live)
- GitHub: [@YOUR_USERNAME](https://github.com/YOUR_USERNAME)
- LinkedIn: [Your LinkedIn](https://linkedin.com/in/your-profile)

---

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - The React Framework
- [Vercel](https://vercel.com/) - Deployment platform
- [Prisma](https://www.prisma.io/) - Database ORM
- [Metered.ca](https://www.metered.ca/) - Free TURN servers
- [Rough.js](https://roughjs.com/) - Hand-drawn graphics library

---

## 📊 Project Stats

![GitHub stars](https://img.shields.io/github/stars/YOUR_USERNAME/InkSync-NextApp?style=social)
![GitHub forks](https://img.shields.io/github/forks/YOUR_USERNAME/InkSync-NextApp?style=social)
![GitHub issues](https://img.shields.io/github/issues/YOUR_USERNAME/InkSync-NextApp)
![GitHub pull requests](https://img.shields.io/github/issues-pr/YOUR_USERNAME/InkSync-NextApp)

---

<div align="center">

**Built with ❤️ for real-time collaboration**

⭐ Star this repo if you find it helpful!

</div>


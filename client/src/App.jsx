import { BrowserRouter, Route, Routes } from "react-router-dom";
import { SocketProvider } from "./context/SocketContext";
import { Landing } from "./components/Landing";
import { Room } from "./components/Room";

export function App() {
  return (
    <SocketProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/room/:roomId" element={<Room />} />
        </Routes>
      </BrowserRouter>
    </SocketProvider>
  );
}

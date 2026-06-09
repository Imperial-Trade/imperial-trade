import { Routes, Route, Navigate } from "react-router-dom";
import CreateRoomPage from "./CreateRoomPage";
import OwnedRoomsPage from "./OwnedRoomsPage";
import PayoutsPage from "./PayoutsPage";

export default function ProviderConsole() {
  return (
    <Routes>
      <Route index element={<Navigate to="rooms" replace />} />
      <Route path="rooms" element={<OwnedRoomsPage />} />
      <Route path="create" element={<CreateRoomPage />} />
      <Route path="payouts" element={<PayoutsPage />} />
    </Routes>
  );
}

import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import TouristDashboard from "./pages/TouristDashboard";
import AuthorityDashboard from "./pages/AuthorityDashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/tourist-dashboard" element={<TouristDashboard />} />
        <Route path="/authority-dashboard" element={<AuthorityDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
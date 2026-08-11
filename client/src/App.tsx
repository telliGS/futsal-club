import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Status from "./pages/Status";
import Cronograma from "./pages/Cronograma";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/mi-cuota" element={<Status />} />
      <Route path="/cronograma" element={<Cronograma />} />
      <Route path="/ingresar" element={<Login />} />
      <Route path="/delegado/*" element={<Dashboard />} />
    </Routes>
  );
}
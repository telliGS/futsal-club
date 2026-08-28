import { Routes, Route } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import Home from "./pages/Home";
import Status from "./pages/Status";
import Cronograma from "./pages/Cronograma";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Historia from "./pages/Historia";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/mi-cuota" element={<Status />} />
        <Route path="/cronograma" element={<Cronograma />} />
        <Route path="/ingresar" element={<Login />} />
        <Route path="/delegado/*" element={<Dashboard />} />
        <Route path="/historia" element={<Historia />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Analytics />
    </>
  );
}
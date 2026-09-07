import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";

const Home = lazy(() => import("./pages/Home"));
const Status = lazy(() => import("./pages/Status"));
const Cronograma = lazy(() => import("./pages/Cronograma"));
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Historia = lazy(() => import("./pages/Historia"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Privacidad = lazy(() => import("./pages/Privacidad"));
const Terminos = lazy(() => import("./pages/Terminos"));

const Fallback = () => (
  <div className="min-h-screen bg-surface text-white/50 font-mono text-xs p-6" role="status">
    Cargando...
  </div>
);

export default function App() {
  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            <Suspense fallback={<Fallback />}>
              <Home />
            </Suspense>
          }
        />
        <Route
          path="/mi-cuota"
          element={
            <Suspense fallback={<Fallback />}>
              <Status />
            </Suspense>
          }
        />
        <Route
          path="/cronograma"
          element={
            <Suspense fallback={<Fallback />}>
              <Cronograma />
            </Suspense>
          }
        />
        <Route
          path="/ingresar"
          element={
            <Suspense fallback={<Fallback />}>
              <Login />
            </Suspense>
          }
        />
        <Route
          path="/delegado/*"
          element={
            <Suspense fallback={<Fallback />}>
              <Dashboard />
            </Suspense>
          }
        />
        <Route
          path="/historia"
          element={
            <Suspense fallback={<Fallback />}>
              <Historia />
            </Suspense>
          }
        />
        <Route
          path="/privacidad"
          element={
            <Suspense fallback={<Fallback />}>
              <Privacidad />
            </Suspense>
          }
        />
        <Route
          path="/terminos"
          element={
            <Suspense fallback={<Fallback />}>
              <Terminos />
            </Suspense>
          }
        />
        <Route
          path="*"
          element={
            <Suspense fallback={<Fallback />}>
              <NotFound />
            </Suspense>
          }
        />
      </Routes>
      <Analytics />
    </>
  );
}
import { useState } from "react";
import { Link } from "react-router-dom";
import { usePanelSession } from "../lib/use-panel-session";
import { usePlantel } from "../lib/use-plantel";
import { usePlayerForm } from "../lib/use-player-form";
import { usePlayerStatus } from "../lib/use-player-status";
import { usePlayerDocs } from "../lib/use-player-docs";
import { useCuotas } from "../lib/use-cuotas";
import { useGymPagos } from "../lib/use-gym-pagos";
import { usePresupuesto } from "../lib/use-presupuesto";
import { useDelegados } from "../lib/use-delegados";
import { usePoli } from "../lib/use-poli";
import { useSeguroGym } from "../lib/use-seguro-gym";
import { useExcel } from "../lib/use-excel";
import { useToasts } from "../lib/use-toasts";
import { filtrarJugadores } from "../lib/panel-filters";
import { formatPesos, Icon, mesActual, monthRange, placeColor, vigenciaHint } from "../lib/panel-helpers";
import { cn } from "../lib/cn";
import Layout from "../components/Layout";
import CalendarioView from "../components/panel/CalendarioView";
import DelegadosView from "../components/panel/DelegadosView";
import PoliView from "../components/panel/PoliView";
import PresupuestoView from "../components/panel/PresupuestoView";
import PlayerListView from "../components/panel/PlayerListView";
import PlayerModal from "../components/panel/PlayerModal";
import CredencialesModal from "../components/panel/CredencialesModal";
import PoliSlotModal from "../components/panel/PoliSlotModal";
import PoliExModal from "../components/panel/PoliExModal";
import ImportModal from "../components/panel/ImportModal";
import FichasModal from "../components/panel/FichasModal";
import DelegadoModal from "../components/panel/DelegadoModal";
import QuotaModal from "../components/panel/QuotaModal";
import GastoModal from "../components/panel/GastoModal";
import InactivoModal from "../components/panel/InactivoModal";
import SeguroModal from "../components/panel/SeguroModal";
import PagoModal from "../components/panel/PagoModal";
import GymModal from "../components/panel/GymModal";
import PagoGymModal from "../components/panel/PagoGymModal";

export default function Dashboard() {
  // ---------- Sesión (token, me, equipo seleccionado, credenciales) ----------
  const {
    token, me, teamId, setTeamId, loading, view, setView, allTeams,
    esAdmin, categoriaActual,
    showCredModal, setShowCredModal, credForm, setCredForm, credSaving, credMsg,
    guardarCredenciales, abrirCredenciales, salir,
  } = usePanelSession();

  // Estado local del Dashboard: error global del panel + toasts.
  const [error, setError] = useState("");
  const { toasts, mostrarToast } = useToasts();

  // ---------- Plantel + filtros ----------
  const plantelHook = usePlantel(token, teamId, setError);
  const { players, setPlayers, filtroEstado, setFiltroEstado, busqueda, setBusqueda, recargarPlantel } = plantelHook;

  // ---------- Alta / edición de jugadores ----------
  const pf = usePlayerForm(token, teamId, me, setPlayers, setError, mostrarToast);

  // ---------- Inactivo / Reactivar ----------
  const ps = usePlayerStatus(token, recargarPlantel, setError);

  // ---------- Fichas / documentos médicos ----------
  const pd = usePlayerDocs(token, teamId, categoriaActual, setPlayers);

  // ---------- Pagos (cuota + gym) ----------
  const cuotas = useCuotas(token, setPlayers, setError, mostrarToast);
  const gymPagos = useGymPagos(token, setPlayers, setError, mostrarToast);

  // ---------- Presupuesto ----------
  const presu = usePresupuesto(token, teamId, me?.role);

  // ---------- Delegados (solo ADMIN) ----------
  const deps = useDelegados(token, esAdmin);

  // ---------- Cronograma (poli) ----------
  const poli = usePoli(token, esAdmin, allTeams, me?.teams, view);

  // ---------- Seguro + Gimnasio (avisos y modales) ----------
  const sg = useSeguroGym(token);

  // ---------- Excel (plantilla, importar, exportar) ----------
  const ex = useExcel(token, teamId, recargarPlantel, setError, mostrarToast);

  if (loading) return <div className="p-10">Cargando...</div>;

  const currentMonth = new Date().toISOString().slice(0, 7);
  const months = monthRange();
  const tecnicos = players.filter((p) => p.role !== "JUGADOR");
  // Jugadores que pagan acá (nativos o sin vínculo formativo)
  const plantel = players.filter((p) => p.role === "JUGADOR" && p.pagaAca !== false);
  const { jugadoresFiltrados, jugadoresBusqueda } = filtrarJugadores(plantel, {
    filtroEstado,
    busqueda,
  });
  // Jugadores de formativa que aparecen en este equipo pero pagan en su categoría
  const plantelSinCuota = players.filter((p) => p.role === "JUGADOR" && p.pagaAca === false);

  return (
    <Layout>
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Encabezado del panel: tarjeta con saludo + botón salir */}
      <div className="rounded-lg border border-outline bg-surface-1 p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex w-12 h-12 rounded-lg bg-primary/15 border border-primary/30 items-center justify-center shrink-0">
            <img src="/escudo-jh.png" alt="" className="w-8 h-8" />
          </div>
          <div>
            <h1 className="font-display text-xl md:text-2xl font-bold">Panel de delegado</h1>
            <p className="text-white/60 text-sm mt-0.5">
              Hola, <span className="text-white/85 font-semibold">{me?.fullName}</span> — {me?.role === "ADMIN" ? "Administrador" : "Delegado"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {me?.role !== "ADMIN" && me?.canChangeCredentials && (
            <button
              onClick={abrirCredenciales}
              className="text-sm text-white/70 hover:text-primary-light border border-outline px-3 py-1.5 rounded-lg transition-all duration-200 hover:border-primary/50 hover:bg-surface-2 active:scale-95"
            >
              Cambiar credenciales
            </button>
          )}
          <button
            onClick={salir}
            className="text-sm text-white/60 hover:text-red-400 border border-outline px-3 py-1.5 rounded-lg transition-all duration-200 hover:border-red-400/50 hover:bg-surface-2 active:scale-95"
          >
            Salir
          </button>
        </div>
      </div>

      {/* selector de equipo + acciones */}
      {me && me.teams.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <label className="text-sm text-white/70">Estás viendo: </label>
          <select
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            className="px-3 py-2 rounded-lg bg-surface-1 border border-outline transition-colors duration-200 focus:outline-none focus:border-primary"
          >
            {me.teams.map((t) => (
              <option key={t.id} value={t.id} className="bg-surface-1">
                {t.name}
              </option>
            ))}
          </select>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <button
              onClick={() => sg.setShowSeguro(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-surface-1 border border-outline text-white/80 transition-all duration-200 hover:bg-surface-2 active:scale-95"
              title="Exportar la lista de asegurados para el seguro"
            >
              <Icon name="doc" className="w-3.5 h-3.5" />
              Seguro
            </button>
            <button
              onClick={() => sg.setShowGym(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-surface-1 border border-outline text-white/80 transition-all duration-200 hover:bg-surface-2 active:scale-95"
              title="Lista del gimnasio, avisos y cuotas de gym por mes"
            >
              <Icon name="doc" className="w-3.5 h-3.5" />
              Gym
            </button>
            <button
              onClick={pf.openNuevo}
              className="px-4 py-2 rounded-lg text-sm bg-primary text-white font-semibold transition-all duration-200 hover:bg-primary-light active:scale-95"
              title="Agregar jugador o cuerpo técnico"
            >
              + Agregar
            </button>
            <div className="flex rounded-lg border border-outline overflow-hidden">
              <button
                onClick={ex.descargarPlantilla}
                disabled={ex.exporting}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-surface-1 text-white/80 transition-all duration-200 hover:bg-surface-2 active:scale-95 disabled:opacity-50"
                title="Descargar plantilla Excel para cargar el plantel"
              >
                <Icon name="download" className="w-3.5 h-3.5" />
                {ex.exporting ? "Generando..." : "Plantilla"}
              </button>
              <button
                onClick={() => ex.setShowImport(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-surface-1 text-white/80 transition-all duration-200 hover:bg-surface-2 active:scale-95"
                title="Importar plantel desde Excel"
              >
                <Icon name="upload" className="w-3.5 h-3.5" />
                Importar
              </button>
              <button
                onClick={ex.exportarExcel}
                disabled={ex.exporting}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-surface-1 text-white/80 transition-all duration-200 hover:bg-surface-2 active:scale-95 disabled:opacity-50"
                title="Exportar lista de jugadores a Excel"
              >
                <Icon name="download" className="w-3.5 h-3.5" />
                {ex.exporting ? "Generando..." : "Exportar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* navegación de vistas */}
      {me && (
        <div className="mt-4 flex rounded-lg border border-outline overflow-x-auto whitespace-nowrap scrollbar-none">
          <button
            onClick={() => setView("lista")}
            className={cn('px-4 py-2 text-sm transition-all duration-200 active:scale-95 shrink-0 md:flex-1', view === "lista" ? "bg-primary text-white" : "text-white/60 hover:text-white hover:bg-surface-2")}
          >
            Lista
          </button>
          <button
            onClick={() => setView("calendario")}
            className={cn('px-4 py-2 text-sm transition-all duration-200 active:scale-95 shrink-0 md:flex-1', view === "calendario" ? "bg-primary text-white" : "text-white/60 hover:text-white hover:bg-surface-2")}
          >
            Cuotas
          </button>
          <button
            onClick={() => setView("presupuesto")}
            className={cn('px-4 py-2 text-sm transition-all duration-200 active:scale-95 shrink-0 md:flex-1', view === "presupuesto" ? "bg-primary text-white" : "text-white/60 hover:text-white hover:bg-surface-2")}
          >
            Presupuesto
          </button>
          {me?.role === "ADMIN" && (
            <button
              onClick={() => setView("delegados")}
              className={cn('px-4 py-2 text-sm transition-all duration-200 active:scale-95 shrink-0 md:flex-1', view === "delegados" ? "bg-primary text-white" : "text-white/60 hover:text-white hover:bg-surface-2")}
            >
              Delegados
            </button>
          )}
          <button
            onClick={() => setView("poli")}
            className={cn('px-4 py-2 text-sm transition-all duration-200 active:scale-95 shrink-0 md:flex-1', view === "poli" ? "bg-primary text-white" : "text-white/60 hover:text-white hover:bg-surface-2")}
          >
            Cronograma
          </button>
        </div>
      )}

      {error && <p className="mt-4 text-red-400">{error}</p>}

      {/* Aviso: jugadores con documentación que bloquea */}
      {view === "lista" && plantel.some((p) => p.fichas && !p.fichas.aptoFichas) && (
  <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
    <div>
      <p className="text-sm font-semibold text-amber-300">
        ⚠ Algunos jugadores tienen documentación vencida o sin cargar — no pueden jugar hasta regularizar
      </p>
      <p className="text-xs text-amber-200/70 mt-1">
        {plantel
          .filter((p) => p.fichas && !p.fichas.aptoFichas)
          .map((p) => `${p.firstName} ${p.lastName} (${p.fichas!.resumen})`)
          .join(" · ")}
      </p>
    </div>
    <button
      onClick={() => {
        const deudores = plantel.filter((p) => p.fichas && !p.fichas.aptoFichas);
        if (deudores.length > 0) {
          const first = document.getElementById(`player-${deudores[0].id}`);
          if (first) first.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }}
      className="px-4 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-colors text-sm font-medium whitespace-nowrap"
    >
      Ver jugadores
    </button>
  </div>
)}

      {/* Aviso: lista de asegurados desactualizada (altas/bajas pendientes) */}
      {sg.seguroAvisos && sg.seguroAvisos.total > 0 && (
  <div className="mt-4 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
    <div>
      <p className="text-sm font-semibold text-blue-300">
        📋 Cambios pendientes en la lista de asegurados
      </p>
      <p className="text-xs text-blue-200/70 mt-1">
        {sg.seguroAvisos.altas > 0 && `${sg.seguroAvisos.altas} alta${sg.seguroAvisos.altas === 1 ? "" : "s"}`}
        {sg.seguroAvisos.altas > 0 && sg.seguroAvisos.bajas > 0 && " y "}
        {sg.seguroAvisos.bajas > 0 && `${sg.seguroAvisos.bajas} baja${sg.seguroAvisos.bajas === 1 ? "" : "s"}`}
        {" "}— exportá la lista completa para actualizar el seguro.
      </p>
    </div>
    <button
      onClick={() => sg.setShowSeguro(true)}
      className="px-4 py-1.5 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/40 hover:bg-blue-500/30 transition-colors text-sm font-medium whitespace-nowrap"
    >
      Exportar lista
    </button>
  </div>
)}

      {/* Aviso: lista del gimnasio desactualizada (altas/bajas pendientes) */}
      {sg.gymAvisos && sg.gymAvisos.total > 0 && (
  <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
    <div>
      <p className="text-sm font-semibold text-amber-300">
        💪 Cambios pendientes en la lista del gimnasio
      </p>
      <p className="text-xs text-amber-200/70 mt-1">
        {sg.gymAvisos.altas > 0 && `${sg.gymAvisos.altas} alta${sg.gymAvisos.altas === 1 ? "" : "s"}`}
        {sg.gymAvisos.altas > 0 && sg.gymAvisos.bajas > 0 && " y "}
        {sg.gymAvisos.bajas > 0 && `${sg.gymAvisos.bajas} baja${sg.gymAvisos.bajas === 1 ? "" : "s"}`}
        {" "}— exportá la lista completa del gym para actualizarla.
      </p>
    </div>
    <button
      onClick={() => sg.setShowGym(true)}
      className="px-4 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-colors text-sm font-medium whitespace-nowrap"
    >
      Exportar lista
    </button>
  </div>
)}

      {/* ===================== VISTA LISTA ===================== */}
      {view === "lista" && (
        <PlayerListView
          jugadoresBusqueda={jugadoresBusqueda}
          jugadoresFiltrados={jugadoresFiltrados}
          plantel={plantel}
          plantelSinCuota={plantelSinCuota}
          busqueda={busqueda}
          setBusqueda={setBusqueda}
          filtroEstado={filtroEstado}
          setFiltroEstado={setFiltroEstado}
          currentMonth={currentMonth}
          categoriaActual={categoriaActual}
          abrirPago={cuotas.abrirPago}
          abrirPagoGym={gymPagos.abrirPagoGym}
          abrirInactivo={ps.abrirInactivo}
          reactivar={ps.reactivar}
          openDocs={pd.openDocs}
          openEditar={pf.openEditar}
          removePlayer={pf.removePlayer}
        />
      )}

      {/* ===================== VISTA CALENDARIO ===================== */}
      {view === "calendario" && (
        <CalendarioView
          plantel={plantel}
          months={months}
          currentMonth={currentMonth}
          abrirPago={cuotas.abrirPago}
        />
      )}

      {/* ===================== VISTA DELEGADOS ===================== */}
      {view === "delegados" && me?.role === "ADMIN" && (
        <DelegadosView
          delegados={deps.delegados}
          delegadosLoading={deps.delegadosLoading}
          delegadosError={deps.delegadosError}
          delegadoMsg={deps.delegadoMsg}
          eliminarTodosDelegados={deps.eliminarTodosDelegados}
          openNuevoDelegado={deps.openNuevoDelegado}
          startEditDelegado={deps.startEditDelegado}
          toggleDelegadoActive={deps.toggleDelegadoActive}
          reactivarCredenciales={deps.reactivarCredenciales}
          eliminarDelegado={deps.eliminarDelegado}
        />
      )}

      {/* ===================== VISTA CRONOGRAMA DE ENTRENAMIENTO ===================== */}
      {view === "poli" && (
        <PoliView
          poliMsg={poli.poliMsg}
          poliError={poli.poliError}
          poliLoading={poli.poliLoading}
          poliSemana={poli.poliSemana}
          poliHoy={poli.poliHoy}
          poliSlots={poli.poliSlots}
          poliSemanaOffset={poli.poliSemanaOffset}
          openNuevoPoliSlot={poli.openNuevoPoliSlot}
          moverSemana={poli.moverSemana}
          abrirExcepcion={poli.abrirExcepcion}
          placeColor={placeColor}
          puedeOperarPoli={poli.puedeOperarPoli}
          togglePoliSlot={poli.togglePoliSlot}
          startEditPoliSlot={poli.startEditPoliSlot}
          borrarPoliSlot={poli.borrarPoliSlot}
        />
      )}

      {/* ===================== VISTA PRESUPUESTO ===================== */}
      {view === "presupuesto" && (
        <PresupuestoView
          presup={presu.presup}
          presupMes={presu.presupMes}
          setPresupMes={presu.setPresupMes}
          mesActual={mesActual}
          presupLoading={presu.presupLoading}
          presupError={presu.presupError}
          verTotal={presu.verTotal}
          setVerTotal={presu.setVerTotal}
          formatPesos={formatPesos}
          setQuotaInput={presu.setQuotaInput}
          setShowQuotaModal={presu.setShowQuotaModal}
          openGastoModal={presu.openGastoModal}
          borrarGasto={presu.borrarGasto}
          totalData={presu.totalData}
          totalLoading={presu.totalLoading}
          totalError={presu.totalError}
        />
      )}

      {/* ===================== CUERPO TÉCNICO (separado, sin pagos) ===================== */}
      {tecnicos.length > 0 && (
        <div className="mt-8">
          <h2 className="font-display text-lg font-bold text-white/80 mb-3">Cuerpo técnico</h2>
<div className="overflow-x-auto rounded-lg border border-outline">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="panel-th">Nombre</th>
                  <th className="panel-th">Rol</th>
                  <th className="panel-th text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {tecnicos.map((p) => (
                  <tr key={p.id} className="panel-tr">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-3">
                        <span className="avatar">{p.firstName.charAt(0)}{p.lastName.charAt(0)}</span>
                        <p className="font-semibold truncate">{p.firstName} {p.lastName}</p>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="px-2 py-0.5 rounded-md text-xs bg-primary/20 text-primary-light font-semibold">
                        {p.role}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="row-actions">
                        <button
                          onClick={() => pd.openDocs(p)}
                          className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-surface-2 transition-colors active:scale-90"
                          title="Fichas y estudios"
                        >
                          <Icon name="doc" className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => pf.openEditar(p)}
                          className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-surface-2 transition-colors active:scale-90"
                          title="Editar"
                        >
                          <Icon name="edit" className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => pf.removePlayer(p)}
                          className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-white/60 hover:text-red-400 hover:bg-red-500/10 transition-colors active:scale-90"
                          title="Quitar del equipo"
                        >
                          <Icon name="trash" className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="mt-6 text-xs text-white/40">
        <Link to="/" className="underline">Ver sitio público</Link>
      </p>

      {/* ===================== MODAL ALTA / EDICIÓN DE JUGADOR ===================== */}
      <PlayerModal
        showForm={pf.showForm}
        setShowForm={pf.setShowForm}
        editing={pf.editing}
        form={pf.form}
        setForm={pf.setForm}
        saving={pf.saving}
        formError={pf.formError}
        foundPlayer={pf.foundPlayer}
        buscandoDni={pf.buscandoDni}
        cuentaPresupuesto={pf.cuentaPresupuesto}
        setCuentaPresupuesto={pf.setCuentaPresupuesto}
        savePlayer={pf.savePlayer}
      />
      {/* ===================== MODAL FICHAS / DOCUMENTOS ===================== */}
      <FichasModal
        player={pd.docsPlayer}
        setPlayer={pd.setdocsPlayer}
        estado={pd.docsEstado}
        form={pd.docForm}
        setForm={pd.setDocForm}
        list={pd.docsList}
        loading={pd.docsLoading}
        msg={pd.docsMsg}
        vigenciaHint={vigenciaHint}
        subirDoc={pd.subirDoc}
        descargarDoc={pd.descargarDoc}
        borrarDoc={pd.borrarDoc}
      />
    {/* ===================== MODAL DELEGADO ===================== */}
      <CredencialesModal
        show={showCredModal}
        setShow={setShowCredModal}
        credForm={credForm}
        setCredForm={setCredForm}
        credSaving={credSaving}
        credMsg={credMsg}
        guardarCredenciales={guardarCredenciales}
      />

      <DelegadoModal
        show={deps.showDelegadoModal}
        setShow={deps.setShowDelegadoModal}
        editingId={deps.delegadoEditingId}
        form={deps.delegadoForm}
        setForm={deps.setDelegadoForm}
        allTeams={allTeams}
        error={deps.delegadosError}
        saving={deps.delegadoSaving}
        save={deps.saveDelegado}
      />

      {/* ===================== MODAL BLOQUE SEMANAL (POLI) ===================== */}
      <PoliSlotModal
        show={poli.showPoliSlotModal}
        setShow={poli.setshowPoliSlotModal}
        editingId={poli.poliSlotEditingId}
        form={poli.poliSlotForm}
        setForm={poli.setPoliSlotForm}
        esAdmin={esAdmin}
        equiposPoliEditables={poli.equiposPoliEditables}
        error={poli.poliError}
        saving={poli.poliSlotSaving}
        save={poli.savePoliSlot}
      />

      {/* ===================== MODAL EXCEPCIÓN PUNTUAL (POLI) ===================== */}
      <PoliExModal
        modal={poli.showPoliExModal}
        setModal={poli.setShowPoliExModal}
        form={poli.poliExForm}
        setForm={poli.setPoliExForm}
        esAdmin={esAdmin}
        equiposPoliEditables={poli.equiposPoliEditables}
        error={poli.poliError}
        saving={poli.poliExSaving}
        save={poli.saveExcepcion}
      />

      {/* ===================== MODAL CUOTA ===================== */}
      <QuotaModal
        show={presu.showQuotaModal}
        setShow={presu.setShowQuotaModal}
        categoria={presu.presup?.categoria}
        quotaInput={presu.quotaInput}
        setQuotaInput={presu.setQuotaInput}
        saving={presu.quotaSaving}
        save={presu.guardarQuota}
      />

      {/* ===================== MODAL GASTO ===================== */}
      <GastoModal
        modal={presu.gastoModal}
        setModal={presu.setGastoModal}
        form={presu.gastoForm}
        setForm={presu.setGastoForm}
        saving={presu.gastoSaving}
        mesActual={mesActual}
        save={presu.guardarGasto}
      />

      {/* ===================== MODAL INACTIVO (elegir mes de corte) ===================== */}
      <InactivoModal
        player={ps.inactivoModal}
        setPlayer={ps.setInactivoModal}
        mes={ps.inactivoMes}
        setMes={ps.setInactivoMes}
        confirmar={ps.setInactivo}
      />

      {/* ===================== MODAL IMPORTAR EXCEL ===================== */}
      <ImportModal
        show={ex.showImport}
        close={() => { ex.setShowImport(false); ex.setImportMsg(null); ex.setImportFile(null); }}
        importFile={ex.importFile}
        setImportFile={ex.setImportFile}
        importMsg={ex.importMsg}
        setImportMsg={ex.setImportMsg}
        importing={ex.importing}
        importarExcel={ex.importarExcel}
        descargarPlantilla={ex.descargarPlantilla}
      />

      {/* ===================== MODAL SEGURO (lista de asegurados) ===================== */}
      <SeguroModal
        show={sg.showSeguro}
        setShow={sg.setShowSeguro}
        esAdmin={esAdmin}
        teams={esAdmin ? allTeams : (me?.teams ?? [])}
        teamId={teamId}
        token={token}
        onExportado={sg.cargarAvisosSeguro}
        onMsg={mostrarToast}
      />

      {/* ===================== MODAL GIMNASIO (lista + avisos + pagos) ===================== */}
      <GymModal
        show={sg.showGym}
        setShow={sg.setShowGym}
        esAdmin={esAdmin}
        teams={esAdmin ? allTeams : (me?.teams ?? [])}
        teamId={teamId}
        token={token}
        precioGlobal={sg.gymPrecioGlobal}
        setPrecioGlobal={sg.setGymPrecioGlobal}
        onExportado={sg.cargarAvisosGym}
        onMsg={mostrarToast}
      />

      {/* ===================== MODAL PAGO DE CUOTA (monto + detalle) ===================== */}
      <PagoModal
        modal={cuotas.pagoModal}
        setModal={cuotas.setPagoModal}
        cuotaSugerida={presu.presup?.cuota ?? null}
        saving={cuotas.pagoSaving}
        guardarPago={cuotas.guardarPago}
        quitarPago={cuotas.quitarPago}
        ponerNulo={cuotas.ponerNulo}
      />

      {/* ===================== MODAL PAGO DE GIMNASIO (monto + detalle) ===================== */}
      <PagoGymModal
        modal={gymPagos.pagoGymModal}
        setModal={gymPagos.setPagoGymModal}
        precioGlobal={sg.gymPrecioGlobal}
        saving={gymPagos.pagoGymSaving}
        guardarPago={gymPagos.guardarPagoGym}
        quitarPago={gymPagos.quitarPagoGym}
        ponerNulo={gymPagos.ponerNuloGym}
      />
    </div>

      {/* ===== TOASTS ===== */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((toast) => {
          const colors = {
            success: "border-primary/50 bg-primary/10 text-primary-light",
            error: "border-red-500/50 bg-red-500/10 text-red-400",
            warning: "border-amber-500/50 bg-amber-500/10 text-amber-400",
            info: "border-blue-500/50 bg-blue-500/10 text-blue-400",
          };
          return (
            <div
              key={toast.id}
              className={cn('rounded-lg border px-4 py-3 text-sm animate-fade-up', colors[toast.type])}
              style={{ animationDuration: "0.3s" }}
            >
              {toast.message}
            </div>
          );
        })}
      </div>
    </Layout>
  );
}
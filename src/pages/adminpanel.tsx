import React, { useEffect, useState } from 'react';
import { IonPage, IonContent, IonSpinner, IonToast, useIonRouter } from '@ionic/react';
import { supabase } from "../services/Supabasecliente";

interface Usuario {
  id: string;
  nombre: string;
  dni: number;
  perfil: string;
  estado: string;
  foto_url: string | null;
}

export const AdminPanel: React.FC = () => {
  const router = useIonRouter();
  const [cargandoSesion, setCargandoSesion] = useState(true);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [pendientes, setPendientes] = useState<Usuario[]>([]);
  const [cargandoPendientes, setCargandoPendientes] = useState(true);
  const [procesando, setProcesando] = useState<string | null>(null);
  const [toastInfo, setToastInfo] = useState<{
    mostrar: boolean;
    mensaje: string;
    color: 'success' | 'danger' | 'warning';
  }>({
    mostrar: false,
    mensaje: '',
    color: 'success'
  });

  // Verificación de sesión activa y carga del perfil administrador
  useEffect(() => {
    const cargarUsuario = async () => {
      const { data: sesion } = await supabase.auth.getSession();
      const userId = sesion.session?.user.id;

      if (!userId) {
        router.push('/login', 'forward', 'replace');
        return;
      }

      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nombre, dni, perfil, estado, foto_url')
        .eq('id', userId);

      const perfilAdmin = data?.[0];

      if (error || !perfilAdmin) {
        console.error('No se pudo cargar el perfil del admin ->', error);
        router.push('/login', 'forward', 'replace');
        return;
      }

      setUsuario(perfilAdmin as Usuario);
      setCargandoSesion(false);
    };

    cargarUsuario();
  }, [router]);

  // Consulta de clientes con estado 'pendiente' ordenados por fecha
  const traerPendientes = async () => {
    setCargandoPendientes(true);

    const { data, error } = await supabase
      .from('usuarios')
      .select('id, nombre, dni, perfil, estado, foto_url')
      .eq('estado', 'pendiente')
      .order('fecha_registro', { ascending: true });

    if (!error && data) setPendientes(data as Usuario[]);
    setCargandoPendientes(false);
  };

  useEffect(() => {
    if (!cargandoSesion) traerPendientes();
  }, [cargandoSesion]);

  // Modificación del estado del cliente ('aceptado' o 'rechazado') y auditoría
  const resolver = async (cliente: Usuario, aprobar: boolean) => {
    setProcesando(cliente.id);

    const estadoNuevo = aprobar ? 'aceptado' : 'rechazado';

    const { error } = await supabase
      .from('usuarios')
      .update({
        estado: estadoNuevo,
        fecha_aprobacion: new Date().toISOString(),
        aprobado_por: usuario?.id ?? null,
      })
      .eq('id', cliente.id);

    setProcesando(null);

    if (error) {
      console.error('Error al actualizar usuario:', error);
      setToastInfo({
        mostrar: true,
        mensaje: `Ocurrió un error al intentar ${aprobar ? 'aceptar' : 'rechazar'} a ${cliente.nombre}.`,
        color: 'danger'
      });
    } else {
      setToastInfo({
        mostrar: true,
        mensaje: `El cliente ${cliente.nombre} fue ${aprobar ? 'aceptado' : 'rechazado'} correctamente.`,
        color: aprobar ? 'success' : 'warning'
      });
      traerPendientes();
    }
  };

  const handleCerrarSesion = async () => {
    await supabase.auth.signOut();
    router.push('/login', 'forward', 'replace');
  };

  if (cargandoSesion) {
    return (
      <IonPage>
        <IonContent style={{ '--background': '#f4f4f5' } as React.CSSProperties}>
          <div style={{ minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IonSpinner name="crescent" color="dark" />
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonContent style={{ '--background': '#f4f4f5' } as React.CSSProperties}>
        <div style={{ minHeight: '100%', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

          {/* HEADER */}
          <header style={{
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #e4e4e7',
            padding: '20px 20px 16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '1px', color: '#a1a1aa', textTransform: 'uppercase' }}>
                Panel
              </span>
              <h1 style={{ fontSize: '18px', fontWeight: '500', color: '#18181b', margin: '2px 0 0 0' }}>
                Hola, {usuario?.nombre}
              </h1>
            </div>
            <button
              onClick={handleCerrarSesion}
              style={{
                fontSize: '12px',
                fontWeight: '500',
                color: '#3f3f46',
                backgroundColor: '#fafafa',
                border: '1px solid #e4e4e7',
                borderRadius: '8px',
                padding: '8px 14px',
                cursor: 'pointer'
              }}
            >
              Cerrar sesión
            </button>
          </header>

          <main style={{ padding: '20px 16px', maxWidth: '520px', margin: '0 auto' }}>
            <div style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e4e4e7',
              borderRadius: '16px',
              padding: '20px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
            }}>
              <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#18181b', margin: '0 0 14px 0' }}>
                Clientes pendientes de aprobación
              </h2>

              {cargandoPendientes ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
                  <IonSpinner name="crescent" color="dark" />
                </div>
              ) : pendientes.length === 0 ? (
                <p style={{ fontSize: '13px', color: '#a1a1aa', margin: 0 }}>
                  No hay clientes esperando aprobación.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {pendientes.map((cliente) => (
                    <div key={cliente.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      backgroundColor: '#fafafa',
                      border: '1px solid #e4e4e7',
                      borderRadius: '10px',
                      padding: '10px 12px'
                    }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        backgroundColor: '#18181b',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: '600',
                        flexShrink: 0,
                        overflow: 'hidden'
                      }}>
                        {cliente.foto_url ? (
                          <img src={cliente.foto_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                        ) : (
                          cliente.nombre?.charAt(0) ?? 'U'
                        )}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '13px', color: '#18181b', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {cliente.nombre}
                        </p>
                        <p style={{ fontSize: '11px', color: '#a1a1aa', margin: 0 }}>
                          DNI {cliente.dni}
                        </p>
                      </div>

                      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                        <button
                          disabled={procesando === cliente.id}
                          onClick={() => resolver(cliente, true)}
                          style={{
                            backgroundColor: '#16a34a',
                            color: '#ffffff',
                            fontSize: '11px',
                            fontWeight: '600',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: 'none',
                            cursor: 'pointer',
                            opacity: procesando === cliente.id ? 0.5 : 1
                          }}
                        >
                          Aceptar
                        </button>
                        <button
                          disabled={procesando === cliente.id}
                          onClick={() => resolver(cliente, false)}
                          style={{
                            backgroundColor: '#dc2626',
                            color: '#ffffff',
                            fontSize: '11px',
                            fontWeight: '600',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: 'none',
                            cursor: 'pointer',
                            opacity: procesando === cliente.id ? 0.5 : 1
                          }}
                        >
                          Rechazar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </main>

          <IonToast
            isOpen={toastInfo.mostrar}
            message={toastInfo.mensaje}
            duration={3000}
            color={toastInfo.color}
            onDidDismiss={() => setToastInfo((prev) => ({ ...prev, mostrar: false }))}
          />

        </div>
      </IonContent>
    </IonPage>
  );
};
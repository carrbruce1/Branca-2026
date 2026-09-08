import React, { useEffect, useState } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonList,
  IonItem,
  IonLabel,
  IonButton,
  IonIcon,
  IonAlert,
  IonLoading,
  IonToast,
  IonAvatar
} from '@ionic/react';
import { checkmarkCircleOutline, closeCircleOutline } from 'ionicons/icons';
import { supabase } from '../supabaseClient';

interface ClientePendiente {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  foto?: string;
  dni?: string;
}

export const PendientesAprobacion: React.FC = () => {
  const [clientes, setClientes] = useState<ClientePendiente[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClientePendiente | null>(null);
  const [showRechazarAlert, setShowRechazarAlert] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');

  useEffect(() => {
    cargarPendientes();
  }, []);

  const cargarPendientes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('estado', 'pendiente');

    if (error) {
      setToastMessage('Error al cargar la lista de clientes pendientes.');
    } else {
      setClientes(data || []);
    }
    setLoading(false);
  };

  const enviarEmailNotificacion = async (
    email: string,
    nombre: string,
    aprobado: boolean,
    motivo?: string
  ) => {
    try {
      await supabase.functions.invoke('send-email', {
        body: {
          email,
          nombre,
          estado: aprobado ? 'aprobado' : 'rechazado',
          motivo: motivo || '',
        },
      });
    } catch (err) {
      console.error('Error enviando notificación por email:', err);
    }
  };

  const aceptarCliente = async (cliente: ClientePendiente) => {
    setLoading(true);
    const { error } = await supabase
      .from('clientes')
      .update({ estado: 'aprobado' })
      .eq('id', cliente.id);

    if (!error) {
      await enviarEmailNotificacion(cliente.email, `${cliente.nombre} ${cliente.apellido}`, true);
      setToastMessage(`Cliente ${cliente.nombre} aprobado con éxito.`);
      cargarPendientes();
    } else {
      setToastMessage('Error al aprobar el cliente.');
      setLoading(false);
    }
  };

  const rechazarCliente = async (motivo: string) => {
    if (!clienteSeleccionado) return;
    setLoading(true);

    const { error } = await supabase
      .from('clientes')
      .update({ estado: 'rechazado', motivo_rechazo: motivo })
      .eq('id', clienteSeleccionado.id);

    if (!error) {
      await enviarEmailNotificacion(
        clienteSeleccionado.email,
        `${clienteSeleccionado.nombre} ${clienteSeleccionado.apellido}`,
        false,
        motivo
      );
      setToastMessage(`Cliente ${clienteSeleccionado.nombre} rechazado.`);
      cargarPendientes();
    } else {
      setToastMessage('Error al rechazar el cliente.');
      setLoading(false);
    }
    setClienteSeleccionado(null);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Aprobación de Clientes</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <IonLoading isOpen={loading} message={'Procesando...'} />

        {clientes.length === 0 && !loading ? (
          <p style={{ textAlign: 'center', marginTop: '2rem' }}>
            No hay clientes pendientes de aprobación.
          </p>
        ) : (
          <IonList>
            {clientes.map((c) => (
              <IonItem key={c.id}>
                {c.foto && (
                  <IonAvatar slot="start">
                    <img src={c.foto} alt={c.nombre} />
                  </IonAvatar>
                )}
                <IonLabel>
                  <h2>{c.nombre} {c.apellido}</h2>
                  <p>{c.email}</p>
                  {c.dni && <p>DNI: {c.dni}</p>}
                </IonLabel>

                <IonButton
                  slot="end"
                  color="success"
                  fill="clear"
                  onClick={() => aceptarCliente(c)}
                >
                  <IonIcon slot="icon-only" icon={checkmarkCircleOutline} />
                </IonButton>

                <IonButton
                  slot="end"
                  color="danger"
                  fill="clear"
                  onClick={() => {
                    setClienteSeleccionado(c);
                    setShowRechazarAlert(true);
                  }}
                >
                  <IonIcon slot="icon-only" icon={closeCircleOutline} />
                </IonButton>
              </IonItem>
            ))}
          </IonList>
        )}

        <IonAlert
          isOpen={showRechazarAlert}
          onDidDismiss={() => setShowRechazarAlert(false)}
          header="Rechazar Registro"
          subHeader="Ingrese el motivo del rechazo para notificar al cliente"
          inputs={[
            {
              name: 'motivo',
              type: 'textarea',
              placeholder: 'Ej: Documentación o datos inválidos...',
            },
          ]}
          buttons={[
            {
              text: 'Cancelar',
              role: 'cancel',
            },
            {
              text: 'Rechazar y Notificar',
              handler: (data) => {
                rechazarCliente(data.motivo);
              },
            },
          ]}
        />

        <IonToast
          isOpen={!!toastMessage}
          message={toastMessage}
          duration={3000}
          onDidDismiss={() => setToastMessage('')}
        />
      </IonContent>
    </IonPage>
  );
};

export default PendientesAprobacion;
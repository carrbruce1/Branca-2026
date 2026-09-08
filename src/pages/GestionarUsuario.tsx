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
  IonBadge,
  IonLoading,
  IonToast,
  IonSelect,
  IonSelectOption
} from '@ionic/react';
import { supabase } from '../supabaseClient'; 

interface Usuario {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  perfil: string;
  estado?: string;
}

export const GestionUsuarios: React.FC = () => {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string>('');

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const cargarUsuarios = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .order('nombre', { ascending: true });

    if (error) {
      setToastMessage('Error al cargar la lista de usuarios.');
    } else {
      setUsuarios(data || []);
    }
    setLoading(false);
  };

  const actualizarPerfil = async (id: string, nuevoPerfil: string) => {
    setLoading(true);
    const { error } = await supabase
      .from('usuarios')
      .update({ perfil: nuevoPerfil })
      .eq('id', id);

    if (error) {
      setToastMessage('No se pudo actualizar el perfil del usuario.');
    } else {
      setToastMessage('Perfil actualizado correctamente.');
      cargarUsuarios();
    }
    setLoading(false);
  };

  const getBadgeColor = (perfil: string) => {
    switch (perfil) {
      case 'dueno':
        return 'danger';
      case 'supervisor':
        return 'warning';
      case 'cliente':
        return 'success';
      default:
        return 'primary';
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Gestión de Usuarios</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <IonLoading isOpen={loading} message={'Cargando usuarios...'} />

        <IonList>
          {usuarios.map((u) => (
            <IonItem key={u.id}>
              <IonLabel>
                <h2>
                  {u.nombre} {u.apellido}{' '}
                  <IonBadge color={getBadgeColor(u.perfil)}>
                    {u.perfil.toUpperCase()}
                  </IonBadge>
                </h2>
                <p>{u.email}</p>
              </IonLabel>

              <IonSelect
                value={u.perfil}
                placeholder="Cambiar rol"
                onIonChange={(e) => actualizarPerfil(u.id, e.detail.value)}
              >
                <IonSelectOption value="dueno">Dueño</IonSelectOption>
                <IonSelectOption value="supervisor">Supervisor</IonSelectOption>
                <IonSelectOption value="mozo">Mozo</IonSelectOption>
                <IonSelectOption value="cocinero">Cocinero</IonSelectOption>
                <IonSelectOption value="bartender">Bartender</IonSelectOption>
                <IonSelectOption value="cliente">Cliente</IonSelectOption>
              </IonSelect>
            </IonItem>
          ))}
        </IonList>

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

export default GestionUsuarios;
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButton, useIonRouter } from '@ionic/react';
import ExploreContainer from '../components/ExploreContainer';
import './Home.css';

const Home: React.FC = () => {
  const router = useIonRouter();

  const irAlLogin = () => {
    router.push('/login', 'forward', 'push');
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Home - Restaurante</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="ion-padding">
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Home</IonTitle>
          </IonToolbar>
        </IonHeader>

        {/* BOTÓN PARA IR AL LOGIN */}
        <div className="flex flex-col items-center justify-center my-6">
          <IonButton onClick={irAlLogin} color="primary">
            Ir al Login
          </IonButton>
        </div>

        <ExploreContainer />
      </IonContent>
    </IonPage>
  );
};

export default Home;
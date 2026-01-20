import { Injectable, inject } from '@angular/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { Platform } from '@ionic/angular';
import { BehaviorSubject } from 'rxjs';
import { NotificationService } from './notification.service';

@Injectable({ providedIn: 'root' })
export class PushService {
  // Observable to track registration status
  private tokenSubject = new BehaviorSubject<string | null>(null);
  public token$ = this.tokenSubject.asObservable();
  private notificationService = inject(NotificationService);

  constructor(private platform: Platform) {}

  async init() {
    if (!this.platform.is('capacitor')) {
      console.log('Push notifications only work on native devices.');
      return;
    }

    await this.registerNotifications();
    await this.createChannels();
    await this.addListeners();
  }

  private async registerNotifications() {
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      console.error('User denied permissions!');
      return;
    }

    await PushNotifications.register();
  }

  private async createChannels() {
    if (this.platform.is('android')) {
      await PushNotifications.createChannel({
        id: 'default',
        name: 'Notificaciones Generales',
        description: 'Notificaciones generales de la aplicación',
        importance: 3,
        visibility: 1,
        vibration: true,
      });

      await PushNotifications.createChannel({
        id: 'silent',
        name: 'Notificaciones Silenciosas',
        description: 'Notificaciones sin sonido',
        importance: 2, // Low importance, no sound
        visibility: 1,
        vibration: false,
        sound: undefined
      });
    }
  }

  private async addListeners() {
    await PushNotifications.addListener('registration', token => {
      console.log('Push registration success, token: ' + token.value);
      this.tokenSubject.next(token.value);
      // TODO: Send token to backend
    });

    await PushNotifications.addListener('registrationError', err => {
      console.error('Push registration error: ', err.error);
    });

    await PushNotifications.addListener('pushNotificationReceived', notification => {
      console.log('Push received: ', notification);
      // Refresh notifications list in the app
      this.notificationService.refreshNotifications();
    });

    await PushNotifications.addListener('pushNotificationActionPerformed', notification => {
      console.log('Push action performed: ', notification);
      // Navigate to specific page based on notification data
      const data = notification.notification.data;
      if (data && data.url) {
        // Use router to navigate
        // this.router.navigateByUrl(data.url);
      }
    });
  }
}

import { Component, OnInit } from '@angular/core';
import { AuthService } from './core/services/auth.service';
import { Router } from '@angular/router';
import { PushService } from './core/services/push.service';
import { Platform } from '@ionic/angular';
import { NetworkService } from './core/services/network.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  constructor(
    private authService: AuthService,
    private router: Router,
    private pushService: PushService,
    private platform: Platform,
    private networkService: NetworkService
  ) { }

  ngOnInit() {
    this.platform.ready().then(() => {
      this.pushService.init();
    });
  }
}

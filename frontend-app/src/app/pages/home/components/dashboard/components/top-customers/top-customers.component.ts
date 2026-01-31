import { Component, Input } from '@angular/core';

interface CustomerStat {
  name: string;
  totalSpent: number;
  transactionCount: number;
  lastPurchase: string | Date;
}

@Component({
  selector: 'app-top-customers',
  templateUrl: './top-customers.component.html',
  styleUrls: ['./top-customers.component.scss'],
  standalone: false
})
export class TopCustomersComponent {
  @Input() topCustomers: CustomerStat[] = [];
}

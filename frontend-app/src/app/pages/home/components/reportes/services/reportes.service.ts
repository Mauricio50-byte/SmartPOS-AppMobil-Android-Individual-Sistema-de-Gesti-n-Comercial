import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export type ReportPeriod = 'day' | 'week' | 'month' | 'year' | 'all';

export type GroupByOption = 'category' | 'product';

export interface ReportMetric {
  name: string;
  salesVolume: number; // Units
  revenue: number; // Money
  cost: number; // Money
  margin: number; // %
  growth: number; // % vs previous period
  share: number; // % of total revenue
}

export interface ReportData {
  metrics: ReportMetric[];
  totalRevenue: number; // Facturado
  totalCollected: number; // Recaudado (Real)
  totalPending: number; // Por Cobrar (Fiado)
  totalCost: number;
  totalVolume: number;
  totalTransactions: number; // Cantidad de ventas (tickets)
  averageTicket: number; // Ticket Promedio
  // Breakdowns
  revenueCash: number;
  revenueTransfer: number;
  collectedCash: number;
  collectedTransfer: number;
  pendingCash: number;
  pendingTransfer: number;
  volumeContado: number;
  volumeFiado: number;
  transactionsContado: number;
  transactionsFiado: number;
}

@Injectable({
  providedIn: 'root'
})
export class ReportesService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl + '/reportes';

  constructor() { }

  /**
   * Obtiene el reporte general desde el backend.
   * La lógica de cálculo se ha migrado al backend para mayor eficiencia.
   */
  getGeneralReport(period: ReportPeriod = 'month', groupBy: GroupByOption = 'category'): Observable<ReportData> {
    console.log('[DEBUG Frontend] Requesting report from backend:', { period, groupBy });

    return this.http.get<ReportData>(`${this.apiUrl}/general`, {
      params: { period, groupBy }
    });
  }

  exportToPDF(data: ReportMetric[], title: string = 'Reporte de Categorías') {
    const doc = new jsPDF();
    const date = new Date().toLocaleDateString();

    doc.setFontSize(18);
    doc.text(title, 14, 22);
    doc.setFontSize(11);
    doc.text(`Generado el: ${date}`, 14, 30);

    const headers = [['Categoría', 'Ventas ($)', 'Costo ($)', 'Margen (%)', 'Crecimiento (%)', 'Volumen']];
    const rows = data.map(row => [
      row.name,
      row.revenue.toFixed(2),
      row.cost.toFixed(2),
      row.margin.toFixed(2) + '%',
      row.growth.toFixed(2) + '%',
      row.salesVolume
    ]);

    autoTable(doc, {
      head: headers,
      body: rows,
      startY: 40,
      theme: 'grid',
      headStyles: { fillColor: [22, 163, 74] } // green-600
    });

    const fileName = `${title.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.pdf`;

    if (Capacitor.isNativePlatform()) {
      try {
        const base64PDF = doc.output('datauristring').split(',')[1];
        this.saveAndShareFile(fileName, base64PDF);
      } catch (e) {
        console.error('Error exportando PDF nativo', e);
      }
    } else {
      doc.save(fileName);
    }
  }

  exportToExcel(data: ReportMetric[], fileName: string = 'reporte') {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = { Sheets: { 'data': worksheet }, SheetNames: ['data'] };

    const fullFileName = `${fileName}_export_${new Date().getTime()}.xlsx`;

    if (Capacitor.isNativePlatform()) {
      try {
        const excelBase64 = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
        this.saveAndShareFile(fullFileName, excelBase64);
      } catch (e) {
        console.error('Error exportando Excel nativo', e);
      }
    } else {
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      this.saveAsExcelFile(excelBuffer, fileName);
    }
  }

  private async saveAndShareFile(fileName: string, base64Data: string) {
    try {
      const savedFile = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Cache
      });

      await Share.share({
        title: 'Compartir Reporte',
        text: 'Adjunto encontrarás el reporte generado.',
        url: savedFile.uri,
        dialogTitle: 'Compartir Reporte'
      });
    } catch (error) {
      console.error('Error al guardar/compartir archivo:', error);
      // Fallback or alert logic could be added here
    }
  }

  private saveAsExcelFile(buffer: any, fileName: string): void {
    const EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
    const EXCEL_EXTENSION = '.xlsx';
    const data: Blob = new Blob([buffer], { type: EXCEL_TYPE });
    saveAs(data, fileName + '_export_' + new Date().getTime() + EXCEL_EXTENSION);
  }
}
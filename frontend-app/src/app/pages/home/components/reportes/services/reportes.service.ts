import { Injectable, inject } from '@angular/core';
import { forkJoin, Observable, map } from 'rxjs';
import { VentaServices } from '../../../../../core/services/venta.service';
import { ProductosServices } from '../../../../../core/services/producto.service';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

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
  totalRevenue: number;
  totalCost: number;
  totalVolume: number;
}

@Injectable({
  providedIn: 'root'
})
export class ReportesService {
  private ventaService = inject(VentaServices);
  private productoService = inject(ProductosServices);

  constructor() { }

  getGeneralReport(): Observable<ReportData> {
    return forkJoin({
      ventas: this.ventaService.listarVentas(),
      productos: this.productoService.listarProductos()
    }).pipe(
      map(({ ventas, productos }) => this.calculateMetrics(ventas, productos))
    );
  }

  private calculateMetrics(ventas: any[], productos: any[]): ReportData {
    const productMap = new Map(productos.map(p => [p.id, p]));
    const categoryStats: Record<string, {
      volume: number,
      revenue: number,
      cost: number,
      prevRevenue: number
    }> = {};

    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
    const prevMonth = prevMonthDate.getMonth();
    const prevYear = prevMonthDate.getFullYear();

    let totalRevenue = 0;
    let totalCost = 0;
    let totalVolume = 0;

    ventas.forEach(v => {
      if (!v.fecha) return;
      const vDate = new Date(v.fecha);

      const isCurrentPeriod = vDate.getMonth() === currentMonth && vDate.getFullYear() === currentYear;

      // For a more fair comparison (Month-to-Date), compare with previous month up to the same day
      const isPrevPeriod = vDate.getMonth() === prevMonth &&
        vDate.getFullYear() === prevYear &&
        vDate.getDate() <= currentDay;

      if (!isCurrentPeriod && !isPrevPeriod) return;

      const items = v.detalles || v.items || [];
      items.forEach((item: any) => {
        const pId = item.producto?.id || item.productoId;
        const product = productMap.get(pId);
        if (!product) return;

        const cat = (product.categoria || product.tipo || 'General').trim();
        const qty = Number(item.cantidad) || 0;

        // Prioritize subtotal, then calculated, then unit * qty
        const itemRevenue = Number(item.subtotal) || Number(item.total) || (Number(item.precioUnitario) * qty) || 0;
        const unitCost = Number(product.precioCosto) || 0;
        const itemCost = unitCost * qty;

        if (!categoryStats[cat]) {
          categoryStats[cat] = { volume: 0, revenue: 0, cost: 0, prevRevenue: 0 };
        }

        if (isCurrentPeriod) {
          categoryStats[cat].volume += qty;
          categoryStats[cat].revenue += itemRevenue;
          categoryStats[cat].cost += itemCost;
          totalRevenue += itemRevenue;
          totalCost += itemCost;
          totalVolume += qty;
        } else if (isPrevPeriod) {
          categoryStats[cat].prevRevenue += itemRevenue;
        }
      });
    });

    const metrics = Object.entries(categoryStats).map(([name, stats]) => {
      const margin = stats.revenue > 0 ? ((stats.revenue - stats.cost) / stats.revenue) * 100 : 0;

      // Growth calculation:
      // If we had sales before: (Current - Previous) / Previous
      // If we had NO sales before and HAVE sales now: 100% growth (New Sales)
      let growth = 0;
      if (stats.prevRevenue > 0) {
        growth = ((stats.revenue - stats.prevRevenue) / stats.prevRevenue) * 100;
      } else if (stats.revenue > 0) {
        growth = 100; // It's all growth compared to zero
      }

      const share = totalRevenue > 0 ? (stats.revenue / totalRevenue) * 100 : 0;

      return {
        name,
        salesVolume: stats.volume,
        revenue: stats.revenue,
        cost: stats.cost,
        margin,
        growth,
        share
      };
    });

    return { metrics, totalRevenue, totalCost, totalVolume };
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

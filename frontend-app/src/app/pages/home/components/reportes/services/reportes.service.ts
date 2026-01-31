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
  private ventaService = inject(VentaServices);
  private productoService = inject(ProductosServices);

  constructor() { }

  getGeneralReport(period: ReportPeriod = 'month', groupBy: GroupByOption = 'category'): Observable<ReportData> {
    const { startDate, endDate } = this.getDateRange(period);
    console.log('[DEBUG Frontend] Requesting report for period:', period, 'Group by:', groupBy);
    console.log('[DEBUG Frontend] Date Range:', { startDate, endDate });

    return forkJoin({
      ventas: this.ventaService.listarVentas({ startDate, endDate }),
      productos: this.productoService.listarProductos()
    }).pipe(
      map(({ ventas, productos }) => this.calculateMetrics(ventas, productos, groupBy))
    );
  }

  private getDateRange(period: ReportPeriod): { startDate?: string, endDate?: string } {
    if (period === 'all') return {};

    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    
    let start = new Date(now);
    start.setHours(0, 0, 0, 0);

    switch (period) {
      case 'day':
        // Start is already today 00:00
        break;
      case 'week':
        const day = start.getDay();
        // Calculate Monday of current week
        const diff = start.getDate() - day + (day === 0 ? -6 : 1); 
        start.setDate(diff);
        break;
      case 'month':
        start.setDate(1);
        break;
      case 'year':
        start.setMonth(0, 1);
        break;
    }

    return { 
      startDate: start.toISOString(), 
      endDate: end.toISOString() 
    };
  }

  private calculateMetrics(ventas: any[], productos: any[], groupBy: GroupByOption): ReportData {
    const productMap = new Map(productos.map(p => [p.id, p]));
    const categoryStats: Record<string, {
      volume: number,
      revenue: number,
      cost: number,
      prevRevenue: number
    }> = {};

    let totalRevenue = 0;
    let totalCollected = 0; 
    let totalPending = 0;   
    let totalCost = 0;
    let totalVolume = 0;

    let revenueCash = 0;
    let revenueTransfer = 0;
    let collectedCash = 0;
    let collectedTransfer = 0;
    let pendingCash = 0;
    let pendingTransfer = 0;
    let volumeContado = 0;
    let volumeFiado = 0;
    let transactionsContado = 0;
    let transactionsFiado = 0;

    ventas.forEach(v => {
      // Since we filter at API level, we assume all returned sales are relevant for the current period
      
      // Use Number() to ensure safety
      const pagado = Number(v.montoPagado) || 0;
      const pendiente = Number(v.saldoPendiente) || 0;
      const totalVenta = Number(v.total) || 0;
      const metodo = (v.metodoPago || 'EFECTIVO').toUpperCase();
      const estado = (v.estadoPago || 'PAGADO').toUpperCase();
      
      // Transaction breakdown
      if (estado === 'PAGADO') {
        transactionsContado++;
      } else {
        transactionsFiado++;
      }

      totalCollected += pagado;
      totalPending += pendiente;

      // Revenue breakdown (by sale payment method)
      if (metodo === 'EFECTIVO') {
        revenueCash += totalVenta;
      } else {
        revenueTransfer += totalVenta;
      }

      // Collected breakdown (by sale payment method)
      if (metodo === 'EFECTIVO') {
        collectedCash += pagado;
      } else {
        collectedTransfer += pagado;
      }

      // Pending breakdown (by sale payment method)
      if (metodo === 'EFECTIVO') {
        pendingCash += pendiente;
      } else {
        pendingTransfer += pendiente;
      }
      
      const items = v.detalles || v.items || [];
      items.forEach((item: any) => {
        const pId = item.producto?.id || item.productoId;
        const product = productMap.get(pId);
        if (!product) return;

        let key = '';
        if (groupBy === 'category') {
           key = (product.categoria || product.tipo || 'General').trim();
        } else {
           // Agrupar por nombre de producto
           // Opcional: concatenar SKU si se desea diferenciar variantes: `${product.nombre} (${product.sku || 'Sin SKU'})`
           key = product.nombre.trim();
        }
        
        const qty = Number(item.cantidad) || 0;

        // Prioritize subtotal, then calculated, then unit * qty
        const itemRevenue = Number(item.subtotal) || Number(item.total) || (Number(item.precioUnitario) * qty) || 0;
        const unitCost = Number(product.precioCosto) || 0;
        const itemCost = unitCost * qty;

        if (!categoryStats[key]) {
          categoryStats[key] = { volume: 0, revenue: 0, cost: 0, prevRevenue: 0 };
        }

        categoryStats[key].volume += qty;
        categoryStats[key].revenue += itemRevenue;
        categoryStats[key].cost += itemCost;
        
        totalRevenue += itemRevenue;
        totalCost += itemCost;
        totalVolume += qty;

        // Volume breakdown
        if (estado === 'PAGADO') {
            volumeContado += qty;
        } else {
            volumeFiado += qty;
        }
      });
    });

    const metrics = Object.entries(categoryStats).map(([name, stats]) => {
      const margin = stats.revenue > 0 ? ((stats.revenue - stats.cost) / stats.revenue) * 100 : 0;

      // Growth calculation is disabled/reset because we don't fetch previous period data anymore
      const growth = 0; 

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

    const totalTransactions = ventas.length;
    const averageTicket = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    return { 
      metrics, 
      totalRevenue, 
      totalCost, 
      totalVolume, 
      totalCollected, 
      totalPending,
      totalTransactions,
      averageTicket,
      revenueCash,
      revenueTransfer,
      collectedCash,
      collectedTransfer,
      pendingCash,
      pendingTransfer,
      volumeContado,
      volumeFiado,
      transactionsContado,
      transactionsFiado
    };
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
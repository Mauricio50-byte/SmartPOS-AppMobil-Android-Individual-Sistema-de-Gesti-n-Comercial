import { Directive, HostListener, ElementRef, OnInit, Optional } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: '[appNumericFormat]',
  standalone: true
})
export class NumericFormatDirective implements OnInit {

  constructor(
    private el: ElementRef,
    @Optional() private control: NgControl
  ) {}

  ngOnInit() {
    // Formatear valor inicial si existe
    if (this.control && this.control.value) {
      this.formatValue(this.control.value.toString());
    }
  }

  @HostListener('ionInput', ['$event'])
  onIonInput(event: any) {
    const value = event.target.value;
    this.formatValue(value);
  }

  @HostListener('input', ['$event'])
  onInput(event: any) {
    // Fallback para inputs nativos si no es ion-input
    const value = event.target.value;
    this.formatValue(value);
  }

  private formatValue(value: any) {
    if (value === null || value === undefined) return;

    // Convertir a string y limpiar caracteres no numéricos
    let stringValue = value.toString();
    let numericValue = stringValue.replace(/[^0-9]/g, '');

    if (!numericValue) {
      this.updateValues('', null);
      return;
    }

    // Aplicar formato de miles con puntos
    // Ejemplo: 10000 -> 10.000
    const formattedValue = numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    this.updateValues(formattedValue, parseInt(numericValue, 10));
  }

  private updateValues(displayValue: string, rawValue: number | null) {
    // Actualizar el valor visual en el elemento
    // Si es un ion-input, accedemos al valor a través de la propiedad value
    if (this.el.nativeElement.value !== undefined) {
      this.el.nativeElement.value = displayValue;
    }

    // Actualizar el valor en el FormControl de Angular si existe
    if (this.control && this.control.control) {
      this.control.control.setValue(rawValue, {
        emitEvent: false,
        emitModelToViewChange: false,
        emitViewToModelChange: false
      });
    }
  }
}

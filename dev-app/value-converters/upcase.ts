export class UpcaseValueConverter {

  toView(value: unknown): string {

    return typeof value === 'string' ? value.toUpperCase() : '';
  }
}

import { UnimplementedError } from '../../util/Errors';
import * as E from '../Expressions';

// ----------------------------------------------------------------------------
// Arithmetic
// ----------------------------------------------------------------------------

export function numericMultiply(left: number, right: number) {
  return left * right;
}

export function numericDivide(left: number, right: number) {
  return left / right;
}

export function numericAdd(left: number, right: number) {
  return left + right;
}

export function numericSubtract(left: number, right: number) {
  return left - right;
}

// ----------------------------------------------------------------------------
// Tests
// ----------------------------------------------------------------------------

// Equal ---------------------------------------------------------------------

export function numericEqual(left: number, right: number) {
  return left === right;
}

export function booleanEqual(left: boolean, right: boolean) {
  return left === right;
}

export function dateTimeEqual(left: Date, right: Date): boolean {
  throw new UnimplementedError();
}

// Less Than ------------------------------------------------------------------

export function numericLessThan(left: number, right: number) {
  return left < right;
}

export function booleanLessThan(left: boolean, right: boolean) {
  return left < right;
}

export function dateTimeLessThan(left: Date, right: Date): boolean {
  throw new UnimplementedError();
}

// Greater Than

export function numericGreaterThan(left: number, right: number) {
  return left > right;
}

export function booleanGreaterThan(left: boolean, right: boolean) {
  return left > right;
}

export function dateTimeGreaterThan(left: Date, right: Date): boolean {
  throw new UnimplementedError();
}

// ----------------------------------------------------------------------------
// Varia
// ----------------------------------------------------------------------------

export function compare(left: string, right: string) {
  return left.localeCompare(right);
}

export function str(lit: E.Literal<any>) {
  return lit.strValue || lit.typedValue.toString();
}

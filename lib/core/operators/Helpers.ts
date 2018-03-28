import { List, Map, Record } from 'immutable';
import * as RDFDM from 'rdf-data-model';

import * as C from '../../util/Consts';
import { DataType as DT } from '../../util/Consts';
import { UnimplementedError } from '../../util/Errors';
import * as E from '../Expressions';

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

export function bool(val: boolean): E.BooleanLiteral {
  return new E.BooleanLiteral(val, undefined, C.make(DT.XSD_BOOLEAN));
}

export function number(num: number, dt?: C.DataType): E.NumericLiteral {
  return new E.NumericLiteral(num, undefined, C.make(dt || DT.XSD_FLOAT));
}

export function list(...args: E.ArgumentType[]) {
  return List(args);
}

// ----------------------------------------------------------------------------
// Type Safety Helpers
// ----------------------------------------------------------------------------

// OverloadMap ----------------------------------------------------------------
/*
 * Immutable.js type definitions are pretty unsafe, and this is typo-prone work.
 * These helpers allow use to create OverloadMaps with more type-safety.
 * One entry in the OverloadMap is described by the record Impl;
 *
 * An array of Impl's then gets constructed into an Immutable.js Map.
 *
 * See:
 * https://medium.com/@alexxgent/enforcing-types-with-immutablejs-and-typescript-6ab980819b6a
 */

// tslint:disable-next-line:interface-over-type-literal
export type ImplType = {
  types: E.ArgumentType[];
  func: (args: E.ITermExpression[]) => E.ITermExpression;
};

function implDefaults() {
  return {
    types: <E.ArgumentType[]>[],
    func(args: E.ITermExpression[]) {
      throw new UnimplementedError();
    },
  };
}

export class Impl extends Record(implDefaults()) {
  constructor(params: ImplType) { super(params); }
  public get<T extends keyof ImplType>(value: T): ImplType[T] {
    return super.get(value);
  }
}

export function map(implementations: Impl[]): E.OverloadMap {
  return Map(implementations.map((i) => [List(i.get('types')), i.get('func')]));
}

import * as Promise from 'bluebird';
import { Iterable, List, Map, Record } from 'immutable';
import { Impl, map } from './Helpers';

import * as C from '../../util/Consts';
import { DataType as DT } from '../../util/Consts';
import { InvalidArity, UnimplementedError, InvalidLexicalForm } from '../../util/Errors';
import * as E from './../Expressions';
import { bool, list, number } from './Helpers';
import * as Special from './SpecialFunctions';
import {
  ArgumentType, OverloadedFunction, OverloadMap, SimpleFunction, SpecialFunctionAsync,
} from './Types';
import * as X from './XPath';

// ----------------------------------------------------------------------------
// The definitions and functionality for all operators
// ----------------------------------------------------------------------------

export type SpecificDefinition = SimpleDefinition | OverloadedDefinition | SpecialDefinition;

export interface IDefinition {
  category: C.OperatorCategory;
  arity: number;
  definition: SpecificDefinition;
}

type IDefinitionMap = {[key in C.Operator]: IDefinition };

// tslint:disable-next-line:interface-over-type-literal
export type SimpleDefinition = {
  types: ArgumentType[];
  apply(args: any[]): E.ITermExpression;
};
export type OverloadedDefinition = OverloadMap;
export type SpecialDefinition = new (op: C.Operator) => SpecialFunctionAsync;

// TODO Maybe split in definitions for simple, overloaded and async functions.
const _definitions: IDefinitionMap = {
  // TODO: Check expressions parent types
  '!': {
    arity: 1,
    category: 'simple',
    definition: {
      types: [],
      apply: () => { throw new UnimplementedError(); },
    },
  },
  'UPLUS': {
    arity: 1,
    category: 'simple',
    definition: {
      types: [],
      apply: () => { throw new UnimplementedError(); },
    },
  },
  'UMINUS': {
    arity: 1,
    category: 'simple',
    definition: {
      types: [],
      apply: () => { throw new UnimplementedError(); },
    },
  },
  '&&': {
    arity: 2,
    category: 'special',
    definition: Special.LogicalAndAsync,
  },
  '||': {
    arity: 2,
    category: 'special',
    definition: Special.LogicalOrAsync,
  },
  '*': {
    arity: 2,
    category: 'overloaded',
    definition: arithmetic(X.numericMultiply),
  },
  '/': {
    arity: 2,
    category: 'overloaded',
    definition: arithmetic(X.numericDivide).set(
      list('integer', 'integer'),
      (args: Term[]) => number(binary(X.numericDivide, args), DT.XSD_DECIMAL),
    ),
  },
  '+': {
    arity: 2,
    category: 'overloaded',
    definition: arithmetic(X.numericAdd),
  },
  '-': {
    arity: 2,
    category: 'overloaded',
    definition: arithmetic(X.numericSubtract),
  },
  '=': {
    arity: 2,
    category: 'overloaded',
    definition: xPathTest(
      X.numericEqual,
      (left, right) => X.numericEqual(X.compare(left, right), 0),
      X.booleanEqual,
      X.dateTimeEqual,
    ).set(
      list('term', 'term'),
      (args: Term[]) => {
        return bool(Special.RDFTermEqual(args[0], args[1]));
      },
    ),
  },
  '!=': {
    arity: 2,
    category: 'overloaded',
    definition: xPathTest(
      (left, right) => !X.numericEqual(left, right),
      (left, right) => !X.numericEqual(X.compare(left, right), 0),
      (left, right) => !X.booleanEqual(left, right),
      (left, right) => !X.dateTimeEqual(left, right),
    ),
  },
  '<': {
    arity: 2,
    category: 'overloaded',
    definition: xPathTest(
      X.numericLessThan,
      (left, right) => X.numericEqual(X.compare(left, right), -1),
      X.booleanLessThan,
      X.dateTimeLessThan,
    ),
  },
  '>': {
    arity: 2,
    category: 'overloaded',
    definition: xPathTest(
      X.numericGreaterThan,
      (left, right) => X.numericEqual(X.compare(left, right), 1),
      X.booleanGreaterThan,
      X.dateTimeGreaterThan,
    ),
  },
  '<=': {
    arity: 2,
    category: 'overloaded',
    definition: xPathTest(
      (left, right) => X.numericLessThan(left, right) || X.numericEqual(left, right),
      (left, right) => !X.numericEqual(X.compare(left, right), 1),
      (left, right) => !X.booleanGreaterThan(left, right),
      (left, right) => !X.dateTimeGreaterThan(left, right),
    ),
  },
  '>=': {
    arity: 2,
    category: 'overloaded',
    definition: xPathTest(
      (left, right) => X.numericGreaterThan(left, right) || X.numericEqual(left, right),
      (left, right) => !X.numericEqual(X.compare(left, right), -1),
      (left, right) => !X.booleanLessThan(left, right),
      (left, right) => !X.dateTimeLessThan(left, right),
    ),
  },
  'bound': {
    arity: 1,
    category: 'special',
    definition: Special.Bound,
  },
  'if': {
    arity: 3,
    category: 'special',
    definition: Special.If,
  },
  'coalesce': {
    arity: Infinity,
    category: 'special',
    definition: Special.Coalesce,
  },
  'sameterm': {
    arity: 2,
    category: 'simple',
    definition: {
      types: ['term', 'term'],
      apply(args: Term[]) {
        return bool(Special.sameTerm(args[1], args[2]));
      },
    },
  },
  'in': {
    arity: Infinity,
    category: 'special',
    definition: Special.In,
  },
  'notin': {
    arity: Infinity,
    category: 'simple',
    definition: Special.NotIn,
  },
};

export const definitions = Map<C.Operator, IDefinition>(_definitions);

// ----------------------------------------------------------------------------
// Utility helpers
// ----------------------------------------------------------------------------

type Term = E.ITermExpression;

/*
 * Arithetic Operators take numbers, and return numbers.
 * Check 'numeric' for behaviour of the generic numeric helper.
 * https://www.w3.org/TR/sparql11-query/#OperatorMapping
 */
type ArithmeticOperator = (left: number, right: number) => number;
function arithmetic(op: ArithmeticOperator): OverloadMap {
  const func = (dt?: DT) => (
    (args: Term[]) => number(binary(op, args), dt || DT.XSD_FLOAT)
  );
  return map(numeric(func));
}

/*
 * XPath Tests take numbers, booleans, strings, simple strings, and dates,
 * and they return booleans.
 * Check 'numeric' for behaviour of the generic numeric helper.
 * https://www.w3.org/TR/sparql11-query/#OperatorMapping
 */
type XPathTest<T> = (left: T, right: T) => boolean;
function xPathTest(
  numOp: XPathTest<number>,
  strOp: XPathTest<string>,
  boolOp: XPathTest<boolean>,
  dateOp: XPathTest<Date>,
): OverloadMap {
  const numericHelper = (args: Term[]) => bool(binary(numOp, args));

  const wrap = (func: XPathTest<any>) => (args: Term[]) => bool(binary(func, args));
  return map([
    new Impl({ types: ['string', 'string'], func: wrap(strOp) }),
    new Impl({ types: ['simple', 'simple'], func: wrap(strOp) }),
    new Impl({ types: ['boolean', 'boolean'], func: wrap(boolOp) }),
    new Impl({ types: ['date', 'date'], func: wrap(dateOp) }),

    new Impl({ types: ['other', 'other'], func: invalidLexicalForm(1) }),
    new Impl({ types: ['other', 'string'], func: invalidLexicalForm(1) }),
    new Impl({ types: ['other', 'boolean'], func: invalidLexicalForm(1) }),
    new Impl({ types: ['other', 'date'], func: invalidLexicalForm(1) }),
    new Impl({ types: ['string', 'other'], func: invalidLexicalForm(2) }),
    new Impl({ types: ['boolean', 'other'], func: invalidLexicalForm(2) }),
    new Impl({ types: ['date', 'other'], func: invalidLexicalForm(2) }),

  ].concat(numeric((dt?: DT) => numericHelper)));
}

type OpFactory = (dt?: C.DataType) => E.SimpleApplication;

/*
 * DataType will be generalized to float,
 * or to the the category-parent (interger, decimal, ...) if both have the same.
 */
function numeric(opFac: OpFactory): Impl[] {
  return [
    new Impl({ types: ['integer', 'integer'], func: opFac(DT.XSD_INTEGER) }),
    new Impl({ types: ['integer', 'decimal'], func: opFac() }),
    new Impl({ types: ['integer', 'float'], func: opFac() }),
    new Impl({ types: ['integer', 'double'], func: opFac() }),
    new Impl({ types: ['integer', 'other'], func: invalidLexicalForm(2) }),

    new Impl({ types: ['decimal', 'integer'], func: opFac() }),
    new Impl({ types: ['decimal', 'decimal'], func: opFac(DT.XSD_DECIMAL) }),
    new Impl({ types: ['decimal', 'float'], func: opFac() }),
    new Impl({ types: ['decimal', 'double'], func: opFac() }),
    new Impl({ types: ['decimal', 'other'], func: invalidLexicalForm(2) }),

    new Impl({ types: ['float', 'integer'], func: opFac() }),
    new Impl({ types: ['float', 'decimal'], func: opFac() }),
    new Impl({ types: ['float', 'float'], func: opFac(DT.XSD_FLOAT) }),
    new Impl({ types: ['float', 'double'], func: opFac() }),
    new Impl({ types: ['float', 'other'], func: invalidLexicalForm(2) }),

    new Impl({ types: ['double', 'integer'], func: opFac() }),
    new Impl({ types: ['double', 'decimal'], func: opFac() }),
    new Impl({ types: ['double', 'float'], func: opFac() }),
    new Impl({ types: ['double', 'double'], func: opFac(DT.XSD_DOUBLE) }),
    new Impl({ types: ['double', 'other'], func: invalidLexicalForm(2) }),

    new Impl({ types: ['other', 'integer'], func: invalidLexicalForm(1) }),
    new Impl({ types: ['other', 'decimal'], func: invalidLexicalForm(1) }),
    new Impl({ types: ['other', 'float'], func: invalidLexicalForm(1) }),
    new Impl({ types: ['other', 'double'], func: invalidLexicalForm(1) }),
  ];
}

type LiteralOp<T, R> = (left: T, right: T) => R;
function binary<T, R>(op: LiteralOp<T, R>, args: E.ITermExpression[]): R {
  const [left, right] = <E.Literal<T>[]> args;
  return op(left.typedValue, right.typedValue);
}

function invalidLexicalForm(index: number) {
  return (args: Term[]) =>
    binary((_args: E.Literal<any>[]) => {
      throw new InvalidLexicalForm(_args[index].toRDF());
    }, args);
}

// // https://gist.github.com/JamieMason/172460a36a0eaef24233e6edb2706f83
// const compose = (...fns: Function[]) =>
//   fns.reverse().reduce((prevFn, nextFn) =>
//     (value: any) => nextFn(prevFn(value)),
//     (value: any) => value,
//   );

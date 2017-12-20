import * as RDFJS from 'rdf-js';
import * as S from 'sparqljs';
import fromString from 'termterm.js';

// TODO: Join Expression type definitions back together
import * as E from './expressions/Types';
import * as T from './expressions/Terms';
import * as Ops from './expressions/Operators';

import { Evaluator } from '../core/Evaluator';
import { Bindings } from '../core/Bindings';
// TODO: Make this import more clear/elegant
import { TermTypes as TT, ExpressionTypes as ET, DataType as DT } from '../util/Consts';
import { UnimplementedError } from '../util/Errors';
import * as P from '../util/Parsing';


/**
 * Benchmarking this provides a theoretical maximum
 * Will only evaluate specific examples correctly.
 */
export class SyncEvaluator implements Evaluator {
    expr: E.Expression;

    constructor(expr: S.Expression) {
        this.expr = this._transform(expr);
    }

    evaluate(mapping: Bindings): boolean {
        return this.evalExpr(this.expr, mapping).toEBV();
    }

    evalExpr(expr: E.Expression, mapping: Bindings): T.Term {
        switch (expr.exprType) {
            case E.ExpressionType.Term: return <T.Term>expr;

            case E.ExpressionType.Variable: {
                let variable = <E.VariableExpression>expr;
                let binding = mapping.get(variable.name);
                if (!binding) { throw new Error();}
                return this._toTerm(binding);
            };

            case E.ExpressionType.Operation: {
                let op = <Ops.Operation>expr;
                let args = op.args.map((arg: T.Term) => this.evalExpr(arg, mapping));
                return op.apply(args);
            };

            case E.ExpressionType.FunctionCall: throw new UnimplementedError();
            case E.ExpressionType.Aggregate: throw new UnimplementedError();
            case E.ExpressionType.BGP: throw new UnimplementedError();
            case E.ExpressionType.Group: throw new UnimplementedError();
            case E.ExpressionType.Tuple: throw new UnimplementedError();
            default: throw new Error(`${JSON.stringify(expr)} not supported as expression`);
        }
    }

    _transform(expr: S.Expression): E.Expression {
        if (typeof expr == 'string') {
            let term = fromString(expr);
            return this._toInternal(term);
        }

        // SPARQL.js represents Tuples as arrays
        if (expr instanceof Array) {
            return new E.Tuple(expr.map((sexpr) => this._transform(sexpr)));
        }

        expr = <S.OperationExpression
            | S.FunctionCallExpression
            | S.AggregateExpression
            | S.BgpPattern
            | S.GroupPattern>expr;

        switch (expr.type) {
            case ET.Operation: {
                let args = expr.args.map((arg) => this._transform(arg));
                switch (expr.operator) {
                    case '&&': return new Ops.And(args);
                    case '||': return new Ops.Or(args);
                    case '!': return new Ops.Not(args);
                    case '=': return new Ops.Equal(args);
                    case '!=': return new Ops.NotEqual(args);
                    case '<': return new Ops.LesserThan(args);
                    case '>': return new Ops.GreaterThan(args);
                    case '<=': return new Ops.LesserThanEqual(args);
                    case '>=': return new Ops.GreaterThanEqual(args);
                    case '*': return new Ops.Multiplication(args);
                    case '/': return new Ops.Division(args);
                    case '+': return new Ops.Addition(args);
                    case '-': return new Ops.Subtraction(args);
                }
            };
            case ET.FunctionCall: throw new UnimplementedError();
            case ET.Aggregate: throw new UnimplementedError();
            case ET.BGP: throw new UnimplementedError();
            case ET.Group: throw new UnimplementedError();
        }
    }

    // Distinction from _toTerm is made because of the return type.
    // This way this function can easily be used in expression transformation
    _toInternal(term: RDFJS.Term): E.Expression {
        switch (term.termType) {
            case 'Variable': return new E.VariableExpression(term.value);
            default: return this._toTerm(term);
        }
    }

    _toTerm(term: RDFJS.Term): T.Term {
        switch (term.termType) {
            case 'NamedNode': return new T.NamedNode(term.value);
            case 'BlankNode': return new T.BlankNode(term.value);
            case 'DefaultGraph': return new T.DefaultGraph();
            case 'Literal': return this._convertLiteral(<RDFJS.Literal> term);
            case 'Variable': throw new Error(); // A variable is not a valid term
            default: throw new Error();
        }
    }

    // TODO: Derived numeric types
    _convertLiteral(lit: RDFJS.Literal): T.Literal<Object> {
        switch(lit.datatype.value) {
            case null: return new T.SimpleLiteral(lit.value);
            case undefined: return new T.SimpleLiteral(lit.value);
            case "": return new T.SimpleLiteral(lit.value);

            case DT.XSD_STRING: return new T.StringLiteral(lit.value);
            case DT.RDF_LANG_STRING: return new T.LangLiteral(lit.value, lit.language);

            case DT.XSD_DATE_TIME: {
                let val: Date = new Date(lit.value);
                if(isNaN(val.getTime())) {
                    throw new Error();
                }
                return new T.DateTimeLiteral(new Date(lit.value));
            }

            case DT.XSD_BOOLEAN: {
                let val: boolean = JSON.parse(lit.value);
                if (typeof val != 'boolean') {
                    throw new Error();
                }
                return new T.BooleanLiteral(val);
            }

            case DT.XSD_INTEGER:
            case DT.XSD_DECIMAL:

            case DT.XSD_NEGATIVE_INTEGER:
            case DT.XSD_NON_NEGATIVE_INTEGER:
            case DT.XSD_NON_POSITIVE_INTEGER:
            case DT.XSD_POSITIVE_INTEGER:
            case DT.XSD_LONG:
            case DT.XSD_INT:
            case DT.XSD_SHORT:
            case DT.XSD_BYTE:
            case DT.XSD_UNSIGNED_LONG:
            case DT.XSD_UNSIGNED_INT:
            case DT.XSD_UNSIGNED_SHORT:
            case DT.XSD_UNSIGNED_BYTE:
            case DT.XSD_INT: {
                let val: number = P.parseXSDInteger(lit.value);
                if (val == undefined) { throw new TypeError() }
                return new T.NumericLiteral(val, lit.datatype.value);
            }
            case DT.XSD_FLOAT:
            case DT.XSD_DOUBLE: {
                let val: number = P.parseXSDFloat(lit.value);
                if (val == undefined) { throw new TypeError() }
                return new T.NumericLiteral(val, lit.datatype.value);
            }
            default:  return new T.TypedLiteral(lit.value, lit.datatype.value);
        }
    }
}


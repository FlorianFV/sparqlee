#! /usr/bin/env node

import * as _ from 'lodash';
import * as RDF from 'rdf-data-model';
import { Algebra as Alg } from 'sparqlalgebrajs';

import { ArrayIterator, AsyncIterator } from 'asynciterator';
import { AsyncEvaluatedStream } from '../index';
import { AsyncEvaluator } from '../lib/async/AsyncEvaluator';
import { Bindings } from '../lib/core/Bindings';
import { DataType as DT } from '../lib/util/Consts';
import { Example, example1, mockLookup, parse } from '../util/Util';

function print(expr: string): void {
  console.log(JSON.stringify(parse(expr), null, 4));
}

async function testEval() {
  const ex = new Example('?a || "not an integer"^^xsd:integer', () => Bindings({
    a: RDF.literal("true", RDF.namedNode(DT.XSD_BOOLEAN)),
    b: RDF.literal("not an integer", RDF.namedNode(DT.XSD_INTEGER)),
  }));
  const evaluator = new AsyncEvaluator(ex.expression, mockLookup);
  const presult = evaluator.evaluate(ex.mapping());
  const val = await presult;
  console.log(val);
}

function main(): void {
  // const ex = example1;
  const ex = new Example('-?a', () => Bindings({
    a: RDF.literal("3", RDF.namedNode(DT.XSD_INTEGER)),
  }));
  const input = [ex.mapping()];
  const istream = new ArrayIterator(input);
  const evalled = new AsyncEvaluatedStream(ex.expression, istream, mockLookup);
  evalled.on('error', (error) => console.log(error));
  evalled.on('data', (data) => {
    console.log(JSON.stringify(data, undefined, 4));
  });
}

testEval();
// test();
// print('EXISTS {?a ?b ?c}');
// print('?a + str(<http://example.com>)')
// print('"aaaaaaa"')
// print('bound(?a)');
// print('isLiteral(?a)');
// print('COUNT(?a)')
// print('xsd:dateTime(?a)');
// print('+?a');
// print('(?a > ?b) = ?c')
// main();

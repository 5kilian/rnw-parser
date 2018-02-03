import test from 'ava';
import util from 'util';
import RnwParser from './index';

// console.log(util.inspect(result, false, null));

let testDir = './resources/test-files/';
let tests = [
    { file: 'SenderEmpfaengerSimple', method: testSenderEmpfaengerSimple },
    { file: 'Kink', method: testKink },
];

test('testRnw', async t => {
    let parse = file => RnwParser.readRnw(testDir + file);
    for (let i=0; i<tests.length; i++) {
        tests[i].method(t, await Promise.resolve(parse(tests[i].file + '.rnw')));
    }
});

test('testPnml', async t => {
    let parse = file => RnwParser.readPnml(testDir + file);
    for (let i=0; i<tests.length; i++) {
        tests[i].method(t, await Promise.resolve(parse(tests[i].file + '.pnml')));
    }
});

function testSenderEmpfaengerSimple(t, result) {
    t.is(result.size, 25);
    t.is(result.figures.filter(figure => figure.type === 'Place').length, 6);
    t.is(result.figures.filter(figure => figure.type === 'Transition').length, 4);
    t.is(result.figures.filter(figure => figure.type === 'Arc').length, 12);
    t.is(result.figures.filter(figure => figure.type === 'Text').length, 3);
}

function testKink(t, result) {
    t.is(result.figures.filter(figure => figure.id === 5)[0].positions.length, 2);
    t.is(result.figures.filter(figure => figure.id === 2)[0].positions.length, 3);
    t.is(result.figures.filter(figure => figure.id === 4)[0].positions.length, 4);
}
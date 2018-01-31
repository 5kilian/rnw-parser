import test from 'ava';
import util from 'util';
import RnwParser from './index';

test('testRnw', async t => {
    let res = Promise.resolve(RnwParser.readRnw('./resources/test-files/doubleTip.rnw')).then(r => {
        console.log(util.inspect(r, false, null));
        return r;
    });

    t.is((await res).size, (await res).figures.length);
});

test('testPnml', async t => {
    let res = Promise.resolve(RnwParser.readPnml('./resources/test-files/doubleTip.pnml')).then(r => {
        console.log(util.inspect(r, false, null));
        return r;
    });

    t.is((await res).size, 7);
});

test('testDraw', async t => {
    let res = Promise.resolve(RnwParser.readRnw('./resources/test-files/test.draw')).then(r => {
        // console.log(util.inspect(r, false, null));
        return r;
    });

    t.is((await res).size, (await res).figures.length);
});

test('testFa', async t => {
    let res = Promise.resolve(RnwParser.readRnw('./resources/test-files/test.fa')).then(r => {
        // console.log(util.inspect(r, false, null));
        return r;
    });

    t.is((await res).size, (await res).figures.length);
});

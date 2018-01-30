import test from 'ava';
import util from 'util';
import RnwParser from './index';

test('testRnw', async t => {
    let res = Promise.resolve(RnwParser.readRnw('./resources/test-files/untitled.rnw')).then(r => {
        console.log(util.inspect(r, false, null));
        return r;
    });

    t.is((await res).size, (await res).figures.length);
});

test('testPnml', async t => {
    let res = Promise.resolve(RnwParser.readPnml('./resources/test-files/untitled.pnml')).then(r => {
        console.log(util.inspect(r, false, null));
        return r;
    });

    t.is((await res).size, 15);
});
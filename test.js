import test from 'ava';
import RnwParser from './index';

test('testRank', async t => {
    let res = Promise.resolve(RnwParser.readRnw('./resources/test-files/untitled.rnw')).then(r => {
        // console.log(r);
        return r;
    });

    t.is((await res).size, 26);
});

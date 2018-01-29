import test from 'ava';
import util from 'util';
import RnwParser from './index';

test('testRank', async t => {
    let res = Promise.resolve(RnwParser.readRnw('./resources/test-files/inscription.rnw')).then(r => {
        console.log(util.inspect(r, false, null));
        return r;
    });

    t.is((await res).size, 10);
});

import test from 'ava';
import RnwParser from './index';

test('testRank', async t => {
    let res = Promise.resolve(RnwParser.readRnw('./resources/test-files/kink.rnw'));

    t.is((await res)[0].size, 5);
});

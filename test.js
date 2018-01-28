import test from 'ava';
import RnwParser from './lib/core/RnwParser';

test('testRank', async t => {
    let res = Promise.resolve(RnwParser.readRnw('./resources/test-files/test.rnw'));

    t.is((await res)[0].size, 5);
});


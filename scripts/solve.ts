/**
 * `npm run solve` — the playability report.
 *
 * Turns "it feels a bit hard" into degrees. Run it after any tuning session, and
 * before believing that a difficulty problem is a WIND problem.
 */
import { report } from '../src/systems/Solver';

console.log('');
console.log(report());
console.log('');

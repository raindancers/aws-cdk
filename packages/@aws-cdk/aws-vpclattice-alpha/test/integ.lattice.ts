import * as core from 'aws-cdk-lib';
import * as integ from '@aws-cdk/integ-tests-alpha';
import { LatticeTestStack } from './latticetests/latticetest';

const app = new core.App();
const stack = new LatticeTestStack(app, 'ServiceNetwork', {});

new integ.IntegTest(app, 'vpcLatticeTestStackInteg', {
  testCases: [stack],
});

app.synth();
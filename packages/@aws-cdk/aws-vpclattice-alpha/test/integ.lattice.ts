import * as core from 'aws-cdk-lib';
import * as integ from '@aws-cdk/integ-tests-alpha';
import { LatticeTestStack } from './latticetests/latticetest';

const app = new core.App();
const stack = new LatticeTestStack(app, 'ServiceNetwork', {});

const tests = new integ.IntegTest(app, 'vpcLatticeTestStackInteg', {
  testCases: [stack],
});

const invoke = tests.assertions.invokeFunction({
  functionName: stack.invoke.functionName,
  payload: JSON.stringify({ url: stack.serviceURL }),
});

invoke.expect(integ.ExpectedResult.objectLike({
  StatusCode: 200,
}));

app.synth();
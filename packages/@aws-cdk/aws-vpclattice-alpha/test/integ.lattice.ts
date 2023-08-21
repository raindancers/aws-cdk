import * as core from 'aws-cdk-lib';
import * as integ from '@aws-cdk/integ-tests-alpha';
import { LatticeTestStack } from './latticetests/latticetest';

const app = new core.App();
const stack = new LatticeTestStack(app, 'ServiceNetwork', {});

const tests = new integ.IntegTest(app, 'vpcLatticeTestStackInteg', {
  testCases: [stack],
  cdkCommandOptions: {
    destroy: {
      enabled: false,
    },
  },
});

// the invoke lambda is permitted to access this path
const test1 = tests.assertions.invokeFunction({
  functionName: stack.invoke.functionName,
  payload: JSON.stringify({ url: `https://${stack.serviceURL}/test1` }),
});

test1.expect(integ.ExpectedResult.objectLike({
  Payload: {
    StatusCode: 200,
  },
}));

// the invoke lambda is not permitted to this path, so shoudl return 403
const test2 = tests.assertions.invokeFunction({
  functionName: stack.invoke.functionName,
  payload: JSON.stringify({ url: `https://${stack.serviceURL}/test2` }),
});

test2.expect(integ.ExpectedResult.objectLike({
  Payload: {
    StatusCode: 403,
  },
}));

app.synth();
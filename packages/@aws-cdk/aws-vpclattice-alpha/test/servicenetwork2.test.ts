import { Template } from 'aws-cdk-lib/assertions';
import * as core from 'aws-cdk-lib';
import {
  aws_iam as iam,
}
  from 'aws-cdk-lib';
import {
  ServiceNetwork,
  Authorizer,
}
  from '../lib';

/* We allow quotes in the object keys used for CloudFormation template assertions */
/* eslint-disable quote-props */
describe('VPC Lattice Service Network Tests', () => {
  let stack: core.Stack;

  beforeEach(() => {
    stack = new core.Stack();
  });

  describe('Service Network Tests', () => {

    test('1. Import a service Network by ID', () => {
      const serviceNetwork = ServiceNetwork.fromId(stack, 'ServiceNetwork', 'svc-id');
      expect(serviceNetwork.serviceNetworkId).toEqual('svc-id');
    });

    test('2. Import a service network by Name', () => {
      const serviceNetwork = ServiceNetwork.fromName(stack, 'ServiceNetwork', 'serviceName');
      expect(serviceNetwork.serviceNetworkId).toContain('TOKEN');
    });

    test('2. Import a service network by Name', () => {
      const serviceNetwork = ServiceNetwork.fromName(stack, 'ServiceNetwork', 'serviceName');
      expect(serviceNetwork.serviceNetworkId).toContain('TOKEN');
    });

    test('3. Add Auth Statement', () => {
      new ServiceNetwork(stack, 'servicenetwork', {
        authStatements: [
          new iam.PolicyStatement({
            actions: ['*'],
            effect: iam.Effect.ALLOW,
            resources: ['*'],
            principals: [new iam.StarPrincipal()],
          }),
        ],
      });
      Template.fromStack(stack).resourceCountIs('AWS::VpcLattice::ServiceNetwork', 1);
    });

    test('4. Add Bad Auth Statement', () => {
      expect(() => {
        const serviceNetwork = new ServiceNetwork(stack, 'servicenetwork', {});

        // leave off a principals
        serviceNetwork.addStatementToAuthPolicy(new iam.PolicyStatement({
          actions: ['*'],
          resources: ['*'],
          effect: iam.Effect.ALLOW,
        }));

        serviceNetwork.applyAuthPolicyToServiceNetwork();

      }).toThrowError('Auth Policy for granting access on  Service Network is invalid');
    });

    test('5. Wrong Auth Mode', () => {
      expect(() => {
        const serviceNetwork = new ServiceNetwork(stack, 'servicenetwork', {
          authorization: Authorizer.none(),
        });

        // leave off a principals
        serviceNetwork.addStatementToAuthPolicy(new iam.PolicyStatement({
          actions: ['*'],
          resources: ['*'],
          effect: iam.Effect.ALLOW,
          principals: [new iam.StarPrincipal()],
        }));

        serviceNetwork.applyAuthPolicyToServiceNetwork();

      }).toThrowError('AuthType must be AuthorizerMode.AWS_IAM to add an Auth Policy');
    });
  });
});
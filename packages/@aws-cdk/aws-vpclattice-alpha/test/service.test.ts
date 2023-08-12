import { Template } from 'aws-cdk-lib/assertions';
import * as core from 'aws-cdk-lib';
import {
  aws_iam as iam,
  aws_route53 as r53,
}
  from 'aws-cdk-lib';

import {
  //TargetGroup,
  Service,
  ServiceNetwork,
  // LoggingDestination,
  // HTTPMethods,
  // Protocol,
  // PathMatchType,
  // MatchOperator,
  // FixedResponse,
  // Listener,
  // RuleAccessMode,
  // ServiceNetworkAccessMode,
  Authorizer,
}
  from '../lib';

describe('Lattice Service Tests', () => {
  let stack: core.Stack;
  let serviceNetwork: ServiceNetwork;

  beforeEach(() => {
    stack = new core.Stack();
    serviceNetwork = new ServiceNetwork(stack, 'serviceNetwork', {
      name: 'servicenetwork',
      authorization: Authorizer.iam(),
    });
  });

  describe('Service Tests', () => {

    test('1. Associate Service with ServiceNetwork', () => {
      const service = new Service(stack, 'Service', {
        name: 'servicename',
      });
      service.associateWithServiceNetwork(serviceNetwork);
      Template.fromStack(stack).resourceCountIs('AWS::VpcLattice::ServiceNetworkServiceAssociation', 1);
    });

    test('2. Apply AuthPolicy', () => {
      const service = new Service(stack, 'Service', {
        name: 'servicename',
      });
      service.addPolicyStatement(new iam.PolicyStatement({
        actions: ['vpc-lattice-svcs:Invoke'],
        resources: ['*'],
        effect: iam.Effect.ALLOW,
        principals: [new iam.StarPrincipal()],
      }));
      service.applyAuthPolicy();
      Template.fromStack(stack).resourceCountIs('AWS::VpcLattice::AuthPolicy', 1);
    });

    test('3. Try to apply an AuthPolicy , when authorizer type is NONE', () => {
      expect(() => {
        const service = new Service(stack, 'Service', {
          name: 'servicename',
          authorization: Authorizer.none(),
        });

        service.addPolicyStatement(new iam.PolicyStatement({
          actions: ['vpc-lattice-svcs:Invoke'],
          resources: ['*'],
          effect: iam.Effect.ALLOW,
          principals: [new iam.StarPrincipal()],
        }));

        service.applyAuthPolicy();
      }).toThrowError('Can not apply a policy when authType is NONE');
    });

    test('4. Add DNS zone', () => {
      new Service(stack, 'Service', {
        name: 'servicename',
        authorization: Authorizer.none(),
        hostedZone: new r53.HostedZone(stack, 'hostedzone', {
          zoneName: 'blahblah.com',
        }),
      });
      Template.fromStack(stack).resourceCountIs('AWS::VpcLattice::Service', 1);
    });

    test('5. ServiceNetwork Props', () => {
      new Service(stack, 'Service', {
        name: 'servicename',
        authorization: Authorizer.none(),
        serviceNetwork: serviceNetwork,
      });
      Template.fromStack(stack).resourceCountIs('AWS::VpcLattice::Service', 1);
    });

    test('6. Share', () => {
      const service = new Service(stack, 'Service', {
        name: 'servicename',
      });

      service.shareToAccounts({
        name: 'share',
        accounts: ['123456789000'],
      });

      Template.fromStack(stack).resourceCountIs('AWS::RAM::ResourceShare', 1);
    });

    test('7. Import ServiceNetwork By Name', () => {

      const service = Service.fromServiceId(stack, 'service', 'svc-id');

      expect(service.serviceId).toEqual('svc-id');
      expect(service.imported).toEqual(true);
    });

  });
});

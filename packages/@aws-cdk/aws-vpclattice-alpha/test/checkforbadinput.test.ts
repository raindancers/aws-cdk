import * as core from 'aws-cdk-lib';

import {
  aws_ec2 as ec2,
  aws_iam as iam,
}
  from 'aws-cdk-lib';

import {
  Service,
  ServiceNetwork,
  Listener,
  ServiceNetworkAccessMode,
  Protocol,
  Authorizer,
  FixedResponse,
  TargetGroup,
  HTTPMethods,
  RuleAccessMode,
  MatchOperator,
}
  from '../lib/index';

// eslint-disable-next-line import/no-extraneous-dependencies
import * as vpclattice_targets from '@aws-cdk/aws-vpclattice-targets-alpha';

describe('Lattice  Service Input Checking', () => {
  let stack: core.Stack;
  beforeEach(() => {
    stack = new core.Stack();
  });

  describe('Bad Service Name', () => {
    test('throws error on badly formed name', () => {
      expect(() => {
        new Service(stack, 'Service', {
          name: 'BadServiceName', // has caps
        });
      }).toThrowError('The service  name must be between 3 and 63 characters long. The name can only contain alphanumeric characters and hyphens. The name must be unique to the account.');
    });
  });

});

describe('Listener Errors', () => {
  let stack: core.Stack;
  let service: Service;
  beforeEach(() => {
    // try to factor out as much boilerplate test setup to before methods -
    // makes the tests much more readable
    stack = new core.Stack();
    service = new Service(stack, 'Service', {});

  });

  describe('Bad Port Range', () => {
    test('throws error on out of range port', () => {
      expect(() => {
        new Listener(stack, 'Listener', {
          protocol: Protocol.HTTPS,
          port: -1,
          service: service,
        });
      }).toThrowError('Port out of range');
    });
  });

  describe('Listener Properties', () => {
    test('Can only have one of DefaultAction or Forwarding Set', () => {
      expect(() => {

        const vpc1 = new ec2.Vpc(stack, 'VPC1', {});

        const target = new vpclattice_targets.Ip(stack, 'IpTarget2', {
          ipAddress: [
            '10.10.10.12',
            '10.10.10.13',
          ],
          targetConfig: {
            vpc: vpc1,
            port: 443,
          },
        });

        const targetGroup = new TargetGroup(stack, 'TargetGroup2', {
          name: 'targetgroup',
          target: target,
        });

        new Listener(stack, 'Listener2', {
          protocol: Protocol.HTTPS,
          service: service,
          defaultAction: {
            fixedResponse: FixedResponse.NOT_FOUND,
            forward: {
              targetGroup: targetGroup,
              weight: 100,
            },
          },
        });
      }).toThrowError('Both fixedResponse and foward are set');
    });
  });

  describe('Listener Properties', () => {
    test('must have one of DefaultAction or Forwarding Set', () => {
      expect(() => {

        new Listener(stack, 'Listener2', {
          protocol: Protocol.HTTPS,
          service: service,
          defaultAction: {},
        });
      }).toThrowError('At least one of fixedResponse or foward must be set');
    });
  });

  describe('Listener Properties', () => {
    test('Valid Default Action Builds', () => {

      new Listener(stack, 'Listener2', {
        protocol: Protocol.HTTPS,
        service: service,
        defaultAction: {
          fixedResponse: FixedResponse.NOT_FOUND,
        },
      });
    });
  });

  describe('Listener Properties', () => {
    test('Valid Forwarding Builds', () => {

      const vpc1 = new ec2.Vpc(stack, 'VPC1', {});

      const target = new vpclattice_targets.Ip(stack, 'IpTarget2', {
        ipAddress: [
          '10.10.10.12',
          '10.10.10.13',
        ],
        targetConfig: {
          vpc: vpc1,
          port: 443,
        },
      });

      const targetGroup = new TargetGroup(stack, 'TargetGroup2', {
        name: 'targetgroup',
        target: target,
      });

      new Listener(stack, 'Listener2', {
        protocol: Protocol.HTTPS,
        service: service,
        defaultAction: {
          forward: {
            targetGroup: targetGroup,
            weight: 100,
          },
        },
      });
    });
  });

  describe('Listener Properties', () => {
    test('Use HTTP', () => {

      new Listener(stack, 'Listener2', {
        protocol: Protocol.HTTP,
        service: service,
      });
    });
  });

  describe('Listener Properties', () => {
    test('Use HTTP', () => {

      new Listener(stack, 'Listener2', {
        protocol: Protocol.HTTP,
        service: service,
      });
    });
  });

  describe('Listener Properties', () => {
    test('Unauthenticated Rule can not have principals', () => {
      expect(() => {
        const listener = new Listener(stack, 'Listener2', {
          protocol: Protocol.HTTP,
          service: service,
        });

        listener.addListenerRule({
          name: 'testname',
          action: FixedResponse.NOT_FOUND,
          httpMatch: { method: HTTPMethods.GET },
          accessMode: RuleAccessMode.UNAUTHENTICATED,
          allowedPrincipals: [new iam.AnyPrincipal()],
        });
      }).toThrowError('An unauthenticated rule cannot have allowedPrincipals');
    });
  });

  describe('Listener Properties', () => {
    test('Use rules', () => {

      new Listener(stack, 'Listener2', {
        service: service,
        rules: [
          {
            name: 'testname',
            action: FixedResponse.NOT_FOUND,
            httpMatch: {
              method: HTTPMethods.GET,
              headerMatches: [
                {
                  headerName: 'testvalue',
                  matchOperator: MatchOperator.EXACT,
                  matchValue: 'testvalue',
                },
              ],
            },
          },
        ],
      });
    });
  });

  describe('Listener Rule Properties', () => {
    test('Add Listner allowed Principals', () => {
      const listener = new Listener(stack, 'Listener2', {
        protocol: Protocol.HTTP,
        service: service,
      });

      listener.addListenerRule({
        name: 'testname',
        action: FixedResponse.NOT_FOUND,
        httpMatch: { method: HTTPMethods.GET },
        allowedPrincipalArn: ['arn'],
      });
    });
  });

  describe('Listener Rules Properties', () => {
    test('At least one match must be provided', () => {
      expect(() => {
        const listener = new Listener(stack, 'Listener2', {
          protocol: Protocol.HTTP,
          service: service,
        });

        listener.addListenerRule({
          name: 'testname',
          action: FixedResponse.NOT_FOUND,
          httpMatch: {},
        });
      }).toThrowError('At least one of pathMatches, headerMatches, or method must be provided');
    });
  });

  describe('Listener Rules Properties', () => {
    test('Invalid Port', () => {
      expect(() => {
        new Listener(stack, 'Listener2', {
          protocol: Protocol.HTTP,
          service: service,
          port: 99999,
        });

      }).toThrowError('Port out of range');
    });
  });

  describe('Listener Rules Properties', () => {
    test('Invalid Priority', () => {
      expect(() => {
        const listener = new Listener(stack, 'Listener2', {
          protocol: Protocol.HTTP,
          service: service,
        });

        listener.addListenerRule({
          name: 'testname',
          action: FixedResponse.NOT_FOUND,
          httpMatch: { method: HTTPMethods.GET },
          priority: 101,
        });
      }).toThrowError('Priority must be between 1 and 100');
    });
  });

  describe('Listener Rules Properties', () => {
    test('Overlapping Prioritys', () => {
      expect(() => {
        const listener = new Listener(stack, 'Listener2', {
          protocol: Protocol.HTTP,
          service: service,
        });

        listener.addListenerRule({
          name: 'testname1',
          action: FixedResponse.NOT_FOUND,
          httpMatch: { method: HTTPMethods.GET },
          priority: 75,
        });

        listener.addListenerRule({
          name: 'testname2',
          action: FixedResponse.NOT_FOUND,
          httpMatch: { method: HTTPMethods.GET },
          priority: 75,
        });

      }).toThrowError('Priority is already in use, ensure all listener rules have unique prioritys');
    });
  });

  // service network bad iputs
  describe('Bad Name', () => {
    test('Name does match regex', () => {
      expect(() => {
        new ServiceNetwork(stack, 'ServiceNetwork', {
          name: 'BADNAME',
        });
      }).toThrowError('Theservice network name must be between 3 and 63 characters long. The name can only contain alphanumeric characters and hyphens. The name must be unique to the account.');
    });
  });

  // service network bad iputs
  describe('Setting bad combination of Props', () => {
    test('AuthType NONE and AccessMode UNAUTHENTICATED', () => {
      expect(() => {
        new ServiceNetwork(stack, 'ServiceNetwork', {
          authorization: Authorizer.none(),
          accessmode: ServiceNetworkAccessMode.UNAUTHENTICATED,
        });
      }).toThrowError('AccessMode can not be set if AuthType is NONE');
    });
  });

  // service network bad iputs
  describe('Bad Name for Listener', () => {
    test('Bad Name not matching regex', () => {
      expect(() => {
        new Listener(stack, 'Listener2', {
          name: 'BADNAME',
          service: new Service(stack, 'Service2', {}),
        });
      }).toThrowError('The listener name must be between 3 and 63 characters long. The name can only contain  lower case alphanumeric characters and hyphens. The name must be unique to the account.');
    });
  });

});


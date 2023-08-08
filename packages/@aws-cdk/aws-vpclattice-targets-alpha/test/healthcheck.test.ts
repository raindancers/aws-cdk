//import { Template } from 'aws-cdk-lib/assertions';
import * as core from 'aws-cdk-lib';
import {
  ApplicationLoadBalancer,
  HealthCheck,
  ProtocolVersion,
} from '../lib/index';

import {
  aws_ec2 as ec2,
  aws_elasticloadbalancingv2 as elbv2,
}
  from 'aws-cdk-lib';

describe('HealthCheckTests', () => {
  let stack: core.Stack;
  let vpc1: ec2.Vpc;
  let loadbalancer: elbv2.ApplicationLoadBalancer;

  beforeEach(() => {
    stack = new core.Stack();
    vpc1 = new ec2.Vpc(stack, 'VPC1', {});
    loadbalancer = new elbv2.ApplicationLoadBalancer(stack, 'LB', {
      vpc: vpc1,
    });
  });

  describe('Test HealthChecks', () => {
    test('A good health Check', () => {

      new ApplicationLoadBalancer(stack, 'ALBTarget1', {
        alb: [loadbalancer],
        targetConfig: {
          vpc: vpc1,
          healthcheck: HealthCheck.check({}),
        },
      });
    });

    test('Bad HealthCheckInterval', () => {
      expect(() => {
        new ApplicationLoadBalancer(stack, 'ALBTarget1', {
          alb: [loadbalancer],
          targetConfig: {
            vpc: vpc1,
            healthcheck: HealthCheck.check({
              healthCheckInterval: core.Duration.seconds(1),
            }),
          },
        });
      }).toThrowError('HealthCheckInterval must be between 5 and 300 seconds');
    });

    test('Bad HealthCheck Timeout', () => {
      expect(() => {
        new ApplicationLoadBalancer(stack, 'ALBTarget1', {
          alb: [loadbalancer],
          targetConfig: {
            vpc: vpc1,
            healthcheck: HealthCheck.check({
              healthCheckTimeout: core.Duration.seconds(0),
            }),
          },
        });
      }).toThrowError('HealthCheckTimeout must be between 1 and 120seconds');
    });

    test('Using GRPC', () => {
      expect(() => {
        new ApplicationLoadBalancer(stack, 'ALBTarget1', {
          alb: [loadbalancer],
          targetConfig: {
            vpc: vpc1,
            healthcheck: HealthCheck.check({
              protocolVersion: ProtocolVersion.GRPC,
            }),
          },
        });
      }).toThrowError('GRPC is not supported');
    });

  });

});
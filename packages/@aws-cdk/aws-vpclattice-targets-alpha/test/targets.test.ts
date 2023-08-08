//import { Template } from 'aws-cdk-lib/assertions';
import * as core from 'aws-cdk-lib';
import {
  Ip,
  ApplicationLoadBalancer,
  EC2Instance,
  Lambda,
  Protocol,
} from '../lib/index';

import {
  aws_ec2 as ec2,
  aws_lambda as lambda,
  aws_elasticloadbalancingv2 as elbv2,
}
  from 'aws-cdk-lib';

describe('Targets', () => {
  let stack: core.Stack;
  let vpc1: ec2.Vpc;

  beforeEach(() => {
    stack = new core.Stack();
    vpc1 = new ec2.Vpc(stack, 'VPC1', {});
  });

  describe('create a Iptarget', () => {
    test('create a IpTarget', () => {

      new Ip(stack, 'IpTarget1', {
        ipAddress: [
          '10.10.10.10',
          '10.10.10.11',
        ],
        targetConfig: {
          vpc: vpc1,
        },
      });

      new Ip(stack, 'IpTarget2', {
        ipAddress: [
          '10.10.10.12',
          '10.10.10.13',
        ],
        targetConfig: {
          vpc: vpc1,
          port: 443,
        },
      });

      new Ip(stack, 'IpTarget3', {
        ipAddress: [
          '10.10.10.12',
          '10.10.10.13',
        ],
        targetConfig: {
          vpc: vpc1,
          protocol: Protocol.HTTP,
        },
      });

    });
  });

  describe('create an ALB Target', () => {
    test('create a ALB Target', () => {

      const loadbalancer = new elbv2.ApplicationLoadBalancer(stack, 'LB', {
        vpc: vpc1,
      });

      new ApplicationLoadBalancer(stack, 'ALBTarget1', {
        alb: [loadbalancer],
        targetConfig: {
          vpc: vpc1,
        },
      });

      new ApplicationLoadBalancer(stack, 'ALBTarget2', {
        alb: [loadbalancer],
        targetConfig: {
          vpc: vpc1,
          port: 443,
        },
      });

      new ApplicationLoadBalancer(stack, 'ALBTarget3', {
        alb: [loadbalancer],
        targetConfig: {
          vpc: vpc1,
          protocol: Protocol.HTTP,
        },
      });
    });
  });

  describe('create an EC2 Target', () => {
    test('create a EC2 Target', () => {

      const instance = new ec2.Instance(stack, 'Instance', {
        vpc: vpc1,
        instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
        machineImage: new ec2.AmazonLinuxImage(),
      });

      new EC2Instance(stack, 'Ec2InstanceTarget1', {
        ec2instance: [instance],
        targetConfig: {
          vpc: vpc1,
        },
      });

      new EC2Instance(stack, 'Ec2InstanceTarget2', {
        ec2instance: [instance],
        targetConfig: {
          vpc: vpc1,
          port: 443,
        },
      });

      new EC2Instance(stack, 'Ec2InstanceTarget3', {
        ec2instance: [instance],
        targetConfig: {
          vpc: vpc1,
          protocol: Protocol.HTTP,
        },
      });
    });
  });

  describe('create a Lambda Target', () => {
    test('create a Lambda Target', () => {

      const fn = new lambda.Function(stack, 'LambdaFunction', {
        runtime: lambda.Runtime.PYTHON_3_10,
        code: lambda.Code.fromInline('def handler(event, context): pass'),
        handler: 'index.handler',
      });

      new Lambda(stack, 'LambdaTarget', {
        lambda: [fn],
      });
    });
  });

});
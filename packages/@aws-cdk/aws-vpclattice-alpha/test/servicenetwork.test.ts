import { Template } from 'aws-cdk-lib/assertions';
import * as core from 'aws-cdk-lib';
import {
  aws_ec2 as ec2,
  aws_s3 as s3,
  aws_kinesis as kinesis,
  aws_logs as log,
  aws_lambda as lambda,
  aws_iam as iam,
  aws_elasticloadbalancingv2 as elbv2,
}
  from 'aws-cdk-lib';

import {
  TargetGroup,
  Service,
  ServiceNetwork,
  LoggingDestination,
  HTTPMethods,
  Protocol,
  PathMatchType,
  MatchOperator,
  FixedResponse,
  Listener,
  RuleAccessMode,
  ServiceNetworkAccessMode,
  Authorizer,
}
  from '../lib';

// eslint-disable-next-line import/no-extraneous-dependencies
import {
  HealthCheck,
  ProtocolVersion,
  Ip,
  Lambda,
  ApplicationLoadBalancer,
  EC2Instance,
} from '@aws-cdk/aws-vpclattice-targets-alpha';

/* We allow quotes in the object keys used for CloudFormation template assertions */
/* eslint-disable quote-props */

describe('VPC Lattice', () => {
  let stack: core.Stack;

  beforeEach(() => {
    // try to factor out as much boilerplate test setup to before methods -
    // makes the tests much more readable
    stack = new core.Stack();
  });

  describe('created with default properties', () => {

    beforeEach(() => {

      const vpc1 = new ec2.Vpc(stack, 'VPC1', {});

      const latticeService = new Service(stack, 'Service', {
        shares: [{
          name: 'LatticeService',
          allowExternalPrincipals: false,
          accounts: [
            '123456123456',
          ],
        }],
      });

      const listener = new Listener(stack, 'Listener', {
        service: latticeService,
      });

      // line 259 service.ts
      latticeService.grantAccess([new iam.AccountPrincipal('123456789000')]);

      // line 293 service.ts
      latticeService.addPolicyStatement(new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['vpc-lattice-svcs:Invoke'],
        resources: ['*'],
        principals: [new iam.AccountPrincipal('123456789000')],
      }));

      listener.addListenerRule({
        accessMode: RuleAccessMode.UNAUTHENTICATED,
        name: 'FixedReponse',
        priority: 99,
        action: FixedResponse.NOT_FOUND,
        httpMatch: {
          pathMatches: { path: '/' },
        },
      });

      listener.addListenerRule({
        name: 'ListenerRule100',
        priority: 10,
        action: [
          {
            targetGroup: new TargetGroup(stack, 'lambdaTargets', {
              name: 'lambda1',
              target: new Lambda(stack, 'lambdaTarget', {
                lambda: [
                  new lambda.Function(stack, 'lambdafunction', {
                    runtime: lambda.Runtime.PYTHON_3_10,
                    handler: 'handler',
                    code: lambda.Code.fromInline('return {"statusCode": 200}'),
                  }),
                ],
              }),
            }),
          },
        ],
        httpMatch: {
          pathMatches: { path: '/path1' },
          method: HTTPMethods.GET,
        },
        accessMode: RuleAccessMode.UNAUTHENTICATED,
      });

      listener.addListenerRule({
        name: 'ListenerRule200',
        priority: 20,
        action: [
          {
            targetGroup: new TargetGroup(stack, 'ipTargets', {
              name: 'ipTargets',
              target: new Ip(stack, 'ip', {
                ipAddress: ['10.10.10.10'],
                targetConfig: {
                  vpc: vpc1,
                  healthcheck: HealthCheck.check({
                    healthCheckInterval: core.Duration.seconds(60),
                    healthCheckTimeout: core.Duration.seconds(10),
                    healthyThresholdCount: 2,
                    protocolVersion: ProtocolVersion.HTTP1,
                    unhealthyThresholdCount: 2,
                  }),
                },
              }),
            }),
          },
        ],
        httpMatch: {
          pathMatches: {
            path: '/path2',
            pathMatchType: PathMatchType.PREFIX,
          },
          method: HTTPMethods.GET,
        },
        allowedPrincipals: [new iam.AccountPrincipal('123456123456')],
        accessMode: RuleAccessMode.ORG_ONLY,
      });

      listener.addListenerRule({
        name: 'ListenerRule300',
        priority: 30,
        httpMatch: {
          pathMatches: { path: '/path3' },
          method: HTTPMethods.GET,
        },
        allowedPrincipals: [new iam.AccountPrincipal('123456123456')],
        accessMode: RuleAccessMode.AUTHENTICATED_ONLY,
        action: [
          {
            targetGroup: new TargetGroup(stack, 'instanceTargets', {
              name: 'instanceTarget',
              target: new EC2Instance(stack, 'ec2instance', {
                ec2instance: [
                  new ec2.Instance(stack, 'Instance1', {
                    instanceType: new ec2.InstanceType('t2.micro'),
                    machineImage: ec2.MachineImage.latestAmazonLinux2023(),
                    vpc: new ec2.Vpc(stack, 'ec2instanceTarget'),
                  }),
                ],
                targetConfig: {
                  vpc: vpc1,
                  protocol: Protocol.HTTP,
                  healthcheck: HealthCheck.check({
                    protocol: Protocol.HTTP,
                    healthCheckInterval: core.Duration.seconds(60),
                    healthCheckTimeout: core.Duration.seconds(10),
                    healthyThresholdCount: 2,
                    protocolVersion: ProtocolVersion.HTTP1,
                    unhealthyThresholdCount: 2,
                    matcher: FixedResponse.OK,
                  }),
                },
              }),
            }),
          },
        ],
      });

      listener.addListenerRule({
        name: 'ListenerRule400',
        accessMode: RuleAccessMode.NO_STATEMENT,
        priority: 40,
        action: [
          {
            targetGroup: new TargetGroup(stack, 'albv2Targets', {
              name: 'albv2Target',
              target: new ApplicationLoadBalancer(stack, 'alb', {
                alb: [
                  new elbv2.ApplicationLoadBalancer(stack, 'albv2', {
                    vpc: new ec2.Vpc(stack, 'albv2TargetVpc'),
                  }),
                ],
                targetConfig: {
                  port: 443,
                  protocol: Protocol.HTTPS,
                  vpc: vpc1,
                },
              }),
            }),
          },
        ],
        httpMatch: {
          pathMatches: { path: '/path4' },
          method: HTTPMethods.GET,
        },
        allowedPrincipals: [new iam.AccountPrincipal('123456123456')],
      });

      listener.addListenerRule({
        name: 'ListenerRule500',
        priority: 50,
        action: [
          {
            targetGroup: new TargetGroup(stack, 'albv2Targets2', {
              name: 'albv2Targets',
              target: new ApplicationLoadBalancer(stack, 'albv2a', {
                alb: [
                  new elbv2.ApplicationLoadBalancer(stack, 'albv22', {
                    vpc: new ec2.Vpc(stack, 'albv2TargetVpc2'),
                  }),
                ],
                targetConfig:
                {
                  port: 8080,
                  protocol: Protocol.HTTP,
                  vpc: vpc1,
                },
              }),
            }),
          },
        ],
        httpMatch: {
          headerMatches: [
            {
              headerName: 'header1',
              matchValue: 'value1',
              matchOperator: MatchOperator.EXACT,
            },
            {
              headerName: 'header2',
              matchValue: 'value2',
              matchOperator: MatchOperator.CONTAINS,
            },
            {
              headerName: 'header3',
              matchValue: 'value3',
              matchOperator: MatchOperator.PREFIX,
            },
          ],
          pathMatches: { path: '/path5' },
          method: HTTPMethods.GET,
        },
        allowedPrincipals: [new iam.AccountPrincipal('123456123456')],
      });

      const servicenetwork = new ServiceNetwork(stack, 'ServiceNetwork', {
        name: 'servicenetwork',
        accessmode: ServiceNetworkAccessMode.AUTHENTICATED_ONLY,
        services: [latticeService],
        vpcs: [
          vpc1,
        ],
        loggingDestinations: [
          LoggingDestination.s3(new s3.Bucket(stack, 'S3Bucket')),
          LoggingDestination.kinesis(new kinesis.Stream(stack, 'KinesisStream')),
          LoggingDestination.cloudwatch(new log.LogGroup(stack, 'CloudWatchLogGroup')),
        ],
      });

      servicenetwork.share({
        name: 'abcdef',
        accounts: ['111122223333'],
      });

      new ServiceNetwork(stack, 'ServiceNetwork2', {
        services: [latticeService],
        accessmode: ServiceNetworkAccessMode.ORG_ONLY,
      });

      new ServiceNetwork(stack, 'ServiceNetwork3', {
        services: [latticeService],
        accessmode: ServiceNetworkAccessMode.UNAUTHENTICATED,
      });

      new ServiceNetwork(stack, 'ServiceNetwork4', {
        name: 'servicenetwork',
        authorization: Authorizer.iam(),
        accessmode: ServiceNetworkAccessMode.AUTHENTICATED_ONLY,
        services: [latticeService],
        vpcs: [
          vpc1,
        ],
      });

      servicenetwork.applyAuthPolicyToServiceNetwork();
      latticeService.applyAuthPolicy();

    });

    test('creates a lattice network', () => {
      Template.fromStack(stack).resourceCountIs('AWS::VpcLattice::ServiceNetwork', 4);
    });

    test('creates a lattice service', () => {
      Template.fromStack(stack).resourceCountIs('AWS::VpcLattice::Service', 1);
    });

    test('creates logging destinations', () => {
      Template.fromStack(stack).resourceCountIs('AWS::VpcLattice::AccessLogSubscription', 3);
    });

  });
});

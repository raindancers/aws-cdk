import * as path from 'path';
import * as core from 'aws-cdk-lib';

import {
  aws_iam as iam,
  aws_ec2 as ec2,
  aws_logs as logs,
  aws_lambda,
}
  from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class SupportResources extends Construct {

  public lambdaTarget: core.aws_lambda.Function;
  public target2: core.aws_lambda.Function;
  public invoke: core.aws_lambda.Function;

  public vpc1: ec2.Vpc;
  public vpc2: ec2.Vpc;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // NOTE for the purpose of this demonstration, we are deliberately overlapping the IP Address ranges.
    // a vpc for the helloworld lambda
    this.vpc1 = new ec2.Vpc(this, 'VPC1', {
      ipAddresses: ec2.IpAddresses.cidr('10.10.0.0/16'),
      maxAzs: 2,
      natGateways: 0,
    });

	  // a vpc for the goodbye world lambda
    this.vpc2 = new ec2.Vpc(this, 'VPC2', {
      ipAddresses: ec2.IpAddresses.cidr('10.10.0.0/16'),
      maxAzs: 2,
      natGateways: 0,
    });

    // lambda to invoke from;

    this.invoke = new aws_lambda.Function(this, 'InvokeLambda', {
      runtime: aws_lambda.Runtime.PYTHON_3_10,
      handler: 'latticeRequest.lambda_handler',
      logRetention: core.aws_logs.RetentionDays.FIVE_DAYS,
      code: aws_lambda.Code.fromAsset(path.join(__dirname, './lambda/latticeRequest'), {
        bundling: {
          image: aws_lambda.Runtime.PYTHON_3_10.bundlingImage,
          command: [
            'bash', '-c',
            'pip install -r requirements.txt -t /asset-output && cp -au . /asset-output',
          ],
        },
      }),
      timeout: core.Duration.seconds(899),
      vpc: this.vpc1,
    });

    // the lambda needs some additonal permissions to attach to the vpc.
    this.invoke.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      resources: ['*'],
      actions: [
        'ec2:CreateNetworkInterface',
        'ec2:DescribeNetworkInterfaces',
        'ec2:DeleteNetworkInterface',
      ],
    }));

    // give the hello lambda a role and permissions
    const lambdaRole = new iam.Role(this, 'helloRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    });

    // create the hello world lambda
    this.lambdaTarget = new aws_lambda.Function(this, 'Helloworld', {
      runtime: aws_lambda.Runtime.PYTHON_3_10,
      handler: 'helloworld.lambda_handler',
      code: aws_lambda.Code.fromAsset(path.join(__dirname, './lambda' )),
      timeout: core.Duration.seconds(15),
      role: lambdaRole,
      logRetention: logs.RetentionDays.FIVE_DAYS,
    });

    this.target2 = new aws_lambda.Function(this, 'placeholder', {
      runtime: aws_lambda.Runtime.PYTHON_3_10,
      handler: 'helloworld.lambda_handler',
      code: aws_lambda.Code.fromAsset(path.join(__dirname, './lambda' )),
      timeout: core.Duration.seconds(15),
      role: lambdaRole,
      logRetention: logs.RetentionDays.FIVE_DAYS,
    });

  }
}
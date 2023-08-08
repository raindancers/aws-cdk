import * as core from 'aws-cdk-lib';

import {
  aws_vpclattice,
  aws_lambda,
}
  from 'aws-cdk-lib';

import { Construct } from 'constructs';

import {
  TargetType,
  ITarget,
} from './index';

/**
 * Lambda Target Properties
 */
export interface LambdaProps {
  /**
   * lambda functions that will be part of the target
  */
  readonly lambda: aws_lambda.Function[];
}

/**
 * Creates a Lambda Target
 */
export class Lambda extends core.Resource implements ITarget {
  /**
   * The TargetType
   */
  readonly type: TargetType;
  /**
   * Targets
   */
  readonly targets: core.aws_vpclattice.CfnTargetGroup.TargetProperty[];

  constructor(scope: Construct, id: string, props: LambdaProps) {
    super(scope, id);

    let targets: aws_vpclattice.CfnTargetGroup.TargetProperty[] = [];
    props.lambda.forEach((target) => {
      targets.push({ id: target.functionArn });
    });

    this.type = TargetType.LAMBDA;
    this.targets = targets;

  };
}

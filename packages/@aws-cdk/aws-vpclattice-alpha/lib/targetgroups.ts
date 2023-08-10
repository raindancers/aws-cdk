import * as core from 'aws-cdk-lib';

import {
  aws_vpclattice,
}
  from 'aws-cdk-lib';

import * as constructs from 'constructs';

/**
 * Types of Targets that are usable with vpclattice
 */
export enum TargetType {
  /**
   * Lambda Target
   */
  LAMBDA = 'LAMBDA',
  /**
   * IP Address Target
   */
  IP = 'IP',
  /**
   * EC2 Instance Targets
   */
  INSTANCE = 'INSTANCE',
  /**
   * Application Load Balancer Target
   */
  ALB = 'ALB'
}

/**
 * ITarget
 */
export interface ITarget {
  /**
   * Target Type
   */
  readonly type: TargetType;
  /**
   * References to the targets, ids or Arns
   */
  readonly targets: aws_vpclattice.CfnTargetGroup.TargetProperty[];
  /**
   * Configuration for the TargetGroup, if it is not a lambda
   */
  readonly config?: aws_vpclattice.CfnTargetGroup.TargetGroupConfigProperty | undefined;
};

/**
 * Create a vpc lattice TargetGroup.
 * Implemented by `TargetGroup`.
 */
export interface ITargetGroup extends core.IResource {
  /**
   * The id of the target group
   */
  readonly targetGroupId: string;
  /**
   * The Arn of the target group
   */
  readonly targetGroupArn: string;

}
/**
 * Properties for a Target Group, Only supply one of instancetargets, lambdaTargets, albTargets, ipTargets
 */
export interface TargetGroupProps {
  /**
   * The name of the target group
   */
  readonly name: string;
  /**
   * Targets
   */
  readonly target: ITarget;
}

/**
 * Create a vpc lattice TargetGroup
 *
 */
export class TargetGroup extends core.Resource implements ITargetGroup {

  /*
  * the Id of the targetGroup
  **/
  readonly targetGroupId: string;
  /**
   * The Arn of the targetGroup
   */
  readonly targetGroupArn: string;

  constructor(scope: constructs.Construct, id: string, props: TargetGroupProps) {
    super(scope, id);

    const targetGroup = new aws_vpclattice.CfnTargetGroup(this, 'Resource', {
      type: props.target.type,
      name: props.name,
      config: props.target.config,
      targets: props.target.targets,
    });

    this.targetGroupId = targetGroup.attrId;
    this.targetGroupArn = targetGroup.attrArn;
  }
}

/**
 * WeightedTargetGroup
 */
export interface WeightedTargetGroup {
  /**
   * A target Group
   */
  readonly targetGroup: TargetGroup;
  /**
  * A weight for the target group.
  * @default 100
  */
  readonly weight?: number | undefined;
}
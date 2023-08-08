import * as core from 'aws-cdk-lib';

import {
  aws_vpclattice,
  aws_elasticloadbalancingv2 as elbv2,
}
  from 'aws-cdk-lib';

import { Construct } from 'constructs';

import {
  Protocol,
  IpAddressType,
  TargetConfig,
  TargetType,
  ITarget,
} from './index';

/**
 * ApplicaitonLoadBalancerTargetConfiguration
 */
export interface ApplicationConfigurationProps {
  /**
   * Albs to be in target
   */
  readonly alb: elbv2.ApplicationLoadBalancer[];
  /**
   * TargetConfiguration.
   */
  readonly targetConfig: TargetConfig;
}

/**
 * Targets for target Groups
 */
export class ApplicationLoadBalancer extends core.Resource implements ITarget {
  /**
   * The TargetType
   */
  readonly type: TargetType;
  /**
   * Targets
   */
  readonly targets: core.aws_vpclattice.CfnTargetGroup.TargetProperty[];
  /**
   * Config
   */
  readonly config?: core.aws_vpclattice.CfnTargetGroup.TargetGroupConfigProperty | undefined;

  constructor(scope: Construct, id: string, props: ApplicationConfigurationProps) {
    super(scope, id);

    let targets: aws_vpclattice.CfnTargetGroup.TargetProperty[] = [];

    props.alb.forEach((target) => {
      targets.push({ id: target.loadBalancerArn });
    });

    var port: number;
    if (props.targetConfig.port) {
      port = props.targetConfig.port;
    } else if ( props.targetConfig.protocol === Protocol.HTTP ) {
      port = 80;
    } else {
      port = 443;
    };

    var config: aws_vpclattice.CfnTargetGroup.TargetGroupConfigProperty = {
      vpcIdentifier: props.targetConfig.vpc.vpcId,
      protocol: props.targetConfig.protocol ?? Protocol.HTTPS,
      port: port,
      ipAddressType: props.targetConfig.ipAddressType ?? IpAddressType.IPV4,
      healthCheck: props.targetConfig.healthcheck,
    };

    this.type = TargetType.ALB;
    this.targets = targets;
    this.config = config;

  }
}

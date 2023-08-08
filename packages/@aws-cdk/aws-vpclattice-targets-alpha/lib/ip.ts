import * as core from 'aws-cdk-lib';

import {
  aws_vpclattice,
}
  from 'aws-cdk-lib';

import { Construct } from 'constructs';

import {
  TargetConfig,
  TargetType,
  Protocol,
  IpAddressType,
  ITarget,
} from './index';

/**
 * IP Target Properties
 */
export interface IpTargetProps {
  /**
   * IP Address's that will be part of the Target
   */
  readonly ipAddress: string[];
  /**
   * Target Configuration
   */
  readonly targetConfig: TargetConfig;
}

/**
 * Create a Target using IP Address's
 */
export class IpTarget extends core.Resource implements ITarget {
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

  constructor(scope: Construct, id: string, props: IpTargetProps) {
    super(scope, id);

    let targets: aws_vpclattice.CfnTargetGroup.TargetProperty[] = [];

    props.ipAddress.forEach((target) => {
      targets.push({ id: target });
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

    this.type = TargetType.IP,
    this.targets = targets,
    this.config = config;
  };
};

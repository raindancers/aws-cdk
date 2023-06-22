import * as core from 'aws-cdk-lib';

import {
  aws_vpclattice,
  aws_ec2 as ec2,
  aws_lambda,
  aws_elasticloadbalancingv2 as elbv2,
}
  from 'aws-cdk-lib';

import {
  Protocol,
  TargetGroup,
  FixedResponse,
} from './index';

/**
 * IpAddressType
 */
export enum IpAddressType {
  /**
   * ipv4
   */
  IPV4 = 'IPV4',
  /**
   * Ipv6
   */
  IPV6 = 'IPV6',
}

/**
 * ProtocolVersion
 */
export enum ProtocolVersion {
  /**
   * Http1
   */
  HTTP1 = 'HTTP1',
  /**
   * Http2
   */
  HTTP2 = 'HTTP2',
  /**
   * GRPC
   */
  GRPC = 'GRPC',
}

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
 * TargetConfiguration
 */
export interface TargetConfig {
  /**
   * VPC where the target(s) are located
   */
  readonly vpc: ec2.IVpc,
  /**
   * HealthCheckParameters - Can supply for IpAddress and ALB targets only.
   * @default No HealthCheck
   */
  readonly healthcheck?: HealthCheck | undefined,
  /**
   * IpAddressType
   * @default IPv4
   */
  readonly ipAddressType?: IpAddressType,
  /**
   * Protocol
   * @default HTTPS
   */
  readonly protocol?: Protocol | undefined,
  /**
   * Port
   * @default Defaults to port 80 for HTTP, or 443 for HTTPS and GRPC
   */
  readonly port?: number | undefined,
  /**
   * ProtocolVersion
   * @default HTTP1
   */
  readonly protocolVersion?: ProtocolVersion,
}

/**
 * Targets for target Groups
 */
export abstract class Target {

  /**
   * Lambda Target - Note: Lambda Targets do not have a configuration
   * @param lambda
   */
  public static lambda(lambda: aws_lambda.Function[]): Target {

    let targets: aws_vpclattice.CfnTargetGroup.TargetProperty[] = [];
    lambda.forEach((target) => {
      targets.push({ id: target.functionArn });
    });

    return {
      type: TargetType.LAMBDA,
      targets: targets,
    };
  };

  /**
   * IpAddress as Targets
   * @param ipAddress
   * @param targetConfig
   */
  public static ipAddress(ipAddress: string[], targetConfig: TargetConfig ): Target {

    let targets: aws_vpclattice.CfnTargetGroup.TargetProperty[] = [];

    ipAddress.forEach((target) => {
      targets.push({ id: target });
    });

    var port: number;
    if (targetConfig.port) {
      port = targetConfig.port;
    } else if ( targetConfig.protocol === Protocol.HTTP ) {
      port = 80;
    } else {
      port = 443;
    };

    var config: aws_vpclattice.CfnTargetGroup.TargetGroupConfigProperty = {
      vpcIdentifier: targetConfig.vpc.vpcId,
      protocol: targetConfig.protocol ?? Protocol.HTTPS,
      port: port,
      ipAddressType: targetConfig.ipAddressType ?? IpAddressType.IPV4,
      healthCheck: targetConfig.healthcheck,
    };

    return {
      type: TargetType.IP,
      targets: targets,
      config: config,
    };

  };

  /**
   * EC2 Instances as Targets
   * @param ec2instance
   * @param targetConfig
   */
  public static ec2instance(ec2instance: ec2.Instance[], targetConfig: TargetConfig): Target {

    let targets: aws_vpclattice.CfnTargetGroup.TargetProperty[] = [];

    ec2instance.forEach((target) => {
      targets.push({ id: target.instanceId });
    });

    var port: number;
    if (targetConfig.port) {
      port = targetConfig.port;
    } else if ( targetConfig.protocol === Protocol.HTTP ) {
      port = 80;
    } else {
      port = 443;
    };

    var config: aws_vpclattice.CfnTargetGroup.TargetGroupConfigProperty = {
      vpcIdentifier: targetConfig.vpc.vpcId,
      protocol: targetConfig.protocol ?? Protocol.HTTPS,
      port: port,
      ipAddressType: targetConfig.ipAddressType ?? IpAddressType.IPV4,
      healthCheck: targetConfig.healthcheck,
    };

    return {
      type: TargetType.INSTANCE,
      targets: targets,
      config: config,
    };

  };

  /**
   * Application Load Balancer as Targets
   * @param alb
   * @param targetConfig
   */
  public static applicationLoadBalancer(
    alb: elbv2.ApplicationLoadBalancer[],
    targetConfig: TargetConfig,
  ) : Target {

    if (targetConfig?.healthcheck) {
      throw new Error('HealthCheck is not supported for Application Load Balancers');
    };

    let targets: aws_vpclattice.CfnTargetGroup.TargetProperty[] = [];

    alb.forEach((target) => {
      targets.push({ id: target.loadBalancerArn });
    });

    var port: number;
    if (targetConfig.port) {
      port = targetConfig.port;
    } else if ( targetConfig.protocol === Protocol.HTTP ) {
      port = 80;
    } else {
      port = 443;
    };

    var config: aws_vpclattice.CfnTargetGroup.TargetGroupConfigProperty = {
      vpcIdentifier: targetConfig.vpc.vpcId,
      protocol: targetConfig.protocol ?? Protocol.HTTPS,
      port: port,
      ipAddressType: targetConfig.ipAddressType ?? IpAddressType.IPV4,
      healthCheck: targetConfig.healthcheck,
    };

    return {
      type: TargetType.ALB,
      targets: targets,
      config: config,
    };

  }
  /**
   * The type of target
   */
  public abstract readonly type: TargetType;
  /**
   * References to the targets, ids or Arns
   */
  public abstract readonly targets: aws_vpclattice.CfnTargetGroup.TargetProperty[];
  /**
   * Configuration for the TargetGroup, if it is not a lambda
   */
  public abstract readonly config?: aws_vpclattice.CfnTargetGroup.TargetGroupConfigProperty | undefined;

  constructor() {};
}

/**
 * A weighted target group adds a weighting to a target group.
 * when more than one WeightedTargetGroup is provided as the action
 * for a listener, the weights are used to determine the relative proportion
 * of traffic that is sent to the target
 */
export interface WeightedTargetGroup {
  /**
   * A target Group
   */
  readonly targetGroup: TargetGroup,
  /**
  * A weight for the target group.
  * @default 100
  */
  readonly weight?: number | undefined
}

/**
 * A Configuration of the TargetGroup Health Check.
 */
export interface TargetGroupHealthCheckProps {
  /**
   * Enable this Health Check
   * @default true
   */
  readonly enabled?: boolean | undefined,
  /**
   * Health Check Interval
   * @default 30 seconds
   */
  readonly healthCheckInterval?: core.Duration | undefined
  /**
   * TimeOut Period
   * @default 5 seconds
   */
  readonly healthCheckTimeout?: core.Duration | undefined
  /**
   * Number of Healthy Responses before Target is considered healthy
   * @default 2
   */
  readonly healthyThresholdCount?: number | undefined
  /**
   * Check based on Response from target
   * @default 200 OK
   */
  readonly matcher?: FixedResponse | undefined
  /**
   * Path to use for Health Check
   * @default '/'
   */
  readonly path?: string | undefined
  /**
   * Port to use for Health Check
   * @default 443
   */
  readonly port?: number | undefined
  /**
   * Protocol to use for Health Check
   * @default HTTPS
   */
  readonly protocol?: Protocol | undefined
  /**
   * Protocol to use for Health Check
   * @default HTTP2
   */
  readonly protocolVersion?: ProtocolVersion | undefined
  /**
   * Number of unhealty events before Target is considered unhealthy
   * @default 1
   */
  readonly unhealthyThresholdCount?: number | undefined
}

/**
 * Create a Health Check for a target
 */
export abstract class HealthCheck {

  /**
   * A Health Check configuration object for a target
   * @param props
   * @returns HealthCheck
   */
  public static check(props: TargetGroupHealthCheckProps): HealthCheck {

    // validate the ranges for the health check
    if (props.healthCheckInterval) {
      if (props.healthCheckInterval.toSeconds() < 5 || props.healthCheckInterval.toSeconds() > 300) {
        throw new Error('HealthCheckInterval must be between 5 and 300 seconds');
      }
    };

    if (props.healthCheckTimeout) {
      if (props.healthCheckTimeout.toSeconds() < 1 || props.healthCheckTimeout.toSeconds() > 120) {
        throw new Error('HealthCheckTimeout must be between 1 and 120seconds');
      }
    };

    if (props.healthyThresholdCount) {
      if (props.healthyThresholdCount < 1 || props.healthyThresholdCount > 10) {
        throw new Error('HealthyThresholdCount must be between 1 and 10');
      }
    };

    if (props.protocolVersion) {
      if (props.protocolVersion === ProtocolVersion.GRPC) {
        throw new Error('GRPC is not supported');
      }
    };

    if (props.unhealthyThresholdCount) {
      if (props.unhealthyThresholdCount < 2 || props.unhealthyThresholdCount > 10) {
        throw new Error('UnhealthyThresholdCount must be between 2 and 10');
      }
    }

    var port: number;
    if (props.port) {
      port = props.port;
    } else if ( props.protocol === Protocol.HTTP ) {
      port = 80;
    } else {
      port = 443;
    };

    let matcher: aws_vpclattice.CfnTargetGroup.MatcherProperty | undefined = undefined;
    if (props.matcher) {
      const codeAsString = props.matcher.toString();
      matcher = { httpCode: codeAsString };
    };

    return {
      enabled: props.enabled ?? true,
      healthCheckInterval: props.healthCheckInterval ?? core.Duration.seconds(30),
      healthCheckTimeout: props.healthCheckTimeout ?? core.Duration.seconds(5),
      path: props.path ?? '/',
      protocol: props.protocol ?? 'HTTPS',
      port: port,
      protocolVersion: props.protocolVersion ?? 'HTTP1',
      unhealthyThresholdCount: props.unhealthyThresholdCount ?? 2,
      healthyThresholdCount: props.healthyThresholdCount ?? 5,
      matcher: matcher,
    };
  };

  /**
   * health check is enabled.
   */
  public abstract readonly enabled: boolean;
  /**
   * healthCheck Interval
   */
  public abstract readonly healthCheckInterval: core.Duration;
  /**
   * HealthCheck Timeout
   */
  public abstract readonly healthCheckTimeout: core.Duration;
  /**
   * Target Match reponse
   */
  public abstract readonly matcher: aws_vpclattice.CfnTargetGroup.MatcherProperty | undefined;
  /**
   * Path to check
   */
  public abstract readonly path: string;
  /**
   * Port to check
   */
  public abstract readonly port: number;
  /** Protocol
   *
   */
  public abstract readonly protocol: string;
  /**
   * HTTP Protocol Version
   */
  public abstract readonly protocolVersion: string;
  /**
   * Unhealthy Threshold Count
   */
  public abstract readonly unhealthyThresholdCount: number;
  /**
   * Healthy Threshold Count
   */
  public abstract readonly healthyThresholdCount: number;

  protected constructor() {};

};
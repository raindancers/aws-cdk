import * as core from 'aws-cdk-lib';

import {
  aws_vpclattice,
}
  from 'aws-cdk-lib';

import {
  FixedResponse,
  Protocol,
  ProtocolVersion,
}
  from './index';

/**
 * Properties to create a HealthCheck for a Target Group
 */
export interface TargetGroupHealthCheckProps {
  /**
   * Enable this Health Check
   * @default true
   */
  readonly enabled?: boolean | undefined;
  /**
   * Health Check Interval
   * @default 30 seconds
   */
  readonly healthCheckInterval?: core.Duration | undefined;
  /**
   * TimeOut Period
   * @default 5 seconds
   */
  readonly healthCheckTimeout?: core.Duration | undefined;
  /**
   * Number of Healthy Responses before Target is considered healthy
   * @default 2
   */
  readonly healthyThresholdCount?: number | undefined;
  /**
   * Check based on Response from target
   * @default 200 OK
   */
  readonly matcher?: FixedResponse | undefined;
  /**
   * Path to use for Health Check
   * @default '/'
   */
  readonly path?: string | undefined;
  /**
   * Port to use for Health Check
   * @default 443
   */
  readonly port?: number | undefined;
  /**
   * Protocol to use for Health Check
   * @default HTTPS
   */
  readonly protocol?: Protocol | undefined;
  /**
   * Protocol to use for Health Check
   * @default HTTP2
   */
  readonly protocolVersion?: ProtocolVersion | undefined;
  /**
   * Number of unhealty events before Target is considered unhealthy
   * @default 1
   */
  readonly unhealthyThresholdCount?: number | undefined;
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
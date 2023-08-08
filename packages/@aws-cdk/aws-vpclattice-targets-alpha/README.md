# Alpha Package for aws-vpclattice-targets-alpha
<!--BEGIN STABILITY BANNER-->

---

![cdk-constructs: Experimental](https://img.shields.io/badge/cdk--constructs-experimental-important.svg?style=for-the-badge)

> The APIs of higher level constructs in this module are experimental and under active development.
> They are subject to non-backward compatible changes or removal in any future version. These are
> not subject to the [Semantic Versioning](https://semver.org/) model and breaking changes will be
> announced in the release notes. This means that while you may use them, you may need to update
> your source code when upgrading to a newer version of this package.

---

<!--END STABILITY BANNER-->

## Targets

VpcLattice Targets are Integrations which provide the mechanism to connect a backend resources. Supported target types
include AWS Lambdas, EC2 Instances, Application Load Balancers and IP Address. A target may optionally include a Health check.

### Lambda

Lambda targets enable integrating a HTTP route from Lattice to a Lambda function.  Uniquely lambda targets do not require to be associated with a vpc that vpclattice is associated with. As such they do not require a targetConfig, and do not support health checks.

The following code configures a lambda target.

```typescript
import * as vpclattice-targets from '@aws-cdk/aws-vpclattice-targets-alpha';

const fn = new lambda.Function(stack, 'LambdaFunction', {
  runtime: lambda.Runtime.PYTHON_3_10,
  code: lambda.Code.fromInline('def handler(event, context): pass'),
  handler: 'index.handler',
});

new Lambda(stack, 'Ec2InstanceTarget', {
  lambda: [fn],
});
```

### ECInstance

EC2 Instance targets enable integrating a HTTP route from VPC Lattice to an EC2 Instance.  Instance targets must be placed on a vpc which has been associated with a VPC Lattice servicenetwork.

The following code configures a EC2 Instance target, with default settings. ( Ipv4, HTTPS, tcp 443, HTTP1 )

```typescript
import * as vpclattice-targets from '@aws-cdk/aws-vpclattice-targets-alpha';

var vpc: ev2.Vpc;

new vpclattice-targets.EC2Instance(stack, 'Ec2InstanceTarget2', {
  ec2instance: [instance],
  targetConfig: {
    vpc: vpc
  },
});
```

### ApplicationLoadBalancer

ApplicaitonLoadBalancer targets enable integrating a HTTP route from VPC Lattice to an EC2 Instance.  ApplicationLoadBalancer targets must be placed on a vpc which has been associated with a VPC Lattice servicenetwork.

The following code configures an ALB target, with default settings. ( Ipv4, HTTPS, tcp 443, HTTP1 )

```typescript
import * as vpclattice-targets from '@aws-cdk/aws-vpclattice-targets-alpha';

var vpc: ec2.Vpc;
var loadbalancer: elbv2.ApplicaitonLoadBalancer

 new ApplicationLoadBalancer(stack, 'ALBTarget1', {
  alb: [loadbalancer],
  targetConfig: {
    vpc: vpc,
  },
});
```

### IP address

IP address targets allow directing a route from VPC Lattice to an IP Address.  Ip address's must be within the VPC that you specify.

The following code configures a IP target, with default settings. ( Ipv4, HTTPS, tcp 443, HTTP1 )

```typescript
import * as vpclattice-targets from '@aws-cdk/aws-vpclattice-targets-alpha';

var vpc: ec2.Vpc;

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
```

## HealthCheck

The VpcLattice service periodically sends requests to its registered targets to test their status. These tests are called
[*health checks.*](https://docs.aws.amazon.com/vpc-lattice/latest/ug/target-group-health-checks.html)

Each VPC Lattice service routes requests only to the healthy targets. Each service checks the health of each target, using the health check settings for the target groups with which the target is registered. After your target is registered, it must pass one health check to be considered healthy.

You can optionally configure non default health checks for a target, by including it with the targetConfig

```typescript
import * as vpclattice-targets from '@aws-cdk/aws-vpclattice-targets-alpha';

var vpc: ec2.Vpc;
var loadbalancer: elbv2.ApplicaitonLoadBalancer

 new ApplicationLoadBalancer(stack, 'ALBTarget1', {
  alb: [loadbalancer],
  targetConfig: {
    vpc: vpc,
    healthcheck: vpclattice-targets.HealthCheck.check({
      enabled: true,
      healthcheckInterval: cdk.Duration.seconds(5),
    })
  },
});

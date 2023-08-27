# Alpha Package for aws-vpclattice-alpha
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

[Amazon VPC Lattice](https://docs.aws.amazon.com/vpc-lattice/) is an application networking service that connects, monitors, and secures communications between workloads.

A VPCLattice `Service` provides access to  `Targets`, via a `Listener`. Access to the service is controlled by a policy rule.   A `Service` is associated with a `ServiceNetwork`.  VPC's are associated with a ServiceNetwork.  

## Service

Every VPCLattice project will require a vpc lattice service. This is achieved by creating an instance of `Service`.  The service will be constructed with default settings, which an be overridden as required, by providing alternative parameters. By default the service will require IAM authentication, and will not have a custom domain.

```typescript
const myLatticeService = new Service(this, 'myLatticeService', {});
```

## Listener

A Listener is required, and needs to be associated with a `Service`.  This can be acheived by creating an instance of `Listener`.  A Listener can be created with default settings of HTTP, Port 443, and a default fixed action of 404 NOT FOUND, or configured with alternative settings.

```typescript
const myListener = new Listener(this, 'myListener', {
  service: myLatticeService,
});
```

## Targets

Targets for Vpc Lattice follow the cdk integration pattern, so are part of the aws-vpclattice-target-alpha package.Lattice supports target types of Applicaiton Load balancer, Address, Lambda, and EC2 instance.

```typescript
declare const myFunction: lambda.Function;

const lambdaTarget = new vpcLatticeTargets.Target.Lambda(this, 'lambdaTarget', {
  lambda: [
    myFunction,
  ]
});
```

## Listener Rules

Listener rules can be added to the Listener using the `.addListenerRule` method on a `Listener`.
This method creates both the the ListenerRule and optionally adds statements to to the Service policy.
A listener rule requires. Each rule consists of a priority, one or more actions, and one
or more conditions. Each rule associated with a service must have unique prioritys.

```typescript

declare const myListener: Listener;
declare const lambdaTarget: vpcLatticeTargets.Target;

myListener.addListenerRule({
      name: 'rule1',
      priority: 10,
      action: [
        {
          targetGroup: new TargetGroup(this, 'test1', {
            name: 'test1',
            target: lambdaTarget,
          }),
        },
      ],
      httpMatch: {
        pathMatches: { path: '/test1' },
      },
      allowedPrincipals: [
        support.invoke.role as iam.Role,
        support.ec2instance.role as iam.Role,
      ],
      accessMode: RuleAccessMode.AUTHENTICATED_ONLY,
    });
```

## ServiceNetwork

A service network defines the local collection of services. Services associated with the network can be authorized for
discovery, connectivity, accessibility, and observability. To make requests to services in the network, a target or
client must be in a VPC that is associated with the service network.

A ServiceNetwork has an associated Policy, which is typically used to set high level policy. Such as allowing or denying
Unauthenticated requests or only request from an Organisation.

Logging of request can be sent to S3, cloudwatch or kinesis.

```typescript

declare const myLatticeService: Service;
declare const vcp1: ec2.Vpc;
declare const vcp2: ec2.Vpc;

const serviceNetwork = new ServiceNetwork(this, 'LatticeServiceNetwork', {
      accessmode: ServiceNetworkAccessMode.UNAUTHENTICATED,
      services: [myLatticeService],
      loggingDestinations: [
        LoggingDestination.cloudwatch(new logs.LogGroup(this, 'latticeLogs', {
          retention: logs.RetentionDays.ONE_MONTH,
          logGroupName: 'latticeLogs',
          removalPolicy: core.RemovalPolicy.DESTROY,
        })),
      ],
      vpcs: [
        support.vpc1,
        support.vpc2,
      ],
    });
```

## Applying Policy

The policies for service networks and services are the sum of the policy statements that are created by adding rules.
The policy needs to be applied to the servicenetwork or service using the `.applyAuthPolicy` method.

```typescript
declare const serviceNetwork: ServiceNetwork;
declare cosnt service: Service;

serviceNetwork.applyAuthPolicy();
service.applyAuthPolicy();
```

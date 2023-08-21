import * as core from 'aws-cdk-lib';

import {
  aws_iam as iam,
  aws_lambda,
}
  from 'aws-cdk-lib';

// eslint-disable-next-line import/no-extraneous-dependencies
import * as vpcLatticeTarget from '@aws-cdk/aws-vpclattice-targets-alpha';

import { Construct } from 'constructs';

import { SupportResources } from './support';
import {
  ServiceNetwork,
  Service,
  TargetGroup,
  Listener,
  RuleAccessMode,
  ServiceNetworkAccessMode,
}
  from '../../lib/index';

export class LatticeTestStack extends core.Stack {

  invoke: aws_lambda.Function
  serviceURL: string

  constructor(scope: Construct, id: string, props?: core.StackProps) {
    super(scope, id, props);

    const support = new SupportResources(this, 'supportresources');

    this.invoke = support.invoke;

    // Create a Lattice Service
    // this will default to using IAM Authentication
    const myLatticeService = new Service(this, 'myLatticeService', {
    });

    this.serviceURL = myLatticeService.url;

    myLatticeService.node.addDependency(support.vpc1);
    myLatticeService.node.addDependency(support.vpc2);

    // add a listener to the service, using the defaults
    // - HTTPS
    // - Port 443
    // - default action of providing 404 NOT Found,
    // - cloudformation name

    const myListener = new Listener(this, 'myListener', {
      service: myLatticeService,
    });

    // the invoker lambda is permitted to access this.
    myListener.addListenerRule({
      name: 'rule1',
      priority: 10,
      action: [
        {
          targetGroup: new TargetGroup(this, 'test1', {
            name: 'test1',
            target: new vpcLatticeTarget.Lambda( this, 'testtarget', {
              lambda: [
                support.lambdaTarget,
              ],
            }),
          }),
        },
      ],
      // the conditions for the match are effectively AND'ed together
      httpMatch: {
        pathMatches: { path: '/test1' },
      },
      allowedPrincipals: [
        support.invoke.role as iam.Role,
      ],
      accessMode: RuleAccessMode.AUTHENTICATED_ONLY,
    });

    // the invoker lambda is not permittd to access this, and when called shoudl get a 403
    myListener.addListenerRule({
      name: 'rule2',
      priority: 20,
      action: [
        {
          targetGroup: new TargetGroup(this, 'test2', {
            name: 'test2',
            target: new vpcLatticeTarget.Lambda( this, 'test2target', {
              lambda: [
                support.target2,
              ],
            }),
          }),
        },
      ],
      // the conditions for the match are effectively AND'ed together
      httpMatch: {
        pathMatches: { path: '/test2' },
      },
      allowedPrincipals: [
        new iam.Role(this, 'arole', {
          assumedBy: new iam.AnyPrincipal(),
        }),
      ],
      accessMode: RuleAccessMode.AUTHENTICATED_ONLY,
    });

    /**
     * Create a ServiceNetwork.
     * OPINIONATED DEFAULT: The default behavior is to create a
     * service network that requries an IAM policy, and authenticated access
     * ( requestors must send signed requests )
     */

    const serviceNetwork = new ServiceNetwork(this, 'LatticeServiceNetwork', {
      accessmode: ServiceNetworkAccessMode.UNAUTHENTICATED,
      services: [myLatticeService],
      vpcs: [
        support.vpc1,
        support.vpc2,
      ],
    });

    serviceNetwork.applyAuthPolicyToServiceNetwork();
    myLatticeService.applyAuthPolicy();
  }
}
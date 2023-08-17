import * as core from 'aws-cdk-lib';

import {
  aws_iam as iam,
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
  HTTPMethods,
  Listener,
  RuleAccessMode,
  ServiceNetworkAccessMode,
}
  from '../../lib/index';

export class LatticeTestStack extends core.Stack {

  constructor(scope: Construct, id: string, props?: core.StackProps) {
    super(scope, id, props);

    const support = new SupportResources(this, 'supportresources');

    // Create a Lattice Service
    // this will default to using IAM Authentication
    const myLatticeService = new Service(this, 'myLatticeService', {
    });

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

    myListener.addListenerRule({
      name: 'rule1',
      priority: 10,
      action: [
        {
          targetGroup: new TargetGroup(this, 'lambdatargetsHello', {
            name: 'hellotarget',
            target: new vpcLatticeTarget.Lambda( this, 'lambdaTargetHello', {
              lambda: [
                support.helloWorld,
              ],
            }),
          }),
        },
      ],
      // the conditions for the match are effectively AND'ed together
      httpMatch: {
        pathMatches: { path: '/hello' },
        method: HTTPMethods.GET,
      },
      allowedPrincipals: [new iam.AnyPrincipal()],
      accessMode: RuleAccessMode.AUTHENTICATED_ONLY,
    });

    myListener.addListenerRule({
      name: 'rule2',
      priority: 20,
      action: [
        {
          targetGroup: new TargetGroup(this, 'lambdatargetsGoodbye', {
            name: 'goodbyetarget',
            target: new vpcLatticeTarget.Lambda( this, 'lambdaTargetGoodbye', {
              lambda: [
                support.goodbyeWorld,
              ],
            }),
          }),
        },
      ],
      // the conditions for the match are effectively AND'ed together
      httpMatch: {
        pathMatches: { path: '/goodbye' },
        method: HTTPMethods.GET,
      },
      accessMode: RuleAccessMode.UNAUTHENTICATED,

    });

    ;

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
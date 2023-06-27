import {
  aws_vpclattice,
  aws_iam as iam,
  aws_ec2 as ec2,
  aws_ram as ram,
  custom_resources as cr,
}
  from 'aws-cdk-lib';
import * as core from 'aws-cdk-lib';
import * as constructs from 'constructs';
import {
  IService,
  AuthType,
  LoggingDestination,
} from './index';
/**
 * AccesModes
 */
export enum ServiceNetworkAccessMode {
  /**
   * Unauthenticated Access
   */
  UNAUTHENTICATED = 'UNAUTHENTICATED',
  /**
   * Unauthenticated Access
   */
  AUTHENTICATED_ONLY = 'AUTHENTICATED',
  /**
   * THIS Org only
   */
  ORG_ONLY = 'ORG_ONLY',
}

/**
 * Properties to share a Service Network
 */
export interface ShareServiceNetworkProps {
  /**
   * The name of the share.
   */
  readonly name: string;
  /**
   * Are external Principals allowed
   * @default false;
   */
  readonly allowExternalPrincipals?: boolean | undefined
  /**
   * Principals to share the Service Network with
   * @default none
   */
  readonly principals?: string[] | undefined
}
/**
 * Properties to associate a VPC with a Service Network
 */
export interface AssociateVPCProps {
  /**
   * The VPC to associate with the Service Network
   */
  readonly vpc: ec2.IVpc;
  /**
   * The security groups to associate with the Service Network
   * @default a security group that allows inbound 443 will be permitted.
   */
  readonly securityGroups?: ec2.SecurityGroup[] | undefined
}
/**
 * Properties to add a logging Destination
 */

export interface AddloggingDestinationProps{
  /**
   * The logging destination
   */
  readonly destination: LoggingDestination
}

// addService Props
/**
 * Properties to add a Service to a Service Network
 */
export interface AddServiceProps {
  /**
   * The Service to add to the Service Network
   */
  readonly service: IService;
  /**
   * The Service Network to add the Service to
   */
  readonly serviceNetworkId: string;
}

/**
 * Create a vpc lattice service network.
 * Implemented by `ServiceNetwork`.
 */
export interface IServiceNetwork extends core.IResource {

  /**
  * The Amazon Resource Name (ARN) of the service network.
  */
  readonly serviceNetworkArn: string;
  /**
   * The Id of the Service Network
   */
  readonly serviceNetworkId: string;
  /**
   * Is this an imported serviceNetwork
   */
  readonly imported: boolean;
  /**
   * Add Lattice Service
   */
  addService(props: AddServiceProps): void;
  /**
   * Associate a VPC with the Service Network
   */
  associateVPC(props: AssociateVPCProps): void;
}

/**
 * The properties for the ServiceNetwork.
 */
export interface ServiceNetworkProps {

  /** The name of the Service Network. If not provided Cloudformation will provide
   * a name
   * @default cloudformation generated name
   */
  readonly name?: string

  /**
   * The type of  authentication to use with the Service Network
   * @default 'AWS_IAM'
   */
  readonly authType?: AuthType | undefined;

  /**
   * Logging destinations
   * @default: no logging
   */
  readonly loggingDestinations?: LoggingDestination[];

  /**
   * Lattice Services that are assocaited with this Service Network
   * @default no services are associated with the service network
   */
  readonly services?: IService[] | undefined;

  /**
   * Vpcs that are associated with this Service Network
   * @default no vpcs are associated
   */
  readonly vpcs?: ec2.IVpc[] | undefined;
  /**
   * Allow external principals
   * @default false
   */
  readonly accessmode?: ServiceNetworkAccessMode | undefined;
}

abstract class ServiceNetworkBase extends core.Resource implements IServiceNetwork {

  /**
   * THe Arn of the Service Network
   */
  public abstract readonly serviceNetworkArn: string;
  /**
   * The Id of the Service Network
   */
  public abstract readonly serviceNetworkId: string;
  /**
   * Boolean
   */
  public abstract imported: boolean;

  /**
   * Add A lattice service to a lattice network
   */
  public addService(props: AddServiceProps): void {

    new ServiceAssociation(this, `ServiceAssociation${props.service.node.addr}`, {
      service: props.service,
      serviceNetworkId: this.serviceNetworkId,
    });
  }

  /**
   * Associate a VPC with the Service Network
   * This provides an opinionated default of adding a security group to allow inbound 443
   */
  public associateVPC(props: AssociateVPCProps): void {

    new AssociateVpc(this, `AssociateVPC${props.vpc.node.addr}`, {
      vpc: props.vpc,
      securityGroups: props.securityGroups,
      serviceNetworkId: this.serviceNetworkId,
    });
  };
}

/**
 * Create a vpcLattice Service Network.
 */
export class ServiceNetwork extends ServiceNetworkBase {

  /**
   * Import a Service Network by Id
   */
  public static fromId(scope: constructs.Construct, id: string, serviceNetworkId: string ): IServiceNetwork {
    return new ImportedServiceNetwork(scope, id, serviceNetworkId);
  }

  /**
   * The Arn of the service network
   */
  public readonly serviceNetworkArn: string;
  /**
   * The Id of the Service Network
   */
  public readonly serviceNetworkId: string;
  /**
   * imported
   */
  public readonly imported: boolean;
  /**
   * the authType of the service network
   */
  authType: AuthType | undefined;
  /**
   * policy document to be used.
   */
  //authPolicy: iam.PolicyDocument = new iam.PolicyDocument();
  /**
   * A managed Policy that is the auth policy
   */
  authPolicy: iam.PolicyDocument

  constructor(scope: constructs.Construct, id: string, props: ServiceNetworkProps) {
    super(scope, id);

    this.imported = false;
    this.authType = props.authType ?? AuthType.AWS_IAM;

    if (props.name !== undefined) {
      if (props.name.match(/^[a-z0-9\-]{3,63}$/) === null) {
        throw new Error('Theservice network name must be between 3 and 63 characters long. The name can only contain alphanumeric characters and hyphens. The name must be unique to the account.');
      }
    }
    // the opinionated default for the servicenetwork is to use AWS_IAM as the
    // authentication method. Provide 'NONE' to props.authType to disable.

    // Throw an error if authType and access mode are set
    if (props.accessmode && props.authType === AuthType.NONE) {
      throw new Error('AccessMode can not be set if AuthType is NONE');
    }

    const serviceNetwork = new aws_vpclattice.CfnServiceNetwork(this, 'Resource', {
      name: props.name,
      authType: this.authType,
    });

    this.serviceNetworkId = serviceNetwork.attrId;
    this.serviceNetworkArn = serviceNetwork.attrArn;

    if (props.loggingDestinations !== undefined) {
      props.loggingDestinations.forEach((destination) => {
        this.addloggingDestination({
          destination: destination,
        });
      });
    }

    // associate vpcs
    if (props.vpcs !== undefined) {
      props.vpcs.forEach((vpc) => {
        this.associateVPC({ vpc: vpc });
      });
    };

    //associate services
    if (props.services !== undefined) {
      props.services.forEach((service) => {
        this.addService({
          service: service,
          serviceNetworkId: this.serviceNetworkId,
        });
      });
    };

    // create a managedPolicy for the lattice ServiceNetwork.
    this.authPolicy = new iam.PolicyDocument();

    const statement = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['vpc-lattice-svcs:Invoke'],
      resources: ['*'],
      principals: [new iam.StarPrincipal()],
    });

    if (props.accessmode === ServiceNetworkAccessMode.ORG_ONLY) {
      const orgIdCr = new cr.AwsCustomResource(this, 'getOrgId', {
        onCreate: {
          region: 'us-east-1',
          service: 'Organizations',
          action: 'describeOrganization',
          physicalResourceId: cr.PhysicalResourceId.of('orgId'),
        },
        policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
          resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE,
        }),
      });

      const orgId = orgIdCr.getResponseField('Organization.Id');

      // add the condition that requires that the principal is from this org
      statement.addCondition('StringEquals', { 'aws:PrincipalOrgID': [orgId] } );
      statement.addCondition('StringNotEqualsIgnoreCase', { 'aws:PrincipalType': 'Anonymous' } );
    } else if (props.accessmode === ServiceNetworkAccessMode.AUTHENTICATED_ONLY) {
      // add the condition that requires that the principal is authenticated
      statement.addCondition('StringNotEqualsIgnoreCase', { 'aws:PrincipalType': 'Anonymous' } );
    };

    this.authPolicy.addStatements(statement);
  }

  /**
   * This will give the principals access to all resources that are on this
   * service network. This is a broad permission.
   * Consider granting Access at the Service
   * addToResourcePolicy()
   *
   */
  addStatementToAuthPolicy(statement: iam.PolicyStatement): void {

    if (this.imported) {
      throw new Error('It is not possible to add statements to an imported Service Network');
    }

    this.authPolicy.addStatements(statement);
  }

  /**
   * Apply the AuthPolicy to a Service Network
   */
  public applyAuthPolicyToServiceNetwork(): void {

    if (this.imported) {
      throw new Error('It is not possible to apply an AuthPolicy on an imported ServiceNetwork');
    }

    // check to see if there are any errors with the auth policy
    if (this.authPolicy.validateForResourcePolicy().length > 0) {
      throw new Error(`Auth Policy for granting access on  Service Network is invalid\n, ${this.authPolicy}`);
    }
    // check to see if the AuthType is AWS_IAM
    if (this.authType !== AuthType.AWS_IAM ) {
      throw new Error(`AuthType must be ${AuthType.AWS_IAM} to add an Auth Policy`);
    }

    // attach the AuthPolicy to the Service Network
    new aws_vpclattice.CfnAuthPolicy(this, 'AuthPolicy', {
      policy: this.authPolicy.toJSON(),
      resourceIdentifier: this.serviceNetworkArn,
    });

  }

  /**
   * send logs to a destination
   */
  public addloggingDestination(props: AddloggingDestinationProps): void {

    if (this.imported) {
      throw new Error('It is not possible to add a logging destination to an imported Service Network');
    }

    new aws_vpclattice.CfnAccessLogSubscription(this, `AccessLogSubscription${props.destination.addr}`, {
      destinationArn: props.destination.arn,
      resourceIdentifier: this.serviceNetworkId,
    });
  };

  /**
   * Share the The Service network using RAM
   * @param props ShareServiceNetwork
   */
  public share(props: ShareServiceNetworkProps): void {

    if (this.imported) {
      throw new Error('It is not possible to share an imported Service Network');
    }

    new ram.CfnResourceShare(this, 'ServiceNetworkShare', {
      name: props.name,
      resourceArns: [this.serviceNetworkArn],
      allowExternalPrincipals: props.allowExternalPrincipals,
      principals: props.principals,
    });
  }

}

/**
 * Import an Exisiting ServiceNetwork by Id
 */
class ImportedServiceNetwork extends ServiceNetworkBase {
  /**
   * The Id of the serviceNetwork
   */
  public readonly serviceNetworkId: string;
  /**
   * The Arn of the serviceNetwork
   */
  public readonly serviceNetworkArn: string;
  /**
   * is this an imported ServiceNetwork
   */
  public readonly imported: boolean = true;

  constructor(scope: constructs.Construct, id: string, serviceNetworkId: string) {
    super(scope, id);

    this.serviceNetworkId = serviceNetworkId;
    this.serviceNetworkArn = `arn:${core.Aws.PARTITION}:vpc-lattice:${core.Aws.REGION}:${core.Aws.ACCOUNT_ID}:servicenetwork/${serviceNetworkId}`;
  }
}

/**
 * Props to Associate a VPC with a Service Network
 */
export interface AssociateVpcProps {
  /**
   * security groups for the lattice endpoint
   * @default a security group that will permit inbound 443
   */
  readonly securityGroups?: ec2.ISecurityGroup[],
  /**
   * The VPC to associate with
   */
  readonly vpc: ec2.IVpc,
  /**
   * Service Network Identifier
   */
  readonly serviceNetworkId: string,
}
/**
 * Associate a VPO with Lattice Service Network
 */
export class AssociateVpc extends core.Resource {

  constructor(scope: constructs.Construct, id: string, props: AssociateVpcProps) {
    super(scope, id);

    const securityGroupIds: string[] = [];

    if (props.securityGroups === undefined) {
      const securityGroup = new ec2.SecurityGroup(this, `ServiceNetworkSecurityGroup${this.node.addr}`, {
        vpc: props.vpc,
        allowAllOutbound: true,
        description: 'ServiceNetworkSecurityGroup',
      });

      securityGroup.addIngressRule(
        ec2.Peer.ipv4(props.vpc.vpcCidrBlock),
        ec2.Port.tcp(443),
      );
      securityGroupIds.push(securityGroup.securityGroupId);
    }

    new aws_vpclattice.CfnServiceNetworkVpcAssociation(this, `VpcAssociation${this.node.addr}`, {
      securityGroupIds: securityGroupIds,
      serviceNetworkIdentifier: props.serviceNetworkId,
      vpcIdentifier: props.vpc.vpcId,
    });
  };
};

/**
 * Props for Service Assocaition
 */
export interface ServiceAssociationProps {
  /**
   * lattice Service
   */
  readonly service: IService;
  /**
   * Lattice ServiceId
   */
  readonly serviceNetworkId: string;
}

/**
 * Creates an Association Between a Lattice Service and a Service Network
 */
export class ServiceAssociation extends core.Resource {

  constructor(scope: constructs.Construct, id: string, props: ServiceAssociationProps) {
    super(scope, id);

    new aws_vpclattice.CfnServiceNetworkServiceAssociation(this, `LatticeService${this.node.addr}`, {
      serviceIdentifier: props.service.serviceId,
      serviceNetworkIdentifier: props.serviceNetworkId,
    });
  };
};
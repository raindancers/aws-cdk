import * as core from 'aws-cdk-lib';
import {
  aws_vpclattice,
  aws_iam as iam,
  aws_certificatemanager as certificatemanager,
  aws_ram as ram,
  custom_resources as cr,
  aws_route53 as r53,
}
  from 'aws-cdk-lib';
import * as constructs from 'constructs';
import {
  IListener,
  IServiceNetwork,
  IAuthorizer,
  AuthorizerMode,
}
  from './index';

/**
 * Properties to Share the Service
 */
export interface ShareServiceProps {
  /**
   * The name of the service
   */
  readonly name: string;
  /**
   * Allow External Principals
   * @default false
   */
  readonly allowExternalPrincipals?: boolean | undefined;
  /**
   * Principals to share the service with.
   * TO DO, this needs some work
   * @default none
   */
  readonly accounts: string[] | undefined;
}

/**
 * Create a vpcLattice service network.
 * Implemented by `Service`.
 */
export interface IService extends core.IResource {
  /**
   * The Id of the Service
   */
  readonly serviceId: string;
  /**
   * The Arn of the Service
   */
  readonly serviceArn: string;
  /**
   * the discovered OrgId
   */
  readonly orgId: string | undefined;
  /**
   * Imported
   */
  readonly imported: boolean;
  /**
   * The authType of the service.
   */
  readonly authorization: IAuthorizer | undefined;
  /**
   * A certificate that may be used by the service
   */
  certificate: certificatemanager.Certificate | undefined;
  /**
   * A custom Domain used by the service
   */
  customDomain: string | undefined;
  /**
  * A name for the service
  */
  name: string | undefined;
  /**
   * The auth Policy for the service.
   */
  authPolicy: iam.PolicyDocument;

  /**
  * associate the service with a servicenetwork.
  */
  associateWithServiceNetwork(serviceNetwork: IServiceNetwork): void;
  /**
   * apply an authpolicy to the servicenetwork
   */
  applyAuthPolicy(): iam.PolicyDocument;
}

/**
 * Properties for a Lattice Service
 */
export interface ServiceProps {

  /**
   * Name for the service
   * @default cloudformation will provide a name
   */
  readonly name?: string | undefined;

  /**
   * The authType of the Service
   * @default 'AWS_IAM'
   */
  readonly authorization?: IAuthorizer | undefined;

  /**
   * Listeners that will be attached to the service
   * @default no listeners
  */
  readonly listeners?: IListener[] | undefined;

  /**
   * A certificate that may be used by the service
   * @default no custom certificate is used
   */
  readonly certificate?: certificatemanager.Certificate | undefined;
  /**
   * A customDomain used by the service
   * @default no customdomain is used
   */
  readonly customDomain?: string | undefined;
  /**
   * A custom hosname
   * @default no hostname is used
   */
  readonly hostedZone?: r53.IHostedZone | undefined;

  /**
   * Share Service
   *@default no sharing of the service
   */
  readonly shares?: ShareServiceProps[] | undefined;
  /**
   * ServiceNetwork to associate with.
   * @default will not assocaite with any serviceNetwork.
   */
  readonly serviceNetwork?: IServiceNetwork | undefined;
}

abstract class ServiceBase extends core.Resource implements IService {
  /**
  * The Arn of the Service
  */
  public abstract readonly serviceArn: string;
  /**
  * The Arn of the Service
  */
  public abstract readonly serviceId: string;
  /**
   * Imported
   */
  public abstract readonly imported: boolean;
  /**
   * the discovered OrgId
   */
  readonly orgId: string | undefined;
  /**
   * The authType of the service.
   */
  readonly authorization: IAuthorizer | undefined;
  /**
   * A certificate that may be used by the service
   */
  certificate: certificatemanager.Certificate | undefined;
  /**
   * A custom Domain used by the service
   */
  customDomain: string | undefined;
  /**
  * A name for the service
  */
  name: string | undefined;
  /**
   * The auth Policy for the service.
   */
  /**
   * The auth Policy for the service.
   */
  authPolicy: iam.PolicyDocument = new iam.PolicyDocument();

  public associateWithServiceNetwork(serviceNetwork: IServiceNetwork): void {
    new ServiceNetworkAssociation(this, `ServiceAssociation${serviceNetwork.serviceNetworkId}`, {
      serviceNetwork: serviceNetwork,
      serviceId: this.serviceId,
    });
  }

  public applyAuthPolicy(): iam.PolicyDocument {

    if (this.imported) {
      throw new Error('Can not apply a policy to a service that is imported.');
    }

    if (this.authorization) {
      if (this.authorization.type === AuthorizerMode.NONE) {
        throw new Error('Can not apply a policy when authType is NONE');
      }
    };

    if (this.authPolicy.validateForResourcePolicy().length > 0) {
      throw new Error(
        `The following errors were found in the policy: \n${this.authPolicy.validateForResourcePolicy()} \n ${this.authPolicy}`);
    }

    // interate over all statements and add conditons.

    new aws_vpclattice.CfnAuthPolicy(this, 'ServiceAuthPolicy', {
      policy: this.authPolicy.toJSON(),
      resourceIdentifier: this.serviceId,
    });

    return this.authPolicy;
  }
}

/**
 * Create a vpcLattice Service
 */
export class Service extends core.Resource implements IService {

  /**
  * import a service from Id
  */
  public static fromServiceId(scope: constructs.Construct, id: string, serviceId: string): IService {
    return new ImportedService(scope, id, serviceId);
  }
  /**
   * The Id of the Service
   */
  readonly serviceId: string;
  /**
   * The Arn of the Service
   */
  readonly serviceArn: string;
  /**
   * the discovered OrgId
   */
  readonly orgId: string | undefined;
  /**
   * Imported
   */
  readonly imported: boolean;
  /**
   * The authType of the service.
   */
  readonly authorization: IAuthorizer | undefined;
  /**
   * A certificate that may be used by the service
   */
  certificate: certificatemanager.Certificate | undefined;
  /**
   * A custom Domain used by the service
   */
  customDomain: string | undefined;
  /**
   * A DNS Entry for the service
   */
  hostedZone: r53.IHostedZone | undefined;
  /**
  * A name for the service
  */
  name: string | undefined;
  /**
   * The auth Policy for the service.
   */
  authPolicy: iam.PolicyDocument;

  constructor(scope: constructs.Construct, id: string, props: ServiceProps) {
    super(scope, id);

    this.name = props.name;
    this.authPolicy = new iam.PolicyDocument();
    this.imported = false;

    if (props.name !== undefined) {
      if (props.name.match(/^[a-z0-9\-]{3,63}$/) === null) {
        throw new Error('The service  name must be between 3 and 63 characters long. The name can only contain alphanumeric characters and hyphens. The name must be unique to the account.');
      }
    }

    let dnsEntry: aws_vpclattice.CfnService.DnsEntryProperty | undefined = undefined;
    if (props.hostedZone) {
      dnsEntry = {
        domainName: props.hostedZone.zoneName,
        hostedZoneId: props.hostedZone.hostedZoneId,
      };
    }

    const service = new aws_vpclattice.CfnService(this, 'Resource', {
      authType: props.authorization?.type ?? 'AWS_IAM',
      certificateArn: this.certificate?.certificateArn,
      customDomainName: this.customDomain,
      dnsEntry: dnsEntry,
      name: this.name,
    });

    // associate with serviceNetwork
    if (props.serviceNetwork !== undefined) {
      this.associateWithServiceNetwork(props.serviceNetwork);
    };

    this.serviceId = service.attrId;
    this.serviceArn = service.attrArn;

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

    this.orgId = orgIdCr.getResponseField('Organization.Id');
  }

  /**
   * .grantAccess on a lattice service, will permit the principals to
   * access all of the service. Consider using more granual permissions
   * at the rule level.
   *
   * @param principals
   */
  public grantAccess(principals: iam.IPrincipal[]): void {

    if (this.imported) {
      throw new Error('Can not grant access to a service that is imported.');
    }

    let policyStatement: iam.PolicyStatement = new iam.PolicyStatement();

    principals.forEach((principal) => {
      policyStatement.addPrincipals(principal);
    });
    policyStatement.addActions('vpc-lattice-svcs:Invoke');
    policyStatement.addResources('*');
    policyStatement.effect = iam.Effect.ALLOW;

    this.authPolicy.addStatements(policyStatement);

  }
  /**
  * apply an authpolicy
  */
  public applyAuthPolicy(): iam.PolicyDocument {

    if (this.imported) {
      throw new Error('Can not apply a policy to a service that is imported.');
    }

    if (this.authorization?.type === AuthorizerMode.NONE) {
      throw new Error('Can not apply a policy when authType is NONE');
    }

    if (this.authPolicy.validateForResourcePolicy().length > 0) {
      throw new Error(
        `The following errors were found in the policy: \n${this.authPolicy.validateForResourcePolicy()} \n ${this.authPolicy}`);
    }

    // interate over all statements and add conditons.

    new aws_vpclattice.CfnAuthPolicy(this, 'ServiceAuthPolicy', {
      policy: this.authPolicy.toJSON(),
      resourceIdentifier: this.serviceId,
    });

    return this.authPolicy;
  }
  /**
   * Add a PolicyStatement
   *
   */
  public addPolicyStatement(statement: iam.PolicyStatement): void {
    if (this.imported) {
      throw new Error('Can not add a policy statement to a service that is imported.');
    }
    this.authPolicy.addStatements(statement);
  }

  /**
   * Share the service to other accounts via RAM
   */
  public shareToAccounts(props: ShareServiceProps): void {

    if (this.imported) {
      throw new Error('Can not share a service that is imported.');
    }
    // create a ram resource share for the service.
    new ram.CfnResourceShare(this, 'ServiceNetworkShare', {
      name: props.name,
      resourceArns: [this.serviceArn],
      allowExternalPrincipals: props.allowExternalPrincipals,
      principals: props.accounts,
    });
  }
  /**
   * Associate with a Service Network
   */
  public associateWithServiceNetwork(serviceNetwork: IServiceNetwork): void {
    new ServiceNetworkAssociation(this, 'ServiceNetworkAssociation', {
      serviceNetwork: serviceNetwork,
      serviceId: this.serviceId,
    });
  }
}

/**
 * Import a Lattice Service
 */
class ImportedService extends ServiceBase {

  /**
   * ServiceId
   */
  public readonly serviceId: string;
  /**
   *  ServiceArn
   */
  public readonly serviceArn: string;
  /**
   * Import
   */
  public readonly imported: boolean = true;

  constructor(scope: constructs.Construct, id: string, serviceId: string) {
    super(scope, id);

    this.serviceId = serviceId;
    this.serviceArn = `arn:${core.Aws.PARTITION}:vpc-lattice:${core.Aws.REGION}:${core.Aws.ACCOUNT_ID}:service/${serviceId}`;
  };
}

/**
 * Props for Service Assocaition
 */
export interface ServiceNetworkAssociationProps {
  /**
   * lattice Service
   */
  readonly serviceNetwork: IServiceNetwork;
  /**
   * Lattice ServiceId
   */
  readonly serviceId: string;
}

/**
 * Creates an Association Between a Lattice Service and a Service Network
 * consider using .associateWithServiceNetwork
 */
export class ServiceNetworkAssociation extends core.Resource {

  constructor(scope: constructs.Construct, id: string, props: ServiceNetworkAssociationProps) {
    super(scope, id);

    new aws_vpclattice.CfnServiceNetworkServiceAssociation(this, `LatticeService${this.node.addr}`, {
      serviceIdentifier: props.serviceId,
      serviceNetworkIdentifier: props.serviceNetwork.serviceNetworkId,
    });
  };
};

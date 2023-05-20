import * as core from 'aws-cdk-lib';
import {
  aws_vpclattice,
  aws_iam as iam,
  aws_certificatemanager as certificatemanager,
  aws_ram as ram,
}
  from 'aws-cdk-lib';
import * as constructs from 'constructs';
import * as vpclattice from './index';

/**
 * Create a vpcLattice service network.
 * Implemented by `Service`.
 */
export interface IService extends core.IResource {
  /**
  * The Amazon Resource Name (ARN) of the service.
  */
  readonly serviceArn: string;
  /**
  * The Id of the Service Network
  */
  readonly serviceId: string;

  /**
   * Add An Authentication Policy to the Service.
   * @param policyStatement[];
   */
  addLatticeAuthPolicy(policyStatement: iam.PolicyStatement[]): iam.PolicyDocument;
  /**
   * Add A vpc listener to the Service.
   * @param props
   */
  addListener(props: vpclattice.ListenerProps): vpclattice.Listener;
  /**
   * Share the service to other accounts via RAM
   * @param props
   */
  share(props: ShareServiceProps): void;

  /**
  * Create a DNS entry in R53 for the service.
  */
  addDNSEntry(props: aws_vpclattice.CfnService.DnsEntryProperty): void;

  /**
   * Add a certificate to the service
   * @param certificate
   */
  addCertificate(certificate: certificatemanager.Certificate): void;

  /**
   * add a custom domain to the service
   * @param domain
   */
  addCustomDomain(domain: string): void;

  /**
   * add a name for the service
   * @default cloudformation will provide a name
   */
  addName(name: string): void;
  /**
   * add Tags to the service
   * @deafult
   */

}

export interface ShareServiceProps {
  name: string;
  allowExternalPrincipals?: boolean | undefined
  principals?: string[] | undefined
}

export interface LatticeServiceProps {
  /**
   * Name for the service
   */
  readonly name?: string | undefined
}

/**
 * Create a vpcLattice Service
 */
export class Service extends core.Resource implements IService {

  serviceId: string
  serviceArn: string
  authType: vpclattice.AuthType | undefined;
  certificate: certificatemanager.Certificate | undefined;
  customDomain: string | undefined;
  dnsEntry: aws_vpclattice.CfnService.DnsEntryProperty | undefined;
  name: string | undefined;

  constructor(scope: constructs.Construct, id: string, props: LatticeServiceProps) {
    super(scope, id);

    this.name = props.name;

    const service = new aws_vpclattice.CfnService(this, 'Resource', {
      authType: this.authType ?? vpclattice.AuthType.NONE,
      certificateArn: this.certificate?.certificateArn,
      customDomainName: this.customDomain,
      dnsEntry: this.dnsEntry,
      name: this.name,
    });

    this.serviceId = service.attrId;
    this.serviceArn = service.attrArn;
  }

  /**
   * add an IAM policy to the service network. statements should only
   * contain a single action 'vpc-lattice-svcs:Invoke' and a single resource
   * which is the service network ARN. The policy statements resource and action
   * are optional. If they are not provided, the correct values will be set.
   *
   * @param policyStatements
   */
  public addLatticeAuthPolicy(policyStatements: iam.PolicyStatement[]): iam.PolicyDocument {

    let policyDocument: iam.PolicyDocument = new iam.PolicyDocument();

    // create the policy document and validdate the action
    const validAction = ['vpc-lattice-svcs:Invoke'];
    const validResources = [this.serviceArn];

    policyStatements.forEach((statement) => {
      if (statement.actions === undefined) {
        statement.addActions('vpc-lattice-svcs:Invoke');
      }
      if (statement.resources === undefined) {
        statement.addResources(this.serviceArn);
      }
      policyDocument.addStatements(statement);

      if (statement.actions !== validAction) {
        throw new Error('The actions for the policy statement are invalid, They must only be [\'vpc-lattice-svcs:Invoke\']');
      }
      if (statement.resources !== validResources) {
        throw new Error('The resources for the policy statement are invalid, They must only be [\'' + this.serviceArn + '\']');
      }
    });

    if (policyDocument.validateForResourcePolicy().length > 0) {
      throw new Error('policyDocument.validateForResourcePolicy() failed');
    }

    this.authType = vpclattice.AuthType.IAM;

    new aws_vpclattice.CfnAuthPolicy(this, 'AuthPolicy', {
      policy: policyDocument.toJSON(),
      resourceIdentifier: this.serviceId,
    });

    return policyDocument;
  }

  /**
   * Provide an ACM certificate to the service
   * @param certificate
   */
  public addCertificate(certificate: core.aws_certificatemanager.Certificate): void {
    this.certificate = certificate;
  }

  /**
   * Add a name to the Service
   * @param name
   */
  public addName(name: string): void {

    // TODO:validate the name is ok
    this.name = name;
  }

  public addCustomDomain(domain: string): void {

    // TODO:validate the domain is ok
    this.customDomain = domain;
  }

  public addDNSEntry(dnsEntry: aws_vpclattice.CfnService.DnsEntryProperty): void {

    this.dnsEntry = dnsEntry;
  }

  public addListener(props: vpclattice.ListenerProps): vpclattice.Listener {

    // check the the port is in range if it is specificed
    if (props.port) {
      if (props.port < 0 || props.port > 65535) {
        throw new Error('Port out of range');
      }
    }

    // default to using HTTPS
    let protocol = props.protocol ?? vpclattice.Protocol.HTTPS;

    // if its not specified, set it to the default port based on the protcol
    let port: number;
    switch (protocol) {
      case vpclattice.Protocol.HTTP:
        port = props.port ?? 80;
        break;
      case vpclattice.Protocol.HTTPS:
        port = props.port ?? 443;
        break;
      default:
        throw new Error('Protocol not supported');
    }

    let defaultAction: aws_vpclattice.CfnListener.DefaultActionProperty = {};
    // the default action is a not found
    if (props.defaultAction === undefined) {
      defaultAction = {
        fixedResponse: {
          statusCode: vpclattice.FixedResponse.NOT_FOUND,
        },
      };
    }

    const listener = new vpclattice.Listener(this, `Listener-${props.name}`, {
      defaultAction: defaultAction,
      protocol: protocol,
      port: port,
      serviceIdentifier: this.serviceId,
      name: props.name,
    });

    return listener;
  }

  public share(props: ShareServiceProps): void {

    new ram.CfnResourceShare(this, 'ServiceNetworkShare', {
      name: props.name,
      resourceArns: [this.serviceArn],
      allowExternalPrincipals: props.allowExternalPrincipals,
      principals: props.principals,
    });
	  }
}


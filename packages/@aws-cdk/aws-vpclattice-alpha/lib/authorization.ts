/**
 * Authorization Types for VPC Lattice. The class type Enum is used to allow
 * for the creation of other authentication methods easily in the future.
 */
export enum AuthorizerMode {
  /**
   * No Authorization is used for Lattice Requests
   */
  NONE = 'NONE',
  /**
   * IAM Policys are used for Lattice Requests.
   */
  AWS_IAM = 'AWS_IAM'
}

/**
 * Authorizer Interface.
*/
export interface IAuthorizer {
  /**
   * Authorizer Mode
   */
  readonly type: AuthorizerMode;
}

/**
 * Authorization Type for Lattice.
 */
export abstract class Authorizer implements IAuthorizer {

  /**
   * Use IAM Policy for Authorization
   */
  public static iam(): IAuthorizer {
    return {
      type: AuthorizerMode.AWS_IAM,
    };
  }
  /**
   * Use no Authorization for Lattice Requests
   */
  public static none(): IAuthorizer {
    return {
      type: AuthorizerMode.NONE,
    };
  }
  /**
   * THe AuthMode TYpe
   */
  public abstract readonly type: AuthorizerMode;

  protected constructor() {};
}
import * as core from 'aws-cdk-lib';

import {
  Service,
  ServiceNetwork,
  Listener,
  ServiceNetworkAccessMode,
  Protocol,
  Authorizer,
}
  from '../lib/index';

describe('Lattice  Service Input Checking', () => {
  let stack: core.Stack;
  beforeEach(() => {
    // try to factor out as much boilerplate test setup to before methods -
    // makes the tests much more readable
    stack = new core.Stack();
  });

  describe('Bad Service Name', () => {
    test('throws error on badly formed name', () => {
      expect(() => {
        new Service(stack, 'Service', {
          name: 'BadServiceName', // has caps
        });
      }).toThrowError('The service  name must be between 3 and 63 characters long. The name can only contain alphanumeric characters and hyphens. The name must be unique to the account.');
    });
  });

});

describe('Listener Errors', () => {
  let stack: core.Stack;
  let service: Service;
  beforeEach(() => {
    // try to factor out as much boilerplate test setup to before methods -
    // makes the tests much more readable
    stack = new core.Stack();
    service = new Service(stack, 'Service', {});

  });

  describe('Bad Port Range', () => {
    test('throws error on out of range port', () => {
      expect(() => {
        new Listener(stack, 'Listener', {
          protocol: Protocol.HTTPS,
          port: -1,
          service: service,
        });
      }).toThrowError('Port out of range');
    });
  });

  // service network bad iputs
  describe('Bad Name', () => {
    test('Name does match regex', () => {
      expect(() => {
        new ServiceNetwork(stack, 'ServiceNetwork', {
          name: 'BADNAME',
        });
      }).toThrowError('Theservice network name must be between 3 and 63 characters long. The name can only contain alphanumeric characters and hyphens. The name must be unique to the account.');
    });
  });

  // service network bad iputs
  describe('Setting bad combination of Props', () => {
    test('AuthType NONE and AccessMode UNAUTHENTICATED', () => {
      expect(() => {
        new ServiceNetwork(stack, 'ServiceNetwork', {
          authorization: Authorizer.none(),
          accessmode: ServiceNetworkAccessMode.UNAUTHENTICATED,
        });
      }).toThrowError('AccessMode can not be set if AuthType is NONE');
    });
  });

  // service network bad iputs
  describe('Bad Name for Listener', () => {
    test('Bad Name not matching regex', () => {
      expect(() => {
        new Listener(stack, 'Listener2', {
          name: 'BADNAME',
          service: new Service(stack, 'Service2', {}),
        });
      }).toThrowError('The listener name must be between 3 and 63 characters long. The name can only contain  lower case alphanumeric characters and hyphens. The name must be unique to the account.');
    });
  });

});


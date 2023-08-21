import requests 
from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest
from botocore.credentials import Credentials
import botocore.session
import os
import logging


def lambda_handler(payload, context):

    print(payload)


    data = "some data that is not important"

    # https://docs.aws.amazon.com/vpc-lattice/latest/ug/sigv4-authenticated-requests.html#sigv4-authenticated-requests-python0

    session = botocore.session.Session()
    region = os.environ.get('AWS_REGION')

    request = AWSRequest(
        method='POST',
        url=payload["url"],
        data= data,
        headers= {'Content-Type': 'application/json'},
    )
    request.context["payload_signing_enabled"] = False # payload signing is not supported

    # create a Signature and add it to the the request
    sigv4 = SigV4Auth(session.get_credentials(), 'vpc-lattice-svcs', region).add_auth(request)
    # add the signature to the request
    
    prepped = request.prepare()
    
    try:
        response = requests.post(prepped.url, headers=prepped.headers, data=data)
    except Exception as e:
        print('reponse Failed:', e)

        return {
            "statusCode": 500,
            "statusDescription": "Lambda could ",
            "body": "Server error - check lambda logs\n"
        }
    
    print(response)

    return {
        "StatusCode": response.status_code,
    }

    
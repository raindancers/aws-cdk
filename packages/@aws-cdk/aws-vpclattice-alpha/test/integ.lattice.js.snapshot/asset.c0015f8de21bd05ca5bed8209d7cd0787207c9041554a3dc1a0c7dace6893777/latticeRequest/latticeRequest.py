import requests 
from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest
from botocore.credentials import Credentials
import botocore.session
import os
import logging


def lambda_handler(payload, context):

    print(payload)


    data = "some-data-here"

    # https://docs.aws.amazon.com/vpc-lattice/latest/ug/sigv4-authenticated-requests.html#sigv4-authenticated-requests-python0

    session = botocore.session.Session()
    sigv4 = SigV4Auth(session.get_credentials(), 'vpc-lattice-svcs', 'ap-southeast-2')
    
    request = AWSRequest(
        method='POST',
        url=payload["url"],
        data= data,
        headers= {'Content-Type': 'application/json'},
    )
    request.context["payload_signing_enabled"] = False # payload signing is not supported
    sigv4.add_auth(request)
    
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

    
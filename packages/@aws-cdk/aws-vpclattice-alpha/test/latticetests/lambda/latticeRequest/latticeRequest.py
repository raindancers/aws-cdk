import requests 
from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest
from botocore.credentials import Credentials
import botocore.session
import os
import logging


def lambda_handler(event, context):

    payload = event


    log = logging.getLogger("handler")
    log.setLevel(logging.INFO)

    # https://docs.aws.amazon.com/vpc-lattice/latest/ug/sigv4-authenticated-requests.html#sigv4-authenticated-requests-python0

    session = botocore.session.Session()
    region = os.environ.get('AWS_REGION')


    request = AWSRequest(
        method='POST',
        url=payload["url"],
        data= "data-that-is-not-important",
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
        log.error("Request Failed")
        log.info(e)
        
        return {
            "statusCode": 500,
            "statusDescription": "Lambda could ",
            "body": "Server error - check lambda logs\n"
        }
    
    log.info(response.text)

    # this returns the code from the lattice response. In some respects
    # this lambda is proxying the request from the integ-tests
    return {
        "statusCode": 200,
        "statusDescription": "200 OK",
        "body": f"{response.status_code}",
    }

    
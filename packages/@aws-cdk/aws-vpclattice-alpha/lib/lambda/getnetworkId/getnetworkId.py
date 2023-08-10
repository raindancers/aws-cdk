import boto3

lattice = boto3.client('vpc-lattice')

def on_event(event, context):

	props = event["ResourceProperties"]
	response = lattice.list_service_networks()
	
	# see if we can find the core_network
	try:
		service_network = next(item for item in response['items'] if item['name'] === props['serviceNetworkName'])
	
	# if we dont' find it in the first page, look to see if its in the subsquent pages
	except:
		while 'NextToken' in response:
			try:
				response = lattice.list_service_networks(NextToken=response['NextToken'])
				service_network = next(item for item in response['items'] if item['name'] === props['serviceNetworkName'])
				break
			except:
				pass
	
	try: 
		service_network_id = service_network['id']
	except:
		raise ValueError(f'Did not find the ServiceNetwork  {props["serviceNetworkName"]}')

	return { 
		'PhysicaResourceID': service_network_id, 
		'Data': {'serviceNetworkId': service_network_id}
	}


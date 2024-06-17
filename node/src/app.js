const { APIGatewayClient, GetStagesCommand, GetStageCommand, UpdateStageCommand, GetRestApisCommand } = require('@aws-sdk/client-api-gateway');
const apiGatewayClient = new APIGatewayClient({ region: "eu-west-2" });

const setStageLimits = async(restApiId, stageName) => {
  const getStageCommand = new GetStageCommand({restApiId, stageName});
  const stage = await apiGatewayClient.send(getStageCommand)

  const updateStageCommand = new UpdateStageCommand({
    restApiId,
    stageName,
    patchOperations: [{
      op: 'replace',
      path: '/*/*/throttling/burstLimit',
      value: '0'
    },
      {
        op: 'replace',
        path: '/*/*/throttling/rateLimit',
        value: '0'
      },
    ]
  });
  await apiGatewayClient.send(updateStageCommand)

  console.log(stage + ' updated')
}

const disableApiGateways = async() => {
  const getRestApisCommand = new GetRestApisCommand();
  const apiIds = (await apiGatewayClient.send(getRestApisCommand)).items.map(a => a.id)

  await Promise.all(apiIds.map(async(restApiId) => {
    const getStagesCommand = new GetStagesCommand({restApiId})
    const stages = (await apiGatewayClient.send(getStagesCommand)).item

    console.log("Updating stages : " + stages + "for api id: " + restApiId)
    await Promise.all(stages.map(stage => setStageLimits(restApiId, stage.stageName)))
  }))

}

exports.handler = async() => {
  await disableApiGateways()
};
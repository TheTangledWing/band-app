import os

import aws_cdk as cdk
from aws_cdk import (
    aws_apigateway as apigw,
    aws_cognito as cognito,
    aws_dynamodb as dynamodb,
    aws_iam as iam,
    aws_lambda as _lambda,
    aws_logs as logs,
    aws_ssm as ssm,
)
from constructs import Construct


class BandmanagerApiStack(cdk.Stack):
    def __init__(self, scope: Construct, construct_id: str, config, **kwargs):
        super().__init__(scope, construct_id, **kwargs)

        user_pool_id = ssm.StringParameter.value_from_lookup(
            self, f"/identity/{config.stage}/user-pool-id"
        )
        user_pool_arn = ssm.StringParameter.value_from_lookup(
            self, f"/identity/{config.stage}/user-pool-arn"
        )
        hosting_url = ssm.StringParameter.value_from_lookup(
            self, f"/hosting/{config.stage}/url"
        )

        table = dynamodb.Table(
            self,
            "AppTable",
            table_name=f"{config.resource_prefix}-app",
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            partition_key=dynamodb.Attribute(name="PK", type=dynamodb.AttributeType.STRING),
            sort_key=dynamodb.Attribute(name="SK", type=dynamodb.AttributeType.STRING),
            removal_policy=cdk.RemovalPolicy.DESTROY,
        )
        table.add_global_secondary_index(
            index_name="GSI1",
            partition_key=dynamodb.Attribute(name="GSI1PK", type=dynamodb.AttributeType.STRING),
            sort_key=dynamodb.Attribute(name="GSI1SK", type=dynamodb.AttributeType.STRING),
            projection_type=dynamodb.ProjectionType.ALL,
        )

        api_layer = _lambda.LayerVersion(
            self,
            "ApiLayer",
            layer_version_name=f"{config.resource_prefix}-api-deps",
            code=_lambda.Code.from_asset(os.path.join(os.path.dirname(__file__), "..", "layers", "api")),
            compatible_runtimes=[_lambda.Runtime.PYTHON_3_12],
            description="Bandmanager API dependencies: FastAPI, Mangum, Pydantic",
        )

        api_function = _lambda.Function(
            self,
            "ApiFunction",
            function_name=f"{config.resource_prefix}-api",
            runtime=_lambda.Runtime.PYTHON_3_12,
            handler="app.handler",
            code=_lambda.Code.from_asset(os.path.join(os.path.dirname(__file__), "..", "lambda_api")),
            environment={
                "APP_TABLE_NAME": table.table_name,
                "APP_BASE_URL": hosting_url,
                "CORS_ORIGINS": f"{hosting_url},http://localhost:5173,http://127.0.0.1:5173",
                "LOG_LEVEL": "INFO",
            },
            layers=[api_layer],
            memory_size=256,
            timeout=cdk.Duration.seconds(30),
            log_retention=logs.RetentionDays.ONE_WEEK,
        )
        table.grant_read_write_data(api_function)

        imported_pool = cognito.UserPool.from_user_pool_id(self, "UserPool", user_pool_id)
        authorizer = apigw.CognitoUserPoolsAuthorizer(
            self,
            "CognitoAuthorizer",
            authorizer_name=f"{config.resource_prefix}-cognito-auth",
            cognito_user_pools=[imported_pool],
        )

        api = apigw.RestApi(
            self,
            "RestApi",
            rest_api_name=f"{config.resource_prefix}-api",
            endpoint_types=[apigw.EndpointType.REGIONAL],
            deploy_options=apigw.StageOptions(
                stage_name=config.stage,
                throttling_rate_limit=100,
                throttling_burst_limit=200,
            ),
            default_cors_preflight_options=apigw.CorsOptions(
                allow_origins=[
                    hosting_url,
                    "http://localhost:5173",
                    "http://127.0.0.1:5173",
                ],
                allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
                allow_headers=["Content-Type", "Authorization", "x-correlation-id"],
            ),
        )

        integration = apigw.LambdaIntegration(api_function)
        root_proxy = api.root.add_resource("{proxy+}")
        method_options = {
            "authorizer": authorizer,
            "authorization_type": apigw.AuthorizationType.COGNITO,
        }
        api.root.add_method("ANY", integration, **method_options)
        root_proxy.add_method("ANY", integration, **method_options)

        ssm.StringParameter(
            self,
            "ApiUrlParam",
            parameter_name=f"/bandmanager/{config.stage}/api-url",
            string_value=api.url,
        )
        ssm.StringParameter(
            self,
            "TableNameParam",
            parameter_name=f"/bandmanager/{config.stage}/app-table-name",
            string_value=table.table_name,
        )

        api_function.add_to_role_policy(
            iam.PolicyStatement(
                actions=["cognito-idp:AdminGetUser"],
                resources=[user_pool_arn],
            )
        )

        cdk.CfnOutput(self, "ApiUrl", value=api.url)
        cdk.CfnOutput(self, "TableName", value=table.table_name)

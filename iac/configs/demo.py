import os

from .base import ProjectConfig


DEPLOY_ENV = "demo"
CDK_DEPLOY_ACCOUNT = (
    os.environ.get("CDK_DEPLOY_ACCOUNT") or os.environ["CDK_DEFAULT_ACCOUNT"]
)
CDK_DEPLOY_REGION = (
    os.environ.get("CDK_DEPLOY_REGION") or os.environ["CDK_DEFAULT_REGION"]
)

DEPLOY_PROJECT_CONFIG = ProjectConfig(
    environment=DEPLOY_ENV,
    project=os.environ.get("PROJECT", "eodhrc"),
    cdk_deploy_account=CDK_DEPLOY_ACCOUNT,
    cdk_deploy_region=CDK_DEPLOY_REGION,
)

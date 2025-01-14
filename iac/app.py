#!/usr/bin/env python3
import os

import aws_cdk as cdk

from configs.develop import DEPLOY_PROJECT_CONFIG as DEVELOP_PROJECT_CONFIG
from configs.demo import DEPLOY_PROJECT_CONFIG as DEMO_PROJECT_CONFIG
from stacks.static_site import StaticSiteStack

app = cdk.App()

develop_site = StaticSiteStack(
    app,
    f"{DEVELOP_PROJECT_CONFIG.environment}-{DEVELOP_PROJECT_CONFIG.project}-static-site",
    env=cdk.Environment(
        account=os.environ.get("CDK_DEPLOY_ACCOUNT"),
        region=os.environ.get("CDK_DEPLOY_REGION"),
    ),
    config=DEVELOP_PROJECT_CONFIG,
)
demo_site = StaticSiteStack(
    app,
    f"{DEMO_PROJECT_CONFIG.environment}-{DEMO_PROJECT_CONFIG.project}-static-site",
    env=cdk.Environment(
        account=os.environ.get("CDK_DEPLOY_ACCOUNT"),
        region=os.environ.get("CDK_DEPLOY_REGION"),
    ),
    config=DEMO_PROJECT_CONFIG,
)

app.synth()

from dataclasses import dataclass


@dataclass
class ProjectConfig:
    environment: str
    project: str
    cdk_deploy_account: str
    cdk_deploy_region: str

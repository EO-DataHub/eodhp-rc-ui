from aws_cdk import CfnOutput, Stack
from aws_cdk import aws_cloudfront as cf
from aws_cdk import aws_cloudfront_origins as cf_origins
from aws_cdk import aws_iam as iam
from aws_cdk import aws_s3 as s3
from aws_cdk import aws_route53 as route53
from aws_cdk import aws_route53_targets as route53_targets
from aws_cdk import aws_certificatemanager as acm
from constructs import Construct

from configs import ProjectConfig

class StaticSiteStack(Stack):
    def __init__(
        self, scope: Construct, id: str, config: ProjectConfig, **kwargs
    ) -> None:
        super().__init__(scope, id, **kwargs)

        bucket = s3.Bucket(
            self,
            f"{config.environment}-{config.project}-website",
            bucket_name=f"{config.environment}-{config.project}-website-files",
            public_read_access=False,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
        )

        oai = cf.OriginAccessIdentity(self, "{config.environment}-{config.project}-oai")
        cfoai_principal = iam.CanonicalUserPrincipal(
            oai.cloud_front_origin_access_identity_s3_canonical_user_id
        )

        bucket.add_to_resource_policy(
            iam.PolicyStatement(
                actions=["s3:GetObject"],
                resources=[bucket.bucket_arn + "/*"],
                principals=[cfoai_principal],
            )
        )
    
        # Check if the hosted zone already exists
        hosted_zone = route53.HostedZone(
            self, "HostedZone",
            zone_name=f"{config.project}.sparkgeo.dev",
            comment="Hosted Zone for EODH website"
        )

        cert = acm.Certificate(self, "Certificate",
            domain_name=f"*.{config.project}.sparkgeo.dev",
            certificate_name=f"{config.project}-certificate",
            validation=acm.CertificateValidation.from_dns(hosted_zone)
        )

        behaviour_options = cf.BehaviorOptions(
            cache_policy=cf.CachePolicy.CACHING_OPTIMIZED,
            origin=cf_origins.S3Origin(bucket=bucket, origin_access_identity=oai),
            allowed_methods=cf.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
            viewer_protocol_policy=cf.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        )
        distribution = cf.Distribution(
            self,
            f"{config.environment}-{config.project}-website-distribution",
            minimum_protocol_version=cf.SecurityPolicyProtocol.TLS_V1_2_2021,
            domain_names=[f"{config.environment}.{config.project}.sparkgeo.dev"],
            certificate=cert,
            error_responses=[
            cf.ErrorResponse(
                http_status=404,
                response_page_path="/index.html",
                response_http_status=200,
            ),
            cf.ErrorResponse(
                http_status=403,
                response_page_path="/index.html",
                response_http_status=200,
            ),
            ],
            default_behavior=behaviour_options,
            default_root_object="index.html",
        )

        a_record = route53.ARecord(
            self, 
            "ARecord",
            zone=hosted_zone,
            record_name=f"{config.environment}",
            target=route53.RecordTarget.from_alias(route53_targets.CloudFrontTarget(distribution))
        )

        CfnOutput(
            self,
            f"{config.environment}-{config.project}-website-distribution-domain-name",
            value=distribution.distribution_domain_name,
        )
